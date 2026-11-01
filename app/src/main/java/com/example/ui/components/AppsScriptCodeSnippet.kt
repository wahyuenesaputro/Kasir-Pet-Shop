package com.example.ui.components

object AppsScriptCodeSnippet {
    val CODE = """
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "products";
  if (action === "products") return getProductsJson();
  if (action === "recent") return getRecentSalesJson();
  return jsonResponse({ success: false, message: "Action tidak dikenal" });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var requestData = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var salesSheet = ss.getSheetByName("Penjualan");
    if (!salesSheet) {
      salesSheet = ss.insertSheet("Penjualan");
      var headers = ["Tanggal", "Jam", "Nama Produk Yang Dibeli", "Total Barang", "Total Harga", "Metode Pembayaran"];
      salesSheet.appendRow(headers);
    }
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
    var receiptNumber = requestData.receiptNumber || ("PS-" + Utilities.formatDate(now, tz, "yyyyMMdd-HHmmss"));
    var items = requestData.items || [];

    // Gabung semua nama produk dalam 1 baris
    var productSummary = requestData.productNamesSummary;
    if (!productSummary || productSummary.trim() === "") {
      productSummary = items.map(function(it) {
        var qty = it.jumlah || 1;
        var sat = it.satuan || "pcs";
        return (it.namaProduk || "Produk") + " (" + qty + " " + sat + ")";
      }).join(", ");
    }
    if (!productSummary || productSummary.trim() === "") {
      productSummary = "-";
    }

    var totalQty = Number(requestData.totalItems) || items.reduce(function(sum, it) { return sum + (Number(it.jumlah) || 1); }, 0);
    var totalPrice = Number(requestData.totalAmount) || 0;
    var paymentMethod = String(requestData.paymentMethod || "Tunai");

    // Catat 1 baris transaksi per penjualan (6 Kolom Sederhana)
    salesSheet.appendRow([
      tanggal, jam, productSummary, totalQty, totalPrice, paymentMethod
    ]);

    return jsonResponse({ success: true, receiptNumber: receiptNumber, date: tanggal, time: jam });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getProductsJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var categories = ["Burung", "Kucing", "Ayam", "Ikan"];
    var all = [];
    categories.forEach(function(cat) {
      var sh = ss.getSheetByName(cat);
      if (!sh) return;
      var data = sh.getDataRange().getValues();
      if (!data || data.length < 2) return;
      var col = {};
      for (var c = 0; c < data[0].length; c++) col[String(data[0][c]).trim().toLowerCase()] = c;
      var idxNama = col["nama produk"] !== undefined ? col["nama produk"] : col["nama barang"];
      var idxSat = col["satuan"];
      var idxBeli = col["harga beli (per satuan)"] !== undefined ? col["harga beli (per satuan)"] : col["harga beli"];
      var idxJual = col["harga jual"];
      var idxAyamKg = col["harga beli per kg"];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var nama = (idxNama !== undefined && row[idxNama]) ? String(row[idxNama]).trim() : "";
        if (!nama) break;
        var sat = (idxSat !== undefined && row[idxSat]) ? String(row[idxSat]).trim() : "pcs";
        var jual = (idxJual !== undefined) ? Number(row[idxJual]) || 0 : 0;
        var beli = (idxBeli !== undefined) ? Number(row[idxBeli]) || 0 : 0;
        var note = "";
        if (cat.toLowerCase() === "ayam" && sat.toLowerCase() === "zak") {
          sat = "kg";
          if (idxAyamKg !== undefined && row[idxAyamKg]) beli = Number(row[idxAyamKg]) || 0;
          note = "Dijual per kg (dari zak)";
        }
        all.push({
          id: cat + "_" + r, kategori: cat, namaProduk: nama, satuan: sat,
          hargaJual: jual, hargaBeli: beli, hargaBelumDiisi: (jual <= 0), catatan: note
        });
      }
    });
    return jsonResponse({ success: true, products: all });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function getRecentSalesJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("Penjualan");
    if (!sh) return jsonResponse({ success: true, todayTotal: 0, todayCount: 0, recentTransactions: [] });
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 2) return jsonResponse({ success: true, todayTotal: 0, todayCount: 0, recentTransactions: [] });
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");

    var isSimpleFormat = (data[0].length <= 8);
    var todayTotal = 0;
    var todayCount = 0;
    var recent = [];

    if (isSimpleFormat) {
      // FORMAT BARU 6 KOLOM: [Tanggal, Jam, Nama Produk Yang Dibeli, Total Barang, Total Harga, Metode Pembayaran]
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var rawT = row[0];
        var tgl = "";
        if (rawT instanceof Date) {
          tgl = Utilities.formatDate(rawT, tz, "yyyy-MM-dd");
        } else if (rawT) {
          tgl = String(rawT).trim();
        }
        var rawJ = row[1];
        var jam = (rawJ instanceof Date) ? Utilities.formatDate(rawJ, tz, "HH:mm:ss") : String(rawJ || "");
        var namaProduk = String(row[2] || "-");
        var totalQty = Number(row[3]) || 1;
        var totalHarga = Number(row[4]) || 0;
        var metodeBayar = String(row[5] || "Tunai");
        var noStruk = "PS-" + (tgl ? tgl.replace(/-/g, "") : "TRX") + "-" + (r < 10 ? "00" + r : (r < 100 ? "0" + r : r));

        if (tgl === todayStr) {
          todayTotal += totalHarga;
          todayCount++;
        }

        recent.push({
          noStruk: noStruk,
          tanggal: tgl,
          jam: jam,
          namaPembeli: "-",
          metodeBayar: metodeBayar,
          total: totalHarga,
          bayar: totalHarga,
          kembalian: 0,
          items: [{
            kategori: "Penjualan",
            namaProduk: namaProduk,
            satuan: "item",
            jumlah: totalQty,
            hargaJual: totalHarga,
            subtotal: totalHarga
          }]
        });
      }
      recent.reverse();
      if (recent.length > 25) recent = recent.slice(0, 25);
    } else {
      // FORMAT LAMA (15 Kolom) - Backward Compatibility
      var map = {}, order = [];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var noStruk = String(row[2] || "").trim();
        if (!noStruk) continue;
        var rawT = row[0];
        var tgl = (rawT instanceof Date) ? Utilities.formatDate(rawT, tz, "yyyy-MM-dd") : String(rawT || "");
        var rawJ = row[1];
        var jam = (rawJ instanceof Date) ? Utilities.formatDate(rawJ, tz, "HH:mm:ss") : String(rawJ || "");
        var totalItem = Number(row[9]) || (Number(row[7]) * Number(row[8])) || 0;
        if (!map[noStruk]) {
          map[noStruk] = {
            noStruk: noStruk, tanggal: tgl, jam: jam,
            namaPembeli: String(row[3] || "-"), metodeBayar: String(row[12] || "Tunai"),
            bayar: Number(row[13]) || 0, kembalian: Number(row[14]) || 0, total: 0, items: []
          };
          order.push(noStruk);
        }
        map[noStruk].total += totalItem;
        map[noStruk].items.push({
          kategori: String(row[4] || ""), namaProduk: String(row[5] || ""), satuan: String(row[6] || ""),
          jumlah: Number(row[7]) || 1, hargaJual: Number(row[8]) || 0, subtotal: totalItem
        });
        if (tgl === todayStr) {
          todayTotal += totalItem;
          todayCount++;
        }
      }
      for (var i = order.length - 1; i >= 0 && recent.length < 25; i--) {
        recent.push(map[order[i]]);
      }
    }

    return jsonResponse({
      success: true,
      todayTotal: todayTotal,
      todayCount: todayCount,
      recentTransactions: recent
    });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
""".trimIndent()
}

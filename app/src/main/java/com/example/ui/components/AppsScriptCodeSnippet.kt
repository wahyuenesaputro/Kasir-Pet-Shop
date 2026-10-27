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
      var headers = ["Tanggal", "Jam", "No Struk", "Nama Pembeli", "Kategori", "Nama Produk", "Satuan", "Jumlah", "Harga Jual", "Total", "Harga Beli", "Laba", "Metode Bayar", "Bayar", "Kembalian"];
      salesSheet.appendRow(headers);
    }
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
    var receiptNumber = requestData.receiptNumber || ("PS-" + Utilities.formatDate(now, tz, "yyyyMMdd-HHmmss"));
    var items = requestData.items || [];
    for (var i = 0; i < items.length; i++) {
      var itm = items[i];
      var nextRow = salesSheet.getLastRow() + 1;
      salesSheet.appendRow([
        tanggal, jam, receiptNumber, requestData.customerName || "-",
        itm.kategori, itm.namaProduk, itm.satuan, itm.jumlah, itm.hargaJual,
        "=H" + nextRow + "*I" + nextRow, itm.hargaBeli,
        "=J" + nextRow + "-(H" + nextRow + "*K" + nextRow + ")",
        requestData.paymentMethod || "Tunai", requestData.paidAmount || 0, requestData.changeAmount || 0
      ]);
    }
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
    var todayStr = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
    var map = {}, order = [], todayTotal = 0, todaySet = {};
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var noStruk = String(row[2] || "");
      if (!noStruk) continue;
      var totalItem = Number(row[9]) || (Number(row[7]) * Number(row[8])) || 0;
      if (!map[noStruk]) {
        map[noStruk] = {
          noStruk: noStruk, tanggal: String(row[0]||""), jam: String(row[1]||""),
          namaPembeli: String(row[3]||""), metodeBayar: String(row[12]||"Tunai"),
          bayar: Number(row[13])||0, kembalian: Number(row[14])||0, total: 0, items: []
        };
        order.push(noStruk);
      }
      map[noStruk].total += totalItem;
      map[noStruk].items.push({
        kategori: String(row[4]||""), namaProduk: String(row[5]||""), satuan: String(row[6]||""),
        jumlah: Number(row[7])||1, hargaJual: Number(row[8])||0, subtotal: totalItem
      });
      if (String(row[0]||"") === todayStr) {
        todayTotal += totalItem;
        todaySet[noStruk] = true;
      }
    }
    var recent = [];
    for (var i = order.length - 1; i >= 0 && recent.length < 20; i--) {
      recent.push(map[order[i]]);
    }
    return jsonResponse({ success: true, todayTotal: todayTotal, todayCount: Object.keys(todaySet).length, recentTransactions: recent });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
""".trimIndent()
}

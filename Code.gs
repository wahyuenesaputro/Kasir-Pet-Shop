/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (Code.gs) - KASIR PET SHOP
 * =========================================================================
 * 
 * PETUNJUK DEPLOYMENT (LANGKAH DEMI LANGKAH):
 * 1. Buka Google Spreadsheet Anda yang berisi tab "Burung", "Kucing", "Ayam", "Ikan".
 * 2. Klik menu "Ekstensi" > "Apps Script".
 * 3. Hapus semua kode yang ada di editor Apps Script, lalu tempel (paste) seluruh isi file ini.
 * 4. Klik ikon disket (Simpan proyek) atau tekan Ctrl+S.
 * 5. Klik tombol biru "Deploy" di kanan atas > pilih "Deployment baru".
 * 6. Di samping "Pilih jenis", klik ikon gerigi > pilih "Aplikasi web".
 * 7. Isi konfigurasi:
 *    - Deskripsi: "API Kasir Pet Shop"
 *    - Jalankan sebagai: "Saya" (akun Google Anda)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone)
 * 8. Klik tombol "Deploy", lalu jika diminta izin akses, klik "Beri akses" (Review permissions)
 *    dan pilih akun Anda, kemudian klik "Advanced" > "Go to ... (unsafe)" > "Allow".
 * 9. Salin "URL Aplikasi web" yang diberikan (berakhiran /exec).
 * 10. Tempel URL tersebut ke menu Pengaturan di aplikasi Kasir Pet Shop.
 * =========================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "products";
  
  if (action === "products") {
    return getProductsJson();
  } else if (action === "recent") {
    return getRecentSalesJson();
  } else {
    return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Kunci selama max 30 detik untuk mencegah tabrakan data (concurrency safe)
    lock.waitLock(30000);
    
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      return jsonResponse({ success: false, message: "Tidak ada data yang dikirim" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var salesSheet = ss.getSheetByName("Penjualan");
    
    // Buat sheet Penjualan jika belum ada
    if (!salesSheet) {
      salesSheet = ss.insertSheet("Penjualan");
      var headers = [
        "Tanggal", "Jam", "No Struk", "Nama Pembeli", "Kategori",
        "Nama Produk", "Satuan", "Jumlah", "Harga Jual", "Total",
        "Harga Beli", "Laba", "Metode Bayar", "Bayar", "Kembalian"
      ];
      salesSheet.appendRow(headers);
      var headerRange = salesSheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#FFE0B2");
    }

    var now = new Date();
    var tanggal = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+7", "HH:mm:ss");
    
    // Nomor struk unik: PS-YYYYMMDD-HHMMSS-RAND
    var receiptNumber = requestData.receiptNumber || ("PS-" + Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+7", "yyyyMMdd-HHmmss"));
    var customerName = requestData.customerName || "-";
    var paymentMethod = requestData.paymentMethod || "Tunai";
    var paidAmount = Number(requestData.paidAmount || 0);
    var changeAmount = Number(requestData.changeAmount || 0);
    var items = requestData.items || [];

    if (items.length === 0) {
      return jsonResponse({ success: false, message: "Keranjang belanja kosong" });
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var nextRow = salesSheet.getLastRow() + 1;
      
      var kategori = item.kategori || "-";
      var namaProduk = item.namaProduk || "-";
      var satuan = item.satuan || "pcs";
      var jumlah = Number(item.jumlah || 1);
      var hargaJual = Number(item.hargaJual || 0);
      var hargaBeli = Number(item.hargaBeli || 0);
      
      // Kolom:
      // A: Tanggal, B: Jam, C: No Struk, D: Nama Pembeli, E: Kategori,
      // F: Nama Produk, G: Satuan, H: Jumlah, I: Harga Jual, J: Total,
      // K: Harga Beli, L: Laba, M: Metode Bayar, N: Bayar, O: Kembalian
      
      var formulaTotal = "=H" + nextRow + "*I" + nextRow;
      var formulaLaba = "=J" + nextRow + "-(H" + nextRow + "*K" + nextRow + ")";
      
      salesSheet.appendRow([
        tanggal,
        jam,
        receiptNumber,
        customerName,
        kategori,
        namaProduk,
        satuan,
        jumlah,
        hargaJual,
        formulaTotal,
        hargaBeli,
        formulaLaba,
        paymentMethod,
        paidAmount,
        changeAmount
      ]);

      // Format Rupiah untuk kolom I (Harga Jual), J (Total), K (Harga Beli), L (Laba), N (Bayar), O (Kembalian)
      salesSheet.getRange(nextRow, 9, 1, 4).setNumberFormat('"Rp"#,##0');
      salesSheet.getRange(nextRow, 14, 1, 2).setNumberFormat('"Rp"#,##0');
      // Format desimal untuk Jumlah (kolom H)
      salesSheet.getRange(nextRow, 8).setNumberFormat('#,##0.##');
    }

    return jsonResponse({
      success: true,
      message: "Transaksi berhasil disimpan ke spreadsheet",
      receiptNumber: receiptNumber,
      date: tanggal,
      time: jam,
      itemCount: items.length
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal menyimpan transaksi: " + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Membaca 4 tab produk (Burung, Kucing, Ayam, Ikan) berdasarkan nama header
 */
function getProductsJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var categories = ["Burung", "Kucing", "Ayam", "Ikan"];
    var allProducts = [];

    categories.forEach(function(catName) {
      var sheet = ss.getSheetByName(catName);
      if (!sheet) return;

      var data = sheet.getDataRange().getValues();
      if (!data || data.length < 2) return;

      var headerRow = data[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        var hName = String(headerRow[c]).trim().toLowerCase();
        colMap[hName] = c;
      }

      // Cari indeks kolom berdasarkan nama header yang fleksibel
      var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk"]);
      var idxSatuan = findColumnIndex(colMap, ["satuan", "unit"]);
      var idxHargaBeli = findColumnIndex(colMap, ["harga beli (per satuan)", "harga beli per satuan", "harga beli"]);
      var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga jual (per satuan)", "harga"]);
      var idxIsiZak = findColumnIndex(colMap, ["isi zak (kg)", "isi zak", "isi zak/kg"]);
      var idxHargaBeliPerKg = findColumnIndex(colMap, ["harga beli per kg", "harga beli/kg"]);

      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var namaProduk = (idxNama >= 0 && row[idxNama]) ? String(row[idxNama]).trim() : "";
        
        // Berhenti jika ketemu Nama Produk kosong (mengabaikan baris catatan di bawah)
        if (!namaProduk) {
          break;
        }

        var satuan = (idxSatuan >= 0 && row[idxSatuan]) ? String(row[idxSatuan]).trim() : "pcs";
        var rawHargaJual = (idxHargaJual >= 0) ? parseNumber(row[idxHargaJual]) : 0;
        var rawHargaBeli = (idxHargaBeli >= 0) ? parseNumber(row[idxHargaBeli]) : 0;

        var finalSatuan = satuan;
        var finalHargaJual = rawHargaJual;
        var finalHargaBeli = rawHargaBeli;
        var note = "";

        // Aturan khusus tab Ayam: jika Satuan = "zak", dijual per KG
        if (catName.toLowerCase() === "ayam" && satuan.toLowerCase() === "zak") {
          finalSatuan = "kg";
          if (idxHargaBeliPerKg >= 0 && row[idxHargaBeliPerKg]) {
            finalHargaBeli = parseNumber(row[idxHargaBeliPerKg]);
          }
          note = "Dijual per kg (dari zak)";
        }

        var isPriceEmpty = (finalHargaJual <= 0);

        allProducts.push({
          id: catName + "_" + r,
          kategori: catName,
          namaProduk: namaProduk,
          satuan: finalSatuan,
          satuanAsli: satuan,
          hargaJual: finalHargaJual,
          hargaBeli: finalHargaBeli,
          hargaBelumDiisi: isPriceEmpty,
          catatan: note
        });
      }
    });

    return jsonResponse({
      success: true,
      products: allProducts,
      count: allProducts.length,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal membaca produk: " + err.toString()
    });
  }
}

/**
 * Membaca 20 transaksi terakhir dan total penjualan hari ini dari tab "Penjualan"
 */
function getRecentSalesJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Penjualan");
    if (!sheet) {
      return jsonResponse({
        success: true,
        todayTotal: 0,
        todayCount: 0,
        recentTransactions: []
      });
    }

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return jsonResponse({
        success: true,
        todayTotal: 0,
        todayCount: 0,
        recentTransactions: []
      });
    }

    var now = new Date();
    var todayStr = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");

    // Kelompokkan per No Struk
    var transactionsMap = {};
    var transactionOrder = [];
    var todayTotalOmset = 0;
    var todayReceiptsSet = {};

    // Header baris 0, data mulai baris 1
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var tanggal = String(row[0] || "");
      var jam = String(row[1] || "");
      var noStruk = String(row[2] || "");
      var namaPembeli = String(row[3] || "");
      var kategori = String(row[4] || "");
      var namaProduk = String(row[5] || "");
      var satuan = String(row[6] || "");
      var jumlah = parseNumber(row[7]);
      var hargaJual = parseNumber(row[8]);
      var totalItem = parseNumber(row[9]);
      if (totalItem === 0) totalItem = jumlah * hargaJual;
      var metodeBayar = String(row[12] || "Tunai");
      var bayar = parseNumber(row[13]);
      var kembalian = parseNumber(row[14]);

      if (!noStruk) continue;

      if (!transactionsMap[noStruk]) {
        transactionsMap[noStruk] = {
          noStruk: noStruk,
          tanggal: tanggal,
          jam: jam,
          namaPembeli: namaPembeli,
          metodeBayar: metodeBayar,
          bayar: bayar,
          kembalian: kembalian,
          total: 0,
          items: []
        };
        transactionOrder.push(noStruk);
      }

      transactionsMap[noStruk].total += totalItem;
      transactionsMap[noStruk].items.push({
        kategori: kategori,
        namaProduk: namaProduk,
        satuan: satuan,
        jumlah: jumlah,
        hargaJual: hargaJual,
        subtotal: totalItem
      });

      // Hitung total hari ini
      if (tanggal === todayStr) {
        todayTotalOmset += totalItem;
        todayReceiptsSet[noStruk] = true;
      }
    }

    // Ambil 20 transaksi terakhir (dari urutan paling baru)
    var recent = [];
    for (var i = transactionOrder.length - 1; i >= 0 && recent.length < 20; i--) {
      recent.push(transactionsMap[transactionOrder[i]]);
    }

    return jsonResponse({
      success: true,
      todayTotal: todayTotalOmset,
      todayCount: Object.keys(todayReceiptsSet).length,
      recentTransactions: recent
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal membaca riwayat: " + err.toString()
    });
  }
}

function findColumnIndex(colMap, candidateNames) {
  for (var i = 0; i < candidateNames.length; i++) {
    var name = candidateNames[i].toLowerCase();
    if (colMap.hasOwnProperty(name)) {
      return colMap[name];
    }
  }
  return -1;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  var cleaned = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

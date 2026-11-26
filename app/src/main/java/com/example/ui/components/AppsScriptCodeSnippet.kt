package com.example.ui.components

object AppsScriptCodeSnippet {
    val CODE = """
/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (Code.gs) - KASIR PET SHOP & MUTASI SALDO KAS
 * =========================================================================
 * 
 * STRUKTUR RESMI TAB "Penjualan" (HANYA 7 KOLOM - TIDAK ADA HARGA BELI/LABA):
 * [A: Tanggal] | [B: Jam] | [C: Keterangan / Transaksi] | [D: Masuk (+)] | [E: Keluar (-)] | [F: Saldo Kas Akhir] | [G: Metode]
 * 
 * =========================================================================
 * CARA MEMBERSIHKAN KOLOM ORANYE & MENGAKTIFKAN KE SPREADSHEET (2 LANGKAH):
 * =========================================================================
 * LANGKAH 1: BERSIHKAN KOLOM LAMA & BARIS YANG GESER
 * 1. Buka spreadsheet > Ekstensi > Apps Script.
 * 2. Hapus semua isi Code.gs, tempel seluruh kode ini, lalu Simpan (Ctrl + S).
 * 3. Di toolbar atas, pilih fungsi "buatKolomSaldoOtomatis", lalu klik "▶ Jalankan".
 *    -> Semua kolom oranye H-O dan baris salah format langsung DIHAPUS.
 *    -> Spreadsheet bersih 100% hanya 7 kolom resmi A s/d G!
 * 
 * LANGKAH 2: DEPLOY VERSI BARU (WAJIB AGAR PENJUALAN TIDAK GESER LAGI)
 * 1. Klik tombol biru "Deploy" di kanan atas > "Kelola deployment" (Manage deployments).
 * 2. Klik ikon PENSIL (Edit).
 * 3. Pada baris "Versi" (Version), pilih "Versi baru" (New version).
 * 4. Klik tombol "Deploy".
 * =========================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "products";
  
  if (action === "products") {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      ensureSalesSheetWithHeaders(ss);
    } catch (ignore) {}
    return getProductsJson();
  } else if (action === "update_product_price" || action === "update_price") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonResponse(updateProductPriceInSheets(ss, e.parameter || {}));
  } else if (action === "add_product") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonResponse(addProductToSheets(ss, e.parameter || {}));
  } else if (action === "delete_product" || action === "hapus_produk") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonResponse(deleteProductFromSheets(ss, e.parameter || {}));
  } else if (action === "recent" || action === "balance" || action === "get_balance") {
    return getRecentSalesJson();
  } else if (action === "setup_data_baru" || action === "isi_pakan_baru" || action === "buat_spreadsheet_baru" || action === "reset_data_baru") {
    var resultMsg = buatSpreadsheetDataPakanBaru();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "reset_and_format" || action === "bersihkan_semua" || action === "format_estetik") {
    var resultMsg = bersihkanDanFormatSemuaSheet();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "setup" || action === "init" || action === "buat_saldo") {
    var resultMsg = buatKolomSaldoOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "setup_produk" || action === "isi_produk" || action === "isi_database") {
    var resultMsg = isiDataProdukOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "setup_obat" || action === "buat_obat" || action === "isi_obat") {
    var resultMsg = buatSheetObatOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "hapus_modal" || action === "clean_modal" || action === "hapus_harga_modal") {
    var resultMsg = hapusKolomHargaModalOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else {
    return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      return jsonResponse({ success: false, message: "Tidak ada data yang dikirim" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 0. Aksi Update Harga Produk di Tab Kategori Spreadsheet
    if (requestData.action === "update_product_price" || requestData.action === "update_price") {
      var updateRes = updateProductPriceInSheets(ss, requestData);
      return jsonResponse(updateRes);
    }

    // 0B. Aksi Tambah Produk Baru ke Tab Kategori Spreadsheet
    if (requestData.action === "add_product" || requestData.action === "tambah_produk") {
      var addRes = addProductToSheets(ss, requestData);
      return jsonResponse(addRes);
    }

    // 0C. Aksi Hapus Produk dari Tab Kategori Spreadsheet
    if (requestData.action === "delete_product" || requestData.action === "hapus_produk") {
      var delRes = deleteProductFromSheets(ss, requestData);
      return jsonResponse(delRes);
    }

    var salesSheet = ensureSalesSheetWithHeaders(ss);

    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");

    var currentBalance = getLastCashBalance(salesSheet);

    // 1. Aksi Atur Saldo Kas (Tambah / Tarik / Koreksi)
    if (requestData.action === "adjust_balance" || requestData.action === "set_balance") {
      var mutationType = String(requestData.mutationType || "").toLowerCase();
      var amount = Number(requestData.amount) || 0;
      var reason = String(requestData.reason || "").trim();
      var targetBalance = Number(requestData.newBalance);

      var masuk = 0;
      var keluar = 0;
      var finalBalance = currentBalance;
      var metodeKet = "Kas Toko";

      if (mutationType === "add" || mutationType === "tambah") {
        masuk = amount;
        keluar = 0;
        finalBalance = currentBalance + amount;
        metodeKet = "Kas Toko (Tambah)";
        if (!reason) reason = "Tambah Modal Kasir";
      } else if (mutationType === "withdraw" || mutationType === "tarik" || mutationType === "kurang") {
        masuk = 0;
        keluar = amount;
        finalBalance = Math.max(0, currentBalance - amount);
        metodeKet = "Kas Toko (Tarik)";
        if (!reason) reason = "Tarik Saldo Kas / Keperluan Toko";
      } else {
        if (isNaN(targetBalance)) targetBalance = amount;
        var diff = targetBalance - currentBalance;
        if (diff >= 0) {
          masuk = diff;
          keluar = 0;
          metodeKet = "Koreksi Tambah";
        } else {
          masuk = 0;
          keluar = Math.abs(diff);
          metodeKet = "Koreksi Kurang";
        }
        finalBalance = targetBalance;
        if (!reason) reason = "Penyesuaian Saldo Kasir";
      }

      salesSheet.appendRow([
        tanggal,
        jam,
        reason,
        masuk,
        keluar,
        finalBalance,
        metodeKet
      ]);
      
      var lastR = salesSheet.getLastRow();
      salesSheet.getRange(lastR, 4).setNumberFormat('"Rp"#,##0');
      salesSheet.getRange(lastR, 5).setNumberFormat('"Rp"#,##0');
      salesSheet.getRange(lastR, 6).setNumberFormat('"Rp"#,##0');

      return jsonResponse({
        success: true,
        balance: finalBalance,
        message: "Mutasi saldo kas berhasil dicatat! Saldo akhir: Rp " + finalBalance
      });
    }

    // 2. Aksi Penjualan Kasir (Mutasi Penjualan Murni 7 Kolom)
    var receiptNumber = requestData.receiptNumber || ("PS-" + Utilities.formatDate(now, tz, "yyyyMMdd-HHmmss"));
    var items = requestData.items || [];
    
    var productSummary = requestData.productNamesSummary;
    if (!productSummary || productSummary.trim() === "") {
      productSummary = items.map(function(it) {
        var qty = it.jumlah || 1;
        var sat = it.satuan || "pcs";
        return (it.namaProduk || "Produk") + " (" + qty + " " + sat + ")";
      }).join(", ");
    }
    if (!productSummary || productSummary.trim() === "") {
      productSummary = "Penjualan Toko";
    }

    var totalPrice = Number(requestData.totalAmount) || 0;
    var paymentMethod = String(requestData.paymentMethod || "Tunai");
    var newBalance = currentBalance + totalPrice;

    salesSheet.appendRow([
      tanggal,
      jam,
      productSummary,
      totalPrice,
      0,
      newBalance,
      paymentMethod
    ]);

    var newRow = salesSheet.getLastRow();
    salesSheet.getRange(newRow, 4).setNumberFormat('"Rp"#,##0');
    salesSheet.getRange(newRow, 5).setNumberFormat('"Rp"#,##0');
    salesSheet.getRange(newRow, 6).setNumberFormat('"Rp"#,##0');

    return jsonResponse({
      success: true,
      message: "Transaksi berhasil dicatat ke spreadsheet",
      receiptNumber: receiptNumber,
      date: tanggal,
      time: jam,
      balance: newBalance
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal memproses data: " + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function buatKolomSaldoOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Penjualan");
  var headers = [
    "Tanggal", 
    "Jam", 
    "Keterangan / Transaksi", 
    "Masuk (+)", 
    "Keluar (-)", 
    "Saldo Kas Akhir", 
    "Metode"
  ];
  
  if (!sheet) {
    sheet = ss.insertSheet("Penjualan");
  }

  // 1. HAPUS SEMUA KOLOM SISA FORMAT LAMA DARI KOLOM 8 KE ATAS (H s/d O)
  var totalCols = sheet.getMaxColumns();
  if (totalCols > 7) {
    sheet.deleteColumns(8, totalCols - 7);
  }

  // 2. Tulis 7 header resmi
  sheet.getRange(1, 1, 1, 7).setValues([headers]);
  formatHeaderRow(sheet, 7);
  sheet.setFrozenRows(1);

  // 3. Bersihkan baris yang berantakan / geser
  var lastRow = sheet.getLastRow();
  for (var r = lastRow; r >= 2; r--) {
    var valC = String(sheet.getRange(r, 3).getValue() || "").trim();
    var valD = String(sheet.getRange(r, 4).getValue() || "").trim();
    if (valC.indexOf("PS-") === 0 || valD === "-") {
      sheet.deleteRow(r);
    }
  }

  // 4. Baris Saldo Awal jika kosong
  if (sheet.getLastRow() <= 1) {
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tgl = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
    sheet.appendRow([tgl, jam, "Saldo Awal Kasir", 0, 0, 0, "Sistem"]);
  }

  // 5. Format Mata Uang Rp
  var maxR = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, 4, maxR - 1, 3).setNumberFormat('"Rp"#,##0');
  sheet.autoResizeColumns(1, 7);

  // 6. Otomatis bersihkan kolom Harga Modal/Beli dari seluruh sheet kategori jika ada
  hapusKolomHargaModalOtomatis();

  return "Berhasil membersihkan kolom lama H-O dan merapikan 7 kolom mutasi kas murni!";
}

function hapusKolomHargaModalOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var cleanedSheets = [];

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName();
    if (sheetName === "Penjualan" || sheetName === "Rekap") continue;

    var values = sheet.getDataRange().getValues();
    if (!values || values.length === 0) continue;

    var headerRow = values[0];
    for (var col = headerRow.length - 1; col >= 0; col--) {
      var headerText = String(headerRow[col] || "").trim().toLowerCase();
      if (headerText.indexOf("beli") >= 0 || headerText.indexOf("modal") >= 0) {
        sheet.deleteColumn(col + 1);
        cleanedSheets.push(sheetName + " (kolom " + (col + 1) + ")");
      }
    }
  }

  return "Berhasil menghapus seluruh kolom Harga Modal/Beli dari spreadsheet! " + (cleanedSheets.length > 0 ? "Sheet dibersihkan: " + cleanedSheets.join(", ") : "Semua sheet sudah bersih tanpa kolom modal.");
}

function isiDataProdukOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Buat sheet Penjualan (7 Kolom Mutasi Kas)
  buatKolomSaldoOtomatis();

  // 2. Data 29 Produk Burung Resmi (Hanya Harga Jual - Tanpa Modal)
  var dataBurung = [
    [1, "SKM (SKM Halus)", "pcs", 4500, ""],
    [2, "SKM (SKM Kasar)", "pcs", 4500, ""],
    [3, "Kroto Sari (KSK)", "pcs", 3500, ""],
    [4, "Kroto Sari (Krotosari Kasar)", "pcs", 3500, ""],
    [5, "Alam Sakti (Love Bird)", "pcs", 10500, ""],
    [6, "Alam Sakti (Kenari)", "pcs", 11500, ""],
    [7, "Topsong (Top Song Coklat)", "pcs", 12000, ""],
    [8, "Topsong (Top Song Hijau)", "pcs", 12000, ""],
    [9, "Leopard (Kuning Kasar)", "pcs", 8500, ""],
    [10, "Leopard (Hijau Kasar)", "pcs", 8500, ""],
    [11, "Chirpy (Besar)", "pcs", 8500, ""],
    [12, "Madura Koung (Madura Koung)", "pcs", 9500, ""],
    [13, "Kutut Profit (Profit)", "pcs", 8500, ""],
    [14, "Derkuku Comet (Comet Derkuku)", "pcs", 7500, ""],
    [15, "Gold Coin (Kutut 250gr)", "pcs", 8500, ""],
    [16, "Gold Coin (Hijau Seaweed 450gr)", "pcs", 12000, ""],
    [17, "Gold Coin (Canary)", "pcs", 10000, ""],
    [18, "Ebod Canary (Ebod)", "pcs", 9000, ""],
    [19, "Fancy (9 Bintang Anti Stress)", "pcs", 8000, ""],
    [20, "Fancy (Love Bird)", "pcs", 14500, ""],
    [21, "Fancy (Bintang Seaweed/Gold)", "pcs", 14500, ""],
    [22, "Milet Racik Lovebird", "pcs", 10000, ""],
    [23, "Milet Putih Kiloan", "kg", 14500, ""],
    [24, "Milet Merah Kiloan", "kg", 14500, ""],
    [25, "Bintang Kebumen (Halus)", "pcs", 9000, ""],
    [26, "Phoenix Perkutut", "pcs", 12500, ""],
    [27, "Canary Post (Biji Sawi)", "kg", 16000, ""],
    [28, "Kwaci Hitam Kiloan", "kg", 22000, ""],
    [29, "Jagung Kristal Merah", "kg", 10000, ""]
  ];
  isiSheetKategori(ss, "Burung", dataBurung);

  // 3. Data Produk Ayam (Hanya Harga Jual - Tanpa Modal)
  var dataAyam = [
    [1, "511 (1 Karung)", "kg", 11500, "Dijual per kg (dari karung)"],
    [2, "511 (511 K)", "kg", 14500, ""],
    [3, "591 (591k)", "kg", 14500, ""],
    [4, "592 (592k)", "kg", 14500, ""],
    [5, "594 (594k)", "kg", 14500, ""],
    [6, "BR-1 Super", "kg", 12000, ""],
    [7, "BR-611", "kg", 10000, ""],
    [8, "Buras (1 Karung)", "kg", 7000, ""],
    [9, "EH 610 (1 Karung)", "kg", 9500, ""],
    [10, "Jagung (1 Karung Meniran)", "kg", 10500, ""],
    [11, "Jagung (1 Karung Kasar)", "kg", 10500, ""],
    [12, "Konsentrat 144", "kg", 13500, ""],
    [13, "Katul Super", "kg", 5500, ""],
    [14, "Polard Gandum", "kg", 7000, ""],
    [15, "Kupang Halus", "kg", 4000, ""]
  ];
  isiSheetKategori(ss, "Ayam", dataAyam);

  // 4. Data Produk Kucing (Hanya Harga Jual - Tanpa Modal)
  var dataKucing = [
    [1, "Bolt Ikan Tuna (Kiloan)", "kg", 24000, ""],
    [2, "Bolt Salmon (Kiloan)", "kg", 25000, ""],
    [3, "Bolt Kitten Salmon", "kg", 26000, ""],
    [4, "Me-O Adult Seafood", "kg", 36000, ""],
    [5, "Me-O Adult Tuna", "kg", 36000, ""],
    [6, "Me-O Kitten Ocean Fish", "kg", 38000, ""],
    [7, "Whiskas Adult Tuna", "kg", 37000, ""],
    [8, "Whiskas Junior Ocean Fish", "kg", 39000, ""],
    [9, "Cat Choize Tuna", "kg", 21000, ""],
    [10, "Cat Choize Salmon", "kg", 21500, ""],
    [11, "Cat Choize Kitten", "kg", 23000, ""],
    [12, "Ori Cat Kitten", "kg", 20000, ""],
    [13, "Ori Cat Adult", "kg", 19500, ""],
    [14, "Life Cat Pouch Tuna 85gr", "pcs", 6000, ""],
    [15, "Life Cat Pouch Salmon 85gr", "pcs", 6000, ""],
    [16, "Whiskas Pouch Tuna 85gr", "pcs", 8000, ""],
    [17, "Pasir Kucing Gumpal 5L", "pcs", 27000, ""],
    [18, "Pasir Kucing Gumpal 10L", "pcs", 50000, ""]
  ];
  isiSheetKategori(ss, "Kucing", dataKucing);

  // 5. Data Produk Ikan (Hanya Harga Jual - Tanpa Modal)
  var dataIkan = [
    [1, "Takari Hijau 100gr", "pcs", 6500, ""],
    [2, "Takari Merah 100gr", "pcs", 6500, ""],
    [3, "Takari 250gr", "pcs", 13500, ""],
    [4, "Takari 500gr", "pcs", 24000, ""],
    [5, "Akari Premium Red 100gr", "pcs", 16000, ""],
    [6, "Akari Premium Maxi 100gr", "pcs", 16000, ""],
    [7, "Sanyu Turtle Food 100gr", "pcs", 13000, ""],
    [8, "Pelet Lele 781-1 Kiloan", "kg", 14000, ""],
    [9, "Pelet Lele 781-2 Kiloan", "kg", 13500, ""],
    [10, "Pelet Lele -1 Kiloan", "kg", 13000, ""],
    [11, "Pelet Nila LP-1 Kiloan", "kg", 13500, ""],
    [12, "Pelet Nila LP-2 Kiloan", "kg", 13000, ""],
    [13, "Pelet Apung Feng-Li 0", "kg", 20000, ""],
    [14, "Pelet Apung Feng-Li 1", "kg", 19000, ""],
    [15, "Pelet Koi CP 1kg", "pcs", 26000, ""],
    [16, "Pelet Mas Koki 100gr", "pcs", 8000, ""]
  ];
  isiSheetKategori(ss, "Ikan", dataIkan);

  // 6. Data Kategori Obat & Vitamin Ternak/Hewan (Hanya Harga Jual - Tanpa Modal)
  buatSheetObatOtomatis(ss);

  return "Berhasil mengisi seluruh data produk (5 kolom resmi tanpa modal termasuk Obat) dan sheet Penjualan 7 kolom!";
}

function buatSheetObatOtomatis(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataObat = [
    [1, "Vita Tetra Chlor (Kapsul isi 10)", "pcs", 6000, "Obat ngorok & snot unggas"],
    [2, "Koleridin (Kapsul isi 10)", "pcs", 5500, "Obat kolera & berak hijau"],
    [3, "Vita Stress (Sachet 10gr)", "pcs", 5000, "Vitamin anti stres ayam & burung"],
    [4, "Super N (15 ml)", "pcs", 20000, "Obat infeksi pernapasan burung"],
    [5, "Biodin Spray Antiseptik (100 ml)", "pcs", 28000, "Obat luka, jamur, korep hewan"],
    [6, "Scabies Cream / Salep Jamur Kucing", "pcs", 16000, "Obat jamur & scabies kucing"],
    [7, "Detick Obat Kutu Kucing (1-10kg)", "pcs", 22000, "Obat tetes kutu kucing"],
    [8, "Albenworm Obat Cacing Kucing", "pcs", 18000, "Obat cacing tablet kucing"],
    [9, "Minyak Ikan / Fish Oil (Botol 50 butir)", "pcs", 12000, "Suplemen bulu & nafsu makan"],
    [10, "Gendol / Tetraclor Cair Ternak (100 ml)", "pcs", 14000, "Obat pencernaan ternak"],
    [11, "Doxyvet Serbuk (Sachet 5gr)", "pcs", 6000, "Antibiotik batuk ngorok ternak"],
    [12, "Obat Kutu Serbuk Asuntol (100gr)", "pcs", 15000, "Bedak anti kutu ayam & unggas"]
  ];
  isiSheetKategori(ss, "Obat", dataObat);
  return "Berhasil membuat sheet Obat (12 produk) di spreadsheet!";
}

function isiSheetKategori(ss, sheetName, items) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  var headers = ["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"];
  var allRows = [headers];
  for (var i = 0; i < items.length; i++) {
    allRows.push(items[i]);
  }
  sheet.getRange(1, 1, allRows.length, 5).setValues(allRows);

  try {
    formatHeaderRow(sheet, 5);
    sheet.setFrozenRows(1);
    if (allRows.length > 1) {
      sheet.getRange(2, 4, allRows.length - 1, 1).setNumberFormat('"Rp"#,##0');
    }
    sheet.autoResizeColumns(1, 5);
  } catch (err) {
    // Tetap sukses menulis data meskipun ada sel yang sedang diedit di browser
  }
}

function ensureSalesSheetWithHeaders(ss) {
  var sheet = ss.getSheetByName("Penjualan");
  var headers = [
    "Tanggal", 
    "Jam", 
    "Keterangan / Transaksi", 
    "Masuk (+)", 
    "Keluar (-)", 
    "Saldo Kas Akhir", 
    "Metode"
  ];

  if (!sheet) {
    sheet = ss.insertSheet("Penjualan");
    var totalCols = sheet.getMaxColumns();
    if (totalCols > 7) {
      sheet.deleteColumns(8, totalCols - 7);
    }
    sheet.appendRow(headers);
    formatHeaderRow(sheet, 7);
    sheet.setFrozenRows(1);

    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tgl = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
    sheet.appendRow([tgl, jam, "Saldo Awal Kasir", 0, 0, 0, "Sistem"]);
    sheet.getRange(2, 4, 1, 3).setNumberFormat('"Rp"#,##0');
    sheet.autoResizeColumns(1, 7);
    return sheet;
  }

  var totalCols = sheet.getMaxColumns();
  if (totalCols > 7) {
    sheet.deleteColumns(8, totalCols - 7);
  }

  var currentHeaders = sheet.getRange(1, 1, 1, 7).getValues()[0];
  var hasSaldo = false;
  for (var i = 0; i < currentHeaders.length; i++) {
    if (String(currentHeaders[i]).toLowerCase().includes("saldo")) {
      hasSaldo = true;
      break;
    }
  }

  if (!hasSaldo) {
    sheet.getRange(1, 1, 1, 7).setValues([headers]);
    formatHeaderRow(sheet, 7);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 7);
  }

  return sheet;
}


/**
 * MEMBUAT SPREADSHEET BARU UNTUK DATA PAKAN (78 PRODUK)
 * - Menghapus data lama di tab Kucing, Burung, Ayam, Ikan, Obat, dan Penjualan.
 * - Mengisi 78 item pakan resmi dari data pakan baru.
 * - Tab Obat dikosongkan (hanya header).
 * - Tidak menambahkan kategori Lainnya.
 * - Tema visual Emerald Green modern dengan zebra striping & dropdown satuan.
 */
function buatSpreadsheetDataPakanBaru() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var rawDataPakan = {
  "Kucing": [
    {
      "id": "kucing_1",
      "kategori": "Kucing",
      "namaProduk": "Bolt (Ikan Ungu 800gr)",
      "satuan": "pcs",
      "hargaJual": 19000
    },
    {
      "id": "kucing_2",
      "kategori": "Kucing",
      "namaProduk": "Bolt (Donat Kuning 800gr)",
      "satuan": "pcs",
      "hargaJual": 19000
    },
    {
      "id": "kucing_3",
      "kategori": "Kucing",
      "namaProduk": "Bolt (Pink Bulat 800gr)",
      "satuan": "pcs",
      "hargaJual": 19000
    },
    {
      "id": "kucing_4",
      "kategori": "Kucing",
      "namaProduk": "Bolt (Kitten Bolt 500gr)",
      "satuan": "pcs",
      "hargaJual": 14000
    },
    {
      "id": "kucing_5",
      "kategori": "Kucing",
      "namaProduk": "Felibite (Felibite Ikan)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "kucing_6",
      "kategori": "Kucing",
      "namaProduk": "Felibite (Felibite Donat)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "kucing_7",
      "kategori": "Kucing",
      "namaProduk": "Felibite (Felibite Kitten Donat)",
      "satuan": "pcs",
      "hargaJual": 12500
    },
    {
      "id": "kucing_8",
      "kategori": "Kucing",
      "namaProduk": "Excel (Adult Ikan 500gr)",
      "satuan": "pcs",
      "hargaJual": 11500
    },
    {
      "id": "kucing_9",
      "kategori": "Kucing",
      "namaProduk": "Excel (Adult Donat)",
      "satuan": "pcs",
      "hargaJual": 11500
    },
    {
      "id": "kucing_10",
      "kategori": "Kucing",
      "namaProduk": "Excel (Adult Segitiga Oren)",
      "satuan": "pcs",
      "hargaJual": 11500
    },
    {
      "id": "kucing_11",
      "kategori": "Kucing",
      "namaProduk": "Excel (Kitten Pink 500gr)",
      "satuan": "pcs",
      "hargaJual": 13000
    },
    {
      "id": "kucing_12",
      "kategori": "Kucing",
      "namaProduk": "Cat Choize (Hijau Adult 800gr)",
      "satuan": "pcs",
      "hargaJual": 18000
    },
    {
      "id": "kucing_13",
      "kategori": "Kucing",
      "namaProduk": "Cat Choize (Oren Adult 800gr)",
      "satuan": "pcs",
      "hargaJual": 18000
    },
    {
      "id": "kucing_14",
      "kategori": "Kucing",
      "namaProduk": "Cat Choize (Kitten Tuna Pink 1kg)",
      "satuan": "pcs",
      "hargaJual": 24500
    },
    {
      "id": "kucing_15",
      "kategori": "Kucing",
      "namaProduk": "Cat Choize (Kitten Salmon Kuning 1kg)",
      "satuan": "pcs",
      "hargaJual": 24500
    },
    {
      "id": "kucing_16",
      "kategori": "Kucing",
      "namaProduk": "Chester (800gr)",
      "satuan": "pcs",
      "hargaJual": 19500
    },
    {
      "id": "kucing_17",
      "kategori": "Kucing",
      "namaProduk": "Whiskas Pouch (Kitten)",
      "satuan": "pcs",
      "hargaJual": 6500
    },
    {
      "id": "kucing_18",
      "kategori": "Kucing",
      "namaProduk": "Whiskas Pouch (Adult)",
      "satuan": "pcs",
      "hargaJual": 6500
    },
    {
      "id": "kucing_19",
      "kategori": "Kucing",
      "namaProduk": "Life Cat (Pouch)",
      "satuan": "pcs",
      "hargaJual": 6000
    },
    {
      "id": "kucing_20",
      "kategori": "Kucing",
      "namaProduk": "Life Cat (Kaleng Adult 400gr)",
      "satuan": "pcs",
      "hargaJual": 13500
    },
    {
      "id": "kucing_21",
      "kategori": "Kucing",
      "namaProduk": "Life Cat (Kaleng Kitten 400gr)",
      "satuan": "pcs",
      "hargaJual": 13500
    }
  ],
  "Burung": [
    {
      "id": "burung_1",
      "kategori": "Burung",
      "namaProduk": "Leopard (MD Halus)",
      "satuan": "pcs",
      "hargaJual": 8000
    },
    {
      "id": "burung_2",
      "kategori": "Burung",
      "namaProduk": "Leopard (MD Kasar)",
      "satuan": "pcs",
      "hargaJual": 8000
    },
    {
      "id": "burung_3",
      "kategori": "Burung",
      "namaProduk": "Leopard (Hijau Kasar)",
      "satuan": "pcs",
      "hargaJual": 8000
    },
    {
      "id": "burung_4",
      "kategori": "Burung",
      "namaProduk": "Topsong (Top Song Coklat)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "burung_5",
      "kategori": "Burung",
      "namaProduk": "Topsong (Top Song Hijau)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "burung_6",
      "kategori": "Burung",
      "namaProduk": "SKM (SKM Halus)",
      "satuan": "pcs",
      "hargaJual": 4000
    },
    {
      "id": "burung_7",
      "kategori": "Burung",
      "namaProduk": "SKM (SKM Kasar)",
      "satuan": "pcs",
      "hargaJual": 4000
    },
    {
      "id": "burung_8",
      "kategori": "Burung",
      "namaProduk": "Kroto Sari (KSK)",
      "satuan": "pcs",
      "hargaJual": 3500
    },
    {
      "id": "burung_9",
      "kategori": "Burung",
      "namaProduk": "Kroto Sari (Krotosari Kasar)",
      "satuan": "pcs",
      "hargaJual": 3500
    },
    {
      "id": "burung_10",
      "kategori": "Burung",
      "namaProduk": "Alam Sakti (Love Bird)",
      "satuan": "pcs",
      "hargaJual": 10500
    },
    {
      "id": "burung_11",
      "kategori": "Burung",
      "namaProduk": "Alam Sakti (Kenari)",
      "satuan": "pcs",
      "hargaJual": 11500
    },
    {
      "id": "burung_12",
      "kategori": "Burung",
      "namaProduk": "Madura Koung (Madura Koung)",
      "satuan": "pcs",
      "hargaJual": 9500
    },
    {
      "id": "burung_13",
      "kategori": "Burung",
      "namaProduk": "Kutut Profit (Profit)",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "burung_14",
      "kategori": "Burung",
      "namaProduk": "Derkuku Comet (Comet Derkuku)",
      "satuan": "pcs",
      "hargaJual": 7500
    },
    {
      "id": "burung_15",
      "kategori": "Burung",
      "namaProduk": "Gold Coin (Kutut 250gr)",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "burung_16",
      "kategori": "Burung",
      "namaProduk": "Gold Coin (Hijau Seaweed 450gr)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "burung_17",
      "kategori": "Burung",
      "namaProduk": "Gold Coin (Kenari)",
      "satuan": "pcs",
      "hargaJual": 9500
    },
    {
      "id": "burung_18",
      "kategori": "Burung",
      "namaProduk": "Ebod Canary (Ebod)",
      "satuan": "pcs",
      "hargaJual": 9000
    },
    {
      "id": "burung_19",
      "kategori": "Burung",
      "namaProduk": "Chirpy (Besar)",
      "satuan": "pcs",
      "hargaJual": 10000
    },
    {
      "id": "burung_20",
      "kategori": "Burung",
      "namaProduk": "Chirpy (Kecil)",
      "satuan": "pcs",
      "hargaJual": 7000
    },
    {
      "id": "burung_21",
      "kategori": "Burung",
      "namaProduk": "Fancy (Besar)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "burung_22",
      "kategori": "Burung",
      "namaProduk": "Fancy (Kecil 250gr)",
      "satuan": "pcs",
      "hargaJual": 8000
    },
    {
      "id": "burung_23",
      "kategori": "Burung",
      "namaProduk": "Ketan Hitam",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "burung_24",
      "kategori": "Burung",
      "namaProduk": "Milet Putih (1kg)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "burung_25",
      "kategori": "Burung",
      "namaProduk": "Milet Merah",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "burung_26",
      "kategori": "Burung",
      "namaProduk": "Kenari Seed (1kg)",
      "satuan": "pcs",
      "hargaJual": 15500
    },
    {
      "id": "burung_27",
      "kategori": "Burung",
      "namaProduk": "Trucuk Pisang Ijo SM",
      "satuan": "pcs",
      "hargaJual": 3500
    },
    {
      "id": "burung_28",
      "kategori": "Burung",
      "namaProduk": "521 (521 Coklat)",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "burung_29",
      "kategori": "Burung",
      "namaProduk": "521 (521 Hijau)",
      "satuan": "pcs",
      "hargaJual": 9000
    }
  ],
  "Ayam": [
    {
      "id": "ayam_1",
      "kategori": "Ayam",
      "namaProduk": "511 (Zak)",
      "satuan": "kg",
      "hargaJual": 11500
    },
    {
      "id": "ayam_2",
      "kategori": "Ayam",
      "namaProduk": "511 (511 K)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ayam_3",
      "kategori": "Ayam",
      "namaProduk": "591 (591k)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ayam_4",
      "kategori": "Ayam",
      "namaProduk": "592 (592k)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ayam_5",
      "kategori": "Ayam",
      "namaProduk": "594 (594k)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ayam_6",
      "kategori": "Ayam",
      "namaProduk": "EH510 (1 kg) / BR Super",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "ayam_7",
      "kategori": "Ayam",
      "namaProduk": "BR Multifeed (BR 1kg)",
      "satuan": "pcs",
      "hargaJual": 10500
    },
    {
      "id": "ayam_8",
      "kategori": "Ayam",
      "namaProduk": "Buras (Zak)",
      "satuan": "kg",
      "hargaJual": 7000
    },
    {
      "id": "ayam_9",
      "kategori": "Ayam",
      "namaProduk": "EH 610 (Zak)",
      "satuan": "kg",
      "hargaJual": 9500
    },
    {
      "id": "ayam_10",
      "kategori": "Ayam",
      "namaProduk": "Jagung (Zak Meniran)",
      "satuan": "kg",
      "hargaJual": 10500
    },
    {
      "id": "ayam_11",
      "kategori": "Ayam",
      "namaProduk": "Jagung (Zak Kasar)",
      "satuan": "kg",
      "hargaJual": 10500
    },
    {
      "id": "ayam_12",
      "kategori": "Ayam",
      "namaProduk": "Jagung (Unyil Kristal)",
      "satuan": "pcs",
      "hargaJual": 13500
    },
    {
      "id": "ayam_13",
      "kategori": "Ayam",
      "namaProduk": "524 A (Zak)",
      "satuan": "kg",
      "hargaJual": 9500
    },
    {
      "id": "ayam_14",
      "kategori": "Ayam",
      "namaProduk": "324KJ (Zak)",
      "satuan": "kg",
      "hargaJual": 9500
    },
    {
      "id": "ayam_15",
      "kategori": "Ayam",
      "namaProduk": "CP 124 P",
      "satuan": "pcs",
      "hargaJual": 11000
    }
  ],
  "Ikan": [
    {
      "id": "ikan_1",
      "kategori": "Ikan",
      "namaProduk": "781 (-1)",
      "satuan": "pcs",
      "hargaJual": 16500
    },
    {
      "id": "ikan_2",
      "kategori": "Ikan",
      "namaProduk": "781 (-2)",
      "satuan": "pcs",
      "hargaJual": 16000
    },
    {
      "id": "ikan_3",
      "kategori": "Ikan",
      "namaProduk": "781 (-3)",
      "satuan": "pcs",
      "hargaJual": 15500
    },
    {
      "id": "ikan_4",
      "kategori": "Ikan",
      "namaProduk": "782 (-2)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ikan_5",
      "kategori": "Ikan",
      "namaProduk": "782 (-3)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ikan_6",
      "kategori": "Ikan",
      "namaProduk": "782 (-4)",
      "satuan": "pcs",
      "hargaJual": 14500
    },
    {
      "id": "ikan_7",
      "kategori": "Ikan",
      "namaProduk": "T78 (-2 kg)",
      "satuan": "pcs",
      "hargaJual": 12500
    },
    {
      "id": "ikan_8",
      "kategori": "Ikan",
      "namaProduk": "T78 (-3 kg)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "ikan_9",
      "kategori": "Ikan",
      "namaProduk": "T78 (-4 kg)",
      "satuan": "pcs",
      "hargaJual": 12000
    },
    {
      "id": "ikan_10",
      "kategori": "Ikan",
      "namaProduk": "Hiu (-2)",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "ikan_11",
      "kategori": "Ikan",
      "namaProduk": "Hiu (-3)",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "ikan_12",
      "kategori": "Ikan",
      "namaProduk": "Hiu (-5)",
      "satuan": "pcs",
      "hargaJual": 8500
    },
    {
      "id": "ikan_13",
      "kategori": "Ikan",
      "namaProduk": "Takari (100 gr)",
      "satuan": "pcs",
      "hargaJual": 4500
    }
  ],
  "Obat": []
};

  var categories = ["Kucing", "Burung", "Ayam", "Ikan", "Obat"];
  var satuanOptions = ["Kg", "Bungkus", "Karung", "Botol", "Sachet", "Pcs", "Butir", "Tablet", "Kapsul", "Ekor"];
  var satuanRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(satuanOptions, true)
    .setAllowInvalid(true)
    .build();

  for (var k = 0; k < categories.length; k++) {
    var catName = categories[k];
    var sheet = ss.getSheetByName(catName);
    if (!sheet) {
      sheet = ss.insertSheet(catName);
    } else {
      sheet.clear();
      try { sheet.clearConditionalFormatRules(); } catch (e) {}
      try {
        var bandings = sheet.getBandings();
        for (var b = 0; b < bandings.length; b++) { bandings[b].remove(); }
      } catch (e) {}
    }

    // 5 Kolom Standar Tanpa Modal: NO | NAMA BARANG | SATUAN | HARGA JUAL | KETERANGAN
    var headers = [["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"]];
    sheet.getRange(1, 1, 1, 5).setValues(headers);

    var headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setBackground("#064e3b"); // Deep Emerald Green
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    headerRange.setFontFamily("Arial");
    headerRange.setVerticalAlignment("middle");
    headerRange.setHorizontalAlignment("center");
    try { sheet.setRowHeight(1, 36); } catch (e) {}
    try { sheet.setFrozenRows(1); } catch (e) {}

    // Lebar kolom rapi proporsional
    try {
      sheet.setColumnWidth(1, 55);  // NO
      sheet.setColumnWidth(2, 280); // NAMA BARANG
      sheet.setColumnWidth(3, 110); // SATUAN
      sheet.setColumnWidth(4, 135); // HARGA JUAL
      sheet.setColumnWidth(5, 250); // KETERANGAN
    } catch (e) {}

    var items = rawDataPakan[catName] || [];
    if (items.length > 0) {
      var rows = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        rows.push([i + 1, it.namaProduk, it.satuan, it.hargaJual, ""]);
      }
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);

      // Alignment dan format mata uang
      sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 2, rows.length, 1).setHorizontalAlignment("left");
      sheet.getRange(2, 3, rows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 4, rows.length, 1).setHorizontalAlignment("right");
      sheet.getRange(2, 5, rows.length, 1).setHorizontalAlignment("left");
      sheet.getRange(2, 4, rows.length, 1).setNumberFormat('"Rp"#,##0');
      sheet.getRange(2, 3, rows.length, 1).setDataValidation(satuanRule);

      // Zebra striping halus
      try {
        var banding = sheet.getRange(1, 1, rows.length + 1, 5).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
        banding.setHeaderRowColor("#064e3b");
        banding.setFirstRowColor("#ffffff");
        banding.setSecondRowColor("#f0fdf4");
      } catch (e) {}
    } else {
      // Tab Obat kosong: tetap pasang dropdown satuan & format mata uang untuk baris masa depan
      try {
        sheet.getRange(2, 3, 50, 1).setDataValidation(satuanRule);
        sheet.getRange(2, 4, 50, 1).setNumberFormat('"Rp"#,##0');
      } catch (e) {}
    }
  }

  // Format sheet Penjualan (7 Kolom Mutasi Kas Murni)
  var salesSheet = ss.getSheetByName("Penjualan");
  if (!salesSheet) {
    salesSheet = ss.insertSheet("Penjualan");
  } else {
    salesSheet.clear();
    try { salesSheet.clearConditionalFormatRules(); } catch (e) {}
    try {
      var sBandings = salesSheet.getBandings();
      for (var sb = 0; sb < sBandings.length; sb++) { sBandings[sb].remove(); }
    } catch (e) {}
  }

  var salesHeaders = [["Tanggal", "Jam", "Keterangan / Transaksi", "Masuk (+)", "Keluar (-)", "Saldo Kas Akhir", "Metode"]];
  salesSheet.getRange(1, 1, 1, 7).setValues(salesHeaders);
  var sHeaderRange = salesSheet.getRange(1, 1, 1, 7);
  sHeaderRange.setBackground("#064e3b");
  sHeaderRange.setFontColor("#FFFFFF");
  sHeaderRange.setFontWeight("bold");
  sHeaderRange.setFontSize(11);
  sHeaderRange.setFontFamily("Arial");
  sHeaderRange.setVerticalAlignment("middle");
  sHeaderRange.setHorizontalAlignment("center");
  try { salesSheet.setRowHeight(1, 36); } catch (e) {}
  try { salesSheet.setFrozenRows(1); } catch (e) {}

  try {
    salesSheet.setColumnWidth(1, 110);
    salesSheet.setColumnWidth(2, 90);
    salesSheet.setColumnWidth(3, 260);
    salesSheet.setColumnWidth(4, 120);
    salesSheet.setColumnWidth(5, 120);
    salesSheet.setColumnWidth(6, 140);
    salesSheet.setColumnWidth(7, 130);
  } catch (e) {}

  var now = new Date();
  var tz = Session.getScriptTimeZone() || "GMT+7";
  var tgl = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
  salesSheet.appendRow([tgl, jam, "Saldo Awal Kasir", 0, 0, 0, "Sistem"]);
  salesSheet.getRange(2, 4, 1, 3).setNumberFormat('"Rp"#,##0');

  return "Berhasil membuat spreadsheet data pakan baru (78 produk) dengan tema Emerald Green dan tab Obat kosong!";
}


function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu("✨ Kasir Pet Shop")
      .addItem("🚀 Buat Spreadsheet Data Pakan Baru (78 Produk)", "buatSpreadsheetDataPakanBaru")
      .addItem("🧹 Bersihkan Seluruh Sheet (Kosongkan)", "bersihkanDanFormatSemuaSheet")
      .addItem("💰 Rapikan 7 Kolom Mutasi Kas Saja", "buatKolomSaldoOtomatis")
      .addToUi();
  } catch (err) {}
}

function bersihkanDanFormatSemuaSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var kategoriList = ["Ayam", "Burung", "Kucing", "Ikan", "Obat"];
  
  // 1. Format & Bersihkan ke-5 Kategori Produk (Hanya Header 5 Kolom Tanpa Modal)
  for (var k = 0; k < kategoriList.length; k++) {
    var catName = kategoriList[k];
    var sheet = ss.getSheetByName(catName);
    if (!sheet) {
      sheet = ss.insertSheet(catName);
    } else {
      sheet.clear();
      try { sheet.clearConditionalFormatRules(); } catch (e) {}
      try {
        var bandings = sheet.getBandings();
        for (var b = 0; b < bandings.length; b++) { bandings[b].remove(); }
      } catch (e) {}
    }

    var headers = [["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"]];
    sheet.getRange(1, 1, 1, 5).setValues(headers);

    var headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setBackground("#064e3b"); // Deep Emerald Green
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    headerRange.setFontFamily("Arial");
    headerRange.setVerticalAlignment("middle");
    headerRange.setHorizontalAlignment("center");
    try { sheet.setRowHeight(1, 36); } catch (e) {}
    try { sheet.setFrozenRows(1); } catch (e) {}

    // Lebar Kolom Proporsional & Rapi
    try {
      sheet.setColumnWidth(1, 55);  // NO
      sheet.setColumnWidth(2, 280); // NAMA BARANG
      sheet.setColumnWidth(3, 110); // SATUAN
      sheet.setColumnWidth(4, 135); // HARGA JUAL
      sheet.setColumnWidth(5, 250); // KETERANGAN
    } catch (e) {}

    // Format Alignment Data & Format Angka Mata Uang
    try {
      sheet.getRange(2, 1, 100, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 2, 100, 1).setHorizontalAlignment("left");
      sheet.getRange(2, 3, 100, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 4, 100, 1).setHorizontalAlignment("right");
      sheet.getRange(2, 5, 100, 1).setHorizontalAlignment("left");
      sheet.getRange(2, 4, 100, 1).setNumberFormat('"Rp"#,##0');
    } catch (e) {}

    // Dropdown Data Validation untuk Kolom Satuan (Kg, Bungkus, Karung, Botol, Sachet, Pcs, dll)
    try {
      var satuanOptions = ["Kg", "Bungkus", "Karung", "Botol", "Sachet", "Pcs", "Butir", "Tablet", "Kapsul", "Ekor"];
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(satuanOptions, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(2, 3, 100, 1).setDataValidation(rule);
    } catch (e) {}

    // Alternating Row Colors (Zebra Striping Hijau Emerald Halus)
    try {
      var dataRange = sheet.getRange(1, 1, 100, 5);
      var banding = dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
      banding.setHeaderRowColor("#064e3b");
      banding.setFirstRowColor("#ffffff");
      banding.setSecondRowColor("#f0fdf4");
    } catch (e) {}
  }

  // 2. Format & Bersihkan Sheet Penjualan (Mutasi Kas 7 Kolom)
  var salesSheet = ss.getSheetByName("Penjualan");
  if (!salesSheet) {
    salesSheet = ss.insertSheet("Penjualan");
  } else {
    salesSheet.clear();
    try { salesSheet.clearConditionalFormatRules(); } catch (e) {}
    try {
      var bandings = salesSheet.getBandings();
      for (var b = 0; b < bandings.length; b++) { bandings[b].remove(); }
    } catch (e) {}
  }

  var salesHeaders = [["Tanggal", "Jam", "Keterangan / Transaksi", "Masuk (+)", "Keluar (-)", "Saldo Kas Akhir", "Metode"]];
  salesSheet.getRange(1, 1, 1, 7).setValues(salesHeaders);

  var salesHeaderRange = salesSheet.getRange(1, 1, 1, 7);
  salesHeaderRange.setBackground("#064e3b");
  salesHeaderRange.setFontColor("#FFFFFF");
  salesHeaderRange.setFontWeight("bold");
  salesHeaderRange.setFontSize(11);
  salesHeaderRange.setFontFamily("Arial");
  salesHeaderRange.setVerticalAlignment("middle");
  salesHeaderRange.setHorizontalAlignment("center");
  try { salesSheet.setRowHeight(1, 36); } catch (e) {}
  try { salesSheet.setFrozenRows(1); } catch (e) {}

  // Lebar Kolom Sheet Penjualan
  try {
    salesSheet.setColumnWidth(1, 110);
    salesSheet.setColumnWidth(2, 85);
    salesSheet.setColumnWidth(3, 260);
    salesSheet.setColumnWidth(4, 125);
    salesSheet.setColumnWidth(5, 125);
    salesSheet.setColumnWidth(6, 140);
    salesSheet.setColumnWidth(7, 100);
  } catch (e) {}

  // Baris Pembuka: Saldo Kas Awal Rp 0 (Reset)
  var now = new Date();
  var tz = Session.getScriptTimeZone() || "GMT+7";
  var openingRow = [
    Utilities.formatDate(now, tz, "yyyy-MM-dd"),
    Utilities.formatDate(now, tz, "HH:mm:ss"),
    "Saldo Kas Awal Toko (Reset Bersih)",
    0,
    0,
    0,
    "Sistem"
  ];
  salesSheet.getRange(2, 1, 1, 7).setValues([openingRow]);

  try {
    salesSheet.getRange(2, 1, 100, 1).setHorizontalAlignment("center");
    salesSheet.getRange(2, 2, 100, 1).setHorizontalAlignment("center");
    salesSheet.getRange(2, 3, 100, 1).setHorizontalAlignment("left");
    salesSheet.getRange(2, 4, 100, 3).setHorizontalAlignment("right");
    salesSheet.getRange(2, 7, 100, 1).setHorizontalAlignment("center");
    salesSheet.getRange(2, 4, 100, 3).setNumberFormat('"Rp"#,##0');
  } catch (e) {}

  // Zebra Striping Sheet Penjualan
  try {
    var salesRange = salesSheet.getRange(1, 1, 100, 7);
    var salesBanding = salesRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    salesBanding.setHeaderRowColor("#064e3b");
    salesBanding.setFirstRowColor("#ffffff");
    salesBanding.setSecondRowColor("#f0fdf4");
  } catch (e) {}

  // Hapus sheet default "Sheet1" jika masih ada dan kosong
  try {
    var sheet1 = ss.getSheetByName("Sheet1");
    if (sheet1 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet1);
    }
  } catch (e) {}

  return "Berhasil mereset seluruh sheet dan memformat estetik tema Emerald Green!";
}

function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#064e3b");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  try { sheet.setRowHeight(1, 36); } catch (e) {}
}

function getLastCashBalance(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  
  var balanceCol = 6;

  var val = sh.getRange(lastRow, balanceCol).getValue();
  var parsed = parseNumber(val);
  if (!isNaN(parsed) && parsed !== 0) {
    return parsed;
  }

  for (var r = lastRow; r >= 2; r--) {
    var rowVal = parseNumber(sh.getRange(r, balanceCol).getValue());
    if (!isNaN(rowVal) && rowVal > 0) {
      return rowVal;
    }
  }

  return 0;
}

function getRecentSalesJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ensureSalesSheetWithHeaders(ss);

    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return jsonResponse({
        success: true,
        currentBalance: 0,
        todayTotal: 0,
        todayCount: 0,
        recentTransactions: []
      });
    }

    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");

    var todayTotal = 0;
    var todayCount = 0;
    var recent = [];
    var currentBalance = 0;

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var rawT = row[0];
      var tgl = (rawT instanceof Date) ? Utilities.formatDate(rawT, tz, "yyyy-MM-dd") : String(rawT || "").trim();
      var rawJ = row[1];
      var jam = (rawJ instanceof Date) ? Utilities.formatDate(rawJ, tz, "HH:mm:ss") : String(rawJ || "").trim();
      
      var ket = String(row[2] || "-");
      var masuk = parseNumber(row[3]);
      var keluar = parseNumber(row[4]);
      var rowBal = parseNumber(row[5]);
      var metode = String(row[6] || "Kas");

      if (rowBal > 0) {
        currentBalance = rowBal;
      } else if (masuk > 0) {
        currentBalance += masuk;
      } else if (keluar > 0) {
        currentBalance = Math.max(0, currentBalance - keluar);
      }

      var isMutationNote = ket.toLowerCase().includes("saldo") || ket.toLowerCase().includes("modal") || ket.toLowerCase().includes("tarik");
      var isSale = (masuk > 0) && !isMutationNote;

      if (tgl === todayStr && isSale) {
        todayTotal += masuk;
        todayCount++;
      }

      var noStruk = "PS-" + (tgl ? tgl.replace(/-/g, "") : "TRX") + "-" + (r < 10 ? "00" + r : (r < 100 ? "0" + r : r));
      var nominalTrx = masuk > 0 ? masuk : keluar;

      recent.push({
        noStruk: noStruk,
        tanggal: tgl,
        jam: jam,
        namaPembeli: isMutationNote ? "Internal Toko" : "-",
        metodeBayar: metode,
        bayar: nominalTrx,
        kembalian: 0,
        total: nominalTrx,
        tipeMutasi: masuk > 0 ? "masuk" : "keluar",
        saldoAkhir: currentBalance,
        items: [{
          kategori: isMutationNote ? "Mutasi Kas" : "Penjualan",
          namaProduk: ket,
          satuan: "trx",
          jumlah: 1,
          hargaJual: nominalTrx,
          subtotal: nominalTrx
        }]
      });
    }

    var limitedRecent = recent.slice(-30).reverse();

    return jsonResponse({
      success: true,
      currentBalance: currentBalance,
      todayTotal: todayTotal,
      todayCount: todayCount,
      recentTransactions: limitedRecent
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal membaca riwayat: " + err.toString()
    });
  }
}

function getProductsJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var allProducts = [];

    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var rawName = sheet.getName().trim();
      var lowerName = rawName.toLowerCase();
      if (lowerName === "penjualan" || lowerName === "rekap" || lowerName === "summary" || lowerName === "laporan") continue;

      var catName = rawName;
      if (lowerName.indexOf("obat") >= 0) catName = "Obat";
      else if (lowerName.indexOf("burung") >= 0) catName = "Burung";
      else if (lowerName.indexOf("ayam") >= 0) catName = "Ayam";
      else if (lowerName.indexOf("kucing") >= 0) catName = "Kucing";
      else if (lowerName.indexOf("ikan") >= 0) catName = "Ikan";

      var data = sheet.getDataRange().getValues();
      if (!data || data.length < 2) continue;

      var headerRow = data[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        colMap[String(headerRow[c]).trim().toLowerCase()] = c;
      }

      var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk", "barang", "nama"]);
      var idxSatuan = findColumnIndex(colMap, ["satuan", "unit"]);
      var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga jual (per satuan)", "harga"]);

      if (idxNama < 0) continue;

      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var namaProduk = (idxNama >= 0 && row[idxNama]) ? String(row[idxNama]).trim() : "";
        if (!namaProduk) continue;

        var satuan = (idxSatuan >= 0 && row[idxSatuan]) ? String(row[idxSatuan]).trim() : "pcs";
        var rawHargaJual = (idxHargaJual >= 0) ? parseNumber(row[idxHargaJual]) : 0;

        var finalSatuan = satuan;
        var finalHargaJual = rawHargaJual;
        var note = "";

        if (catName.toLowerCase() === "ayam" && (satuan.toLowerCase() === "zak" || satuan.toLowerCase() === "karung")) {
          finalSatuan = "kg";
          note = "Dijual per kg (dari karung)";
        }

        allProducts.push({
          id: catName + "_" + r,
          kategori: catName,
          namaProduk: namaProduk,
          satuan: finalSatuan,
          satuanAsli: satuan,
          hargaJual: finalHargaJual,
          hargaBeli: 0,
          hargaBelumDiisi: (finalHargaJual <= 0),
          catatan: note
        });
      }
    }

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

function findColumnIndex(colMap, candidateNames) {
  for (var i = 0; i < candidateNames.length; i++) {
    var name = candidateNames[i].toLowerCase();
    if (colMap.hasOwnProperty(name)) return colMap[name];
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

function updateProductPriceInSheets(ss, data) {
  var targetCat = String(data.kategori || data.category || "").trim();
  var targetName = String(data.namaProduk || data.nama || "").trim();
  var newPrice = Number(data.hargaJual || data.harga || data.newPrice) || 0;
  var productId = String(data.id || data.productId || "").trim();

  if (!targetName && !productId) {
    return { success: false, message: "Nama produk atau ID produk harus diisi" };
  }

  var categories = ["Ayam", "Burung", "Kucing", "Ikan", "Obat", "Lainnya"];
  if (targetCat) {
    var formattedCat = targetCat.charAt(0).toUpperCase() + targetCat.slice(1).toLowerCase();
    categories = [formattedCat].concat(categories.filter(function(c) { return c.toLowerCase() !== formattedCat.toLowerCase(); }));
  }

  var found = false;
  var matchedCat = "";
  var matchedRow = -1;

  for (var i = 0; i < categories.length; i++) {
    var catName = categories[i];
    var sheet = ss.getSheetByName(catName);
    if (!sheet) continue;

    var values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) continue;

    var headerRow = values[0];
    var colMap = {};
    for (var c = 0; c < headerRow.length; c++) {
      colMap[String(headerRow[c]).trim().toLowerCase()] = c;
    }

    var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk", "barang"]);
    var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga jual (per satuan)", "harga"]);

    if (idxNama < 0 || idxHargaJual < 0) continue;

    for (var r = 1; r < values.length; r++) {
      var rowName = String(values[r][idxNama] || "").trim();
      var cleanTarget = sanitizeNameForMatch(targetName);
      var cleanRow = sanitizeNameForMatch(rowName);

      var isMatch = (cleanRow && cleanTarget && cleanRow === cleanTarget) ||
                    (productId && productId.toLowerCase() === (catName + "_" + r).toLowerCase());

      if (isMatch) {
        sheet.getRange(r + 1, idxHargaJual + 1).setValue(newPrice);
        sheet.getRange(r + 1, idxHargaJual + 1).setNumberFormat('"Rp"#,##0');
        found = true;
        matchedCat = catName;
        matchedRow = r + 1;
        break;
      }
    }

    if (found) break;
  }

  if (found) {
    return {
      success: true,
      message: "Harga produk '" + targetName + "' berhasil diperbarui menjadi Rp " + newPrice + " di tab " + matchedCat + " (baris " + matchedRow + ")",
      kategori: matchedCat,
      namaProduk: targetName,
      hargaJual: newPrice
    };
  } else {
    var addRes = addProductToSheets(ss, {
      kategori: targetCat || "Lainnya",
      namaProduk: targetName,
      satuan: data.satuan || "pcs",
      hargaJual: newPrice
    });
    return {
      success: true,
      message: "Produk belum terdaftar di spreadsheet, otomatis ditambahkan: " + addRes.message,
      kategori: targetCat || "Lainnya",
      namaProduk: targetName,
      hargaJual: newPrice
    };
  }
}

function addProductToSheets(ss, data) {
  var cat = String(data.kategori || data.category || "Lainnya").trim();
  cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  var name = String(data.namaProduk || data.nama || "").trim();
  var unit = String(data.satuan || data.unit || "pcs").trim();
  var price = Number(data.hargaJual || data.harga || data.price) || 0;

  if (!name) {
    return { success: false, message: "Nama produk tidak boleh kosong" };
  }

  var sheet = ss.getSheetByName(cat);
  if (!sheet) {
    sheet = ss.insertSheet(cat);
    sheet.appendRow(["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"]);
    formatHeaderRow(sheet, 5);
    sheet.setFrozenRows(1);
  }

  var values = sheet.getDataRange().getValues();
  var colMap = {};
  if (values.length > 0) {
    var headerRow = values[0];
    for (var c = 0; c < headerRow.length; c++) {
      colMap[String(headerRow[c]).trim().toLowerCase()] = c;
    }
  }

  var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk", "barang"]);
  var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga jual (per satuan)", "harga"]);

  if (idxNama >= 0 && values.length > 1) {
    for (var r = 1; r < values.length; r++) {
      var rowName = String(values[r][idxNama] || "").trim();
      if (sanitizeNameForMatch(rowName) === sanitizeNameForMatch(name)) {
        if (idxHargaJual >= 0 && price > 0) {
          sheet.getRange(r + 1, idxHargaJual + 1).setValue(price);
          sheet.getRange(r + 1, idxHargaJual + 1).setNumberFormat('"Rp"#,##0');
        }
        return {
          success: true,
          message: "Produk sudah ada di tab " + cat + ", harga jual diperbarui menjadi Rp " + price,
          kategori: cat,
          namaProduk: name,
          hargaJual: price
        };
      }
    }
  }

  var nextNo = Math.max(1, sheet.getLastRow());
  var rowData = [nextNo, name, unit, price, "Ditambahkan dari Kasir"];
  sheet.appendRow(rowData);

  var newRowIdx = sheet.getLastRow();
  try {
    sheet.getRange(newRowIdx, 4).setNumberFormat('"Rp"#,##0');
    sheet.autoResizeColumns(1, 5);
  } catch (err) {}

  return {
    success: true,
    message: "Produk '" + name + "' berhasil ditambahkan ke tab " + cat + " (baris " + newRowIdx + ")",
    kategori: cat,
    namaProduk: name,
    satuan: unit,
    hargaJual: price
  };
}

function deleteProductFromSheets(ss, data) {
  var targetName = String(data.namaProduk || data.nama || "").trim();
  var targetCat = String(data.kategori || data.category || "").trim();
  var productId = String(data.id || data.productId || "").trim();

  if (!targetName && !productId) {
    return { success: false, message: "Nama produk atau ID harus diisi untuk menghapus" };
  }

  var sheetsToSearch = [];
  if (targetCat) {
    var s = ss.getSheetByName(targetCat);
    if (s) sheetsToSearch.push(s);
  }
  if (sheetsToSearch.length === 0) {
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      var sh = allSheets[i];
      var n = sh.getName();
      if (n !== "Penjualan" && n !== "Rekap" && n !== "Summary") {
        sheetsToSearch.push(sh);
      }
    }
  }

  var deleted = false;
  var deletedFrom = "";
  var deletedRow = -1;

  for (var sIdx = 0; sIdx < sheetsToSearch.length; sIdx++) {
    var sheet = sheetsToSearch[sIdx];
    var catName = sheet.getName();
    var values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) continue;

    var headerRow = values[0];
    var colMap = {};
    for (var c = 0; c < headerRow.length; c++) {
      colMap[String(headerRow[c]).trim().toLowerCase()] = c;
    }

    var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk", "barang"]);
    if (idxNama < 0) continue;

    for (var r = values.length - 1; r >= 1; r--) {
      var rowName = String(values[r][idxNama] || "").trim();
      var cleanTarget = sanitizeNameForMatch(targetName);
      var cleanRow = sanitizeNameForMatch(rowName);

      var isMatch = (cleanRow && cleanTarget && cleanRow === cleanTarget) ||
                    (productId && productId.toLowerCase() === (catName + "_" + r).toLowerCase());

      if (isMatch) {
        sheet.deleteRow(r + 1);
        deleted = true;
        deletedFrom = catName;
        deletedRow = r + 1;
        break;
      }
    }

    if (deleted) break;
  }

  if (deleted) {
    return {
      success: true,
      message: "Produk '" + targetName + "' berhasil dihapus dari tab " + deletedFrom + " (baris " + deletedRow + ")",
      kategori: deletedFrom,
      namaProduk: targetName
    };
  } else {
    return {
      success: true,
      message: "Produk '" + targetName + "' dihapus dari katalog",
      namaProduk: targetName
    };
  }
}

function sanitizeNameForMatch(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

""".trimIndent()
}

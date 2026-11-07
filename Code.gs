/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (Code.gs) - KASIR PET SHOP & MUTASI SALDO KAS
 * =========================================================================
 * 
 * STRUKTUR RESMI TAB "Penjualan" (HANYA 7 KOLOM - TIDAK ADA HARGA BELI/LABA):
 * [A: Tanggal] | [B: Jam] | [C: Keterangan / Transaksi] | [D: Masuk (+)] | [E: Keluar (-)] | [F: Saldo Kas Akhir] | [G: Metode]
 * 
 * =========================================================================
 * KENAPA DI SPREADSHEET TAMPIL KOLOM ORANYE & BARISNYA GESER?
 * =========================================================================
 * 1. Di baris 1 & 2: Anda sudah berhasil menjalankan 'buatKolomSaldoOtomatis'.
 * 2. Di baris 3: Kolomnya berantakan dan muncul kolom oranye (Jumlah, Harga Beli, Laba, dll)
 *    karena Anda BELUM melakukan "Deploy Versi Baru" pada Web App!
 *    Akibatnya, saat aplikasi kasir mengirim transaksi penjualan, server Google
 *    masih mengeksekusi program versi lama yang mencetak 15 kolom ke kanan!
 * 
 * CARA MEMBERSIHKAN & MENGATASI (HANYA 2 LANGKAH):
 * -------------------------------------------------------------------------
 * LANGKAH 1: BERSIHKAN KOLOM LAMA & BARIS YANG GESER
 * - Salin semua kode ini dan tempel ke Code.gs Anda.
 * - Klik Simpan (Ctrl + S).
 * - Di toolbar atas, pilih fungsi "buatKolomSaldoOtomatis", lalu klik "▶ Jalankan".
 *   -> Otomatis SEMUA kolom oranye H-O dan baris 3 yang salah format langsung DIHAPUS.
 *   -> Spreadsheet Anda langsung bersih 100% hanya 7 kolom A s/d G!
 * 
 * LANGKAH 2: DEPLOY VERSI BARU (WAJIB AGAR PENJUALAN TIDAK GESER LAGI)
 * - Klik tombol biru "Deploy" di kanan atas > "Kelola deployment" (Manage deployments).
 * - Klik ikon PENSIL (Edit).
 * - Pada baris "Versi" (Version), klik dropdown dan pilih "Versi baru" (New version).
 * - Klik tombol "Deploy".
 * - Selesai! Sekarang tiap transaksi kasir akan masuk tepat di kolom Masuk (+) dan Saldo Kas Akhir!
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
  } else if (action === "recent" || action === "balance" || action === "get_balance") {
    return getRecentSalesJson();
  } else if (action === "setup" || action === "init" || action === "buat_saldo") {
    var resultMsg = buatKolomSaldoOtomatis();
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

    // -------------------------------------------------------------
    // 0. AKSI UPDATE HARGA PRODUK DI TAB KATEGORI SPREADSHEET
    // -------------------------------------------------------------
    if (requestData.action === "update_product_price" || requestData.action === "update_price") {
      var updateRes = updateProductPriceInSheets(ss, requestData);
      return jsonResponse(updateRes);
    }

    // -------------------------------------------------------------
    // 0B. AKSI TAMBAH PRODUK BARU KE TAB KATEGORI SPREADSHEET
    // -------------------------------------------------------------
    if (requestData.action === "add_product" || requestData.action === "tambah_produk") {
      var addRes = addProductToSheets(ss, requestData);
      return jsonResponse(addRes);
    }

    var salesSheet = ensureSalesSheetWithHeaders(ss);

    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");

    var currentBalance = getLastCashBalance(salesSheet);

    // -------------------------------------------------------------
    // 1. AKSI ATUR SALDO KAS (TAMBAH / TARIK / KOREKSI)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 2. AKSI PENJUALAN KASIR (MUTASI PENJUALAN MURNI 7 KOLOM)
    // -------------------------------------------------------------
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

    // Catat mutasi tepat ke 7 kolom murni (Tanggal, Jam, Keterangan, Masuk, Keluar, Saldo Kas Akhir, Metode)
    salesSheet.appendRow([
      tanggal,
      jam,
      productSummary,
      totalPrice, // Masuk (+)
      0,          // Keluar (-)
      newBalance, // Saldo Kas Akhir
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

/**
 * FUNGSI PEMBERSIH & PERAPI OTOMATIS:
 * - Menghapus kolom sisa H sampai O (kolom oranye lama).
 * - Menghapus baris yang berantakan / salah format.
 * - Memastikan hanya ada 7 kolom bersih (A s/d G) dengan format Saldo Kas Akhir.
 */
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

  // 1. HAPUS SEMUA KOLOM SISA FORMAT LAMA DARI KOLOM 8 KE ATAS (H, I, J, K, L, M, N, O)
  var totalCols = sheet.getMaxColumns();
  if (totalCols > 7) {
    sheet.deleteColumns(8, totalCols - 7);
  }

  // 2. Tulis 7 header mutasi kas murni
  sheet.getRange(1, 1, 1, 7).setValues([headers]);
  formatHeaderRow(sheet, 7);
  sheet.setFrozenRows(1);

  // 3. Bersihkan baris yang berantakan / geser (misal baris yang di kolom C berisi no struk PS-)
  var lastRow = sheet.getLastRow();
  for (var r = lastRow; r >= 2; r--) {
    var valC = String(sheet.getRange(r, 3).getValue() || "").trim();
    var valD = String(sheet.getRange(r, 4).getValue() || "").trim();
    // Jika baris berisi data lama yang geser (C berupa nomor struk atau D berupa '-')
    if (valC.indexOf("PS-") === 0 || valD === "-") {
      sheet.deleteRow(r);
    }
  }

  // 4. Jika sheet kosong selain header, tambahkan baris saldo awal
  if (sheet.getLastRow() <= 1) {
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tgl = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
    sheet.appendRow([tgl, jam, "Saldo Awal Kasir", 0, 0, 0, "Sistem"]);
  }

  // 5. Format Mata Uang pada kolom Masuk (+), Keluar (-), Saldo Kas Akhir
  var maxR = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, 4, maxR - 1, 3).setNumberFormat('"Rp"#,##0');
  sheet.autoResizeColumns(1, 7);

  return "Berhasil membersihkan kolom lama H-O dan merapikan 7 kolom mutasi kas murni!";
}

/**
 * Memastikan sheet Penjualan memiliki 7 kolom mutasi kas dan tidak ada kolom lama yang tertinggal
 */
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

  // Jika masih ada sisa kolom lama lebih dari 7, hapus
  var totalCols = sheet.getMaxColumns();
  if (totalCols > 7) {
    sheet.deleteColumns(8, totalCols - 7);
  }

  // Cek apakah header kolom Saldo sudah ada di row 1
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

function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1D4ED8");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");
}

function getLastCashBalance(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  
  var balanceCol = 6; // Kolom F: Saldo Kas Akhir

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
    var categories = ["Ayam", "Burung", "Kucing", "Ikan", "Lainnya"];
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

      var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk"]);
      var idxSatuan = findColumnIndex(colMap, ["satuan", "unit"]);
      var idxHargaBeli = findColumnIndex(colMap, ["harga beli (per satuan)", "harga beli per satuan", "harga beli"]);
      var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga jual (per satuan)", "harga"]);
      var idxHargaBeliPerKg = findColumnIndex(colMap, ["harga beli per kg", "harga beli/kg"]);

      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var namaProduk = (idxNama >= 0 && row[idxNama]) ? String(row[idxNama]).trim() : "";
        if (!namaProduk) break;

        var satuan = (idxSatuan >= 0 && row[idxSatuan]) ? String(row[idxSatuan]).trim() : "pcs";
        var rawHargaJual = (idxHargaJual >= 0) ? parseNumber(row[idxHargaJual]) : 0;
        var rawHargaBeli = (idxHargaBeli >= 0) ? parseNumber(row[idxHargaBeli]) : 0;

        var finalSatuan = satuan;
        var finalHargaJual = rawHargaJual;
        var finalHargaBeli = rawHargaBeli;
        var note = "";

        if (catName.toLowerCase() === "ayam" && (satuan.toLowerCase() === "zak" || satuan.toLowerCase() === "karung")) {
          finalSatuan = "kg";
          if (idxHargaBeliPerKg >= 0 && row[idxHargaBeliPerKg]) {
            finalHargaBeli = parseNumber(row[idxHargaBeliPerKg]);
          }
          note = "Dijual per kg (dari karung)";
        }

        allProducts.push({
          id: catName + "_" + r,
          kategori: catName,
          namaProduk: namaProduk,
          satuan: finalSatuan,
          satuanAsli: satuan,
          hargaJual: finalHargaJual,
          hargaBeli: finalHargaBeli,
          hargaBelumDiisi: (finalHargaJual <= 0),
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

/**
 * Memperbarui Harga Jual Produk di tab Sheet Kategori Google Spreadsheet
 */
function updateProductPriceInSheets(ss, data) {
  var targetCat = String(data.kategori || data.category || "").trim();
  var targetName = String(data.namaProduk || data.nama || "").trim();
  var newPrice = Number(data.hargaJual || data.harga || data.newPrice) || 0;
  var productId = String(data.id || data.productId || "").trim();

  if (!targetName && !productId) {
    return { success: false, message: "Nama produk atau ID produk harus diisi" };
  }

  var categories = ["Ayam", "Burung", "Kucing", "Ikan", "Lainnya"];
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
      hargaJual: newPrice,
      hargaBeli: data.hargaBeli || 0
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

/**
 * Menambahkan Produk Baru ke tab Sheet Kategori Google Spreadsheet
 */
function addProductToSheets(ss, data) {
  var cat = String(data.kategori || data.category || "Lainnya").trim();
  cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  var name = String(data.namaProduk || data.nama || "").trim();
  var unit = String(data.satuan || data.unit || "pcs").trim();
  var price = Number(data.hargaJual || data.harga || data.price) || 0;
  var cost = Number(data.hargaBeli || data.costPrice) || 0;

  if (!name) {
    return { success: false, message: "Nama produk tidak boleh kosong" };
  }

  var sheet = ss.getSheetByName(cat);
  if (!sheet) {
    sheet = ss.insertSheet(cat);
    sheet.appendRow(["NO", "NAMA BARANG", "SATUAN", "HARGA BELI", "HARGA JUAL", "HARGA BELI / KG", "KETERANGAN"]);
    formatHeaderRow(sheet, 7);
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

  // Jika produk sudah ada, cukup update harganya
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
  var rowData = [nextNo, name, unit, cost, price, 0, "Ditambahkan dari Kasir"];
  sheet.appendRow(rowData);

  var newRowIdx = sheet.getLastRow();
  sheet.getRange(newRowIdx, 4).setNumberFormat('"Rp"#,##0');
  sheet.getRange(newRowIdx, 5).setNumberFormat('"Rp"#,##0');
  sheet.autoResizeColumns(1, 7);

  return {
    success: true,
    message: "Produk '" + name + "' berhasil ditambahkan ke tab " + cat + " (baris " + newRowIdx + ")",
    kategori: cat,
    namaProduk: name,
    satuan: unit,
    hargaJual: price
  };
}

function sanitizeNameForMatch(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


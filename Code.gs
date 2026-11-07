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
  } else if (action === "recent" || action === "balance" || action === "get_balance") {
    return getRecentSalesJson();
  } else if (action === "setup" || action === "init" || action === "buat_saldo") {
    var resultMsg = buatKolomSaldoOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "setup_katalog" || action === "buat_katalog") {
    var katMsg = buatKatalogKategoriOtomatis();
    return jsonResponse({ success: true, message: katMsg });
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
 * =========================================================================
 * FUNGSI PEMBUAT OTOMATIS SHEET KATALOG BARANG (PER KATEGORI)
 * =========================================================================
 * Jalankan fungsi ini langsung dari menu Apps Script jika tab kategori belum ada,
 * atau panggil via Web App URL: ?action=setup_katalog
 * 
 * Otomatis membuat 4 Tab Kategori:
 * 1. "Ayam" (Pakan karung dijual per kg, lainnya pcs)
 * 2. "Burung" (Pakan burung, milet, vitamin)
 * 3. "Kucing" (Cat food, pouch, kaleng)
 * 4. "Ikan" (Pakan ikan hias/lele)
 * Lengkap dengan styling header warna profesional dan auto-column width!
 */
function buatKatalogKategoriOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var catalogData = {
    "Ayam": [
      ["511 (1 Karung)", "karung", 9800, 11500, 9800, "Dijual per kg (dari karung)"],
      ["511 (511 K)", "kg", 13600, 14500, "", ""],
      ["591 (591k)", "kg", 13700, 14500, "", ""],
      ["592 (592k)", "kg", 13700, 14500, "", ""],
      ["594 (594k)", "kg", 13500, 14500, "", ""],
      ["BR-1 Super", "kg", 11100, 12000, "", ""],
      ["BR-611", "kg", 9200, 10000, "", ""],
      ["Buras (1 Karung)", "karung", 5900, 7000, 5900, "Dijual per kg (dari karung)"],
      ["EH 610 (1 Karung)", "karung", 8700, 9500, 8700, "Dijual per kg (dari karung)"],
      ["Jagung (1 Karung Meniran)", "karung", 9400, 10500, 9400, "Dijual per kg (dari karung)"],
      ["Jagung (1 Karung Kasar)", "karung", 9400, 10500, 9400, "Dijual per kg (dari karung)"],
      ["Jagung (Unyil Kristal)", "pcs", 12200, 13000, "", ""],
      ["524 A (Karung)", "karung", 8320, 9000, 8320, "Dijual per kg (dari karung)"],
      ["324KJ (Karung)", "karung", 8430, 9500, 8430, "Dijual per kg (dari karung)"],
      ["CP 124 P", "kg", 10100, 11000, "", ""]
    ],
    "Burung": [
      ["Leopard (MD Halus)", "pcs", 6900, 8000, "", ""],
      ["Leopard (MD Kasar)", "pcs", 6900, 8000, "", ""],
      ["Leopard (Hijau Kasar)", "pcs", 7100, 8500, "", ""],
      ["Topsong (Top Song Coklat)", "pcs", 10900, 12000, "", ""],
      ["Topsong (Top Song Hijau)", "pcs", 11000, 12000, "", ""],
      ["SKM (SKM Halus)", "pcs", 3200, 4500, "", ""],
      ["SKM (SKM Kasar)", "pcs", 3200, 4500, "", ""],
      ["Kroto Sari (KSK)", "pcs", 2600, 3500, "", ""],
      ["Kroto Sari (Krotosari Kasar)", "pcs", 2700, 3500, "", ""],
      ["Alam Sakti (Love Bird)", "pcs", 9500, 11500, "", ""],
      ["Alam Sakti (Kenari)", "pcs", 10400, 12500, "", ""],
      ["Alam Sakti (Perkutut)", "pcs", 8700, 10500, "", ""],
      ["Milet Putih Super", "kg", 14000, 16000, "", ""],
      ["Milet Merah", "kg", 15000, 17500, "", ""],
      ["Bio Bird Vitamin Kicau", "pcs", 21000, 25000, "", ""]
    ],
    "Kucing": [
      ["Bolt (Tuna)", "pcs", 22000, 25000, "", ""],
      ["Bolt (Salmon)", "pcs", 22500, 25500, "", ""],
      ["Chester (Tuna)", "pcs", 18500, 21000, "", ""],
      ["Cleo (Ocean Fish)", "pcs", 34000, 38000, "", ""],
      ["Ori Cat (Kitten)", "pcs", 20000, 23000, "", ""],
      ["Ori Cat (Adult)", "pcs", 19500, 22500, "", ""],
      ["Me-O (Creamy Treats)", "pcs", 19000, 22000, "", ""],
      ["Whiskas (Pouch Tuna)", "pcs", 6500, 8000, "", ""],
      ["Life Cat (1 Dus Pouch 24pcs)", "pcs", 95000, 110000, "", ""],
      ["Life Cat (Kaleng Adult 400gr)", "pcs", 11500, 13500, "", ""],
      ["Life Cat (Kaleng Kitten 400gr)", "pcs", 11500, 13500, "", ""]
    ],
    "Ikan": [
      ["Takari (Mix Red & Green)", "pcs", 8500, 10500, "", ""],
      ["Saki-Hikari (Fancy Goldfish)", "pcs", 38000, 45000, "", ""],
      ["Pelet PF 1000 Pakan Benih", "kg", 18000, 22000, "", ""],
      ["Pelet 781-1 Pakan Ikan", "kg", 14500, 17000, "", ""],
      ["Obat Biru (Methylene Blue)", "pcs", 5000, 7000, "", ""]
    ]
  };

  var headerNames = ["NO", "NAMA BARANG", "SATUAN", "HARGA BELI", "HARGA JUAL", "HARGA BELI / KG", "KETERANGAN"];
  var sheetColors = {
    "Ayam": "#FFF3E0",   // Oranye lembut
    "Burung": "#E8F5E9", // Hijau lembut
    "Kucing": "#F3E5F5", // Ungu lembut
    "Ikan": "#E1F5FE"    // Biru lembut
  };
  var headerColors = {
    "Ayam": "#E65100",
    "Burung": "#2E7D32",
    "Kucing": "#6A1B9A",
    "Ikan": "#0277BD"
  };

  var createdCount = 0;
  for (var cat in catalogData) {
    var sheet = ss.getSheetByName(cat);
    if (!sheet) {
      sheet = ss.insertSheet(cat);
      createdCount++;
    }

    // Set Header
    var headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setValues([headerNames]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground(headerColors[cat] || "#1565C0");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 34);

    // Isi Baris Produk
    var rows = catalogData[cat];
    var outputRows = [];
    for (var i = 0; i < rows.length; i++) {
      var item = rows[i];
      outputRows.push([
        (i + 1),         // NO
        item[0],         // NAMA BARANG
        item[1],         // SATUAN (karung / pcs / kg)
        item[2],         // HARGA BELI
        item[3],         // HARGA JUAL
        item[4] || "",   // HARGA BELI / KG
        item[5] || ""    // KETERANGAN
      ]);
    }

    if (outputRows.length > 0) {
      var dataRange = sheet.getRange(2, 1, outputRows.length, 7);
      dataRange.setValues(outputRows);
      
      // Format Angka Rupiah untuk kolom D, E, F
      sheet.getRange(2, 4, outputRows.length, 3).setNumberFormat("#,##0");
      sheet.getRange(2, 1, outputRows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 3, outputRows.length, 1).setHorizontalAlignment("center");
    }

    // Auto-fit kolom
    for (var c = 1; c <= 7; c++) {
      sheet.autoResizeColumn(c);
    }
  }

  return "Berhasil membuat/memperbarui tab kategori: Ayam, Burung, Kucing, Ikan!";
}

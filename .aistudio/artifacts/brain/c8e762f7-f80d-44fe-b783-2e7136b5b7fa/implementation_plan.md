# Rencana Implementasi: Pembuatan Spreadsheet Barang (Per Kategori)

Pengguna meminta dibuatkan spreadsheet untuk barang katalog toko (Pet Shop) dengan susunan **terpisah per tab/sheet kategori** (Ayam, Burung, Kucing, Ikan, Lainnya).

---

## 1. Desain Struktur Spreadsheet

Setiap tab sheet kategori akan memiliki header kolom standar 7 kolom yang langsung kompatibel dengan sistem kasir (Android & Web POS):

| Kolom | Nama Kolom | Keterangan & Contoh |
| :--- | :--- | :--- |
| **A** | `NO` | Nomor urut (1, 2, 3, ...) |
| **B** | `NAMA BARANG` | Contoh: `511 (1 Karung)`, `Topsong Coklat`, `Leopard Halus` |
| **C** | `SATUAN` | `karung` (pakan curah) atau `pcs` (kemasan/obat/aksesoris) |
| **D** | `HARGA BELI` | Modal beli produk dari supplier (Rp) |
| **E** | `HARGA JUAL` | Harga jual kasir (Rp) |
| **F** | `HARGA BELI / KG` | Khusus pakan karung (Rp) |
| **G** | `KETERANGAN` | Catatan tambahan |

### Tab Sheet yang Disediakan:
1. **Sheet `Ayam`**: Pakan karungan ayam (511 1 Karung, Buras 1 Karung, CP 124 P, dll.), vitamin, konsentrat.
2. **Sheet `Burung`**: Topsong, Leopard, Kroto Sari, Alam Sakti, Milet, dll.
3. **Sheet `Kucing`**: Cat food, vitamin, pasir, aksesoris.
4. **Sheet `Ikan`**: Pelet ikan, obat air, pakan apung.
5. **Sheet `Lainnya`**: Perlengkapan umum, sangkar, tempat makan.
6. **Sheet `Mutasi_Kas` & `Penjualan`**: Tab bawaan untuk pencatatan transaksi kasir.

---

## 2. Cara Penyediaan untuk Pengguna

Kami akan menyediakan 2 solusi praktis sekaligus:
1. **Script Pembuat Otomatis di Google Spreadsheet (`Code.gs`)**:
   - Menambahkan fungsi `buatTemplateSpreadsheet()` di Google Apps Script.
   - Pengguna tinggal buka Google Spreadsheet miliknya, buka menu Apps Script, jalankan fungsi sekali klik &rarr; semua tab kategori (Ayam, Burung, Kucing, Ikan) beserta seluruh daftar barangnya otomatis langsung terbuat dan terformat rapi dengan warna header yang indah.
2. **File CSV & Panduan Satu Klik di Web POS & Android**:
   - Menambahkan tombol **Unduh Template CSV Barang** di menu Pengaturan Web POS & Android, sehingga pengguna juga bisa langsung import file CSV ke Google Spreadsheet jika diinginkan.
   - Seluruh nama pakan karung sudah otomatis bertuliskan **Karung** (bukan zak), dengan satuan `kg` untuk pakan curah dan `pcs` untuk kemasan.

---

## 3. Langkah Pengerjaan
1. **Update `Code.gs` & `AppsScriptCodeSnippet.kt`**:
   - Tambahkan fungsi setup sheet kategori otomatis `setupSheetsKatalog()` di script Google Sheets.
2. **Buat file data CSV per kategori**:
   - Sediakan file CSV siap pakai di `public/katalog_petshop.csv`.
3. **Tampilkan Tombol & Panduan di Web POS & Android**:
   - Tambahkan tombol download CSV dan instruksi pembuat spreadsheet di modal Pengaturan.
4. **Kompilasi & Build**:
   - Jalankan `compile_applet` dan update APK.

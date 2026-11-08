# Integrasi Katalog Harga Baru & Pemisahan Link Spreadsheet (Produk & Penjualan)

Rencana implementasi integrasi 29 daftar harga terbaru dari file toko, penyediaan 2 link Google Spreadsheet terpisah (Katalog Produk & Riwayat Penjualan/Kas), serta fitur pembaruan produk langsung dari website kasir desktop yang tersinkron otomatis ke seluruh perangkat (tanpa fitur stok barang terlebih dahulu).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan yang Telah Dikonfirmasi Pengguna:**
> 1. **Dua Link Google Spreadsheet Terpisah:**
>    - Di menu Pengaturan (Web POS & Android) akan disediakan dua kolom input URL:
>      - **URL Spreadsheet Produk / Katalog**: Untuk mengambil data barang, kategori, harga beli, harga jual, serta menerima update harga dari aplikasi.
>      - **URL Spreadsheet Penjualan / Kas**: Untuk mencatat mutasi kas penjualan 7 kolom (`Tanggal | Jam | Keterangan | Masuk | Keluar | Saldo Kas Akhir | Metode`).
>      - *Fallback Otomatis:* Jika hanya 1 URL yang diisi, sistem otomatis menggunakan URL tersebut untuk kedua fungsi.
> 2. **Penerapan 29 Data Harga Terbaru:**
>    - Seluruh 29 produk pakan burung dan pakan lainnya dari file `Daftar_Toko_PakanTernak_a9847901` (seperti SKM Halus/Kasar Rp 4.500, Kroto Sari Rp 3.500, Alam Sakti Rp 10.500/Rp 11.500, Topsong Rp 12.000, Fancy Rp 14.500, Milet, Kenari Seed, dll.) langsung diterapkan ke katalog aplikasi dan Google Spreadsheet sehingga tidak ada lagi produk yang berharga Rp 0.
> 3. **Pengeditan Barang dari Website Desktop:**
>    - Kasir atau pemilik toko dapat mengedit harga jual produk atau menambah barang baru langsung dari layar komputer/laptop di Web POS, dan perubahan tersebut seketika terkirim dan tersimpan ke Google Spreadsheet tab kategori terkait.
> 4. **Penundaan Fitur Stok:**
>    - Sesuai instruksi pengguna (*"jangan beri stok dulu itu nanti"*), sistem saat ini tidak menambahkan kolom stok atau pembatasan kuantitas stok agar fokus penuh pada kelancaran harga dan transaksi.

---

### 1. Overview & Core Concept

- **Apa yang Dibangun?**
  - Arsitektur dual-spreadsheet (URL Katalog Produk vs URL Penjualan Kas) yang fleksibel.
  - Pembaruan menyeluruh database katalog lokal & Google Spreadsheet dengan 29 harga barang terbaru.
  - Antarmuka edit harga cepat di Web POS desktop yang langsung menulis ke Google Spreadsheet tab kategori (`Ayam`, `Burung`, `Kucing`, `Ikan`, `Lainnya`).
- **Target Pengguna:**
  - Kasir dan pemilik toko pet shop yang menggunakan komputer desktop untuk pengelolaan barang serta smartphone untuk penjualan lapangan.
- **Nilai Manfaat:**
  - Pemisahan data pembukuan keuangan (penjualan kas) dari data master barang (katalog produk) sehingga spreadsheet penjualan tetap bersih 7 kolom, sementara master produk tetap rapi per sheet kategori.

---

### 2. User Experience & Visual Design

- **Alur Pengguna di Website Desktop:**
  1. **Update Harga Barang dari Desktop:**
     - Pemilik toko membuka menu **Katalog** di laptop/PC kasir &rarr; Mengetik nama barang di kotak pencarian atau memilih chip kategori &rarr; Klik tombol pensil (Edit Harga) pada barang terkait &rarr; Muncul dialog modal modern berisi Nama Produk, Kategori, Harga Beli, dan input Harga Jual Baru &rarr; Mengetik harga baru (atau klik tombol shortcut `+1.000`, `+2.000`, `+5.000`) &rarr; Klik **"Simpan & Sinkronkan"** &rarr; Indikator hijau muncul *"Tersimpan ke Spreadsheet!"* &rarr; Nilai di Google Spreadsheet dan seluruh aplikasi HP langsung ter-update seketika.
  2. **Pengaturan Dua Link Spreadsheet:**
     - Di modal Pengaturan, terdapat 2 field terpisah dengan deskripsi jelas:
       - 🏷️ **Link Spreadsheet Katalog Produk** (Target: Sheet Ayam, Burung, Kucing, Ikan)
       - 💰 **Link Spreadsheet Riwayat Penjualan / Mutasi Kas** (Target: Sheet Penjualan 7 kolom)
       - Tombol **"Tes Koneksi"** dan **"Salin Kode Script"** untuk masing-masing fungsi.
  3. **Tampilan Kasir dengan Harga Terbaru:**
     - Seluruh barang (khususnya kategori Burung seperti Kroto Sari, Topsong, Leopard, Gold Coin) langsung menampilkan label harga jual yang valid dan siap ditransaksikan dalam 1 klik.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Dukungan 2 URL Terpisah dengan Fallback 1 URL**
  - *Pendekatan:* Jika pemilik toko ingin menggunakan 2 Google Spreadsheet berbeda (misal: spreadsheet rahasia keuangan terpisah dari spreadsheet katalog barang), sistem mendukungnya secara penuh. Namun jika pemilik toko ingin tetap memakai 1 spreadsheet untuk keduanya, sistem tetap berjalan lancar.
  - *Alasan:* Memberikan kebebasan manajemen akuntansi dan privasi bagi pemilik toko.
- **Keputusan 2: Pembaruan Harga Beli & Jual Terintegrasi**
  - *Pendekatan:* Memperbarui daftar katalog standar di kode lokal Web & Android dengan 29 harga resmi dari file lampiran, serta menyediakan fungsi Apps Script untuk memperbarui sheet di Google Spreadsheet.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│  SPREADSHEET 1: MASTER PRODUK        │       │  SPREADSHEET 2: MUTASI PENJUALAN     │
│  (Ayam, Burung, Kucing, Ikan)        │       │  (Sheet: Penjualan - 7 Kolom Murni)  │
│  [No | Nama | Satuan | Beli | Jual]  │       │  [Tgl | Jam | Ket | Msk | Klr | Saldo│
└──────────────────┬───────────────────┘       └──────────────────┬───────────────────┘
                   │                                              │
         Apps Script Produk                             Apps Script Kas
      (action=products, update_price)                 (action=sale, recent, balance)
                   │                                              │
                   └───────────────────────┬──────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
            ┌───────────────────────┐             ┌───────────────────────┐
            │   APLIKASI WEB POS    │             │ APLIKASI ANDROID POS  │
            │  (Desktop Workstation)│             │   (Smartphone Kasir)  │
            │                       │             │                       │
            │ • Edit Harga Desktop  │             │ • Baca 2 URL Prefs    │
            │ • Input 2 URL Mandiri │             │ • Transaksi Kasir     │
            │ • Katalog 78+ Produk  │             │ • Sinkron 2 Arah      │
            └───────────────────────┘             └───────────────────────┘
```

- **Rencana File yang Dikerjakan:**
  1. `SampleCatalog.kt`, `web/app.js`, dan `public/app.js`:
     - Memperbarui daftar 29 produk burung dengan harga beli dan harga jual dari file `Daftar_Toko_PakanTernak_a9847901`.
  2. `web/app.js` & `web/index.html`:
     - Menambahkan input field untuk `productScriptUrl` dan `salesScriptUrl` di modal Pengaturan.
     - Mengarahkan aksi get/update produk ke `productScriptUrl` dan aksi checkout/saldo ke `salesScriptUrl`.
  3. `PetShopPrefs.kt`, `SettingsDialog.kt`, & `PetShopRepository.kt`:
     - Menambahkan penyimpanan preferensi `productScriptUrl` dan `salesScriptUrl`.
     - Mengarahkan `fetchProducts` & `updateProductPrice` ke URL produk, dan `submitSale` & `adjustBalance` ke URL penjualan.
  4. `Code.gs` & `AppsScriptCodeSnippet.kt`:
     - Memastikan kompatibilitas penuh jika dipasang di 2 spreadsheet terpisah maupun di 1 spreadsheet terpadu.

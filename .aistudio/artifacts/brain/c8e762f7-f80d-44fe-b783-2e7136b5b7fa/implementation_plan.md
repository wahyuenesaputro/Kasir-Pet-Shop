# Sinkronisasi Dua Arah Data Produk & Harga (Google Spreadsheet Master)

Rencana implementasi arsitektur penyimpanan pusat data di Google Spreadsheet serta mekanisme sinkronisasi 2 arah (*two-way sync*) otomatis agar penambahan produk dan perubahan harga dari aplikasi kasir maupun langsung dari spreadsheet langsung tersinkronkan ke seluruh perangkat secara *real-time*.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan yang Telah Dikonfirmasi Pengguna:**
> - **Pusat Data Utama:** Google Spreadsheet sebagai pusat data tunggal (*Single Source of Truth*) untuk semua perangkat (Web POS Laptop & Aplikasi Android Kasir).
> - **Fleksibilitas Pengeditan:** Pengguna dapat mengedit harga atau menambah produk baik secara langsung dari Google Spreadsheet maupun melalui antarmuka aplikasi kasir (Web / HP).
> - **Struktur Tab Kategori:** Data produk dikelompokkan dalam tab/sheet kategori masing-masing: `Ayam`, `Burung`, `Kucing`, `Ikan`, dan `Lainnya`.

---

### 1. Overview & Core Concept

- **Di Mana Data Disimpan?**
  1. **Pusat Utama (Cloud Master):** Seluruh data produk, kategori, harga beli, dan harga jual tersimpan di dokumen **Google Spreadsheet** Anda pada lembar kerja (tab) masing-masing kategori:
     - Tab `Ayam`: Pakan karungan ayam, konsentrat, vitamin ayam.
     - Tab `Burung`: Pakan burung (Topsong, Leopard, Kroto Sari), milet, vitamin.
     - Tab `Kucing`: Makanan kucing (Cat food kering/basah), pasir gumpal, aksesoris.
     - Tab `Ikan`: Pelet ikan apung, pakan cupang/koi, obat air.
     - Tab `Lainnya`: Sangkar, tempat pakan, perlengkapan umum.
  2. **Penyimpanan Lokal (Cache Offline Cepat):** Pada perangkat kasir (Web POS di browser laptop & Aplikasi Android di HP), data disimpan sementara di memori lokal (`localStorage` & `SharedPreferences`). Ini memastikan kasir tetap bisa melayani transaksi super cepat tanpa jeda (*zero lag*) dan tetap bisa jualan walau koneksi internet sempat terputus.

- **Bagaimana Mekanisme Sinkronisasinya Bekerja?**
  - **Arah 1 (Edit di Spreadsheet &rarr; Masuk ke Semua Aplikasi):** Saat Anda menambahkan baris produk baru atau mengubah angka harga di kolom `HARGA JUAL` pada spreadsheet, aplikasi kasir otomatis memperbarui datanya melalui sinkronisasi saat aplikasi dibuka (*auto-sync on load*), polling berkala setiap 5 menit di latar belakang, atau saat tombol **"Sinkronkan"** ditekan secara manual.
  - **Arah 2 (Edit di Aplikasi &rarr; Masuk ke Spreadsheet):** Saat kasir mengubah harga jual lewat tombol edit harga cepat di aplikasi atau menambah produk baru, aplikasi kasir langsung mengirim data ke Google Apps Script (`doPost`), yang kemudian secara otomatis mencari tab kategori produk tersebut dan memperbarui nilai sel harga atau menambahkan baris baru di spreadsheet.

---

### 2. User Experience & Visual Design

- **Alur Pengguna (User Flows):**
  1. **Edit Cepat Harga di Aplikasi:**
     Kasir menekan tombol pensil/edit harga pada kartu produk &rarr; Muncul dialog modal modern berisi rincian produk &rarr; Kasir mengetik harga jual baru &rarr; Menekan tombol **"Simpan & Sinkronkan"** &rarr; Indikator loading halus muncul sesaat &rarr; Notifikasi berhasil muncul &rarr; Harga di layar seketika berubah dan di baris spreadsheet terkait nilai harga jual langsung ter-update otomatis.
  2. **Tambah Produk Baru di Aplikasi:**
     Kasir membuka modal "Tambah Produk" &rarr; Memilih kategori (Ayam/Burung/Kucing/Ikan/Lainnya), nama produk, satuan (`karung`, `kg`, atau `pcs`), harga beli, dan harga jual &rarr; Menekan tombol **"Simpan ke Katalog"** &rarr; Produk langsung ditambahkan ke daftar lokal sekaligus di-append sebagai baris baru di tab kategori spreadsheet.
  3. **Indikator Status Sinkronisasi Real-Time:**
     Pada bilah atas (top bar) terdapat badge status:
     - 🟢 **Tersinkron**: Menampilkan waktu sinkronisasi terakhir (misal: "Baru saja" atau "2 menit lalu").
     - 🔄 **Sedang Menyelaraskan**: Animasi rotasi halus saat data sedang dikirim/diambil dari Google Sheets.
     - 🟡 **Offline / Mode Lokal**: Menampilkan status jika koneksi internet terputus dan data disimpan di antrean lokal.

- **Identitas Visual & Desain UI:**
  - *Tema & Mood:* Fresh Pet Shop Modern (Emerald Teal & Dark Navy Blue) yang bersih, ergonomis untuk kasir toko, dan memiliki kontras tinggi.
  - *Tipografi:* Angka monospaced untuk harga dan total pembayaran agar mudah dibaca sekilas.
  - *Feedback Interaktif:* Toast notifikasi sukses berwarna hijau emerald saat data tersimpan di Google Sheets, animasi ripple responsif pada setiap tombol aksi.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Mekanisme Optimistic UI Update**
  - *Pendekatan:* Saat kasir mengubah harga di aplikasi, harga di layar langsung berubah seketika (*optimistic update*) sambil mengirim permintaan update ke Google Apps Script di latar belakang.
  - *Alasan:* Kasir tidak perlu menunggu response HTTP selama 1-2 detik hanya untuk melihat perubahan harga, sehingga antrean transaksi di kasir tidak terganggu. Jika permintaan gagal, sistem memberikan opsi *retry*.

- **Keputusan 2: Pencocokan Data Berdasarkan Nama & Kategori**
  - *Pendekatan:* Google Apps Script mencocokkan baris produk berdasarkan nama produk di tab kategori yang relevan, atau menambahkan baris baru jika produk belum ada.
  - *Alasan:* Menjaga Google Spreadsheet tetap manusiawi (*human-readable*) tanpa mewajibkan kolom ID rumit yang membingungkan kasir jika ingin mengedit langsung di Google Sheets.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PUSAT DATA UTAMA: GOOGLE SPREADSHEET                 │
│                                                                        │
│   Tab: Ayam      Tab: Burung    Tab: Kucing    Tab: Ikan   Tab: Lainnya│
│   [No | Nama Produk | Satuan | Harga Beli | HARGA JUAL | Keterangan]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Google Apps Script API
                    (doGet: products | doPost: update)
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│       APLIKASI WEB POS        │               │     APLIKASI ANDROID POS      │
│     (Laptop / PC Kasir)       │               │      (Smartphone Kasir)       │
│                               │               │                               │
│ • Auto-Sync saat dibuka       │               │ • Auto-Sync saat dibuka       │
│ • Background Polling (5 mnt)  │               │ • Background Polling (5 mnt)  │
│ • Tombol Edit Harga Cepat     │               │ • Dialog Edit Harga Produk    │
│ • Form Tambah Produk Baru     │               │ • Local StateFlow & Coroutine │
│ • LocalStorage Fallback       │               │ • SharedPreferences Fallback  │
└───────────────────────────────┘               └───────────────────────────────┘
```

- **Rancangan Endpoint Baru di `Code.gs`:**
  1. `doPost(e)` dengan `action: "update_product_price"`:
     - Menerima: `{ action: "update_product_price", kategori: "Ayam", namaProduk: "511 1 Karung", hargaJual: 460000 }`
     - Logika: Mencari sheet kategori `Ayam` &rarr; mencari baris di mana kolom Nama Barang cocok &rarr; memperbarui nilai sel pada kolom `HARGA JUAL`.
  2. `doPost(e)` dengan `action: "add_product"`:
     - Menerima: `{ action: "add_product", kategori: "Kucing", namaProduk: "Me-O Salmon 1kg", satuan: "pcs", hargaBeli: 28000, hargaJual: 35000 }`
     - Logika: Menambahkan baris baru di sheet kategori bersangkutan.
  3. Kompatibilitas Penuh: Endpoint pencatatan penjualan 7 kolom (`Penjualan`) tetap berjalan 100% normal tanpa terganggu.

- **Rancangan Perubahan di Sisi Aplikasi Kasir:**
  1. **Web POS (`web/app.js` & `public/app.js`):**
     - Memperbarui fungsi `saveQuickPrice(kategori, nama, newPrice)` untuk memanggil `POST` ke Web App URL.
     - Memperbarui fungsi `addNewProduct(productData)` untuk memanggil `POST` ke Web App URL.
     - Mempercantik indikator status sinkronisasi.
  2. **Android App (`PetShopRepository.kt` & `KasirViewModel.kt`):**
     - Menambahkan fungsi suspend `updateProductPriceOnSpreadsheet(product, newPrice)`.
     - Menambahkan fungsi suspend `addProductToSpreadsheet(product)`.
     - Mengintegrasikan fungsi tersebut ke ViewModel saat aksi pengubahan harga atau penambahan produk dijalankan.

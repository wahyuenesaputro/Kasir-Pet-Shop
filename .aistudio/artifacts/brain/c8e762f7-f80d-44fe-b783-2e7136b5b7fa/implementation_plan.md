# Fitur Riwayat Transaksi Google Spreadsheet

Rencana pengembangan modul Riwayat Transaksi pada aplikasi Kasir Pet Shop untuk menampilkan seluruh penjualan yang tersimpan di Google Spreadsheet, dilengkapi filter transaksi hari ini, pencarian instan nomor nota dan nama pembeli, serta tampilan rincian item yang rapi dan mudah dibaca kasir.

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan tanya-jawab di fase klarifikasi, berikut adalah keputusan utama yang telah disepakati bersama pengguna:

- **Keputusan 1 (Informasi Transaksi)**: Setiap kartu transaksi pada daftar riwayat akan menampilkan Nomor Nota, Tanggal & Jam, Nama Pembeli, Total Penjualan, serta Rincian Item (nama barang, jumlah, satuan, dan subtotal).
- **Keputusan 2 (Filter & Pencarian)**: Dilengkapi filter cepat "Hari Ini" vs "Semua Transaksi", ditambah kolom pencarian instan untuk mencari berdasarkan Nomor Nota (`PS-...`) maupun Nama Pembeli.
- **Keputusan 3 (Aksi Transaksi)**: Sesuai instruksi pengguna, menekan kartu transaksi hanya akan membuka lembar/dialog Detail Rincian Transaksi informatif (tanpa memicu cetak ulang struk).
- **Keputusan 4 (Performa & Sinkronisasi)**: Riwayat dibaca langsung dari endpoint Apps Script (`action=recent`) dengan indikator pemuatan halus (*pull-to-refresh* / tombol refresh) dan penanganan offline/gagal koneksi yang jelas.

---

### 1. Overview & Core Concept

- **What It Does**: Membuka tab "Riwayat Penjualan" yang menyajikan ringkasan total omset dan jumlah transaksi hari ini, filter tanggal, pencarian instan, dan daftar kartu penjualan dari Google Spreadsheet (tab "Penjualan") dengan rincian lengkap tiap barang yang terjual.
- **Target Audience / Persona**: Kasir dan pemilik toko pakan ternak / pet shop yang ingin memverifikasi transaksi sebelumnya, mengecek riwayat belanja pelanggan tertentu, atau memantau omset harian secara langsung di genggaman.
- **Key Value**: Transparansi dan akurasi pencatatan kasir tanpa perlu membuka laptop atau membuka sheet Google Drive secara manual.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Navigasi ke Riwayat**:
   - Kasir mengetuk tab "Riwayat Penjualan" di bagian atas layar.
   - Aplikasi otomatis menyegarkan data dari Google Apps Script jika URL sudah terkonfigurasi.
2. **Memantau Omset Hari Ini**:
   - Bagian atas menampilkan kartu metrik ringkasan: Total Penjualan Hari Ini (format Rupiah tebal) dan Total Transaksi Hari Ini.
3. **Penyaringan & Pencarian**:
   - Kasir dapat mengetuk chip filter "Hari Ini" atau "Semua".
   - Kolom pencarian responsif untuk mengetik nama pelanggan (contoh: "Pak Budi") atau nomor nota.
4. **Melihat Rincian Item**:
   - Kartu menampilkan badge metode pembayaran (Tunai, Transfer, QRIS), tanggal, nomor struk, nama pembeli, jumlah item, dan total rupiah.
   - Mengetuk kartu membuka modal "Detail Transaksi" yang memperlihatkan rincian setiap pakan/barang yang dibeli beserta subtotalnya.

#### Visual Identity & Theme
- **Aesthetic Direction**: Bersih, fungsional, dan bernuansa kasir modern berstandar Material 3.
- **Color Palette & Mood**: 
  - *Primary*: Hijau botani pet shop yang ramah dan profesional.
  - *Surface/Card*: Kontras lembut dengan border tipis dan rounded corner 16dp.
  - *Badge Status*: Aksen pill chip untuk metode bayar (Hijau untuk Tunai, Biru untuk QRIS, Ungu untuk Transfer).
- **Typography & Hierarchy**: Angka monospaced/semi-bold untuk nominal Rupiah dan nomor nota, tipografi hierarkis tebal untuk nama produk dan pembeli.
- **Interactive Feedback**:
  - State kosong (*Empty State*) yang komunikatif jika belum ada transaksi di Spreadsheet.
  - State memuat (*Loading Skeleton / Spinner*) saat sinkronisasi API berlangsung.
  - Tombol segarkan data (*Refresh*) instan di pojok kanan atas.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Penyajian Rincian Item Langsung vs Modal Detail**
  - *Chosen Approach*: Kartu transaksi di daftar riwayat menampilkan cuplikan 2 item pertama + jumlah item lainnya ("+2 item lainnya"), dan jika kartu diketuk akan membuka dialog rincian lengkap.
  - *Why*: Menghindari daftar transaksi menjadi terlalu panjang/memanjang tak berujung saat pelanggan membeli puluhan jenis pakan, sekaligus memberikan kenyamanan kasir saat scrolling cepat.
  - *Alternatives Considered*: Menampilkan semua item di dalam kartu secara langsung (membuat kartu terlalu tinggi dan sulit di-scroll).

- **Decision 2: Filter Hari Ini vs Semua Transaksi di Sisi Klien**
  - *Chosen Approach*: Mengunduh batch transaksi dari Google Apps Script dan menerapkan filter "Hari Ini / Semua" serta pencarian teks secara instan di perangkat (*client-side filtering*).
  - *Why*: Respon pencarian dan filter menjadi seketika (0 milidetik latency) tanpa perlu membebani Google Spreadsheet dengan request baru setiap ketikan huruf.

- **Decision 3: Akses Cepat URL Pengaturan**
  - *Chosen Approach*: Jika kasir belum memasang URL Apps Script, tampilkan kartu peringatan ramah dengan tombol 1-ketuk langsung menuju dialog Pengaturan Spreadsheet.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       KasirScreen                           │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │     Tab 0: Kasir      │       │     Tab 1: Riwayat    │  │
│  └───────────────────────┘       └───────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        HistoryScreen                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Metric Card: Total Omset & Jumlah Transaksi Hari Ini  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Search Bar (No Struk / Nama) + Filter Chips (Hari Ini)│  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ LazyColumn of TransactionHistoryCard                  │  │
│  │  - No Struk, Tanggal & Jam, Nama Pembeli              │  │
│  │  - Cuplikan Item Pakan & Badge Metode Bayar           │  │
│  │  - Total Rupiah & Tombol "Lihat Rincian"              │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ (Ketuk kartu)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 TransactionDetailDialog                     │
│  - Info Lengkap: No Struk, Pembeli, Metode Bayar, Waktu     │
│  - Tabel Rincian Semua Item (Nama, Qty, Satuan, Subtotal)   │
│  - Total, Uang Diterima, Kembalian                          │
│  - Tombol Tutup (Sesuai preferensi: Hanya Lihat Rincian)    │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                       KasirViewModel                        │
│  - State: recentTransactions, todaySummary, historyFilter   │
│  - Actions: loadRecent(), filterByDate(), searchHistory()   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     PetShopRepository                       │
│  - fetchRecentSales(url): GET ?action=recent                │
│  - Parsing JSON: todayTotal, todayCount, recentTransactions │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Google Apps Script (Code.gs)                │
│  - Membaca sheet 'Penjualan' Spreadsheet secara real-time   │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model & State Mapping
- `RecentTransactionSummary`: Menyimpan `noStruk`, `tanggal`, `jam`, `namaPembeli`, `metodeBayar`, `total`, `bayar`, `kembalian`, dan daftar `items` (`ReceiptItemSummary`).
- `selectedHistoryTransaction`: State penampung transaksi yang sedang dibuka detailnya di dialog rincian.
- `historySearchQuery` & `historyDateFilter`: State reaktif untuk menyaring daftar transaksi secara instan.

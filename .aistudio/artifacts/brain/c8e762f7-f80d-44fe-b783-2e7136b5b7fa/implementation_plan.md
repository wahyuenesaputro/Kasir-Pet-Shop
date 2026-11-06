# Menu Katalog Edit Harga Cepat & Pembersihan Input Nama Pembeli

Rencana implementasi penambahan tab menu baru **"Katalog"** pada Web POS (Desktop & Mobile iOS/Android) untuk mengubah harga jual produk secara cepat, serta menghapus kolom input nama pembeli pada seluruh alur kasir.

## Keputusan Kritis & Review Pengguna

> [!IMPORTANT]
> **Keputusan Terkonfirmasi dari Tanya Jawab:**
> - **Penghapusan Nama Pembeli**: Input "Nama Pembeli" pada sidebar kasir desktop dan modal mobile dihapus sepenuhnya. Semua transaksi dicatat langsung tanpa memerlukan input nama pelanggan.
> - **Letak Menu Edit Harga**: Menambahkan tab navigasi baru bernama **"Katalog"** yang ditempatkan tepat di samping tab **Kasir** (urutan navigasi: Kasir | Katalog | Dashboard | Riwayat) pada versi Desktop maupun Mobile (iOS/Android).
> - **Fokus Fitur**: Cukup edit harga jual produk secara cepat (inline edit / modal edit harga cepat dengan input nominal baru dan tombol simpan instan).
> - **Penyimpanan Harga**: Harga kustom tersimpan langsung di browser (localStorage) dan dapat disinkronkan langsung saat kasir memilih produk untuk transaksi.

---

## 1. Arsitektur & Alur Navigasi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NAVIGASI WEB POS BARU                             │
├─────────────────┬─────────────────┬───────────────────────┬─────────────────┤
│   [1] KASIR     │   [2] KATALOG   │    [3] DASHBOARD      │   [4] RIWAYAT   │
│   (Transaksi)   │   (Edit Harga)  │   (Saldo & Omset)     │    (Mutasi)     │
└────────┬────────┴────────┬────────┴───────────────────────┴─────────────────┘
         │                 │
         │                 ▼
         │        ┌──────────────────────────────────────────────────┐
         │        │               LAYAR MENU KATALOG                 │
         │        │ - Pencarian produk & filter kategori             │
         │        │ - Daftar produk dengan harga jual saat ini       │
         │        │ - Tombol cepat "Ubah Harga" / input harga baru   │
         │        │ - Simpan & perbarui harga jual seketika          │
         │        └──────────────────────────────────────────────────┘
         │                                 │
         │                                 ▼ Update harga jual
         └─────────────────────────────────┘ (Harga di kasir otomatis update)
```

---

## 2. Rincian Perubahan Fitur & Tampilan

### A. Penghapusan Kolom Nama Pembeli
- Menghapus elemen input `desktop-cust-name` pada *Sticky Checkout Sidebar* layar desktop.
- Menghapus input nama pelanggan pada form pembayaran modal mobile.
- Menghapus baris nama pembeli pada struk belanja thermal sehingga struk lebih ringkas.
- Memperbarui fungsi `submitDesktopPayment` dan `submitPayment` agar langsung memproses transaksi tanpa membaca input nama pembeli.

### B. Tab Navigasi Baru: "Katalog"
- **Desktop Header Navigation**:
  - Menambahkan tombol menu: `[Kasir POS]` • `[Katalog Produk]` • `[Dashboard & Saldo]` • `[Riwayat Mutasi]`.
- **Mobile Top Tab Navigation**:
  - Menambahkan tab `Katalog` dengan ikon buku/katalog di samping tab `Kasir`.
- **Layar Menu Katalog (`#screen-katalog`)**:
  - Kotak pencarian produk dan tombol filter kategori (Ayam, Burung, Kucing, Ikan, dll).
  - Tampilan daftar produk (format kartu bersih atau tabel modern responsif):
    - Ikon kategori, nama produk, dan satuan.
    - Harga jual saat ini yang ditonjolkan.
    - Tombol aksi **"Ubah Harga"** (atau kolom input harga inline) yang memudahkan kasir mengubah harga dalam 1 klik.
  - Modal / Dialog Edit Harga Cepat:
    - Menampilkan nama produk dan harga lama.
    - Input nominal harga baru.
    - Tombol "Simpan Harga Baru".
    - Indikator notifikasi perubahan berhasil.

### C. Sinkronisasi Data & File
- Memperbarui `web/index.html` dan `web/app.js`.
- Menyalin seluruh pembaruan ke `public/index.html` dan `public/app.js` agar langsung aktif di Vercel dan browser pengguna.
- Memastikan tidak ada benturan dengan fungsionalitas Android dan Google Sheets.

---

## 3. Langkah Eksekusi

1. **Pembaruan Layout HTML (`web/index.html` & `public/index.html`)**:
   - Menghapus bagian input nama pembeli di sidebar desktop dan modal pembayaran.
   - Menambahkan tombol navigasi `desktop-nav-katalog` dan `nav-katalog`.
   - Membuat kontainer tampilan baru `<section id="screen-katalog">` berisi antarmuka kelola harga produk.
   - Menyiapkan modal cepat `quick-price-modal`.
2. **Pembaruan Logika JavaScript (`web/app.js` & `public/app.js`)**:
   - Menambahkan tab `katalog` pada fungsi `switchTab(tab)`.
   - Menambahkan fungsi `renderCatalogManager()` untuk menampilkan daftar produk lengkap dengan tombol edit harga.
   - Menambahkan fungsi `openEditPriceModal(productId)` dan `saveQuickPrice()`.
   - Memastikan harga baru otomatis tersimpan di `localStorage` (`custom_price_*` / `petshop_price_overrides`) dan seketika memperbarui harga di layar kasir.
3. **Pengujian & Verifikasi**:
   - Uji alur ubah harga produk di tab Katalog, lalu kembali ke Kasir untuk memastikan harga baru diterapkan.
   - Uji transaksi kasir tanpa nama pembeli di desktop dan mobile.

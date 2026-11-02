# Web POS Desktop Responsif & Sinkronisasi Ekosistem Pet Shop

Rencana peningkatan antarmuka Web POS Kasir Pet Shop (Vercel/PWA) agar mendukung tampilan layar lebar (Desktop/Laptop PC) dengan tata letak split-screen kasir modern, sekaligus mempertahankan pengalaman mobile yang ramah ponsel (Android/iOS Safari) dan memastikan sinkronisasi penuh dengan Google Sheets dan aplikasi Android.

## Keputusan Kritis & Review Pengguna

> [!IMPORTANT]
> **Keputusan Terkonfirmasi dari Tanya Jawab:**
> - **Format Desktop**: Web POS responsif adaptif khusus layar PC atau laptop (tidak memerlukan instalasi software terpisah, langsung dapat dibuka di Chrome, Edge, Safari, dan Firefox).
> - **Tata Letak Desktop**: Layar lebar memanfaatkan tata letak **Dual-Panel (Split Screen)**:
>   - **Panel Kiri**: Katalog produk responsif (grid 3–4 kolom pada desktop) dengan filter kategori dan pencarian cepat.
>   - **Panel Kanan**: Bilah kasir tetap (*Sticky Checkout Sidebar*) berisi daftar item belanja, pengubah jumlah cepat, kalkulator nominal bayar (uang pas, 20rb, 50rb, 100rb), pilihan metode bayar (Tunai, QRIS, Transfer), dan tombol proses transaksi instan.
> - **Mobile & Tablet**: Tampilan di bawah 1024px tetap mempertahankan antarmuka ponsel yang ringkas (persis seperti Android) lengkap dengan floating cart bar dan drawer popup keranjang.
> - **Sinkronisasi**: Menggunakan Web App Google Apps Script terbaru (`AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp`) dengan skema 7 kolom mutasi saldo kas.

---

## 1. Arsitektur & Diagram Komponen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SISTEM POS KASIR PET SHOP MULTI-PLATFORM               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌────────────────────────┐                             ┌──────────────────────┐
│     APLIKASI ANDROID   │                             │  WEB POS (VERCEL)    │
│  (Kotlin Jetpack POS)  │                             │ (Desktop & Mobile)   │
└───────────┬────────────┘                             └──────────┬───────────┘
            │                                                     │
            │  Layar < 1024px (Mobile/iOS)     Layar >= 1024px (PC/Desktop)       │
            │  ┌─────────────────────────┐     ┌────────────────────────────┐    │
            │  │ Single Column Grid      │     │ Panel Kiri: Katalog Produk │    │
            │  │ Floating Bottom Bar     │     │ Panel Kanan: Sidebar Kasir │    │
            │  └─────────────────────────┘     └────────────────────────────┘    │
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       │ Fetch / Post JSON (action: products, balance, checkout)
                                       ▼
                     ┌───────────────────────────────────┐
                     │   GOOGLE APPS SCRIPT WEB APP      │
                     │  (7 Kolom Mutasi Kas Real-Time)   │
                     └─────────────────┬─────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │       GOOGLE SPREADSHEETS         │
                     │  - Sheet "Riwayat Penjualan"      │
                     │  - Sheet "Produk" (78 Produk)     │
                     └───────────────────────────────────┘
```

---

## 2. Pengalaman Pengguna & Desain Visual (Desktop vs Mobile)

### A. Tampilan Desktop (Layar Lebar PC & Laptop: `>= 1024px`)
- **Navigasi Atas Lebar**: Header modern dengan logo Pet Shop, indikator status online/cloud Google Sheets, tombol unduh APK Android, serta pintasan cepat ke Pengaturan & Atur Saldo.
- **Katalog Produk (Kiri)**:
  - Kotak pencarian luas dengan shortcut keyboard (`/` atau `Ctrl+F`).
  - Chip kategori interaktif (Semua, Burung, Kucing, Ayam, Ikan, dll).
  - Grid kartu produk dinamis (3–4 kolom) dengan indikator harga jelas, satuan produk (pcs, kg, bungkus), dan tombol `+ Tambah` yang responsif.
- **Bilah Kasir Langsung / Sticky Checkout Sidebar (Kanan)**:
  - Keranjang belanja selalu terlihat di samping katalog tanpa perlu buka/tutup modal.
  - Daftar barang dengan tombol `+`, `-`, dan hapus cepat.
  - Input nama pelanggan & pilihan metode pembayaran (Tunai / QRIS / Transfer).
  - Pilihan cepat uang tunai (Uang Pas, Rp 10.000, Rp 20.000, Rp 50.000, Rp 100.000).
  - Kalkulasi kembalian otomatis.
  - Tombol **"Bayar & Cetak Struk"** berukuran besar yang mencolok dengan dukungan tombol keyboard `F2` atau `Enter`.
- **Cetak Struk Thermal**: Dukungan cetak struk browser langsung ke printer thermal 58mm / 80mm USB atau Bluetooth.

### B. Tampilan Mobile & Tablet (`< 1024px` - Android & iOS Safari)
- Tetap ramping dan ergonomis satu tangan (konsisten dengan aplikasi Android).
- Bilah bawah mengambang (*floating cart pill*) dengan badge jumlah item dan subtotal.
- Modal slide-up untuk rincian keranjang dan pembayaran.

### C. Dashboard & Riwayat Transaksi di Desktop
- **Dashboard**: Tampilan multi-kartu berjajar (Total Saldo Kas Toko gradien biru besar di kiri, Omset Hari Ini di kanan, serta statistik total transaksi dan status koneksi spreadsheet).
- **Riwayat Penjualan**: Tabel riwayat penjualan responsif dengan keterangan transaksi, waktu, metode, dan rincian mutasi kas.

---

## 3. Rencana Langkah Eksekusi

1. **Pembaruan Antarmuka Web (`web/index.html` & `public/index.html`)**:
   - Menghapus pembatasan `max-w-md` pada layar desktop dan menggantinya dengan layout kontainer adaptif (`max-w-7xl mx-auto`).
   - Membuat tata letak grid dual-panel di layar `lg:`:
     - Sisi kiri: Katalog produk & filter kategori.
     - Sisi kanan: Panel keranjang & checkout permanen yang menempel (*sticky*).
   - Menjaga tampilan mobile (`< lg`) tetap bersih seperti tampilan aplikasi Android.
   - Mempercantik Dashboard dan Riwayat untuk memanfaatkan lebar layar desktop.
2. **Penyelarasan Logika JavaScript (`web/app.js` & `public/app.js`)**:
   - Menghubungkan manipulasi keranjang secara real-time pada panel sidebar desktop dan modal mobile secara bersamaan (sinkron dua arah).
   - Menambahkan event listener keyboard shortcut desktop (`F2` untuk checkout cepat, `Escape` untuk tutup modal).
   - Memastikan default URL Apps Script mengarah ke deployment baru (`AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp`).
3. **Penyelarasan File Distribusi (`public/`)**:
   - Memastikan seluruh berkas web (`index.html`, `app.js`, `manifest.json`, `KasirPetShop.apk`) tersinkronisasi 100% sehingga siap dideploy ke Vercel atau diakses via browser laptop/desktop.
4. **Verifikasi Akhir**:
   - Pengujian live responsive preview pada berbagai ukuran viewport.
   - Pengujian simpan transaksi dan penarikan saldo ke Google Sheets.

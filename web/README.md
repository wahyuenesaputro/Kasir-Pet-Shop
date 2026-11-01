# Panduan Deploy ke Vercel & Menjalankan di iOS (iPhone / iPad)

Aplikasi Web POS Kasir Pet Shop ini telah dibuat agar bisa dijalankan di **iPhone / iPad (iOS)**, **Android**, maupun **Laptop/PC** secara online via **Vercel**.

---

### Cara 1: Deploy ke Vercel via GitHub (Paling Direkomendasikan)
1. Ekspor / Push project ini ke repositori **GitHub** Anda.
2. Buka [https://vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
3. Klik tombol **"Add New..."** > **"Project"**.
4. Pilih repositori GitHub proyek Kasir Pet Shop ini.
5. Vercel akan otomatis mendeteksi file `vercel.json` dan folder `web/`.
6. Klik **"Deploy"** (Tunggu sekitar 20-30 detik hingga selesai).
7. Anda akan mendapatkan URL online gratis, misalnya: `https://kasir-petshop.vercel.app`.

---

### Cara Menjalankan di iPhone / iOS (Tampilan Fullscreen seperti Aplikasi Asli)
1. Buka URL Vercel Anda di browser **Safari** pada iPhone/iPad.
2. Tekan tombol **Share** (ikon kotak dengan panah ke atas di bagian bawah Safari).
3. Gulir ke bawah dan pilih **"Add to Home Screen"** (*Tambah ke Layar Utama*).
4. Beri nama **"Kasir PetShop"** lalu klik **"Add"**.
5. Ikon Kasir Pet Shop akan muncul di Home Screen iPhone Anda.
6. Saat dibuka, aplikasi akan berjalan layar penuh (*standalone mode*) tanpa bar browser, persis seperti aplikasi iOS native!

---

### Fitur yang Tersedia di Versi Web & iOS:
- **Katalog Produk & Kategori**: Burung, Ayam, Kucing, Ikan.
- **Keranjang Belanja**: Tombol tambah/kurang cepat dan bilah melayang di bawah dengan tombol tunggal **Bayar**.
- **Pembayaran Cepat**: Mendukung **Tunai** (hitung kembalian otomatis) dan **QRIS Toko**.
- **Cetak Struk Thermal**: Langsung terintegrasi dengan printer AirPrint / Bluetooth via fitur Print iOS.
- **Koneksi Google Spreadsheet**: Tersambung langsung ke Google Apps Script Spreadsheet (sheet 6 kolom sederhana).

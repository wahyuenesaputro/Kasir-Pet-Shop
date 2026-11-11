# Rencana Reset & Format Ulang Desain Spreadsheet Pet Shop (Web & Android)

Pembersihan menyeluruh seluruh item produk dan riwayat transaksi di Google Spreadsheet serta aplikasi kasir, disertai pembaruan desain visual spreadsheet bertema **Emerald Green Modern** bergaris zebra rapi, validasi satuan terstandarisasi, dan penataan state aplikasi agar siap digunakan untuk penginputan data baru oleh pengguna.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawaban klarifikasi pengguna, berikut keputusan utama yang telah disepakati:
> - **Status Data Produk:** Dikosongkan total (hanya menyisakan baris judul dan header kolom berformat rapi) untuk 5 kategori: `Ayam`, `Burung`, `Kucing`, `Ikan`, dan `Obat`.
> - **Tema Visual Spreadsheet:** **Hijau Emerald Modern** (`#064e3b` / `#0f5132`) dengan teks putih tebal, garis batas halus, zebra striping lembut (`#f0fdf4`), dan format mata uang `Rp#,##0`.
> - **Riwayat Kas & Saldo:** Sheet `Penjualan` (7 kolom) dibersihkan riwayat lamanya dan disetel dengan baris pembuka Saldo Kas Awal = **Rp 0**.
> - **Validasi Satuan:** Kolom SATUAN dilengkapi dropdown standar: `Kg`, `Bungkus`, `Karung`, `Botol`, `Sachet`, `Pcs`, `Butir`, `Tablet`, `Kapsul`, `Ekor`.

---

### 1. Overview & Core Concept

- **Tujuan Utama:** Menghadirkan template spreadsheet profesional yang bersih, modern, dan tidak kaku/biasa, sekaligus mereset aplikasi kasir (Web Desktop & Android) ke kondisi awal yang siap menerima input produk baru esok hari.
- **Hasil yang Diberikan:**
  1. **Google Apps Script Terpadu (Code.gs):** Memiliki fungsi otomatis `bersihkanDanFormatSemuaSheet()` serta menu spreadsheet Google Sheets ("✨ Kasir Pet Shop > 🧹 Reset & Format Estetik") dan endpoint API `?action=reset_and_format` untuk dieksekusi dalam 1 klik.
  2. **Tampilan Spreadsheet Profesional:** Header bertema Emerald Green, font rapi (Roboto / Arial), zebra striping, kolom lebar proporsional dengan autofit, format mata uang otomatis, serta dropdown pilihan satuan baku.
  3. **Aplikasi Web & Android:** Tampilan empty state yang elegan ketika produk masih kosong, saldo kas kasir direset ke Rp 0, dan sistem sinkronisasi yang siap menerima produk baru tanpa memunculkan data lama.

---

### 2. User Experience & Visual Design

#### A. Desain Spreadsheet Google Sheets (Emerald Modern)
- **Palette Warna:**
  - Header Utama: Dark Emerald Green (`#064e3b`) dengan font putih tebal, tinggi baris 32px, text centered & vertically aligned.
  - Subheader / Keterangan: Muted Emerald (`#dcfce7`).
  - Zebra Striping (Baris Genap): Soft Mint (`#f0fdf4`), Baris Ganjil: Putih murni (`#ffffff`).
  - Gridlines: Soft Gray Border (`#cbd5e1`).
- **Struktur Kolom 5 Kategori Produk (Ayam, Burung, Kucing, Ikan, Obat):**
  - Kolom A: `NO` (Lebar 50px, Center)
  - Kolom B: `NAMA BARANG` (Lebar 280px, Left aligned, Font Semi-Bold)
  - Kolom C: `SATUAN` (Lebar 110px, Center, dengan Data Validation Dropdown: `Kg, Bungkus, Karung, Botol, Sachet, Pcs, Butir, Tablet, Kapsul, Ekor`)
  - Kolom D: `HARGA JUAL` (Lebar 130px, Right aligned, Format otomatis `Rp#,##0`)
  - Kolom E: `KETERANGAN` (Lebar 220px, Left aligned, Catatan/Deskripsi)
  *(Sesuai instruksi sebelumnya: Tanpa Kolom Harga Modal)*
- **Struktur Kolom Sheet `Penjualan` (Riwayat Kasir 7 Kolom):**
  - `TANGGAL | JAM | KETERANGAN | MASUK (+) | KELUAR (-) | SALDO KAS AKHIR | METODE`
  - Baris 2: Catatan pembuka saldo awal `Rp 0`.

#### B. Desain Aplikasi Kasir (Web & Android)
- **Empty State:** Ilustrasi ramah dengan pesan: *"Katalog Produk Masih Bersih & Kosong — Siap Ditambahkan dari Spreadsheet atau Form Produk"*.
- **Indikator Saldo Kas:** Menampilkan **Rp 0** dengan badge status *"Siap Operasional"*.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Otomasi Pemformatan Spreadsheet via Apps Script**
  - *Pendekatan:* Menyediakan fungsi khusus di Google Apps Script yang langsung membuat menu atas spreadsheet (*Custom Menu*) dan endpoint web. Pengguna cukup klik 1 tombol di spreadsheet untuk mereset dan memformat seluruh sheet menjadi estetik dalam sekejap.
  - *Alasan:* Menghindari keharusan pengguna mengatur warna, border, dan dropdown satu per satu secara manual di Google Sheets.
- **Decision 2: Penanganan Data Lokal di Web dan Android**
  - *Pendekatan:* Menghapus cache lokal data produk contoh lama di `SampleCatalog.kt` dan `INITIAL_PRODUCTS` di `app.js` ketika pengguna memilih reset, sehingga sinkron dengan spreadsheet yang baru dikosongkan.
  - *Alasan:* Mencegah produk default lama (seperti pakan ayam 78 item) muncul kembali saat spreadsheet kosong.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   Google Sheets Spreadsheet                 │
│  [Ayam]  [Burung]  [Kucing]  [Ikan]  [Obat]   [Penjualan]   │
│  - 5 Kolom Produk (Tanpa Modal)                - 7 Kolom Kas│
│  - Emerald Green Headers + Zebra Striping     - Saldo Rp 0 │
│  - Dropdown Satuan Standar                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Google Apps Script (Code.gs)
                - doResetAndFormatAllSheets()
                - Custom Menu: "✨ Kasir Pet Shop"
                - Web App API: ?action=reset_and_format
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│     Web Desktop Client      │ │       Android Client        │
│  - Empty State Elegan       │ │  - Empty State Elegan       │
│  - Saldo Kas Aktif: Rp 0    │ │  - Saldo Kas Aktif: Rp 0    │
│  - Dropdown Satuan Standar  │ │  - Sinkronisasi Bersih      │
└─────────────────────────────┘ └─────────────────────────────┘
```

#### Komponen yang Diperbarui:
1. **Google Apps Script Template (`web/app.js`, `public/app.js`, & `AppsScriptCodeSnippet.kt`):**
   - Menambahkan fungsi `bersihkanDanFormatSemuaSheet(ss)`.
   - Mengatur styling: Background header `#064e3b`, teks putih tebal, border rapi, font family, text wrapping, format number currency `Rp#,##0`, dan dropdown data validation untuk satuan.
   - Menambahkan event handler menu `onOpen(e)` sehingga muncul tombol di bar menu Google Sheets.
2. **Web Desktop Application (`web/app.js` & `public/app.js`):**
   - Mengupdate state awal produk menjadi kosong bila memilih reset.
   - Mengupdate opsi dropdown satuan saat menambah produk baru via form web agar selaras dengan spreadsheet.
   - Mereset saldo kas berjalan dan mutasi kasir ke Rp 0.
3. **Android Client (`SampleCatalog.kt`, `PetShopRepository.kt`, `PetShopPrefs.kt`):**
   - Menyediakan fleksibilitas reset data lokal produk & transaksi kasir ke saldo Rp 0.
   - Menjamin sinkronisasi tetap stabil saat spreadsheet berstatus kosong (tidak crash atau force close).

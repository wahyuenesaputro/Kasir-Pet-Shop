# Rencana Implementasi Fitur Saldo Kas Toko Cross-Platform

Rencana komprehensif untuk mengimplementasikan fitur **Saldo Kas Toko** yang terakumulasi otomatis pada setiap transaksi (Tunai maupun QRIS), tersimpan secara permanen pada sheet Riwayat Penjualan di Google Spreadsheet (sebagai Saldo Berjalan / *Running Balance*), tampil di Dashboard kasir, serta dapat diubah/disesuaikan nilainya melalui menu Pengaturan secara serasi (*cross-platform* antara Android, Web Vercel/iOS, dan Spreadsheet).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan keputusan berdasarkan jawaban klarifikasi Anda:
> - **Lokasi Penyimpanan di Spreadsheet**: Dicatat langsung pada sheet **`Penjualan`** (Riwayat Penjualan) dengan menambahkan kolom ke-7: **`Saldo Kas`**. Dengan demikian, setiap baris transaksi akan memperlihatkan pertambahan saldo kas secara transparan dan historis.
> - **Akumulasi Otomatis Transaksi**: Semua pembayaran baik **Tunai** maupun **QRIS** akan otomatis menambahkan nilai saldo kas berjalan (contoh: saldo Rp 100.000 + belanja Rp 36.000 = saldo baru Rp 136.000).
> - **Sinkronisasi Cross-Platform**: Berlaku dua arah untuk **Android** dan **Website Vercel (iOS)** melalui URL Google Apps Script yang sama, sehingga saldo di HP Android, iPhone/Web, dan Spreadsheet selalu sinkron dan sama persis.
> - **Pengaturan Saldo Fleksibel**: Disediakan menu di bagian **Pengaturan** (serta shortcut di Dashboard) untuk mengubah/menyesuaikan nominal saldo kas kapan saja (misal untuk setoran awal kasir, penarikan uang, atau koreksi modal).

---

### 1. Struktur Data Spreadsheet Baru (7 Kolom)

Sheet **`Penjualan`** di Google Spreadsheet akan memiliki format sebagai berikut:

```
┌────────────┬──────────┬─────────────────────────────┬──────────────┬─────────────┬─────────────┬─────────────┐
│  Tanggal   │   Jam    │   Nama Produk Yang Dibeli   │ Total Barang │ Total Harga │ Metode Bayar│  Saldo Kas  │
├────────────┼──────────┼─────────────────────────────┼──────────────┼─────────────┼─────────────┼─────────────┤
│ 2026-11-01 │ 08:00:00 │ Modal Awal Kasir            │      0       │           0 │ Saldo Awal  │   100.000   │
│ 2026-11-01 │ 08:15:30 │ 511 Bravo (1), Topsong (1)  │      2       │      26.000 │ Tunai       │   126.000   │
│ 2026-11-01 │ 08:30:10 │ Whiskas Tuna 1.2kg (1)      │      1       │      68.000 │ QRIS        │   194.000   │
│ 2026-11-01 │ 09:00:00 │ Penyesuaian Saldo Kas       │      0       │      50.000 │ Koreksi     │   244.000   │
└────────────┴──────────┴─────────────────────────────┴──────────────┴─────────────┴─────────────┴─────────────┘
```

- Saldo Kas terakhir selalu dibaca dari baris terbawah pada kolom ke-7 sheet `Penjualan`.
- Jika pengguna mengubah saldo lewat menu Pengaturan, Apps Script akan mencatat 1 baris riwayat koreksi saldo sehingga pembukuan toko tetap akuntabel dan tidak ada riwayat yang hilang.

---

### 2. Alur Kerja Teknis & API Google Apps Script

1. **`doGet(e)` (Query Saldo & Ringkasan)**:
   - Endpoint `?action=recent` dan `?action=balance` akan mengembalikan objek:
     `{ success: true, currentBalance: 194000, todayTotal: ..., todayCount: ..., recentTransactions: [...] }`
2. **`doPost(e)` (Penjualan & Penyesuaian Saldo)**:
   - **Saat Transaksi Penjualan (`action: "sale"`)**:
     - Membaca saldo terakhir dari sheet.
     - Menambahkan total belanja: `newBalance = lastBalance + totalAmount`.
     - Menyimpan baris transaksi lengkap beserta `newBalance`.
     - Mengembalikan `{ success: true, balance: newBalance }`.
   - **Saat Pengaturan Saldo Diubah (`action: "adjust_balance"`)**:
     - Menerima `targetBalance` dan `reason` dari kasir.
     - Menyimpan baris pencatatan penyesuaian kas.
     - Mengembalikan `{ success: true, balance: targetBalance }`.

---

### 3. Tampilan Antarmuka (UI/UX)

#### A. Pada Layar Dashboard Kasir (Android & Web Vercel/iOS)
- **Kartu Utama "SALDO KAS TOKO"**:
  - Ditempatkan di bagian paling atas Dashboard dengan gradasi warna biru safir ke indigo yang elegan.
  - Menampilkan angka saldo nominal besar: **Rp 194.000**.
  - Dilengkapi tombol cepat **"Atur Saldo"** dengan ikon pensil/edit untuk membuka modal pengubahan saldo secara instan.
  - Menampilkan informasi omset hari ini dan jumlah transaksi di bawah kartu saldo.

#### B. Pada Menu Pengaturan (Settings)
- **Bagian "Manajemen Saldo Kas Toko"**:
  - Menampilkan saldo aktif saat ini.
  - Input teks untuk memasukkan nominal saldo baru.
  - Tombol **"Simpan & Perbarui Saldo ke Spreadsheet"**.
  - Disertai indikator loading saat sinkronisasi berlangsung ke Google Spreadsheet.

---

### 4. Rincian Modifikasi File Proyek

1. **`app/src/main/java/com/example/ui/components/AppsScriptCodeSnippet.kt`**:
   - Perbarui kode Apps Script template ke versi 7 kolom dengan logika kalkulasi saldo berjalan (*running balance*) dan handler `adjust_balance`.
2. **`app/src/main/java/com/example/data/PetShopPrefs.kt` & `PetShopRepository.kt`**:
   - Tambahkan penyimpanan lokal `currentBalance` sebagai cache offline.
   - Tambahkan fungsi jaringan `fetchBalance()` dan `adjustBalance(newBalance, reason)`.
3. **`app/src/main/java/com/example/ui/KasirViewModel.kt` & `KasirUiState`**:
   - Tambahkan state `currentBalance: Double` pada `KasirUiState`.
   - Saat penjualan berhasil disimpan, perbarui `currentBalance` secara otomatis (`+ totalAmount`).
   - Buat fungsi `updateCashBalance(newBalance: Double)` yang mengirim pembaruan ke Google Spreadsheet.
4. **`app/src/main/java/com/example/ui/KasirScreen.kt` & `SettingsDialog.kt`**:
   - Perbarui kartu Dashboard dengan widget **Saldo Kas Toko** dan tombol ubah saldo.
   - Tambahkan form input penyesuaian saldo di `SettingsDialog`.
5. **`web/index.html` & `web/app.js` (Web Vercel / iOS)**:
   - Terapkan kartu saldo kas toko di Dashboard web.
   - Tambahkan form atur saldo di modal Pengaturan web.
   - Sambungkan ke endpoint Apps Script yang sama untuk sinkronisasi *real-time*.
6. **Kompilasi & Pembaruan APK**:
   - Jalankan `compile_applet` dan `assembleDebug` untuk memperbarui file instalasi `KasirPetShop.apk`.

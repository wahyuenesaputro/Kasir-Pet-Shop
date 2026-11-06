# Dukungan Penjualan Eceran /kg (Desimal) & Standarisasi Satuan Produk Pet Shop

Rencana implementasi penanganan barang karungan (zak) agar dijual per kilogram (kg) dengan dukungan kuantitas desimal fleksibel (seperti 0,25 kg, 0,5 kg, 1,5 kg), pilihan tombol timbangan cepat, serta standarisasi satuan produk lainnya menjadi `pcs`.

## Keputusan Kritis & Review Pengguna

> [!IMPORTANT]
> **Keputusan Terkonfirmasi dari Tanya Jawab:**
> - **Penjualan Barang Karung (Zak)**: Semua produk pakan/pasir yang berasal dari zak (karung) dijual per **kg** dengan harga patokan per kilogram.
> - **Kuantitas Desimal Fleksibel**: Kasir dapat menginput angka desimal bebas (misal `0,5` kg, `0,25` kg, `1,5` kg) serta menggunakan tombol pilihan cepat (`0,25 kg`, `0,5 kg`, `1 kg`, `1,5 kg`, `2 kg`).
> - **Penghitungan Subtotal**: Subtotal otomatis dihitung presisi: `Harga per kg × Berat (kg)` (contoh: Rp 14.000 × 0,5 kg = Rp 7.000).
> - **Barang Lainnya**: Semua produk kemasan, vitamin, obat, sangkar, dan aksesoris berstandar satuan **pcs** dengan penambahan bilangan bulat (`1`, `2`, `3...`).

---

## 1. Arsitektur & Logika Kuantitas Dinamis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       KLASIFIKASI SATUAN PRODUK                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     PRODUK KILOAN / CURAH (kg)       │  │     PRODUK KEMASAN / LAINNYA      │
│     (Pakan Ayam, Burung, Kucing,     │  │       (Vitamin, Obat, Aksesoris,  │
│      Pasir Gumpal, Ikan)             │  │        Sampo, Kandang)            │
├──────────────────────────────────────┤  ├───────────────────────────────────┤
│ • Satuan: "kg"                       │  │ • Satuan: "pcs"                   │
│ • Harga patokan: per 1 kg            │  │ • Harga patokan: per 1 pcs        │
│ • Input jumlah: Desimal bebas        │  │ • Input jumlah: Bilangan bulat    │
│ • Tombol cepat: 0.25, 0.5, 1, 1.5 kg │  │ • Tombol cepat: +1, -1            │
│ • Subtotal: round(hargaJual × kg)    │  │ • Subtotal: hargaJual × qty       │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 2. Pengalaman Pengguna (UX Kasir)

### A. Pada Layar Katalog & Kartu Produk
- Label satuan ditampilkan jelas pada setiap kartu: `Burung • kg` atau `Vitamin • pcs`.
- Harga ditampilkan sebagai `Rp 14.000 / kg` atau `Rp 8.500 / pcs`.
- Saat kasir menekan tombol `+` pada produk kiloan (`kg`), kasir langsung dapat memilih berat timbangan cepat atau mengetik angka koma (misal: pembeli beli pakan seharga setengah kilo -> pilih `0,5 kg`).

### B. Pada Keranjang Kasir (Desktop Sidebar & Mobile Drawer)
- **Barang Kiloan (`kg`)**:
  - Kolom kuantitas berupa input desimal interaktif dengan akhiran `kg`.
  - Tombol penambah cepat `+0,5 kg` atau chip berat (`0,25`, `0,5`, `1`, `1,5`, `2`).
  - Tampilan struk dan rincian transaksi: `511 Bravo (0.5 kg) - Rp 7.000`.
- **Barang Satuan (`pcs`)**:
  - Tetap menggunakan tombol kuantitas `+` dan `-` angka bulat standar (`1 pcs`, `2 pcs`).

### C. Pada Struk Pembayaran & Spreadsheet
- Keterangan mutasi mencatat jumlah berat dengan akurat: `[Nama Produk] (0.5 kg)` sehingga pemilik toko tahu persis berapa kilogram pakan yang keluar dari karung/stok.

---

## 3. Rencana Langkah Eksekusi

1. **Pembaruan Data & Logika Web (`web/app.js` & `public/app.js`)**:
   - Memperbarui daftar katalog default untuk produk curah/karungan menjadi satuan `kg` (harga per kg), dan produk lainnya berstandar `pcs`.
   - Mengubah tipe `qty` pada objek keranjang menjadi `Float` / desimal (bukan integer kaku).
   - Menambahkan fungsi pembantu penanganan kuantitas kiloan:
     - `setCartItemKg(productId, kgValue)`
     - `adjustCartItemKg(productId, delta)` (misal `+0.5` atau `-0.5`)
   - Memperbarui `getCartTotals()` agar menghitung total harga berdasarkan kuantitas desimal: `Math.round(item.qty * item.product.hargaJual)`.
2. **Pembaruan Tampilan Antarmuka (`web/index.html` & `public/index.html`)**:
   - Memperbarui rendering item keranjang di desktop dan mobile agar menampilkan kontrol khusus jika `satuan === 'kg'` (chip berat cepat `0,25`, `0,5`, `1`, `1,5` dan input angka desimal).
   - Menambahkan dialog/popover cepat saat pertama kali produk kiloan dimasukkan ke keranjang untuk memilih takaran kg.
3. **Penyelarasan ke Android App (`app/`)**:
   - Menyesuaikan model data `Product` dan `CartItem` di Kotlin agar mendukung kuantitas desimal `Double` untuk produk ber-satuan `kg`.
   - Memastikan build Android berhasil dengan `compile_applet`.
4. **Pengujian & Verifikasi**:
   - Uji transaksi produk kiloan dengan jumlah `0,5 kg` (harga setengah dari harga per kg).
   - Uji transaksi kombinasi produk kiloan (`0,5 kg`) dan produk `pcs` (`2 pcs`).
   - Verifikasi total tagihan, kembalian, struk cetak thermal, dan sinkronisasi ke Google Sheets.

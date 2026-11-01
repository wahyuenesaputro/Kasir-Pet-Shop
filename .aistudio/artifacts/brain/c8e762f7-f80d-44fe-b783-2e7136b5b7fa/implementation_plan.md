# Rencana Validasi Input Form Tambah Produk

Implementasi validasi menyeluruh pada form tambah/edit produk katalog untuk memastikan kualitas data produk. Form akan memvalidasi kolom wajib (Nama Produk, Satuan, dan Harga Jual) serta memastikan harga jual tidak boleh bernilai negatif atau nol (harus > 0), dengan pesan error berwarna merah langsung di bawah kolom input terkait.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan keputusan berdasarkan jawaban klarifikasi Anda:
> - **Gaya Tampilan Pesan Error**: Teks berwarna merah langsung di bawah kolom input (`supportingText`) disertai garis tepi merah pada kolom (`isError = true`).
> - **Kolom Wajib Diisi**:
>   1. **Nama Produk** (tidak boleh kosong atau hanya spasi).
>   2. **Satuan Jual** (tidak boleh kosong, contoh: `pcs`, `kg`, `zak`).
>   3. **Harga Jual** (wajib diisi angka, dan harus lebih besar dari Rp 0).
> - **Validasi Harga**: Harga tidak boleh negatif (`< 0`) dan tidak boleh nol (`== 0`). Nilai minimal yang diizinkan adalah Rp 1 (misal: Rp 1.000, Rp 15.000, dst).

---

### 1. Overview & Core Concept

- **Apa yang Dihadirkan**: Form pendaftaran dan pembaruan produk katalog yang aman dan bebas kesalahan input.
- **Masalah yang Diselesaikan**: Mencegah kasir atau admin memasukkan produk tanpa nama, tanpa satuan, atau produk dengan harga Rp 0 / minus yang berisiko merugikan toko atau mengacaukan pembukuan.
- **Responsivitas Validasi**: Pesan error merah akan langsung dihilangkan begitu pengguna mulai mengetikkan input yang benar, memberikan pengalaman pengguna yang mulus (*responsive feedback*).

---

### 2. User Experience & Visual Design

#### A. Tampilan Kolom Input Form (`ProductFormDialog`)
1. **Nama Produk**:
   - Label: `Nama Produk *`
   - Jika kosong saat disimpan / dikosongkan: Garis tepi merah dan teks merah di bawahnya: *"Nama produk wajib diisi"*.
2. **Satuan Jual**:
   - Label: `Satuan Jual *`
   - Pilihan cepat chip tetap tersedia (`pcs`, `kg`, `zak`, `bungkus`, dll).
   - Jika dikosongkan: Garis tepi merah dan teks merah: *"Satuan produk wajib diisi (contoh: pcs, kg, zak)"*.
3. **Harga Jual (Rp)**:
   - Label: `Harga Jual (Rp) *`
   - Prefix: `Rp `
   - Jika kosong: *"Harga jual wajib diisi"*.
   - Jika bernilai 0: *"Harga jual tidak boleh Rp 0 (harus lebih dari 0)"*.
   - Jika bernilai negatif: *"Harga jual tidak boleh bernilai negatif"*.
   - Jika format angka tidak valid: *"Masukkan nominal angka harga yang valid"*.

#### B. Logika Tombol Simpan
- Saat tombol **`Tambah ke Katalog`** atau **`Simpan Perubahan`** ditekan:
  - Form melakukan pemeriksaan serentak untuk ketiga kolom wajib.
  - Jika ada satu atau lebih kolom yang tidak memenuhi syarat, proses simpan dibatalkan dan semua pesan error yang sesuai ditampilkan serentak.
  - Pengguna langsung dapat melihat kolom mana yang perlu diperbaiki.

---

### 3. Detail Teknis & Perubahan File

```
┌────────────────────────────────────────────────────────┐
│               ProductFormDialog (Compose)              │
├────────────────────────────────────────────────────────┤
│ [ Nama Produk *                                      ] │
│ ⚠ Nama produk wajib diisi                              │
│                                                        │
│ [ Kategori Produk: (Ayam) (Burung) (Kucing) (Ikan)   ] │
│                                                        │
│ [ Satuan Jual *                                      ] │
│ ⚠ Satuan produk wajib diisi (contoh: pcs, kg)          │
│                                                        │
│ [ Harga Jual (Rp) *                                  ] │
│ ⚠ Harga jual harus lebih besar dari Rp 0               │
│                                                        │
│                           [ Batal ]  [ Simpan Produk ] │
└────────────────────────────────────────────────────────┘
```

1. **`app/src/main/java/com/example/ui/components/ProductFormDialog.kt`**:
   - Tambahkan state pesan error spesifik:
     - `nameErrorMessage: String?`
     - `unitErrorMessage: String?`
     - `priceErrorMessage: String?`
   - Terapkan `isError` dan `supportingText = { ... }` pada `OutlinedTextField` Nama Produk, Satuan Jual, dan Harga Jual.
   - Pada handler `onClick` tombol simpan, validasi ketiga kolom secara ketat sebelum mengeksekusi `onSaveProduct`.
2. **`app/src/main/java/com/example/ui/components/AddCustomItemDialog.kt`** (Konsistensi):
   - Selaraskan validasi yang sama untuk dialog tambah barang manual di kasir agar harga barang bebas juga tidak boleh 0 atau negatif.

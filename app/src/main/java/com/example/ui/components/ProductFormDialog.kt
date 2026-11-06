package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddBusiness
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.model.Product

@Composable
fun ProductFormDialog(
    initialProduct: Product? = null,
    onDismiss: () -> Unit,
    onSaveProduct: (id: String?, name: String, category: String, unit: String, price: Double) -> Unit
) {
    val isEditMode = initialProduct != null

    var nameInput by remember { mutableStateOf(initialProduct?.namaProduk ?: "") }
    var categoryInput by remember { mutableStateOf(initialProduct?.kategori ?: "Ayam") }
    var unitInput by remember { mutableStateOf(initialProduct?.satuan ?: "pcs") }
    var priceInput by remember {
        mutableStateOf(
            if (initialProduct != null && initialProduct.hargaJual > 0) {
                if (initialProduct.hargaJual % 1.0 == 0.0) {
                    initialProduct.hargaJual.toLong().toString()
                } else {
                    initialProduct.hargaJual.toString()
                }
            } else ""
        )
    }

    // State pesan error untuk masing-masing kolom wajib
    var nameErrorMessage by remember { mutableStateOf<String?>(null) }
    var unitErrorMessage by remember { mutableStateOf<String?>(null) }
    var priceErrorMessage by remember { mutableStateOf<String?>(null) }

    val categories = listOf("Ayam", "Burung", "Ikan", "Kucing", "Lainnya")
    val popularUnits = listOf("pcs", "kg", "karung", "dus", "bungkus", "botol")
    val quickPrices = listOf(3000, 5000, 8000, 10000, 12000, 15000, 20000)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .testTag("product_form_dialog"),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.padding(end = 10.dp)
                        ) {
                            Icon(
                                imageVector = if (isEditMode) Icons.Default.Edit else Icons.Default.AddBusiness,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                        Column {
                            Text(
                                text = if (isEditMode) "Edit Produk" else "Tambah Produk Baru",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = if (isEditMode) "Perbarui informasi produk katalog" else "Daftarkan pakan/barang baru ke katalog",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Tutup")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // 1. Input Nama Produk (Wajib Diisi)
                OutlinedTextField(
                    value = nameInput,
                    onValueChange = {
                        nameInput = it
                        if (it.isNotBlank()) nameErrorMessage = null
                    },
                    label = { Text("Nama Produk *") },
                    placeholder = { Text("Contoh: 511 Bravo, Topsong...") },
                    singleLine = true,
                    isError = nameErrorMessage != null,
                    supportingText = {
                        nameErrorMessage?.let { msg ->
                            Text(
                                text = msg,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_crud_product_name")
                )

                Spacer(modifier = Modifier.height(8.dp))

                // 2. Pilih Kategori
                Text(
                    text = "Kategori Produk",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    categories.forEach { cat ->
                        val isSelected = categoryInput.equals(cat, ignoreCase = true)
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent),
                            modifier = Modifier
                                .clickable { categoryInput = cat }
                                .testTag("select_cat_$cat")
                        ) {
                            Text(
                                text = cat,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 3. Input Satuan (Wajib Diisi) & Pilihan Cepat Satuan
                OutlinedTextField(
                    value = unitInput,
                    onValueChange = {
                        unitInput = it
                        if (it.isNotBlank()) unitErrorMessage = null
                    },
                    label = { Text("Satuan Jual *") },
                    placeholder = { Text("Contoh: pcs, kg, karung") },
                    singleLine = true,
                    isError = unitErrorMessage != null,
                    supportingText = {
                        unitErrorMessage?.let { msg ->
                            Text(
                                text = msg,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_crud_unit")
                )

                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    popularUnits.forEach { u ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f),
                            modifier = Modifier.clickable {
                                unitInput = u
                                unitErrorMessage = null
                            }
                        ) {
                            Text(
                                text = u,
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 4. Input Harga Jual (Wajib Diisi & Tidak Boleh Nol/Negatif)
                OutlinedTextField(
                    value = priceInput,
                    onValueChange = {
                        priceInput = it
                        priceErrorMessage = null
                    },
                    label = { Text("Harga Jual (Rp) *") },
                    placeholder = { Text("Masukkan nominal harga jual...") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    prefix = { Text("Rp ", fontWeight = FontWeight.Bold) },
                    singleLine = true,
                    isError = priceErrorMessage != null,
                    supportingText = {
                        priceErrorMessage?.let { msg ->
                            Text(
                                text = msg,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_crud_price")
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Chip Cepat Harga
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    quickPrices.forEach { qp ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                            modifier = Modifier.clickable {
                                priceInput = qp.toString()
                                priceErrorMessage = null
                            }
                        ) {
                            Text(
                                text = "${qp / 1000}rb",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Tombol Aksi: Batal & Simpan
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Batal")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            var hasError = false

                            // Validasi 1: Nama Produk wajib diisi
                            if (nameInput.isBlank()) {
                                nameErrorMessage = "Nama produk wajib diisi"
                                hasError = true
                            } else {
                                nameErrorMessage = null
                            }

                            // Validasi 2: Satuan wajib diisi
                            if (unitInput.isBlank()) {
                                unitErrorMessage = "Satuan produk wajib diisi (contoh: pcs, kg, karung)"
                                hasError = true
                            } else {
                                unitErrorMessage = null
                            }

                            // Validasi 3: Harga Jual wajib diisi, tidak boleh 0 atau negatif
                            val cleanPriceStr = priceInput.replace(".", "").replace(",", ".").trim()
                            val parsedPrice = cleanPriceStr.toDoubleOrNull()
                            if (cleanPriceStr.isBlank()) {
                                priceErrorMessage = "Harga jual wajib diisi"
                                hasError = true
                            } else if (parsedPrice == null) {
                                priceErrorMessage = "Format harga jual tidak valid"
                                hasError = true
                            } else if (parsedPrice == 0.0) {
                                priceErrorMessage = "Harga jual tidak boleh Rp 0 (harus lebih dari 0)"
                                hasError = true
                            } else if (parsedPrice < 0.0) {
                                priceErrorMessage = "Harga jual tidak boleh bernilai negatif"
                                hasError = true
                            } else {
                                priceErrorMessage = null
                            }

                            if (hasError || parsedPrice == null || parsedPrice <= 0.0) {
                                return@Button
                            }

                            onSaveProduct(
                                initialProduct?.id,
                                nameInput.trim(),
                                categoryInput.trim(),
                                unitInput.trim(),
                                parsedPrice
                            )
                        },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.testTag("btn_save_crud_product")
                    ) {
                        Text(if (isEditMode) "Simpan Perubahan" else "Tambah ke Katalog", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PriceChange
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.CartItem
import com.example.model.Product
import com.example.model.formatQuantity
import com.example.model.formatRupiah
import com.example.ui.theme.BirdColor
import com.example.ui.theme.CatColor
import com.example.ui.theme.ChickenColor
import com.example.ui.theme.FishColor

@Composable
fun ProductCard(
    product: Product,
    cartItem: CartItem?,
    onAddToCart: (Product, Double) -> Unit,
    onSetQuantity: (String, Double) -> Unit,
    onEditSellingPrice: (Product) -> Unit,
    modifier: Modifier = Modifier
) {
    var showDecimalDialog by remember { mutableStateOf(false) }

    val categoryColor = when (product.kategori.lowercase()) {
        "burung" -> BirdColor
        "kucing" -> CatColor
        "ayam" -> ChickenColor
        "ikan" -> FishColor
        else -> MaterialTheme.colorScheme.primary
    }

    val currentQty = cartItem?.quantity ?: 0.0
    val isInCart = currentQty > 0.0

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("product_card_${product.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isInCart) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            } else if (!product.isSellable) {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        border = BorderStroke(
            width = if (isInCart) 2.dp else 1.dp,
            color = if (isInCart) {
                MaterialTheme.colorScheme.primary
            } else if (!product.isSellable) {
                MaterialTheme.colorScheme.error.copy(alpha = 0.3f)
            } else {
                MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isInCart) 3.dp else 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            // Header baris kartu: Tag kategori & status harga
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = categoryColor.copy(alpha = 0.12f),
                    border = BorderStroke(0.5.dp, categoryColor.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = product.kategori,
                        color = categoryColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }

                if (!product.isSellable) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.8f)
                    ) {
                        Text(
                            text = "Belum Ada Harga Jual",
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                } else if (product.catatan.isNotBlank()) {
                    Text(
                        text = product.catatan,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Nama Produk
            Text(
                text = product.namaProduk,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Bagian Bawah: Harga Jual & Kontrol Aksi
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    if (product.isSellable) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = formatRupiah(product.hargaJual),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary,
                                fontSize = 18.sp
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            // Ikon kecil untuk ubah harga jual master jika mau
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Ubah harga jual",
                                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f),
                                modifier = Modifier
                                    .size(14.dp)
                                    .clickable { onEditSellingPrice(product) }
                            )
                        }
                        Text(
                            text = "per ${product.satuan}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        Text(
                            text = "Harga Jual: Rp -",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.outline
                        )
                        Text(
                            text = "Ketuk untuk atur harga",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Tombol Aksi (+ / - atau "Isi Harga Jual")
                if (product.isSellable) {
                    if (isInCart) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            // Tombol Kurang (-)
                            FilledTonalIconButton(
                                onClick = {
                                    val step = if (product.satuan.lowercase() == "kg") 0.5 else 1.0
                                    val newQty = (currentQty - step).coerceAtLeast(0.0)
                                    onSetQuantity(product.id, newQty)
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .testTag("decrease_btn_${product.id}"),
                                shape = CircleShape,
                                colors = IconButtonDefaults.filledTonalIconButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer
                                )
                            ) {
                                Icon(Icons.Default.Remove, contentDescription = "Kurang", modifier = Modifier.size(18.dp))
                            }

                            // Kuantitas badge (bisa diklik untuk input angka desimal langsung)
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier
                                    .clickable { showDecimalDialog = true }
                                    .padding(horizontal = 2.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = formatQuantity(currentQty),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Icon(
                                        Icons.Default.Edit,
                                        contentDescription = "Edit desimal",
                                        tint = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }

                            // Tombol Tambah (+)
                            FilledTonalIconButton(
                                onClick = {
                                    val step = if (product.satuan.lowercase() == "kg") 0.5 else 1.0
                                    onSetQuantity(product.id, currentQty + step)
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .testTag("increase_btn_${product.id}"),
                                shape = CircleShape,
                                colors = IconButtonDefaults.filledTonalIconButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primary
                                )
                            ) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Tambah",
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    } else {
                        // Tombol Tambah (+) Pertama Kali: Harus pencet tombol + untuk menambah produk
                        FilledTonalIconButton(
                            onClick = { onAddToCart(product, 1.0) },
                            modifier = Modifier
                                .size(44.dp)
                                .testTag("add_first_btn_${product.id}"),
                            shape = CircleShape,
                            colors = IconButtonDefaults.filledTonalIconButtonColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = "Tambah ke keranjang",
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                } else {
                    // Tombol Khusus untuk Mengisi Harga Jual Langsung
                    FilledTonalButton(
                        onClick = { onEditSellingPrice(product) },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        ),
                        modifier = Modifier.testTag("set_price_btn_${product.id}")
                    ) {
                        Icon(Icons.Default.PriceChange, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Isi Harga Jual", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    // Dialog input jumlah desimal
    if (showDecimalDialog) {
        var inputVal by remember { mutableStateOf(formatQuantity(currentQty).replace(".", ",")) }
        var isError by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showDecimalDialog = false },
            title = {
                Text(
                    text = "Atur Jumlah: ${product.namaProduk}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column {
                    Text(
                        text = "Satuan: ${product.satuan}. Boleh desimal (misal 0,5 atau 1,25).",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = inputVal,
                        onValueChange = {
                            inputVal = it
                            isError = false
                        },
                        label = { Text("Jumlah (${product.satuan})") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        isError = isError,
                        modifier = Modifier.fillMaxWidth().testTag("decimal_qty_input")
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        listOf("0.25", "0.5", "1", "2", "5").forEach { chipVal ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f),
                                modifier = Modifier.clickable { inputVal = chipVal.replace(".", ",") }
                            ) {
                                Text(
                                    text = "$chipVal ${product.satuan}",
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val parsed = inputVal.replace(",", ".").toDoubleOrNull()
                        if (parsed != null && parsed >= 0.0) {
                            onSetQuantity(product.id, parsed)
                            showDecimalDialog = false
                        } else {
                            isError = true
                        }
                    }
                ) {
                    Text("Simpan", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDecimalDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

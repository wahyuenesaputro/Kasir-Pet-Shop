package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.CartItem
import com.example.model.Product
import com.example.model.formatQuantity
import com.example.model.formatRupiah
import com.example.ui.theme.BirdColor
import com.example.ui.theme.BirdColorContainer
import com.example.ui.theme.CatColor
import com.example.ui.theme.CatColorContainer
import com.example.ui.theme.ChickenColor
import com.example.ui.theme.ChickenColorContainer
import com.example.ui.theme.FishColor
import com.example.ui.theme.FishColorContainer
import com.example.ui.theme.GeneralColor
import com.example.ui.theme.GeneralColorContainer

data class CategoryAvatarConfig(
    val emoji: String,
    val iconColor: Color,
    val containerColor: Color
)

fun getCategoryConfig(category: String): CategoryAvatarConfig {
    return when (category.lowercase()) {
        "ayam" -> CategoryAvatarConfig("🐔", ChickenColor, ChickenColorContainer)
        "burung" -> CategoryAvatarConfig("🐦", BirdColor, BirdColorContainer)
        "kucing" -> CategoryAvatarConfig("🐱", CatColor, CatColorContainer)
        "ikan" -> CategoryAvatarConfig("🐟", FishColor, FishColorContainer)
        else -> CategoryAvatarConfig("📦", GeneralColor, GeneralColorContainer)
    }
}

/**
 * Kartu Produk Khusus Tata Letak Grid 2 Kolom (Clean Minimalist Neo-POS)
 * - Avatar kategori menonjol di sudut atas
 * - Nama produk dengan tinggi seimbang
 * - Badge harga tebal dengan background lembut
 * - Tombol aksi '+' terpisah agar kasir nyaman saat scrolling layar
 */
@Composable
fun ProductCard(
    product: Product,
    cartItem: CartItem?,
    onAddToCart: (Product, Double) -> Unit,
    onSetQuantity: (String, Double) -> Unit,
    modifier: Modifier = Modifier
) {
    var showDecimalDialog by remember { mutableStateOf(false) }

    val catConfig = remember(product.kategori) { getCategoryConfig(product.kategori) }
    val currentQty = cartItem?.quantity ?: 0.0
    val isInCart = currentQty > 0.0

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("product_card_${product.id}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isInCart) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        border = BorderStroke(
            width = if (isInCart) 2.dp else 1.dp,
            color = if (isInCart) {
                MaterialTheme.colorScheme.primary
            } else if (!product.isSellable) {
                MaterialTheme.colorScheme.error.copy(alpha = 0.35f)
            } else {
                MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
            }
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isInCart) 4.dp else 1.5.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Bagian Atas: Avatar Kategori Menonjol & Chip Satuan Barang
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                // Avatar Kategori Menonjol (Lingkaran Berwarna)
                Surface(
                    shape = CircleShape,
                    color = catConfig.containerColor,
                    border = BorderStroke(1.dp, catConfig.iconColor.copy(alpha = 0.35f)),
                    modifier = Modifier.size(38.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = catConfig.emoji,
                            fontSize = 20.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                // Satuan / Kategori Chip
                Column(horizontalAlignment = Alignment.End) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ) {
                        Text(
                            text = product.satuan.lowercase(),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }

                    if (!product.isSellable) {
                        Spacer(modifier = Modifier.height(3.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.errorContainer
                        ) {
                            Text(
                                text = "Harga 0",
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Nama Produk (2 baris, tebal, kontras tinggi)
            Text(
                text = product.namaProduk,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                lineHeight = 18.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.height(38.dp)
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Badge Harga Jual Tebal (Read-only di Kasir)
            if (product.isSellable) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f),
                    border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = formatRupiah(product.hargaJual),
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                    )
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Harga: Rp -",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Tombol Aksi Keranjang / Stepper Kuantitas
            if (product.isSellable) {
                if (isInCart) {
                    // Kontrol Kuantitas Ringkas untuk Grid 2 Kolom
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Tombol Kurang (-)
                        FilledTonalIconButton(
                            onClick = {
                                val step = if (product.satuan.lowercase() == "kg") 0.5 else 1.0
                                val newQty = (currentQty - step).coerceAtLeast(0.0)
                                onSetQuantity(product.id, newQty)
                            },
                            modifier = Modifier
                                .size(34.dp)
                                .testTag("decrease_btn_${product.id}"),
                            shape = CircleShape,
                            colors = IconButtonDefaults.filledTonalIconButtonColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "Kurang", modifier = Modifier.size(16.dp))
                        }

                        // Jumlah Badge (Bisa diklik untuk memasukkan angka desimal)
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 4.dp)
                                .clickable { showDecimalDialog = true }
                        ) {
                            Text(
                                text = formatQuantity(currentQty),
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(vertical = 6.dp)
                            )
                        }

                        // Tombol Tambah (+)
                        FilledTonalIconButton(
                            onClick = {
                                val step = if (product.satuan.lowercase() == "kg") 0.5 else 1.0
                                onSetQuantity(product.id, currentQty + step)
                            },
                            modifier = Modifier
                                .size(34.dp)
                                .testTag("increase_btn_${product.id}"),
                            shape = CircleShape,
                            colors = IconButtonDefaults.filledTonalIconButtonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Tambah", modifier = Modifier.size(16.dp))
                        }
                    }
                } else {
                    // Tombol Tambah Pertama Kali (+)
                    // Berbentuk pill atau tombol bundar yang jelas dan tidak memicu klik saat scroll
                    FilledTonalButton(
                        onClick = { onAddToCart(product, 1.0) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(38.dp)
                            .testTag("add_first_btn_${product.id}"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = "Tambah",
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Tambah",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            } else {
                // Info jika belum ada harga jual di master data (diatur via tab Katalog)
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(38.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "Atur di Katalog",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.outline
                        )
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
                        text = "Satuan: ${product.satuan}. Bisa input desimal (contoh 0,5 atau 1,25).",
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("decimal_qty_input")
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        listOf("0.25", "0.5", "1", "2", "5").forEach { chipVal ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.6f),
                                modifier = Modifier.clickable { inputVal = chipVal.replace(".", ",") }
                            ) {
                                Text(
                                    text = "$chipVal ${product.satuan}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp)
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

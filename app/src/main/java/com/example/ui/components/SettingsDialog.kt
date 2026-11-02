package com.example.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.PriceChange
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.model.formatRupiah

@Composable
fun SettingsDialog(
    currentUrl: String,
    currentBalance: Double = 0.0,
    unpricedCount: Int = 0,
    initialTab: Int = 0,
    onSaveUrl: (String) -> Unit,
    onSyncNow: () -> Unit,
    onOpenPriceManagement: () -> Unit,
    onAdjustBalance: (newBalance: Double, mutationType: String, amount: Double, reason: String) -> Unit = { _, _, _, _ -> },
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var selectedTab by remember { mutableIntStateOf(initialTab.coerceIn(0, 1)) }
    
    // Tab 1 (Spreadsheet) States
    var inputUrl by remember { mutableStateOf(currentUrl) }

    // Tab 2 (Kelola Saldo Kas) States
    // mutationType: "add" (Tambah Kas), "withdraw" (Tarik Kas), "set" (Setel Langsung)
    var mutationType by remember { mutableStateOf("add") }
    var amountInput by remember { mutableStateOf("") }
    var reasonInput by remember { mutableStateOf("Tambah Modal Kasir") }
    var validationError by remember { mutableStateOf<String?>(null) }

    val quickAddAmounts = listOf(20000L, 50000L, 100000L, 200000L, 500000L)
    val quickWithdrawAmounts = listOf(10000L, 20000L, 50000L, 100000L, 250000L)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .padding(vertical = 16.dp),
            shape = RoundedCornerShape(22.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header Dialog
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Pengaturan Toko",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Koneksi Spreadsheet & Saldo Kas",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.testTag("close_settings_button")
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Tutup")
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // NAVIGASI DUA TAB TERPISAH (TAB 0: SPREADSHEET, TAB 1: KELOLA SALDO KAS)
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    contentColor = MaterialTheme.colorScheme.primary,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = MaterialTheme.colorScheme.primary
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("settings_tab_row")
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Text(
                                text = "Koneksi Sheets",
                                fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 13.sp
                            )
                        },
                        icon = {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        modifier = Modifier.testTag("tab_spreadsheet_connection")
                    )

                    Tab(
                        selected = selectedTab == 1,
                        onClick = {
                            selectedTab = 1
                            if (mutationType == "add" && reasonInput.isBlank()) {
                                reasonInput = "Tambah Modal Kasir"
                            }
                        },
                        text = {
                            Text(
                                text = "Atur Saldo Kas",
                                fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 13.sp
                            )
                        },
                        icon = {
                            Icon(
                                imageVector = Icons.Default.AccountBalanceWallet,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        modifier = Modifier.testTag("tab_manage_cash_balance")
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // ==============================================================
                // HALAMAN / TAB 0: KONEKSI GOOGLE SPREADSHEET
                // ==============================================================
                if (selectedTab == 0) {
                    // Status Koneksi Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (currentUrl.isNotBlank()) {
                                Color(0xFF10B981).copy(alpha = 0.12f)
                            } else {
                                MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f)
                            }
                        ),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(
                            1.dp,
                            if (currentUrl.isNotBlank()) Color(0xFF10B981).copy(alpha = 0.4f) else MaterialTheme.colorScheme.error.copy(alpha = 0.4f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (currentUrl.isNotBlank()) Icons.Default.CheckCircle else Icons.Default.HelpOutline,
                                contentDescription = null,
                                tint = if (currentUrl.isNotBlank()) Color(0xFF059669) else MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (currentUrl.isNotBlank()) "Terhubung ke Google Spreadsheet" else "Belum Terhubung ke Spreadsheet",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = if (currentUrl.isNotBlank()) Color(0xFF065F46) else MaterialTheme.colorScheme.error
                                )
                                Text(
                                    text = if (currentUrl.isNotBlank()) "Katalog, mutasi saldo, & riwayat tersinkron otomatis." else "Masukkan URL Web App Apps Script di bawah untuk menyambungkan.",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "URL Web App Google Apps Script",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = inputUrl,
                        onValueChange = { inputUrl = it.trim() },
                        label = { Text("URL Web App (APPS_SCRIPT_URL)") },
                        placeholder = { Text("https://script.google.com/macros/s/.../exec") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("apps_script_url_input"),
                        trailingIcon = {
                            if (inputUrl.isNotBlank()) {
                                IconButton(onClick = { inputUrl = "" }) {
                                    Icon(Icons.Default.Close, contentDescription = "Hapus")
                                }
                            }
                        }
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                onSaveUrl(inputUrl)
                                Toast.makeText(context, "URL berhasil disimpan!", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .testTag("save_url_button"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Simpan URL", fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                onSaveUrl(inputUrl)
                                onSyncNow()
                                Toast.makeText(context, "Menyinkronkan data...", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .testTag("sync_now_button"),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sinkronkan", fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Pintasan Input Harga Manual jika ada produk belum ada harganya
                    if (unpricedCount > 0) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.PriceChange, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "$unpricedCount Produk Belum Ada Harga",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.titleSmall
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Isi harga jual manual untuk produk yang belum memiliki harga di spreadsheet.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Button(
                                    onClick = {
                                        onDismiss()
                                        onOpenPriceManagement()
                                    },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Buka Kelola & Input Harga", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(18.dp))
                    }

                    // PANDUAN PENYETELAN APPS SCRIPT
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.HelpOutline,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Panduan Pasang / Update Script Mutasi Kas:",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleSmall
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            val steps = listOf(
                                "1. Buka spreadsheet Google Sheets Anda",
                                "2. Klik menu 'Ekstensi' > 'Apps Script'",
                                "3. Hapus semua isi Code.gs, lalu tempel kode mutasi kas terbaru (klik tombol Salin di bawah)",
                                "4. Klik Simpan (ikon Disket)",
                                "5. Klik Deploy > Kelola deployment (Manage deployments)",
                                "6. Klik ikon Pensil (Edit) pada deployment aktif",
                                "7. Di pilihan Versi (Version), pilih 'Versi baru' (New version)",
                                "8. Klik Terapkan (Deploy). Tab Penjualan langsung mencatat mutasi kas secara rapi!"
                            )

                            steps.forEach { step ->
                                Text(
                                    text = step,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Button(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Apps Script Code.gs", AppsScriptCodeSnippet.CODE)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Kode Apps Script disalin ke Clipboard!", Toast.LENGTH_LONG).show()
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                                    .testTag("copy_script_button"),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Salin Kode Apps Script (Code.gs)", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // ==============================================================
                // HALAMAN / TAB 1: KELOLA SALDO KAS TOKO (ATUR SALDO)
                // ==============================================================
                if (selectedTab == 1) {
                    // Card Ringkasan Saldo Saat Ini
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.AccountBalanceWallet,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "SALDO KAS AKTIF SAAT INI",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "Sinkron Sheets",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = formatRupiah(currentBalance),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onSurface
                            )

                            Text(
                                text = "Otomatis bertambah dari penjualan kasir & dapat disesuaikan di bawah.",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Pilihan Tipe Aksi: Tambah Kas vs Tarik Kas vs Setel Langsung
                    Text(
                        text = "Pilih Aksi Mutasi Saldo:",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = mutationType == "add",
                            onClick = {
                                mutationType = "add"
                                reasonInput = "Tambah Modal Kasir"
                                validationError = null
                            },
                            label = { Text("Tambah (+)") },
                            leadingIcon = {
                                Icon(Icons.Default.AddCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF10B981).copy(alpha = 0.2f),
                                selectedLabelColor = Color(0xFF047857)
                            ),
                            modifier = Modifier.weight(1f).testTag("chip_mutation_add")
                        )

                        FilterChip(
                            selected = mutationType == "withdraw",
                            onClick = {
                                mutationType = "withdraw"
                                reasonInput = "Tarik Saldo Kas / Keperluan Toko"
                                validationError = null
                            },
                            label = { Text("Tarik (-)") },
                            leadingIcon = {
                                Icon(Icons.Default.RemoveCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.35f),
                                selectedLabelColor = MaterialTheme.colorScheme.error
                            ),
                            modifier = Modifier.weight(1f).testTag("chip_mutation_withdraw")
                        )

                        FilterChip(
                            selected = mutationType == "set",
                            onClick = {
                                mutationType = "set"
                                reasonInput = "Koreksi Saldo Manual"
                                validationError = null
                            },
                            label = { Text("Setel") },
                            leadingIcon = {
                                Icon(Icons.Default.Tune, contentDescription = null, modifier = Modifier.size(16.dp))
                            },
                            modifier = Modifier.weight(0.9f).testTag("chip_mutation_set")
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Input Nominal Angka
                    val inputLabel = when (mutationType) {
                        "add" -> "Nominal Tambah Saldo (Rp)"
                        "withdraw" -> "Nominal Tarik Saldo (Rp)"
                        else -> "Target Saldo Akhir Baru (Rp)"
                    }

                    OutlinedTextField(
                        value = amountInput,
                        onValueChange = {
                            amountInput = it.filter { ch -> ch.isDigit() }
                            validationError = null
                        },
                        label = { Text(inputLabel) },
                        placeholder = { Text(if (mutationType == "set") "Contoh: 500000" else "Contoh: 50000") },
                        prefix = { Text("Rp ", fontWeight = FontWeight.Bold) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        isError = validationError != null,
                        supportingText = validationError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("balance_mutation_amount_input")
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Chip Nominal Cepat
                    val activeChips = if (mutationType == "withdraw") quickWithdrawAmounts else quickAddAmounts
                    Text(
                        text = "Pilihan Nominal Cepat:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        activeChips.forEach { amt ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                modifier = Modifier.clickable {
                                    amountInput = amt.toString()
                                    validationError = null
                                }
                            ) {
                                Text(
                                    text = "+${formatRupiah(amt.toDouble())}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Input Alasan / Keterangan Mutasi Kas
                    OutlinedTextField(
                        value = reasonInput,
                        onValueChange = { reasonInput = it },
                        label = { Text("Keterangan / Alasan Mutasi") },
                        placeholder = { Text("Contoh: Modal Awal, Beli Pakan Tambahan, Tarik Prive") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("balance_mutation_reason_input")
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Pratinjau Saldo Akhir Berjalan
                    val enteredAmount = amountInput.toDoubleOrNull() ?: 0.0
                    val projectedBalance = when (mutationType) {
                        "add" -> currentBalance + enteredAmount
                        "withdraw" -> currentBalance - enteredAmount
                        else -> enteredAmount
                    }

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Pratinjau Saldo Akhir:",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = formatRupiah(projectedBalance.coerceAtLeast(0.0)),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (mutationType == "withdraw" && enteredAmount > currentBalance) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.primary
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Tombol Eksekusi: Simpan & Catat ke Spreadsheet
                    Button(
                        onClick = {
                            val amt = amountInput.toDoubleOrNull()
                            if (amt == null || amt <= 0.0) {
                                validationError = "Masukkan nominal angka yang lebih besar dari 0"
                                return@Button
                            }

                            if (mutationType == "withdraw" && amt > currentBalance) {
                                validationError = "Saldo kas tidak mencukupi penarikan sebesar Rp ${formatRupiah(amt)}"
                                return@Button
                            }

                            val calculatedNewBalance = when (mutationType) {
                                "add" -> currentBalance + amt
                                "withdraw" -> (currentBalance - amt).coerceAtLeast(0.0)
                                else -> amt
                            }

                            val finalReason = reasonInput.ifBlank {
                                when (mutationType) {
                                    "add" -> "Tambah Modal Kasir"
                                    "withdraw" -> "Tarik Kas Toko"
                                    else -> "Penyesuaian Saldo Kas"
                                }
                            }

                            onAdjustBalance(calculatedNewBalance, mutationType, amt, finalReason)
                            Toast.makeText(context, "Mutasi saldo kas berhasil disimpan & dicatat ke Google Sheets!", Toast.LENGTH_LONG).show()
                            amountInput = ""
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("btn_save_balance_mutation"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (mutationType == "withdraw") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = when (mutationType) {
                                "add" -> "Catat Tambah Kas ke Spreadsheet"
                                "withdraw" -> "Catat Tarik Kas ke Spreadsheet"
                                else -> "Simpan Saldo ke Spreadsheet"
                            },
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

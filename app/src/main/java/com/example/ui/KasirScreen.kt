package com.example.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.model.formatQuantity
import com.example.model.formatRupiah
import com.example.ui.components.AddCustomItemDialog
import com.example.ui.components.CartSheet
import com.example.ui.components.EditPriceDialog
import com.example.ui.components.HistoryScreen
import com.example.ui.components.PaymentDialog
import com.example.ui.components.ProductCard
import com.example.ui.components.ReceiptDialog
import com.example.ui.components.SettingsDialog
import com.example.ui.components.TransactionDetailDialog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KasirScreen(
    viewModel: KasirViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var currentMainTab by remember { mutableIntStateOf(0) } // 0: Kasir, 1: Riwayat Transaksi

    val categories = listOf(
        Pair("Semua", "🔍 Semua"),
        Pair("Burung", "🐦 Burung"),
        Pair("Ayam", "🐔 Ayam"),
        Pair("Kucing", "🐱 Kucing"),
        Pair("Ikan", "🐟 Ikan")
    )

    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(text = "🐾", fontSize = 18.sp)
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Kasir Pet Shop",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                            Text(
                                text = if (uiState.appsScriptUrl.isNotBlank()) "Tersambung ke Spreadsheet" else "Semua Barang Siap Jual",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.85f)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(
                        onClick = { viewModel.loadProducts(); viewModel.loadRecent() },
                        modifier = Modifier.testTag("refresh_all_button")
                    ) {
                        if (uiState.isLoadingProducts) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Perbarui Data",
                                tint = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }

                    IconButton(
                        onClick = { viewModel.openSettings() },
                        modifier = Modifier.testTag("open_settings_button")
                    ) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Pengaturan",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        },
        bottomBar = {
            // Sticky Bottom Bar untuk Kasir
            if (currentMainTab == 0) {
                StickyBottomBar(
                    cartItemCount = uiState.cartItemCount,
                    totalAmount = uiState.cartTotal,
                    onOpenCart = { viewModel.openCartSheet() },
                    onProceedPayment = { viewModel.openPaymentDialog() }
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Tab Navigasi Utama: Kasir & Riwayat
            TabRow(
                selectedTabIndex = currentMainTab,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                // Tab 0: Kasir
                Tab(
                    selected = currentMainTab == 0,
                    onClick = { currentMainTab = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PointOfSale, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Kasir / Katalog (${uiState.products.size} Barang)", fontWeight = FontWeight.Bold)
                        }
                    },
                    modifier = Modifier.testTag("tab_kasir")
                )

                // Tab 1: Riwayat Transaksi
                Tab(
                    selected = currentMainTab == 1,
                    onClick = {
                        currentMainTab = 1
                        viewModel.loadRecent()
                    },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Riwayat Penjualan", fontWeight = FontWeight.Bold)
                        }
                    },
                    modifier = Modifier.testTag("tab_history")
                )
            }

            // Banner Peringatan jika simpan transaksi gagal
            AnimatedVisibility(visible = uiState.lastFailedSale != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Gagal kirim ke Spreadsheet. Keranjang Anda tetap aman.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Button(
                            onClick = { viewModel.retryFailedSale() },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.testTag("retry_failed_sale_button")
                        ) {
                            Text("Coba Lagi", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            when (currentMainTab) {
                0 -> {
                    // Tampilan Kasir Lengkap
                    KasirCatalogContent(
                        uiState = uiState,
                        categories = categories,
                        onSelectCategory = { viewModel.selectCategory(it) },
                        onSearchQueryChange = { viewModel.updateSearchQuery(it) },
                        onAddToCart = { prod, qty -> viewModel.addToCart(prod, qty) },
                        onSetQuantity = { id, qty -> viewModel.setItemQuantity(id, qty) },
                        onEditSellingPrice = { prod -> viewModel.openPriceEditDialog(prod) },
                        onOpenAddCustomItem = { viewModel.openAddCustomItemDialog() }
                    )
                }
                1 -> {
                    // Tampilan Riwayat Penjualan
                    HistoryScreen(
                        todaySummary = uiState.todaySummary,
                        transactions = uiState.filteredHistoryTransactions,
                        searchQuery = uiState.historySearchQuery,
                        isTodayOnly = uiState.historyFilterTodayOnly,
                        isLoading = uiState.isLoadingRecent,
                        onSearchQueryChange = { viewModel.updateHistorySearchQuery(it) },
                        onFilterTodayToggle = { viewModel.setHistoryFilterTodayOnly(it) },
                        onRefresh = { viewModel.loadRecent() },
                        onSelectTransaction = { tx -> viewModel.openHistoryDetail(tx) },
                        onOpenSettings = { viewModel.openSettings() }
                    )
                }
            }
        }
    }

    // Modal Sheet Keranjang
    if (uiState.isCartSheetOpen) {
        CartSheet(
            cart = uiState.cart,
            totalAmount = uiState.cartTotal,
            onDismiss = { viewModel.closeCartSheet() },
            onSetQuantity = { id, qty -> viewModel.setItemQuantity(id, qty) },
            onSetPrice = { id, price -> viewModel.setItemPrice(id, price) },
            onRemoveItem = { id -> viewModel.removeFromCart(id) },
            onClearCart = { viewModel.clearCart() },
            onProceedToPayment = { viewModel.openPaymentDialog() }
        )
    }

    // Dialog Pembayaran
    if (uiState.isPaymentDialogOpen) {
        PaymentDialog(
            totalAmount = uiState.cartTotal,
            isSaving = uiState.isSavingSale,
            errorMessage = uiState.errorMessage,
            onDismiss = { viewModel.closePaymentDialog() },
            onConfirmPayment = { customer, method, paid ->
                viewModel.processSale(customer, method, paid)
            }
        )
    }

    // Dialog Struk Kasir
    uiState.activeReceipt?.let { tx ->
        ReceiptDialog(
            transaction = tx,
            onDismiss = { viewModel.dismissReceipt() }
        )
    }

    // Dialog Rincian Riwayat Transaksi Lama (Hanya melihat rincian tanpa cetak ulang)
    uiState.selectedHistoryDetail?.let { tx ->
        TransactionDetailDialog(
            transaction = tx,
            onDismiss = { viewModel.closeHistoryDetail() }
        )
    }

    // Dialog Input / Ubah Harga Jual Produk
    uiState.productToEditPrice?.let { prod ->
        EditPriceDialog(
            product = prod,
            onDismiss = { viewModel.closePriceEditDialog() },
            onSavePrice = { pId, price -> viewModel.updateProductSellingPrice(pId, price) }
        )
    }

    // Dialog Tambah Item Bebas / Manual Langsung di Kasir
    if (uiState.isAddCustomItemDialogOpen) {
        AddCustomItemDialog(
            onDismiss = { viewModel.closeAddCustomItemDialog() },
            onAddItem = { name, price, unit, qty, category ->
                viewModel.addManualProductToCart(name, price, unit, qty, category)
            }
        )
    }

    // Dialog Pengaturan Spreadsheet
    if (uiState.isSettingsOpen) {
        SettingsDialog(
            currentUrl = uiState.appsScriptUrl,
            unpricedCount = uiState.unpricedProductsCount,
            onSaveUrl = { newUrl -> viewModel.updateAppsScriptUrl(newUrl) },
            onSyncNow = { viewModel.loadProducts(); viewModel.loadRecent() },
            onOpenPriceManagement = { currentMainTab = 0 },
            onDismiss = { viewModel.closeSettings() }
        )
    }
}

@Composable
private fun KasirCatalogContent(
    uiState: KasirUiState,
    categories: List<Pair<String, String>>,
    onSelectCategory: (String) -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onAddToCart: (com.example.model.Product, Double) -> Unit,
    onSetQuantity: (String, Double) -> Unit,
    onEditSellingPrice: (com.example.model.Product) -> Unit,
    onOpenAddCustomItem: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Kolom Pencarian Nama Produk
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ) {
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = onSearchQueryChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("search_product_input"),
                placeholder = { Text("Cari produk: Leopard, Topsong, Milet, 521...") },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = "Cari",
                        tint = MaterialTheme.colorScheme.primary
                    )
                },
                trailingIcon = {
                    if (uiState.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchQueryChange("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Hapus pencarian")
                        }
                    }
                },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color.Transparent
                ),
                shape = RoundedCornerShape(14.dp)
            )
        }

        // Kategori Chips + Tombol "+ Item Bebas" Langsung di Kasir
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tombol Tambah Item Bebas / Manual
            Surface(
                modifier = Modifier
                    .clickable { onOpenAddCustomItem() }
                    .testTag("btn_add_custom_item"),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "+ Item Bebas",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }

            // Kategori Chips
            categories.forEach { (catKey, catLabel) ->
                val isSelected = uiState.selectedCategory.equals(catKey, ignoreCase = true)
                Surface(
                    modifier = Modifier
                        .clickable { onSelectCategory(catKey) }
                        .testTag("category_chip_$catKey"),
                    shape = RoundedCornerShape(12.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(
                        width = if (isSelected) 1.5.dp else 1.dp,
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                    ),
                    shadowElevation = if (isSelected) 2.dp else 0.dp
                ) {
                    Text(
                        text = catLabel,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Daftar Produk dalam Kasir
        val filtered = uiState.filteredProducts

        if (uiState.isLoadingProducts && filtered.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Memuat data produk...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else if (filtered.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "📦", fontSize = 48.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tidak Ada Produk",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tidak ditemukan produk dengan kata kunci '${uiState.searchQuery}'",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(2.dp))
                }

                items(filtered, key = { it.id }) { product ->
                    val cartItem = uiState.cart.find { it.product.id == product.id }
                    ProductCard(
                        product = product,
                        cartItem = cartItem,
                        onAddToCart = onAddToCart,
                        onSetQuantity = onSetQuantity,
                        onEditSellingPrice = onEditSellingPrice
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(80.dp)) // Padding agar tidak tertutup sticky bar
                }
            }
        }
    }
}

/**
 * Sticky Bottom Bar selalu terlihat di bagian bawah layar:
 * Menampilkan total belanja, jumlah item, dan tombol Bayar / Struk.
 */
@Composable
private fun StickyBottomBar(
    cartItemCount: Double,
    totalAmount: Double,
    onOpenCart: () -> Unit,
    onProceedPayment: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 12.dp)
            .testTag("sticky_bottom_bar"),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 6.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tombol Keranjang Belanja dengan Badge
            Surface(
                modifier = Modifier
                    .clickable { onOpenCart() }
                    .testTag("open_cart_sheet_button"),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BadgedBox(
                        badge = {
                            if (cartItemCount > 0) {
                                Badge(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                ) {
                                    Text(
                                        text = formatQuantity(cartItemCount),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = "Keranjang",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Text(
                            text = "Total Belanja",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = formatRupiah(totalAmount),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Tombol Bayar / Simpan & Cetak Struk
            Button(
                onClick = onProceedPayment,
                enabled = cartItemCount > 0,
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .testTag("sticky_pay_button"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Text(
                    text = "Bayar / Struk",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}

package com.example.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.foundation.layout.navigationBarsPadding
import com.example.ui.components.AddCustomItemDialog
import com.example.ui.components.AdjustBalanceDialog
import com.example.ui.components.CartSheet
import com.example.ui.components.CatalogCrudScreen
import com.example.ui.components.DashboardScreen
import com.example.ui.components.HistoryScreen
import com.example.ui.components.PaymentDialog
import com.example.ui.components.ProductCard
import com.example.ui.components.ProductFormDialog
import com.example.ui.components.ReceiptDialog
import com.example.ui.components.SettingsDialog
import com.example.ui.components.TopNavigationBar
import com.example.ui.components.TransactionDetailDialog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KasirScreen(
    viewModel: KasirViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var currentMainTab by remember { mutableIntStateOf(0) } // 0: Dashboard, 1: Kasir, 2: Katalog CRUD, 3: Riwayat Penjualan

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
            TopNavigationBar(
                selectedTab = currentMainTab,
                catalogCount = uiState.products.size,
                isLoading = uiState.isLoadingProducts || uiState.isLoadingRecent,
                onTabSelected = { newTab ->
                    currentMainTab = newTab
                    if (newTab == 0 || newTab == 3) {
                        viewModel.loadRecent()
                    }
                },
                onRefresh = {
                    viewModel.loadProducts()
                    viewModel.loadRecent()
                },
                onOpenSettings = { viewModel.openSettings() }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
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

                // Tampilan Konten Berdasarkan Tab yang Dipilih
                Crossfade(targetState = currentMainTab, label = "main_screen_tab_crossfade") { tab ->
                    when (tab) {
                        0 -> {
                            // Tab 0: Layar Dashboard Bisnis (Omset Hari Ini, Transaksi & Produk Terlaris)
                            DashboardScreen(
                                todaySummary = uiState.displayTodaySummary,
                                recentTransactions = uiState.recentTransactions,
                                products = uiState.products,
                                currentBalance = uiState.currentBalance,
                                isSpreadsheetConnected = uiState.appsScriptUrl.isNotBlank(),
                                isLoading = uiState.isLoadingRecent,
                                onNavigateToKasir = { currentMainTab = 1 },
                                onNavigateToKatalog = { currentMainTab = 2 },
                                onNavigateToRiwayat = {
                                    currentMainTab = 3
                                    viewModel.loadRecent()
                                },
                                onOpenAddProductDialog = { viewModel.openAddProductDialog() },
                                onAdjustBalance = { viewModel.openAdjustBalanceDialog() },
                                onRefresh = {
                                    viewModel.loadProducts()
                                    viewModel.loadRecent()
                                }
                            )
                        }
                        1 -> {
                            // Tab 1: Tampilan Kasir Grid 2 Kolom (Transaksi & Keranjang)
                            KasirCatalogContent(
                                uiState = uiState,
                                categories = categories,
                                onSelectCategory = { viewModel.selectCategory(it) },
                                onSearchQueryChange = { viewModel.updateSearchQuery(it) },
                                onAddToCart = { prod, qty -> viewModel.addToCart(prod, qty) },
                                onSetQuantity = { id, qty -> viewModel.setItemQuantity(id, qty) },
                                onOpenAddCustomItem = { viewModel.openAddCustomItemDialog() }
                            )
                        }
                        2 -> {
                            // Tab 2: Manajemen Master Katalog Produk (CRUD)
                            CatalogCrudScreen(
                                products = uiState.products,
                                onOpenAddProductDialog = { viewModel.openAddProductDialog() },
                                onOpenEditProductDialog = { prod -> viewModel.openEditProductCrudDialog(prod) },
                                onOpenDeleteProductDialog = { prod -> viewModel.openDeleteProductDialog(prod) }
                            )
                        }
                        3 -> {
                            // Tab 3: Tampilan Riwayat Penjualan & Omset
                            HistoryScreen(
                                todaySummary = uiState.displayTodaySummary,
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

            // Banner Ringkasan Keranjang Melayang (Hanya tampil di Tab Kasir bila keranjang tidak kosong)
            AnimatedVisibility(
                visible = currentMainTab == 1 && uiState.cartItemCount > 0,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                FloatingCartBanner(
                    cartItemCount = uiState.cartItemCount,
                    totalAmount = uiState.cartTotal,
                    onOpenCart = { viewModel.openCartSheet() },
                    onProceedPayment = { viewModel.openPaymentDialog() }
                )
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
            onRemoveItem = { id -> viewModel.removeFromCart(id) },
            onClearCart = { viewModel.clearCart() },
            onProceedToPayment = { viewModel.openPaymentDialog() }
        )
    }

    // Dialog Pembayaran (Mendukung Tunai dan QRIS Toko)
    if (uiState.isPaymentDialogOpen) {
        PaymentDialog(
            totalAmount = uiState.cartTotal,
            isSaving = uiState.isSavingSale,
            errorMessage = uiState.errorMessage,
            initialMethod = if (uiState.isDynamicQrisModalOpen) com.example.model.PaymentMethod.QRIS else com.example.model.PaymentMethod.TUNAI,
            onDismiss = {
                viewModel.closePaymentDialog()
                viewModel.closeDynamicQrisModal()
            },
            onConfirmPayment = { customer, method, paid ->
                viewModel.closeDynamicQrisModal()
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

    // Dialog Rincian Riwayat Transaksi Lama
    uiState.selectedHistoryDetail?.let { tx ->
        TransactionDetailDialog(
            transaction = tx,
            onDismiss = { viewModel.closeHistoryDetail() }
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

    // Dialog Pengaturan Spreadsheet & Kelola Saldo
    if (uiState.isSettingsOpen) {
        SettingsDialog(
            currentUrl = uiState.appsScriptUrl,
            currentBalance = uiState.currentBalance,
            unpricedCount = uiState.unpricedProductsCount,
            initialTab = 0,
            onSaveUrl = { newUrl -> viewModel.updateAppsScriptUrl(newUrl) },
            onSyncNow = { viewModel.loadProducts(); viewModel.loadRecent() },
            onOpenPriceManagement = { currentMainTab = 2 },
            onAdjustBalance = { newBalance, mutationType, amount, reason ->
                viewModel.adjustCashBalance(newBalance, mutationType, amount, reason)
            },
            onDismiss = { viewModel.closeSettings() }
        )
    }

    // Dialog Khusus Penyesuaian Saldo Kas Toko (Membuka Tab Atur Saldo)
    if (uiState.isAdjustBalanceDialogOpen) {
        SettingsDialog(
            currentUrl = uiState.appsScriptUrl,
            currentBalance = uiState.currentBalance,
            unpricedCount = uiState.unpricedProductsCount,
            initialTab = 1,
            onSaveUrl = { newUrl -> viewModel.updateAppsScriptUrl(newUrl) },
            onSyncNow = { viewModel.loadProducts(); viewModel.loadRecent() },
            onOpenPriceManagement = { currentMainTab = 2 },
            onAdjustBalance = { newBalance, mutationType, amount, reason ->
                viewModel.adjustCashBalance(newBalance, mutationType, amount, reason)
            },
            onDismiss = { viewModel.closeAdjustBalanceDialog() }
        )
    }

    // Dialog CRUD: Tambah Produk Baru ke Katalog
    if (uiState.isAddProductDialogOpen) {
        ProductFormDialog(
            initialProduct = null,
            onDismiss = { viewModel.closeAddProductDialog() },
            onSaveProduct = { _, name, cat, unit, price ->
                viewModel.addNewProduct(name, cat, unit, price)
            }
        )
    }

    // Dialog CRUD: Edit Produk Lengkap (Nama, Kategori, Satuan, Harga Jual)
    uiState.productToEditCrud?.let { prod ->
        ProductFormDialog(
            initialProduct = prod,
            onDismiss = { viewModel.closeEditProductCrudDialog() },
            onSaveProduct = { id, name, cat, unit, price ->
                if (id != null) {
                    viewModel.updateProductDetails(id, name, cat, unit, price)
                }
            }
        )
    }

    // Dialog CRUD: Konfirmasi Hapus Produk dari Katalog
    uiState.productToDelete?.let { prod ->
        AlertDialog(
            onDismissRequest = { viewModel.closeDeleteProductDialog() },
            title = {
                Text("Hapus Produk?", fontWeight = FontWeight.Bold)
            },
            text = {
                Text("Apakah Anda yakin ingin menghapus '${prod.namaProduk}' (${prod.kategori}) dari katalog produk?")
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.confirmDeleteProduct() },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Hapus", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.closeDeleteProductDialog() }) {
                    Text("Batal")
                }
            }
        )
    }
}

/**
 * Tampilan Katalog Kasir dengan Tata Letak Grid 2 Kolom (Clean Minimalist Neo-POS)
 */
@Composable
private fun KasirCatalogContent(
    uiState: KasirUiState,
    categories: List<Pair<String, String>>,
    onSelectCategory: (String) -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onAddToCart: (com.example.model.Product, Double) -> Unit,
    onSetQuantity: (String, Double) -> Unit,
    onOpenAddCustomItem: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Kolom Pencarian Bersih & Modern
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
            shadowElevation = 1.dp
        ) {
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = onSearchQueryChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("search_product_input"),
                placeholder = {
                    Text(
                        "Cari produk pakan: Leopard, Topsong, Milet...",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = "Cari",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                },
                trailingIcon = {
                    if (uiState.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchQueryChange("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Hapus pencarian", modifier = Modifier.size(18.dp))
                        }
                    }
                },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color.Transparent
                ),
                shape = RoundedCornerShape(16.dp)
            )
        }

        // Kategori Filter Chips + Tombol "+ Item Bebas"
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tombol Tambah Item Bebas / Manual Langsung di Kasir
            Surface(
                modifier = Modifier
                    .clickable { onOpenAddCustomItem() }
                    .testTag("btn_add_custom_item"),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "+ Item Bebas",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }

            // Kategori Filter Chips Modern
            categories.forEach { (catKey, catLabel) ->
                val isSelected = uiState.selectedCategory.equals(catKey, ignoreCase = true)
                Surface(
                    modifier = Modifier
                        .clickable { onSelectCategory(catKey) }
                        .testTag("category_chip_$catKey"),
                    shape = RoundedCornerShape(20.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(
                        width = if (isSelected) 1.5.dp else 1.dp,
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
                    ),
                    shadowElevation = if (isSelected) 2.dp else 0.dp
                ) {
                    Text(
                        text = catLabel,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(horizontal = 13.dp, vertical = 7.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Daftar Produk: Grid 2 Kolom (Sesuai Pilihan Pengguna)
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
            val cartMap = remember(uiState.cart) { uiState.cart.associateBy { it.product.id } }

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 4.dp, bottom = if (uiState.cartItemCount > 0) 80.dp else 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(
                    items = filtered,
                    key = { it.id },
                    contentType = { "product_grid_card" }
                ) { product ->
                    val cartItem = cartMap[product.id]
                    ProductCard(
                        product = product,
                        cartItem = cartItem,
                        onAddToCart = onAddToCart,
                        onSetQuantity = onSetQuantity
                    )
                }
            }
        }
    }
}

/**
 * Floating Cart Banner Melayang di atas Floating Navigation Bar
 */
@Composable
private fun FloatingCartBanner(
    cartItemCount: Double,
    totalAmount: Double,
    onOpenCart: () -> Unit,
    onProceedPayment: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(20.dp),
                ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
            )
            .testTag("sticky_bottom_bar"),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tombol Rincian Keranjang
            Row(
                modifier = Modifier
                    .clickable { onOpenCart() }
                    .testTag("open_cart_sheet_button")
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                BadgedBox(
                    badge = {
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
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.ShoppingCart,
                                contentDescription = "Keranjang",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
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
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Tombol Bayar Tunggal
            Button(
                onClick = onProceedPayment,
                modifier = Modifier
                    .height(46.dp)
                    .testTag("sticky_pay_button"),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                contentPadding = PaddingValues(horizontal = 18.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Bayar",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

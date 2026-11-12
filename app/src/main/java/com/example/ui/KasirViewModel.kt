package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.PetShopPrefs
import com.example.data.PetShopRepository
import com.example.data.SampleCatalog
import com.example.model.CartItem
import com.example.model.Product
import com.example.model.ReceiptItemSummary
import com.example.model.RecentTransactionSummary
import com.example.model.SaleTransaction
import com.example.model.TodaySalesSummary
import com.example.model.formatRupiah
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class KasirUiState(
    val products: List<Product> = emptyList(),
    val selectedCategory: String = "Semua", // "Semua", "Burung", "Ayam", "Kucing", "Ikan"
    val searchQuery: String = "",
    val cart: List<CartItem> = emptyList(),
    val isLoadingProducts: Boolean = false,
    val isSavingSale: Boolean = false,
    val isLoadingRecent: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val activeReceipt: SaleTransaction? = null,
    val currentBalance: Double = 0.0,
    val isAdjustBalanceDialogOpen: Boolean = false,
    val appsScriptUrl: String = "",
    val productScriptUrl: String = "",
    val salesScriptUrl: String = "",
    val todaySummary: TodaySalesSummary = TodaySalesSummary(),
    val recentTransactions: List<RecentTransactionSummary> = emptyList(),
    val isSettingsOpen: Boolean = false,
    val isGuideOpen: Boolean = false,
    val isCartSheetOpen: Boolean = false,
    val isPaymentDialogOpen: Boolean = false,
    val lastFailedSale: SaleTransaction? = null,
    val productToEditPrice: Product? = null,
    val isAddCustomItemDialogOpen: Boolean = false,
    val historySearchQuery: String = "",
    val historyFilterTodayOnly: Boolean = false,
    val selectedHistoryDetail: RecentTransactionSummary? = null,
    val isAddProductDialogOpen: Boolean = false,
    val productToEditCrud: Product? = null,
    val productToDelete: Product? = null,
    val qrisMerchantName: String = "PET SHOP SEJAHTERA",
    val qrisNmid: String = "ID1020023456789",
    val qrisCity: String = "JAKARTA",
    val qrisPostalCode: String = "12340",
    val qrisStaticBasePayload: String = "",
    val isDynamicQrisModalOpen: Boolean = false
) {
    val effectiveProductUrl: String
        get() = productScriptUrl.ifBlank { salesScriptUrl.ifBlank { appsScriptUrl } }

    val effectiveSalesUrl: String
        get() = salesScriptUrl.ifBlank { productScriptUrl.ifBlank { appsScriptUrl } }
    val cartTotal: Double
        get() = cart.sumOf { it.subtotal }

    val cartItemCount: Double
        get() = cart.sumOf { it.quantity }

    val filteredProducts: List<Product>
        get() {
            val list = if (selectedCategory == "Semua") {
                products
            } else {
                products.filter { it.kategori.equals(selectedCategory, ignoreCase = true) }
            }

            return if (searchQuery.isBlank()) {
                list
            } else {
                val q = searchQuery.trim().lowercase(Locale.ROOT)
                list.filter { it.namaProduk.lowercase(Locale.ROOT).contains(q) }
            }
        }

    val displayTodaySummary: TodaySalesSummary
        get() {
            val todayList = recentTransactions.filter { isTodayTransaction(it.tanggal, it.noStruk) }
            val calculatedTotal = todayList.sumOf { it.total }
            val calculatedCount = todayList.size

            return if (todaySummary.todayTotal > 0.0 || todaySummary.todayCount > 0) {
                if (calculatedTotal > todaySummary.todayTotal) {
                    TodaySalesSummary(calculatedTotal, calculatedCount)
                } else {
                    todaySummary
                }
            } else {
                TodaySalesSummary(calculatedTotal, calculatedCount)
            }
        }

    val filteredHistoryTransactions: List<RecentTransactionSummary>
        get() {
            val list = if (historyFilterTodayOnly) {
                recentTransactions.filter { isTodayTransaction(it.tanggal, it.noStruk) }
            } else {
                recentTransactions
            }

            if (historySearchQuery.isBlank()) {
                return list
            }
            val q = historySearchQuery.trim().lowercase(Locale.ROOT)
            return list.filter {
                it.noStruk.lowercase(Locale.ROOT).contains(q) ||
                it.namaPembeli.lowercase(Locale.ROOT).contains(q) ||
                it.items.any { item -> item.namaProduk.lowercase(Locale.ROOT).contains(q) }
            }
        }

    val unpricedProductsCount: Int
        get() = products.count { !it.isSellable }
}

fun isTodayTransaction(tanggalStr: String, noStruk: String): Boolean {
    val now = Date()
    val todayIso = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(now) // e.g. 2026-10-28
    val todayCompact = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(now) // e.g. 20261028
    val todaySlash1 = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(now) // 28/10/2026
    val todaySlash2 = SimpleDateFormat("d/M/yyyy", Locale.getDefault()).format(now)

    val tgl = tanggalStr.trim()

    // 1. Cek kecocokan tanggal string langsung
    if (tgl.startsWith(todayIso) || tgl == todaySlash1 || tgl == todaySlash2) {
        return true
    }

    // 2. Cek apakah tanggal string mengandung YYYY-MM-DD
    if (tgl.contains(todayIso)) {
        return true
    }

    // 3. Cek format tanggal teks (contoh: "Oct 28" / "28 Oct")
    val monthShort = SimpleDateFormat("MMM", Locale.US).format(now)
    val dayStr = SimpleDateFormat("dd", Locale.US).format(now)
    if (tgl.contains(monthShort, ignoreCase = true) && tgl.contains(dayStr)) {
        return true
    }

    // 4. Cek Nomor Struk: PS-YYYYMMDD-HHMMSS (Sangat Akurat dan Pasti)
    if (noStruk.isNotBlank() && noStruk.contains(todayCompact)) {
        return true
    }

    return false
}

class KasirViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = PetShopRepository()
    private val prefs = PetShopPrefs(application)

    private val _uiState = MutableStateFlow(
        KasirUiState(
            products = applyPriceOverrides(SampleCatalog.defaultProducts),
            appsScriptUrl = prefs.appsScriptUrl,
            productScriptUrl = prefs.productScriptUrl,
            salesScriptUrl = prefs.salesScriptUrl,
            currentBalance = prefs.currentBalance,
            qrisMerchantName = prefs.qrisMerchantName,
            qrisNmid = prefs.qrisNmid,
            qrisCity = prefs.qrisCity,
            qrisPostalCode = prefs.qrisPostalCode,
            qrisStaticBasePayload = prefs.qrisStaticBasePayload
        )
    )
    val uiState: StateFlow<KasirUiState> = _uiState.asStateFlow()

    init {
        prefs.isCleanSlate = false
        // Sinkronisasi otomatis saat pertama kali dibuka (onLoad)
        autoSync()

        // Polling berkala setiap 5 menit (300.000 ms) agar data produk dan saldo kas selalu terkini
        viewModelScope.launch {
            while (isActive) {
                delay(5 * 60 * 1000L)
                autoSync(silent = true)
            }
        }
    }

    fun autoSync(silent: Boolean = false) {
        loadProducts(silent = silent)
        loadRecent()
    }

    private fun applyPriceOverrides(rawList: List<Product>): List<Product> {
        val deletedIds = prefs.getDeletedProductIds()
        val customCreated = prefs.getCustomCreatedProducts()
        val overrides = prefs.getProductOverrides()
        val customPrices = prefs.getAllCustomPrices()

        if (rawList.isEmpty() && prefs.isCleanSlate) {
            prefs.isCleanSlate = false
        }

        // 1. Jika mode bersih aktif, sembunyikan baris lama yang belum dibersihkan dari spreadsheet fisik
        val effectiveRaw = if (prefs.isCleanSlate) emptyList() else rawList
        val combined = customCreated + effectiveRaw

        // 2. Filter produk yang telah dihapus
        val activeProducts = combined.filterNot { deletedIds.contains(it.id) }

        // 3. Terapkan override nama/satuan/kategori/harga jika ada & sanitasi Zak -> Karung
        return activeProducts.map { prod ->
            var p = overrides[prod.id] ?: prod

            // Sanitasi nama produk: Zak -> Karung
            val cleanedName = p.namaProduk
                .replace(Regex("(?i)\\b1\\s*Zak\\b"), "1 Karung")
                .replace(Regex("(?i)\\bZak\\b"), "Karung")

            val isKarung = p.satuan.equals("zak", ignoreCase = true) ||
                    p.satuan.equals("karung", ignoreCase = true) ||
                    p.satuan.equals("sak", ignoreCase = true) ||
                    cleanedName.contains("karung", ignoreCase = true) ||
                    cleanedName.contains("zak", ignoreCase = true)

            val finalSatuan = if (isKarung) "kg" else "pcs"
            val finalSatuanAsli = if (isKarung) "karung" else "pcs"

            val overridePrice = customPrices[p.id]
            if (overridePrice != null && overridePrice > 0.0) {
                p = p.copy(
                    namaProduk = cleanedName,
                    satuan = finalSatuan,
                    satuanAsli = finalSatuanAsli,
                    hargaJual = overridePrice,
                    hargaBelumDiisi = false
                )
            } else {
                p = p.copy(
                    namaProduk = cleanedName,
                    satuan = finalSatuan,
                    satuanAsli = finalSatuanAsli
                )
            }
            p
        }
    }

    fun selectCategory(category: String) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun addToCart(product: Product, quantityToAdd: Double = 1.0) {
        _uiState.update { state ->
            val existingIndex = state.cart.indexOfFirst { it.product.id == product.id }
            val updatedCart = state.cart.toMutableList()

            if (existingIndex >= 0) {
                val current = updatedCart[existingIndex]
                val newQty = current.quantity + quantityToAdd
                if (newQty > 0) {
                    updatedCart[existingIndex] = current.copy(quantity = newQty)
                } else {
                    updatedCart.removeAt(existingIndex)
                }
            } else if (quantityToAdd > 0) {
                updatedCart.add(CartItem(product = product, quantity = quantityToAdd))
            }

            state.copy(cart = updatedCart, errorMessage = null)
        }
    }

    fun setItemQuantity(productId: String, newQty: Double) {
        _uiState.update { state ->
            val updatedCart = state.cart.toMutableList()
            val index = updatedCart.indexOfFirst { it.product.id == productId }
            if (index >= 0) {
                if (newQty > 0.0) {
                    updatedCart[index] = updatedCart[index].copy(quantity = newQty)
                } else {
                    updatedCart.removeAt(index)
                }
            }
            state.copy(cart = updatedCart)
        }
    }

    fun setItemPrice(productId: String, newPrice: Double) {
        if (newPrice < 0) return
        _uiState.update { state ->
            val updatedCart = state.cart.toMutableList()
            val index = updatedCart.indexOfFirst { it.product.id == productId }
            if (index >= 0) {
                updatedCart[index] = updatedCart[index].copy(customUnitPrice = newPrice)
            }
            state.copy(cart = updatedCart)
        }
    }

    fun updateProductSellingPrice(productId: String, newSellingPrice: Double) {
        if (newSellingPrice <= 0.0) return

        prefs.setCustomPrice(productId, newSellingPrice)

        val targetProd = _uiState.value.products.find { it.id == productId }
        val name = targetProd?.namaProduk ?: "Produk"

        // Sinkronkan ke Google Spreadsheet secara background
        val scriptUrl = _uiState.value.effectiveProductUrl
        if (targetProd != null && scriptUrl.isNotBlank()) {
            viewModelScope.launch {
                repository.updateProductPrice(scriptUrl, targetProd, newSellingPrice)
            }
        }

        _uiState.update { state ->
            val updatedProducts = state.products.map { p ->
                if (p.id == productId) {
                    p.copy(hargaJual = newSellingPrice, hargaBelumDiisi = false)
                } else {
                    p
                }
            }

            val updatedCart = state.cart.map { itm ->
                if (itm.product.id == productId) {
                    itm.copy(
                        product = itm.product.copy(hargaJual = newSellingPrice, hargaBelumDiisi = false),
                        customUnitPrice = newSellingPrice
                    )
                } else {
                    itm
                }
            }

            state.copy(
                products = updatedProducts,
                cart = updatedCart,
                productToEditPrice = null,
                successMessage = "Harga $name diperbarui & disinkronkan ke Spreadsheet: ${formatRupiah(newSellingPrice)}"
            )
        }
    }

    fun openAddCustomItemDialog() {
        _uiState.update { it.copy(isAddCustomItemDialogOpen = true) }
    }

    fun closeAddCustomItemDialog() {
        _uiState.update { it.copy(isAddCustomItemDialogOpen = false) }
    }

    fun addManualProductToCart(name: String, price: Double, unit: String, qty: Double, category: String) {
        val manualId = "custom_${System.currentTimeMillis()}"
        val prod = Product(
            id = manualId,
            kategori = category.ifBlank { "Lainnya" },
            namaProduk = name,
            satuan = unit.ifBlank { "pcs" },
            hargaJual = price,
            hargaBeli = 0.0
        )
        _uiState.update { state ->
            val updatedList = listOf(prod) + state.products
            state.copy(products = updatedList, isAddCustomItemDialogOpen = false)
        }
        addToCart(prod, qty)
    }

    fun openPriceEditDialog(product: Product) {
        _uiState.update { it.copy(productToEditPrice = product) }
    }

    fun closePriceEditDialog() {
        _uiState.update { it.copy(productToEditPrice = null) }
    }

    // === CRUD KATALOG: TAMBAH PRODUK BARU ===
    fun openAddProductDialog() {
        _uiState.update { it.copy(isAddProductDialogOpen = true) }
    }

    fun closeAddProductDialog() {
        _uiState.update { it.copy(isAddProductDialogOpen = false) }
    }

    fun addNewProduct(name: String, category: String, unit: String, price: Double) {
        if (name.isBlank()) return
        val newId = "prod_${System.currentTimeMillis()}"
        val newProduct = Product(
            id = newId,
            kategori = category.ifBlank { "Lainnya" },
            namaProduk = name.trim(),
            satuan = unit.ifBlank { "pcs" },
            hargaJual = price.coerceAtLeast(0.0),
            hargaBelumDiisi = price <= 0.0
        )

        // Simpan ke SharedPreferences
        val currentCreated = prefs.getCustomCreatedProducts().toMutableList()
        currentCreated.add(0, newProduct)
        prefs.saveCustomCreatedProducts(currentCreated)

        // Sinkronkan produk baru ke Google Spreadsheet
        val scriptUrl = _uiState.value.effectiveProductUrl
        if (scriptUrl.isNotBlank()) {
            viewModelScope.launch {
                repository.addProduct(scriptUrl, newProduct)
            }
        }

        _uiState.update { state ->
            val updatedProducts = listOf(newProduct) + state.products
            state.copy(
                products = updatedProducts,
                isAddProductDialogOpen = false,
                successMessage = "Produk '${newProduct.namaProduk}' ditambahkan & disinkronkan ke Spreadsheet!"
            )
        }
    }

    // === CRUD KATALOG: EDIT PRODUK (Nama, Kategori, Satuan, Harga) ===
    fun openEditProductCrudDialog(product: Product) {
        _uiState.update { it.copy(productToEditCrud = product) }
    }

    fun closeEditProductCrudDialog() {
        _uiState.update { it.copy(productToEditCrud = null) }
    }

    fun updateProductDetails(
        productId: String,
        newName: String,
        newCategory: String,
        newUnit: String,
        newPrice: Double
    ) {
        if (newName.isBlank()) return

        val existing = _uiState.value.products.find { it.id == productId } ?: return
        val updated = existing.copy(
            namaProduk = newName.trim(),
            kategori = newCategory.ifBlank { existing.kategori },
            satuan = newUnit.ifBlank { existing.satuan },
            hargaJual = newPrice.coerceAtLeast(0.0),
            hargaBelumDiisi = newPrice <= 0.0
        )

        // 1. Jika ini produk kustom buatan kasir, update di daftar custom_created
        val customList = prefs.getCustomCreatedProducts().toMutableList()
        val customIdx = customList.indexOfFirst { it.id == productId }
        if (customIdx >= 0) {
            customList[customIdx] = updated
            prefs.saveCustomCreatedProducts(customList)
        } else {
            // Jika produk bawaan katalog/spreadsheet, simpan di override
            prefs.saveProductOverride(updated)
            if (newPrice > 0.0) {
                prefs.setCustomPrice(productId, newPrice)
            }
        }

        // Sinkronkan ke Google Spreadsheet
        val scriptUrl = _uiState.value.effectiveProductUrl
        if (scriptUrl.isNotBlank()) {
            viewModelScope.launch {
                repository.updateProductPrice(scriptUrl, updated, newPrice)
            }
        }

        _uiState.update { state ->
            val updatedList = state.products.map { if (it.id == productId) updated else it }
            val updatedCart = state.cart.map { itm ->
                if (itm.product.id == productId) {
                    itm.copy(
                        product = updated,
                        customUnitPrice = if (newPrice > 0.0) newPrice else itm.customUnitPrice
                    )
                } else {
                    itm
                }
            }
            state.copy(
                products = updatedList,
                cart = updatedCart,
                productToEditCrud = null,
                successMessage = "Produk '${updated.namaProduk}' berhasil diperbarui & disinkronkan!"
            )
        }
    }

    // === CRUD KATALOG: HAPUS PRODUK ===
    fun openDeleteProductDialog(product: Product) {
        _uiState.update { it.copy(productToDelete = product) }
    }

    fun closeDeleteProductDialog() {
        _uiState.update { it.copy(productToDelete = null) }
    }

    fun confirmDeleteProduct() {
        val target = _uiState.value.productToDelete ?: return
        val pId = target.id

        // Catat ID di deleted_product_ids_set
        prefs.addDeletedProductId(pId)

        // Hapus juga dari daftar kustom jika ada
        val customList = prefs.getCustomCreatedProducts().toMutableList()
        customList.removeAll { it.id == pId }
        prefs.saveCustomCreatedProducts(customList)

        _uiState.update { state ->
            val updatedProducts = state.products.filterNot { it.id == pId }
            val updatedCart = state.cart.filterNot { it.product.id == pId }
            state.copy(
                products = updatedProducts,
                cart = updatedCart,
                productToDelete = null,
                successMessage = "Produk '${target.namaProduk}' telah dihapus dari katalog."
            )
        }

        val scriptUrl = _uiState.value.effectiveProductUrl
        if (scriptUrl.isNotBlank()) {
            viewModelScope.launch {
                repository.deleteProduct(scriptUrl, target)
            }
        }
    }

    fun clearAllProducts() {
        prefs.clearAllProducts()
        _uiState.update { state ->
            state.copy(
                products = emptyList(),
                cart = emptyList(),
                successMessage = "Seluruh data produk telah dibersihkan (0 produk)."
            )
        }
    }

    fun removeFromCart(productId: String) {
        _uiState.update { state ->
            state.copy(cart = state.cart.filterNot { it.product.id == productId })
        }
    }

    fun clearCart() {
        _uiState.update { it.copy(cart = emptyList(), isCartSheetOpen = false) }
    }

    fun openCartSheet() {
        _uiState.update { it.copy(isCartSheetOpen = true) }
    }

    fun closeCartSheet() {
        _uiState.update { it.copy(isCartSheetOpen = false) }
    }

    fun openPaymentDialog() {
        if (_uiState.value.cart.isEmpty()) return
        _uiState.update { it.copy(isPaymentDialogOpen = true, isCartSheetOpen = false) }
    }

    fun closePaymentDialog() {
        _uiState.update { it.copy(isPaymentDialogOpen = false) }
    }

    fun openSettings() {
        _uiState.update { it.copy(isSettingsOpen = true) }
    }

    fun closeSettings() {
        _uiState.update { it.copy(isSettingsOpen = false) }
    }

    fun openGuide() {
        _uiState.update { it.copy(isGuideOpen = true) }
    }

    fun closeGuide() {
        _uiState.update { it.copy(isGuideOpen = false) }
    }

    fun saveDualUrls(productUrl: String, salesUrl: String) {
        val pUrl = productUrl.trim()
        val sUrl = salesUrl.trim()
        prefs.productScriptUrl = pUrl
        prefs.salesScriptUrl = sUrl
        val primary = pUrl.ifBlank { sUrl }
        if (primary.isNotBlank()) {
            prefs.appsScriptUrl = primary
        }
        _uiState.update {
            it.copy(
                productScriptUrl = pUrl,
                salesScriptUrl = sUrl,
                appsScriptUrl = primary,
                successMessage = "Pengaturan link Spreadsheet berhasil disimpan!"
            )
        }
        loadProducts()
        loadRecent()
    }

    fun updateAppsScriptUrl(newUrl: String) {
        saveDualUrls(newUrl, newUrl)
    }

    fun dismissReceipt() {
        _uiState.update { it.copy(activeReceipt = null) }
    }

    fun clearMessages() {
        _uiState.update { it.copy(errorMessage = null, successMessage = null) }
    }

    fun loadProducts(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) {
                _uiState.update { it.copy(isLoadingProducts = true, errorMessage = null) }
            }
            val currentUrl = _uiState.value.effectiveProductUrl
            val result = repository.fetchProducts(currentUrl)

            result.fold(
                onSuccess = { list ->
                    val finalProducts = applyPriceOverrides(list)
                    _uiState.update {
                        it.copy(
                            products = finalProducts,
                            isLoadingProducts = false,
                            errorMessage = null
                        )
                    }
                },
                onFailure = { error ->
                    val fallback = applyPriceOverrides(SampleCatalog.defaultProducts)
                    _uiState.update {
                        it.copy(
                            products = if (it.products.isNotEmpty()) it.products else fallback,
                            isLoadingProducts = false,
                            errorMessage = if (silent) null else "Gagal memuat dari Spreadsheet: ${error.localizedMessage ?: "Cek URL"}. Menggunakan katalog lokal."
                        )
                    }
                }
            )
        }
    }

    fun loadRecent() {
        viewModelScope.launch {
            val currentUrl = _uiState.value.effectiveSalesUrl
            if (currentUrl.isBlank()) return@launch

            _uiState.update { it.copy(isLoadingRecent = true) }
            val result = repository.fetchRecentSales(currentUrl)
            result.fold(
                onSuccess = { (summary, list, balance) ->
                    _uiState.update { current ->
                        val merged = (list + current.recentTransactions).distinctBy { tx -> tx.noStruk }
                        val effectiveBalance = if (balance > 0) balance else current.currentBalance
                        prefs.currentBalance = effectiveBalance
                        current.copy(
                            todaySummary = summary,
                            recentTransactions = merged,
                            currentBalance = effectiveBalance,
                            isLoadingRecent = false
                        )
                    }
                },
                onFailure = {
                    _uiState.update { state -> state.copy(isLoadingRecent = false) }
                }
            )
        }
    }

    private fun toRecentSummary(sale: SaleTransaction): RecentTransactionSummary {
        return RecentTransactionSummary(
            noStruk = sale.receiptNumber,
            tanggal = sale.date,
            jam = sale.time,
            namaPembeli = sale.customerName,
            metodeBayar = sale.paymentMethod,
            total = sale.totalAmount,
            bayar = sale.paidAmount,
            kembalian = sale.changeAmount,
            items = sale.items.map { itm ->
                ReceiptItemSummary(
                    kategori = itm.product.kategori,
                    namaProduk = itm.product.namaProduk,
                    satuan = itm.product.satuan,
                    jumlah = itm.quantity,
                    hargaJual = itm.customUnitPrice,
                    subtotal = itm.subtotal
                )
            }
        )
    }

    fun processSale(customerName: String, paymentMethod: String, paidAmount: Double) {
        val currentCart = _uiState.value.cart
        if (currentCart.isEmpty()) return

        val total = currentCart.sumOf { it.subtotal }
        val change = (paidAmount - total).coerceAtLeast(0.0)

        val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFmt = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        val now = Date()

        val receiptNumber = "PS-" + SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault()).format(now)

        val sale = SaleTransaction(
            receiptNumber = receiptNumber,
            date = dateFmt.format(now),
            time = timeFmt.format(now),
            customerName = customerName.ifBlank { "-" },
            paymentMethod = paymentMethod,
            items = currentCart,
            totalAmount = total,
            paidAmount = paidAmount,
            changeAmount = change
        )

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSavingSale = true,
                    errorMessage = null,
                    lastFailedSale = null
                )
            }

            val currentUrl = _uiState.value.effectiveSalesUrl
            if (currentUrl.isBlank()) {
                val newRecent = toRecentSummary(sale)
                _uiState.update { current ->
                    val updatedRecents = (listOf(newRecent) + current.recentTransactions).distinctBy { tx -> tx.noStruk }
                    val updatedBalance = current.currentBalance + sale.totalAmount
                    prefs.currentBalance = updatedBalance
                    current.copy(
                        isSavingSale = false,
                        activeReceipt = sale,
                        cart = emptyList(),
                        recentTransactions = updatedRecents,
                        currentBalance = updatedBalance,
                        isPaymentDialogOpen = false,
                        errorMessage = "Transaksi dicatat secara lokal. Buka Pengaturan untuk menyambungkan Spreadsheet."
                    )
                }
                return@launch
            }

            val result = repository.submitSale(currentUrl, sale)
            result.fold(
                onSuccess = { confirmedReceiptNum ->
                    val finalSale = sale.copy(receiptNumber = confirmedReceiptNum)
                    val newRecent = toRecentSummary(finalSale)
                    _uiState.update { current ->
                        val updatedRecents = (listOf(newRecent) + current.recentTransactions).distinctBy { tx -> tx.noStruk }
                        val updatedBalance = current.currentBalance + sale.totalAmount
                        prefs.currentBalance = updatedBalance
                        current.copy(
                            isSavingSale = false,
                            activeReceipt = finalSale,
                            cart = emptyList(),
                            recentTransactions = updatedRecents,
                            currentBalance = updatedBalance,
                            isPaymentDialogOpen = false,
                            successMessage = "Transaksi berhasil dicatat ke Google Spreadsheet!"
                        )
                    }
                    loadRecent()
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(
                            isSavingSale = false,
                            lastFailedSale = sale,
                            errorMessage = "Gagal kirim ke Spreadsheet: ${err.localizedMessage ?: "Cek koneksi/URL"}. Isi keranjang tetap aman, silakan coba lagi."
                        )
                    }
                }
            )
        }
    }

    fun retryFailedSale() {
        val failed = _uiState.value.lastFailedSale ?: return
        processSale(
            customerName = failed.customerName,
            paymentMethod = failed.paymentMethod,
            paidAmount = failed.paidAmount
        )
    }

    fun viewReceiptFromHistory(history: RecentTransactionSummary) {
        val cartItems = history.items.map { itm ->
            CartItem(
                product = Product(
                    id = "hist_${itm.namaProduk}",
                    kategori = itm.kategori,
                    namaProduk = itm.namaProduk,
                    satuan = itm.satuan,
                    hargaJual = itm.hargaJual
                ),
                quantity = itm.jumlah,
                customUnitPrice = itm.hargaJual
            )
        }

        val sale = SaleTransaction(
            receiptNumber = history.noStruk,
            date = history.tanggal,
            time = history.jam,
            customerName = history.namaPembeli,
            paymentMethod = history.metodeBayar,
            items = cartItems,
            totalAmount = history.total,
            paidAmount = history.bayar,
            changeAmount = history.kembalian
        )

        _uiState.update { it.copy(activeReceipt = sale) }
    }

    fun updateHistorySearchQuery(query: String) {
        _uiState.update { it.copy(historySearchQuery = query) }
    }

    fun setHistoryFilterTodayOnly(todayOnly: Boolean) {
        _uiState.update { it.copy(historyFilterTodayOnly = todayOnly) }
    }

    fun openHistoryDetail(transaction: RecentTransactionSummary) {
        _uiState.update { it.copy(selectedHistoryDetail = transaction) }
    }

    fun closeHistoryDetail() {
        _uiState.update { it.copy(selectedHistoryDetail = null) }
    }

    // === FITUR QRIS DINAMIS ===
    fun openDynamicQrisModal() {
        _uiState.update { it.copy(isDynamicQrisModalOpen = true) }
    }

    fun closeDynamicQrisModal() {
        _uiState.update { it.copy(isDynamicQrisModalOpen = false) }
    }

    fun saveQrisSettings(
        merchantName: String,
        nmid: String,
        city: String,
        postalCode: String,
        baseStaticPayload: String
    ) {
        prefs.qrisMerchantName = merchantName
        prefs.qrisNmid = nmid
        prefs.qrisCity = city
        prefs.qrisPostalCode = postalCode
        prefs.qrisStaticBasePayload = baseStaticPayload

        _uiState.update {
            it.copy(
                qrisMerchantName = prefs.qrisMerchantName,
                qrisNmid = prefs.qrisNmid,
                qrisCity = prefs.qrisCity,
                qrisPostalCode = prefs.qrisPostalCode,
                qrisStaticBasePayload = prefs.qrisStaticBasePayload,
                successMessage = "Pengaturan QRIS Toko berhasil disimpan!"
            )
        }
    }

    // === MANAJEMEN SALDO KAS TOKO ===
    fun openAdjustBalanceDialog() {
        _uiState.update { it.copy(isAdjustBalanceDialogOpen = true) }
    }

    fun closeAdjustBalanceDialog() {
        _uiState.update { it.copy(isAdjustBalanceDialogOpen = false) }
    }

    fun adjustCashBalance(
        newBalance: Double,
        mutationType: String = "set",
        amount: Double = 0.0,
        reason: String = "Penyesuaian Manual"
    ) {
        prefs.currentBalance = newBalance
        _uiState.update { it.copy(currentBalance = newBalance, isAdjustBalanceDialogOpen = false) }

        val currentUrl = _uiState.value.effectiveSalesUrl
        if (currentUrl.isNotBlank()) {
            viewModelScope.launch {
                val res = repository.adjustBalance(currentUrl, newBalance, mutationType, amount, reason)
                res.fold(
                    onSuccess = { b ->
                        prefs.currentBalance = b
                        _uiState.update {
                            it.copy(
                                currentBalance = b,
                                successMessage = "Saldo kas toko berhasil disinkronkan ke Google Spreadsheet!"
                            )
                        }
                        loadRecent()
                    },
                    onFailure = { err ->
                        _uiState.update {
                            it.copy(errorMessage = "Gagal kirim pembaruan saldo ke Spreadsheet: ${err.localizedMessage}")
                        }
                    }
                )
            }
        }
    }
}

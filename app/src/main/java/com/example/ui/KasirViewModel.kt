package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.PetShopPrefs
import com.example.data.PetShopRepository
import com.example.data.SampleCatalog
import com.example.model.CartItem
import com.example.model.Product
import com.example.model.RecentTransactionSummary
import com.example.model.SaleTransaction
import com.example.model.TodaySalesSummary
import com.example.model.formatRupiah
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
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
    val appsScriptUrl: String = "",
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
    val selectedHistoryDetail: RecentTransactionSummary? = null
) {
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

    val filteredHistoryTransactions: List<RecentTransactionSummary>
        get() {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val list = if (historyFilterTodayOnly) {
                recentTransactions.filter { it.tanggal == todayStr }
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

class KasirViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = PetShopRepository()
    private val prefs = PetShopPrefs(application)

    private val _uiState = MutableStateFlow(
        KasirUiState(
            products = applyPriceOverrides(SampleCatalog.defaultProducts),
            appsScriptUrl = prefs.appsScriptUrl
        )
    )
    val uiState: StateFlow<KasirUiState> = _uiState.asStateFlow()

    init {
        loadProducts()
        if (prefs.isConfigured) {
            loadRecent()
        }
    }

    private fun applyPriceOverrides(rawList: List<Product>): List<Product> {
        val overrides = prefs.getAllCustomPrices()
        if (overrides.isEmpty()) return rawList

        return rawList.map { prod ->
            val overridePrice = overrides[prod.id]
            if (overridePrice != null && overridePrice > 0.0) {
                prod.copy(
                    hargaJual = overridePrice,
                    hargaBelumDiisi = false
                )
            } else {
                prod
            }
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

            val targetProd = state.products.find { it.id == productId }
            val name = targetProd?.namaProduk ?: "Produk"

            state.copy(
                products = updatedProducts,
                cart = updatedCart,
                productToEditPrice = null,
                successMessage = "Harga $name diperbarui: ${formatRupiah(newSellingPrice)}"
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

    fun updateAppsScriptUrl(newUrl: String) {
        prefs.appsScriptUrl = newUrl
        _uiState.update { it.copy(appsScriptUrl = newUrl.trim()) }
        loadProducts()
        loadRecent()
    }

    fun dismissReceipt() {
        _uiState.update { it.copy(activeReceipt = null) }
    }

    fun clearMessages() {
        _uiState.update { it.copy(errorMessage = null, successMessage = null) }
    }

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingProducts = true, errorMessage = null) }
            val currentUrl = _uiState.value.appsScriptUrl
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
                            products = fallback,
                            isLoadingProducts = false,
                            errorMessage = "Gagal memuat dari Spreadsheet: ${error.localizedMessage ?: "Cek URL"}. Menggunakan katalog lokal."
                        )
                    }
                }
            )
        }
    }

    fun loadRecent() {
        viewModelScope.launch {
            val currentUrl = _uiState.value.appsScriptUrl
            if (currentUrl.isBlank()) return@launch

            _uiState.update { it.copy(isLoadingRecent = true) }
            val result = repository.fetchRecentSales(currentUrl)
            result.fold(
                onSuccess = { (summary, list) ->
                    _uiState.update {
                        it.copy(
                            todaySummary = summary,
                            recentTransactions = list,
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

            val currentUrl = _uiState.value.appsScriptUrl
            if (currentUrl.isBlank()) {
                _uiState.update {
                    it.copy(
                        isSavingSale = false,
                        activeReceipt = sale,
                        cart = emptyList(),
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
                    _uiState.update {
                        it.copy(
                            isSavingSale = false,
                            activeReceipt = finalSale,
                            cart = emptyList(),
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
}

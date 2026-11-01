package com.example.model

import java.text.NumberFormat
import java.util.Locale

data class Product(
    val id: String,
    val kategori: String, // "Burung", "Kucing", "Ayam", "Ikan"
    val namaProduk: String,
    val satuan: String,
    val satuanAsli: String = satuan,
    val hargaJual: Double,
    val hargaBeli: Double = 0.0,
    val hargaBelumDiisi: Boolean = false,
    val catatan: String = ""
) {
    val isSellable: Boolean get() = !hargaBelumDiisi && hargaJual > 0
}

data class CartItem(
    val product: Product,
    val quantity: Double = 1.0,
    val customUnitPrice: Double = product.hargaJual
) {
    val subtotal: Double
        get() = quantity * customUnitPrice

    val formattedQuantity: String
        get() = if (quantity % 1.0 == 0.0) {
            quantity.toInt().toString()
        } else {
            String.format(Locale.GERMANY, "%.2f", quantity).trimEnd('0').trimEnd(',')
        }
}

enum class PaymentMethod(val label: String) {
    TUNAI("Tunai"),
    QRIS("QRIS")
}

data class SaleTransaction(
    val receiptNumber: String,
    val date: String,
    val time: String,
    val customerName: String,
    val paymentMethod: String,
    val items: List<CartItem>,
    val totalAmount: Double,
    val paidAmount: Double,
    val changeAmount: Double
)

data class RecentTransactionSummary(
    val noStruk: String,
    val tanggal: String,
    val jam: String,
    val namaPembeli: String,
    val metodeBayar: String,
    val total: Double,
    val bayar: Double,
    val kembalian: Double,
    val items: List<ReceiptItemSummary>
)

data class ReceiptItemSummary(
    val kategori: String,
    val namaProduk: String,
    val satuan: String,
    val jumlah: Double,
    val hargaJual: Double,
    val subtotal: Double
)

data class TodaySalesSummary(
    val todayTotal: Double = 0.0,
    val todayCount: Int = 0
)

fun formatRupiah(amount: Double): String {
    val format = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    format.maximumFractionDigits = 0
    return format.format(amount).replace("Rp", "Rp ")
}

fun formatQuantity(qty: Double): String {
    return if (qty % 1.0 == 0.0) {
        qty.toInt().toString()
    } else {
        String.format(Locale.GERMANY, "%.2f", qty).trimEnd('0').trimEnd(',')
    }
}

package com.example.data

import com.example.model.CartItem
import com.example.model.Product
import com.example.model.ReceiptItemSummary
import com.example.model.RecentTransactionSummary
import com.example.model.SaleTransaction
import com.example.model.TodaySalesSummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class PetShopRepository {

    private val client: OkHttpClient = OkHttpClient.Builder()
        .followRedirects(true)
        .followSslRedirects(true)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val textPlainMediaType = "text/plain; charset=utf-8".toMediaType()

    suspend fun fetchProducts(url: String): Result<List<Product>> = withContext(Dispatchers.IO) {
        if (url.isBlank()) {
            return@withContext Result.success(SampleCatalog.defaultProducts)
        }

        try {
            val fullUrl = if (url.contains("?")) "$url&action=products" else "$url?action=products"
            val request = Request.Builder()
                .url(fullUrl)
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("Server merespons kode: ${response.code}"))
                }

                val bodyString = response.body?.string().orEmpty()
                if (bodyString.isBlank()) {
                    return@withContext Result.failure(IOException("Respons kosong dari Google Spreadsheet"))
                }

                val json = JSONObject(bodyString)
                if (!json.optBoolean("success", false)) {
                    val msg = json.optString("message", "Gagal memuat produk dari spreadsheet")
                    return@withContext Result.failure(IOException(msg))
                }

                val productsArray = json.optJSONArray("products") ?: JSONArray()
                val list = mutableListOf<Product>()
                for (i in 0 until productsArray.length()) {
                    val pObj = productsArray.getJSONObject(i)
                    val catName = pObj.optString("kategori", "Lainnya")
                    val nama = pObj.optString("namaProduk", "")
                    val satuan = pObj.optString("satuan", "pcs")
                    val satuanAsli = pObj.optString("satuanAsli", satuan)
                    val hargaJual = pObj.optDouble("hargaJual", 0.0)
                    val hargaBeli = pObj.optDouble("hargaBeli", 0.0)
                    val belumDiisi = pObj.optBoolean("hargaBelumDiisi", hargaJual <= 0)
                    val catatan = pObj.optString("catatan", "")

                    if (nama.isNotBlank()) {
                        list.add(
                            Product(
                                id = pObj.optString("id", "${catName}_$i"),
                                kategori = catName,
                                namaProduk = nama,
                                satuan = satuan,
                                satuanAsli = satuanAsli,
                                hargaJual = hargaJual,
                                hargaBeli = hargaBeli,
                                hargaBelumDiisi = belumDiisi,
                                catatan = catatan
                            )
                        )
                    }
                }

                if (list.isEmpty()) {
                    // Fallback to sample catalog if spreadsheet has no rows yet
                    Result.success(SampleCatalog.defaultProducts)
                } else {
                    Result.success(list)
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitSale(url: String, transaction: SaleTransaction): Result<String> = withContext(Dispatchers.IO) {
        if (url.isBlank()) {
            return@withContext Result.failure(
                IllegalStateException("URL Google Apps Script belum diisi di Pengaturan! Buka menu Pengaturan untuk menempelkan URL.")
            )
        }

        try {
            val root = JSONObject()
            root.put("action", "sale")
            root.put("receiptNumber", transaction.receiptNumber)
            root.put("customerName", transaction.customerName)
            root.put("paymentMethod", transaction.paymentMethod)
            root.put("paidAmount", transaction.paidAmount)
            root.put("changeAmount", transaction.changeAmount)

            val itemsArray = JSONArray()
            transaction.items.forEach { cartItem ->
                val itemObj = JSONObject()
                itemObj.put("kategori", cartItem.product.kategori)
                itemObj.put("namaProduk", cartItem.product.namaProduk)
                itemObj.put("satuan", cartItem.product.satuan)
                itemObj.put("jumlah", cartItem.quantity)
                itemObj.put("hargaJual", cartItem.customUnitPrice)
                itemObj.put("hargaBeli", cartItem.product.hargaBeli)
                itemsArray.put(itemObj)
            }
            root.put("items", itemsArray)

            val requestBody = root.toString().toRequestBody(textPlainMediaType)
            val fullUrl = if (url.contains("?")) "$url&action=sale" else "$url?action=sale"

            val request = Request.Builder()
                .url(fullUrl)
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("Server error HTTP ${response.code}"))
                }

                val bodyString = response.body?.string().orEmpty()
                val json = JSONObject(bodyString)
                if (!json.optBoolean("success", false)) {
                    val msg = json.optString("message", "Gagal menyimpan ke Google Spreadsheet")
                    return@withContext Result.failure(IOException(msg))
                }

                val returnedReceipt = json.optString("receiptNumber", transaction.receiptNumber)
                Result.success(returnedReceipt)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchRecentSales(url: String): Result<Pair<TodaySalesSummary, List<RecentTransactionSummary>>> = withContext(Dispatchers.IO) {
        if (url.isBlank()) {
            return@withContext Result.success(
                Pair(
                    TodaySalesSummary(todayTotal = 0.0, todayCount = 0),
                    emptyList()
                )
            )
        }

        try {
            val fullUrl = if (url.contains("?")) "$url&action=recent" else "$url?action=recent"
            val request = Request.Builder()
                .url(fullUrl)
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("Server HTTP ${response.code}"))
                }

                val bodyString = response.body?.string().orEmpty()
                val json = JSONObject(bodyString)
                if (!json.optBoolean("success", false)) {
                    return@withContext Result.failure(IOException(json.optString("message", "Gagal memuat riwayat")))
                }

                val todayTotal = json.optDouble("todayTotal", 0.0)
                val todayCount = json.optInt("todayCount", 0)
                val todaySummary = TodaySalesSummary(todayTotal, todayCount)

                val recentList = mutableListOf<RecentTransactionSummary>()
                val recentsArray = json.optJSONArray("recentTransactions") ?: JSONArray()
                for (i in 0 until recentsArray.length()) {
                    val txObj = recentsArray.getJSONObject(i)
                    val itemsArr = txObj.optJSONArray("items") ?: JSONArray()
                    val items = mutableListOf<ReceiptItemSummary>()
                    for (j in 0 until itemsArr.length()) {
                        val itm = itemsArr.getJSONObject(j)
                        items.add(
                            ReceiptItemSummary(
                                kategori = itm.optString("kategori", "-"),
                                namaProduk = itm.optString("namaProduk", "-"),
                                satuan = itm.optString("satuan", "pcs"),
                                jumlah = itm.optDouble("jumlah", 1.0),
                                hargaJual = itm.optDouble("hargaJual", 0.0),
                                subtotal = itm.optDouble("subtotal", 0.0)
                            )
                        )
                    }

                    recentList.add(
                        RecentTransactionSummary(
                            noStruk = txObj.optString("noStruk", "-"),
                            tanggal = txObj.optString("tanggal", "-"),
                            jam = txObj.optString("jam", "-"),
                            namaPembeli = txObj.optString("namaPembeli", "-"),
                            metodeBayar = txObj.optString("metodeBayar", "Tunai"),
                            total = txObj.optDouble("total", 0.0),
                            bayar = txObj.optDouble("bayar", 0.0),
                            kembalian = txObj.optDouble("kembalian", 0.0),
                            items = items
                        )
                    )
                }

                Result.success(Pair(todaySummary, recentList))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

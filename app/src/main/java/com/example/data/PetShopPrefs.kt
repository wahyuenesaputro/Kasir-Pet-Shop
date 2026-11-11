package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.model.Product
import org.json.JSONArray
import org.json.JSONObject

class PetShopPrefs(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("petshop_pos_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_APPS_SCRIPT_URL = "apps_script_url"
        private const val KEY_PRODUCT_SCRIPT_URL = "product_script_url"
        private const val KEY_SALES_SCRIPT_URL = "sales_script_url"
        private const val PREFIX_CUSTOM_PRICE = "custom_price_"
        private const val KEY_CUSTOM_PRODUCTS_JSON = "custom_created_products_json"
        private const val KEY_DELETED_PRODUCT_IDS = "deleted_product_ids_set"
        private const val KEY_PRODUCT_OVERRIDES_JSON = "product_overrides_json"
        private const val KEY_CURRENT_BALANCE = "current_cash_balance"
        const val DEFAULT_PLACEHOLDER_URL = "https://script.google.com/macros/s/AKfycbxUA6s50T7pEQ4a3Kg8AdbcT2HlFkW-MOoJMR7gZ2OHSMjg4jzdQIcW4tLd80nDfbNh/exec"
        const val DEFAULT_REAL_URL = "https://script.google.com/macros/s/AKfycbxUA6s50T7pEQ4a3Kg8AdbcT2HlFkW-MOoJMR7gZ2OHSMjg4jzdQIcW4tLd80nDfbNh/exec"
    }

    var currentBalance: Double
        get() = prefs.getFloat(KEY_CURRENT_BALANCE, 0f).toDouble()
        set(value) = prefs.edit().putFloat(KEY_CURRENT_BALANCE, value.toFloat()).apply()

    private fun isOutdatedUrl(url: String): Boolean {
        if (url.isBlank()) return true
        if (url.contains("CONTOH_ID") || url.contains("AKfycbzPytd") || url.contains("AKfycbxuIhr")) return true
        if (url.contains("AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp")) return true
        if (url.contains("AKfycbxclmpSwhWxOq0KKWNwUPHd5hYtjs3Q_fo3N1gvaZOtBdQ4FPyc3adQBQ77QvfUVGXQ")) return true
        if (url.contains("AKfycbxsIpuVeuiV36yNcBCznDLiYberyjDXdqjviFmYfvaJgbzCGhPfA2PDDXxsWUE9pXlu")) return true
        return false
    }

    private val effectiveLegacyUrl: String
        get() {
            val saved = prefs.getString(KEY_APPS_SCRIPT_URL, "") ?: ""
            return if (!isOutdatedUrl(saved)) saved else DEFAULT_REAL_URL
        }

    var productScriptUrl: String
        get() {
            val saved = prefs.getString(KEY_PRODUCT_SCRIPT_URL, "") ?: ""
            return if (!isOutdatedUrl(saved)) saved else effectiveLegacyUrl
        }
        set(value) = prefs.edit().putString(KEY_PRODUCT_SCRIPT_URL, value.trim()).apply()

    var salesScriptUrl: String
        get() {
            val saved = prefs.getString(KEY_SALES_SCRIPT_URL, "") ?: ""
            return if (!isOutdatedUrl(saved)) saved else effectiveLegacyUrl
        }
        set(value) = prefs.edit().putString(KEY_SALES_SCRIPT_URL, value.trim()).apply()

    var appsScriptUrl: String
        get() = effectiveProductUrl
        set(value) {
            prefs.edit().putString(KEY_APPS_SCRIPT_URL, value.trim()).apply()
            productScriptUrl = value.trim()
            salesScriptUrl = value.trim()
        }

    val effectiveProductUrl: String
        get() = productScriptUrl.ifBlank { salesScriptUrl.ifBlank { DEFAULT_REAL_URL } }

    val effectiveSalesUrl: String
        get() = salesScriptUrl.ifBlank { productScriptUrl.ifBlank { DEFAULT_REAL_URL } }

    val isConfigured: Boolean
        get() = effectiveProductUrl.isNotBlank() && effectiveProductUrl.startsWith("https://script.google.com")

    fun setCustomPrice(productId: String, price: Double) {
        prefs.edit().putFloat("$PREFIX_CUSTOM_PRICE$productId", price.toFloat()).apply()
    }

    fun getCustomPrice(productId: String): Double? {
        val key = "$PREFIX_CUSTOM_PRICE$productId"
        return if (prefs.contains(key)) {
            prefs.getFloat(key, 0f).toDouble()
        } else {
            null
        }
    }

    fun getAllCustomPrices(): Map<String, Double> {
        val result = mutableMapOf<String, Double>()
        for ((k, v) in prefs.all) {
            if (k.startsWith(PREFIX_CUSTOM_PRICE) && v is Float) {
                val pId = k.removePrefix(PREFIX_CUSTOM_PRICE)
                result[pId] = v.toDouble()
            }
        }
        return result
    }

    // === CRUD: Produk Baru Tambahan Kasir ===
    fun getCustomCreatedProducts(): List<Product> {
        val jsonStr = prefs.getString(KEY_CUSTOM_PRODUCTS_JSON, "") ?: ""
        if (jsonStr.isBlank()) return emptyList()

        return try {
            val jsonArray = JSONArray(jsonStr)
            val list = mutableListOf<Product>()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                list.add(
                    Product(
                        id = obj.getString("id"),
                        kategori = obj.getString("kategori"),
                        namaProduk = obj.getString("namaProduk"),
                        satuan = obj.getString("satuan"),
                        satuanAsli = obj.optString("satuanAsli", obj.getString("satuan")),
                        hargaJual = obj.getDouble("hargaJual"),
                        hargaBeli = obj.optDouble("hargaBeli", 0.0),
                        hargaBelumDiisi = obj.optBoolean("hargaBelumDiisi", false),
                        catatan = obj.optString("catatan", "")
                    )
                )
            }
            list
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveCustomCreatedProducts(products: List<Product>) {
        val jsonArray = JSONArray()
        products.forEach { prod ->
            val obj = JSONObject()
            obj.put("id", prod.id)
            obj.put("kategori", prod.kategori)
            obj.put("namaProduk", prod.namaProduk)
            obj.put("satuan", prod.satuan)
            obj.put("satuanAsli", prod.satuanAsli)
            obj.put("hargaJual", prod.hargaJual)
            obj.put("hargaBeli", prod.hargaBeli)
            obj.put("hargaBelumDiisi", prod.hargaBelumDiisi)
            obj.put("catatan", prod.catatan)
            jsonArray.put(obj)
        }
        prefs.edit().putString(KEY_CUSTOM_PRODUCTS_JSON, jsonArray.toString()).apply()
    }

    // === CRUD: Daftar ID Produk yang Dihapus ===
    fun getDeletedProductIds(): Set<String> {
        return prefs.getStringSet(KEY_DELETED_PRODUCT_IDS, emptySet()) ?: emptySet()
    }

    fun addDeletedProductId(id: String) {
        val current = getDeletedProductIds().toMutableSet()
        current.add(id)
        prefs.edit().putStringSet(KEY_DELETED_PRODUCT_IDS, current).apply()
    }

    // === CRUD: Modifikasi Produk Bawaan (Nama, Kategori, Satuan, Harga) ===
    fun getProductOverrides(): Map<String, Product> {
        val jsonStr = prefs.getString(KEY_PRODUCT_OVERRIDES_JSON, "") ?: ""
        if (jsonStr.isBlank()) return emptyMap()

        return try {
            val jsonObj = JSONObject(jsonStr)
            val map = mutableMapOf<String, Product>()
            val keys = jsonObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val obj = jsonObj.getJSONObject(key)
                map[key] = Product(
                    id = obj.getString("id"),
                    kategori = obj.getString("kategori"),
                    namaProduk = obj.getString("namaProduk"),
                    satuan = obj.getString("satuan"),
                    satuanAsli = obj.optString("satuanAsli", obj.getString("satuan")),
                    hargaJual = obj.getDouble("hargaJual"),
                    hargaBeli = obj.optDouble("hargaBeli", 0.0),
                    hargaBelumDiisi = obj.optBoolean("hargaBelumDiisi", false),
                    catatan = obj.optString("catatan", "")
                )
            }
            map
        } catch (e: Exception) {
            emptyMap()
        }
    }

    fun saveProductOverride(product: Product) {
        val current = getProductOverrides().toMutableMap()
        current[product.id] = product
        val jsonObj = JSONObject()
        current.forEach { (id, prod) ->
            val obj = JSONObject()
            obj.put("id", prod.id)
            obj.put("kategori", prod.kategori)
            obj.put("namaProduk", prod.namaProduk)
            obj.put("satuan", prod.satuan)
            obj.put("satuanAsli", prod.satuanAsli)
            obj.put("hargaJual", prod.hargaJual)
            obj.put("hargaBeli", prod.hargaBeli)
            obj.put("hargaBelumDiisi", prod.hargaBelumDiisi)
            obj.put("catatan", prod.catatan)
            jsonObj.put(id, obj)
        }
        prefs.edit().putString(KEY_PRODUCT_OVERRIDES_JSON, jsonObj.toString()).apply()
    }

    // === Pengaturan QRIS Toko ===
    var qrisMerchantName: String
        get() = prefs.getString("qris_merchant_name", "PET SHOP SEJAHTERA") ?: "PET SHOP SEJAHTERA"
        set(value) = prefs.edit().putString("qris_merchant_name", value.trim()).apply()

    var qrisNmid: String
        get() = prefs.getString("qris_nmid", "ID1020023456789") ?: "ID1020023456789"
        set(value) = prefs.edit().putString("qris_nmid", value.trim()).apply()

    var qrisCity: String
        get() = prefs.getString("qris_city", "JAKARTA") ?: "JAKARTA"
        set(value) = prefs.edit().putString("qris_city", value.trim()).apply()

    var qrisPostalCode: String
        get() = prefs.getString("qris_postal_code", "12340") ?: "12340"
        set(value) = prefs.edit().putString("qris_postal_code", value.trim()).apply()

    var qrisStaticBasePayload: String
        get() = prefs.getString("qris_static_base_payload", "") ?: ""
        set(value) = prefs.edit().putString("qris_static_base_payload", value.trim()).apply()
}


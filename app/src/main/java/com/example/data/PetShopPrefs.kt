package com.example.data

import android.content.Context
import android.content.SharedPreferences

class PetShopPrefs(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("petshop_pos_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_APPS_SCRIPT_URL = "apps_script_url"
        private const val PREFIX_CUSTOM_PRICE = "custom_price_"
        const val DEFAULT_PLACEHOLDER_URL = "https://script.google.com/macros/s/AKfycbz_CONTOH_ID_APPS_SCRIPT/exec"
    }

    var appsScriptUrl: String
        get() = prefs.getString(KEY_APPS_SCRIPT_URL, "") ?: ""
        set(value) = prefs.edit().putString(KEY_APPS_SCRIPT_URL, value.trim()).apply()

    val isConfigured: Boolean
        get() = appsScriptUrl.isNotBlank() && appsScriptUrl.startsWith("https://script.google.com")

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
}

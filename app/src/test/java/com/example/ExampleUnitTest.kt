package com.example

import com.example.model.CartItem
import com.example.model.Product
import com.example.model.formatQuantity
import com.example.model.formatRupiah
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExampleUnitTest {

    @Test
    fun testProductSellableCheck() {
        val sellableProduct = Product(
            id = "test_1",
            kategori = "Burung",
            namaProduk = "Milet",
            satuan = "kg",
            hargaJual = 14000.0
        )
        assertTrue(sellableProduct.isSellable)

        val unpricedProduct = Product(
            id = "test_2",
            kategori = "Burung",
            namaProduk = "Sangkar",
            satuan = "pcs",
            hargaJual = 0.0,
            hargaBelumDiisi = true
        )
        assertFalse(unpricedProduct.isSellable)
    }

    @Test
    fun testCartItemDecimalCalculation() {
        val chickenFeed = Product(
            id = "feed_1",
            kategori = "Ayam",
            namaProduk = "Konsentrat 511",
            satuan = "kg",
            satuanAsli = "zak",
            hargaJual = 12000.0,
            hargaBeli = 9500.0
        )

        val cartItem = CartItem(
            product = chickenFeed,
            quantity = 0.5,
            customUnitPrice = 12000.0
        )

        assertEquals(6000.0, cartItem.subtotal, 0.001)
        assertEquals("0,5", formatQuantity(cartItem.quantity))
    }

    @Test
    fun testNegotiatedPriceSubtotal() {
        val catFood = Product(
            id = "cat_1",
            kategori = "Kucing",
            namaProduk = "Whiskas",
            satuan = "kg",
            hargaJual = 50000.0
        )

        val cartItem = CartItem(
            product = catFood,
            quantity = 2.0,
            customUnitPrice = 45000.0 // Nego dari 50.000 ke 45.000
        )

        assertEquals(90000.0, cartItem.subtotal, 0.001)
    }
}

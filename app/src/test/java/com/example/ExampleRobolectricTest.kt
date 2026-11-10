package com.example

import com.example.data.SampleCatalog
import com.example.model.Product
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SampleCatalogTest {

  @Test
  fun testProductCatalogLoaded() {
    val products = SampleCatalog.defaultProducts
    assertTrue("Katalog harus berisi produk", products.isNotEmpty())
    
    // Verifikasi produk tidak membutuhkan harga modal
    val firstProduct = products.first()
    assertEquals(0.0, firstProduct.hargaBeli, 0.0)
    assertTrue("Harga jual harus lebih dari 0", firstProduct.hargaJual > 0)
    assertFalse("Produk awal sudah memiliki harga", firstProduct.hargaBelumDiisi)
  }

  @Test
  fun testCategoriesPresent() {
    val categories = SampleCatalog.defaultProducts.map { it.kategori }.toSet()
    assertTrue(categories.contains("Ayam"))
    assertTrue(categories.contains("Burung"))
    assertTrue(categories.contains("Kucing"))
    assertTrue(categories.contains("Ikan"))
    assertTrue(categories.contains("Obat"))
  }
}

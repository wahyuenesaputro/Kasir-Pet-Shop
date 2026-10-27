package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.ui.KasirScreen
import com.example.ui.KasirViewModel
import com.example.ui.theme.KasirPetShopTheme

class MainActivity : ComponentActivity() {

    private val viewModel: KasirViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            KasirPetShopTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    KasirScreen(viewModel = viewModel)
                }
            }
        }
    }
}

package com.example.util

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.widget.Toast
import com.example.model.SaleTransaction
import com.example.model.formatQuantity
import com.example.model.formatRupiah
import java.io.FileOutputStream
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

object ReceiptHelper {

    /**
     * Menghasilkan teks struk thermal murni monospace.
     * Sesuai instruksi: JANGAN tambahkan nama toko, alamat, atau nomor telepon di struk.
     */
    fun generatePlainTextReceipt(tx: SaleTransaction): String {
        val sb = StringBuilder()
        val width = 32 // Standar 58mm printer char width

        sb.append(repeatChar('=', width)).append("\n")
        sb.append("TANGGAL : ${tx.date} ${tx.time}\n")
        sb.append("NO STRUK: ${tx.receiptNumber}\n")
        if (tx.customerName.isNotBlank() && tx.customerName != "-") {
            sb.append("PEMBELI : ${tx.customerName}\n")
        }
        sb.append("BAYAR VIA: ${tx.paymentMethod}\n")
        sb.append(repeatChar('-', width)).append("\n")

        for (item in tx.items) {
            val name = item.product.namaProduk
            val qtyStr = "${formatQuantity(item.quantity)} ${item.product.satuan}"
            val priceStr = "@${formatRupiah(item.customUnitPrice)}"
            val subtotalStr = formatRupiah(item.subtotal)

            sb.append(name).append("\n")
            val detailLeft = "  $qtyStr x $priceStr"
            sb.append(padLine(detailLeft, subtotalStr, width)).append("\n")
        }

        sb.append(repeatChar('-', width)).append("\n")
        sb.append(padLine("TOTAL", formatRupiah(tx.totalAmount), width)).append("\n")
        sb.append(padLine("BAYAR", formatRupiah(tx.paidAmount), width)).append("\n")
        sb.append(padLine("KEMBALIAN", formatRupiah(tx.changeAmount), width)).append("\n")
        sb.append(repeatChar('=', width)).append("\n")
        sb.append("         TERIMA KASIH         \n")
        sb.append(repeatChar('=', width)).append("\n")

        return sb.toString()
    }

    /**
     * Salin teks struk ke papan klip Android.
     */
    fun copyToClipboard(context: Context, tx: SaleTransaction) {
        val receiptText = generatePlainTextReceipt(tx)
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Struk Kasir", receiptText)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "Teks struk berhasil disalin!", Toast.LENGTH_SHORT).show()
    }

    /**
     * Membagikan struk langsung ke WhatsApp atau sistem share Android.
     */
    fun shareToWhatsApp(context: Context, tx: SaleTransaction) {
        val receiptText = generatePlainTextReceipt(tx)
        try {
            val encodedText = URLEncoder.encode(receiptText, StandardCharsets.UTF_8.name())
            val whatsappIntent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("https://wa.me/?text=$encodedText")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(whatsappIntent)
        } catch (e: Exception) {
            val sendIntent = Intent().apply {
                action = Intent.ACTION_SEND
                putExtra(Intent.EXTRA_TEXT, receiptText)
                type = "text/plain"
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(sendIntent, "Bagikan Struk"))
        }
    }

    /**
     * Cetak struk via Android PrintManager menggunakan PdfDocument murni (Native),
     * tanpa menggunakan WebView/Chromium sehingga bebas dari crash renderer process.
     */
    fun printReceipt(context: Context, tx: SaleTransaction) {
        try {
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as? PrintManager
            if (printManager != null) {
                val printAdapter = NativeReceiptPrintAdapter(tx)
                val attributes = PrintAttributes.Builder()
                    .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A7)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build()

                printManager.print("Struk_${tx.receiptNumber}", printAdapter, attributes)
            } else {
                copyToClipboard(context, tx)
            }
        } catch (e: Exception) {
            copyToClipboard(context, tx)
        }
    }

    private fun padLine(left: String, right: String, totalWidth: Int): String {
        val spaceNeeded = totalWidth - left.length - right.length
        return if (spaceNeeded > 0) {
            left + " ".repeat(spaceNeeded) + right
        } else {
            "$left $right"
        }
    }

    private fun repeatChar(c: Char, count: Int): String = c.toString().repeat(count)
}

/**
 * Native PrintDocumentAdapter yang merender struk termal menggunakan PdfDocument & Canvas native Android.
 * Sepenuhnya bebas dari dependensi WebView/Chromium.
 */
class NativeReceiptPrintAdapter(
    private val tx: SaleTransaction
) : PrintDocumentAdapter() {

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes?,
        cancellationSignal: CancellationSignal?,
        callback: LayoutResultCallback?,
        extras: Bundle?
    ) {
        if (cancellationSignal?.isCanceled == true) {
            callback?.onLayoutCancelled()
            return
        }

        val info = PrintDocumentInfo.Builder("Struk_${tx.receiptNumber}.pdf")
            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .setPageCount(1)
            .build()

        callback?.onLayoutFinished(info, true)
    }

    override fun onWrite(
        pages: Array<out PageRange>?,
        destination: ParcelFileDescriptor?,
        cancellationSignal: CancellationSignal?,
        callback: WriteResultCallback?
    ) {
        val pdfDocument = PdfDocument()

        try {
            val pageWidth = 280 // ~58mm @ 72-120 dpi points
            val contentHeight = 320 + (tx.items.size * 32)
            val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, contentHeight, 1).create()
            val page = pdfDocument.startPage(pageInfo)
            val canvas = page.canvas

            val paint = Paint().apply {
                color = Color.BLACK
                isAntiAlias = true
                typeface = Typeface.MONOSPACE
            }

            val dashPaint = Paint().apply {
                color = Color.DKGRAY
                style = Paint.Style.STROKE
                strokeWidth = 1.2f
                pathEffect = DashPathEffect(floatArrayOf(4f, 4f), 0f)
            }

            val solidPaint = Paint().apply {
                color = Color.BLACK
                style = Paint.Style.STROKE
                strokeWidth = 1.5f
            }

            var y = 24f
            val margin = 14f
            val rightMargin = pageWidth - margin

            fun drawDoubleDivider() {
                canvas.drawLine(margin, y, rightMargin, y, solidPaint)
                y += 3f
                canvas.drawLine(margin, y, rightMargin, y, solidPaint)
                y += 14f
            }

            fun drawDashedDivider() {
                canvas.drawLine(margin, y, rightMargin, y, dashPaint)
                y += 14f
            }

            fun drawLeftRight(left: String, right: String, isBold: Boolean = false, textSize: Float = 10f) {
                paint.textSize = textSize
                paint.typeface = if (isBold) Typeface.create(Typeface.MONOSPACE, Typeface.BOLD) else Typeface.MONOSPACE
                paint.textAlign = Paint.Align.LEFT
                canvas.drawText(left, margin, y, paint)
                paint.textAlign = Paint.Align.RIGHT
                canvas.drawText(right, rightMargin, y, paint)
                y += textSize + 4f
            }

            // Header garis (TANPA NAMA TOKO/ALAMAT/TELP)
            drawDoubleDivider()

            drawLeftRight("Tanggal:", "${tx.date} ${tx.time}")
            drawLeftRight("No Struk:", tx.receiptNumber)
            if (tx.customerName.isNotBlank() && tx.customerName != "-") {
                drawLeftRight("Pembeli:", tx.customerName)
            }
            drawLeftRight("Metode:", tx.paymentMethod)

            drawDashedDivider()

            // Daftar Barang
            for (item in tx.items) {
                paint.textSize = 10f
                paint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                paint.textAlign = Paint.Align.LEFT
                canvas.drawText(item.product.namaProduk, margin, y, paint)
                y += 13f

                val qtyPrice = "  ${formatQuantity(item.quantity)} ${item.product.satuan} x @${formatRupiah(item.customUnitPrice)}"
                drawLeftRight(qtyPrice, formatRupiah(item.subtotal), isBold = false, textSize = 9.5f)
            }

            drawDashedDivider()

            // Ringkasan Keuangan
            drawLeftRight("TOTAL", formatRupiah(tx.totalAmount), isBold = true, textSize = 11.5f)
            drawLeftRight("BAYAR", formatRupiah(tx.paidAmount), isBold = false, textSize = 10f)
            drawLeftRight("KEMBALIAN", formatRupiah(tx.changeAmount), isBold = true, textSize = 11f)

            drawDoubleDivider()

            // Penutup
            paint.textSize = 10f
            paint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            paint.textAlign = Paint.Align.CENTER
            canvas.drawText("TERIMA KASIH", pageWidth / 2f, y, paint)
            y += 8f
            drawDoubleDivider()

            pdfDocument.finishPage(page)

            if (destination != null) {
                FileOutputStream(destination.fileDescriptor).use { outputStream ->
                    pdfDocument.writeTo(outputStream)
                }
            }

            callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
        } catch (e: Exception) {
            callback?.onWriteFailed(e.localizedMessage)
        } finally {
            pdfDocument.close()
        }
    }
}

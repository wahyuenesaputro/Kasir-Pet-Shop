/**
 * Kasir Pet Shop Web POS (Desktop Workstation & Mobile iOS/Android PWA)
 * - Standarisasi: Produk pakan/karungan/curah ber-satuan 'kg' (bisa desimal: 0,25 kg, 0,5 kg, 1,5 kg).
 * - Produk lainnya (kemasan, vitamin, obat, aksesoris) ber-satuan 'pcs'.
 */

// State
let products = [];
let cart = {}; // productId -> { product, qty: Float }
let selectedCategory = "Semua";
let katalogSelectedCategory = "Semua";
let currentPaymentMethod = "Tunai";
let activeReceipt = null;
let currentMutationType = "add"; // 'add', 'withdraw', 'set'
let currentBalance = Number(localStorage.getItem("petshop_current_balance")) || 0;
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUA6s50T7pEQ4a3Kg8AdbcT2HlFkW-MOoJMR7gZ2OHSMjg4jzdQIcW4tLd80nDfbNh/exec";

// Otomatis migrasi browser jika masih menyimpan URL lama/placeholder
(function migrateOldUrls() {
  const outdatedSignatures = [
    "AKfycbxsIpuVeuiV36yNcBCznDLiYberyjDXdqjviFmYfvaJgbzCGhPfA2PDDXxsWUE9pXlu",
    "AKfycbxclmpSwhWxOq0KKWNwUPHd5hYtjs3Q_fo3N1gvaZOtBdQ4FPyc3adQBQ77QvfUVGXQ",
    "AKfycbzPytd",
    "AKfycbxuIhr",
    "AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp",
    "AKfycbxMTDMgUPmfCA2IqGEMGaPVk_NjZkLwcRklY1BuFumywXmDH5mTnp-mr9oQo8himA0M",
    "CONTOH_ID"
  ];
  ["petshop_product_script_url", "petshop_sales_script_url", "petshop_apps_script_url"].forEach(k => {
    const val = localStorage.getItem(k);
    if (!val || outdatedSignatures.some(sig => val.includes(sig))) {
      localStorage.setItem(k, DEFAULT_APPS_SCRIPT_URL);
    }
  });
})();

let productScriptUrl = localStorage.getItem("petshop_product_script_url") || localStorage.getItem("petshop_apps_script_url") || DEFAULT_APPS_SCRIPT_URL;
let salesScriptUrl = localStorage.getItem("petshop_sales_script_url") || localStorage.getItem("petshop_apps_script_url") || DEFAULT_APPS_SCRIPT_URL;

function getProductUrl() {
  const p = (productScriptUrl || "").trim();
  if (p && p.startsWith("https://script.google.com")) return p;
  const s = (salesScriptUrl || "").trim();
  if (s && s.startsWith("https://script.google.com")) return s;
  return DEFAULT_APPS_SCRIPT_URL;
}

function getSalesUrl() {
  const s = (salesScriptUrl || "").trim();
  if (s && s.startsWith("https://script.google.com")) return s;
  const p = (productScriptUrl || "").trim();
  if (p && p.startsWith("https://script.google.com")) return p;
  return DEFAULT_APPS_SCRIPT_URL;
}

// Sanitasi nama produk: ganti Zak/zak menjadi Karung/karung
function sanitizeProductName(name) {
  return String(name || "")
    .replace(/\b1\s*Zak\b/gi, "1 Karung")
    .replace(/\bZak\b/g, "Karung")
    .replace(/\bzak\b/g, "karung");
}

// FUNGSI NORMALISASI SATUAN (KARUNG/ZAK/CURAH -> KG, LAINNYA -> PCS)
function normalizeSatuan(rawSatuan, productName = "") {
  const s = String(rawSatuan || "").trim().toLowerCase();
  const name = String(productName || "").trim().toLowerCase();
  
  if (s === "zak" || s === "karung" || s === "sak" || s.includes("kg") || name.includes("zak") || name.includes("karung")) {
    return "kg";
  }
  return "pcs";
}

const defaultCatalog = [
  { id: "ayam_1", kategori: "Ayam", namaProduk: "511 (1 Karung)", satuan: "kg", hargaJual: 11500 },
  { id: "ayam_2", kategori: "Ayam", namaProduk: "511 (511 K)", satuan: "kg", hargaJual: 14500 },
  { id: "ayam_3", kategori: "Ayam", namaProduk: "591 (591k)", satuan: "kg", hargaJual: 14500 },
  { id: "ayam_4", kategori: "Ayam", namaProduk: "592 (592k)", satuan: "kg", hargaJual: 14500 },
  { id: "ayam_5", kategori: "Ayam", namaProduk: "594 (594k)", satuan: "kg", hargaJual: 14500 },
  { id: "ayam_6", kategori: "Ayam", namaProduk: "BR-1 Super", satuan: "kg", hargaJual: 12000 },
  { id: "ayam_7", kategori: "Ayam", namaProduk: "BR-611", satuan: "kg", hargaJual: 10000 },
  { id: "ayam_8", kategori: "Ayam", namaProduk: "Buras (1 Karung)", satuan: "kg", hargaJual: 7000 },
  { id: "ayam_9", kategori: "Ayam", namaProduk: "EH 610 (1 Karung)", satuan: "kg", hargaJual: 9500 },
  { id: "ayam_10", kategori: "Ayam", namaProduk: "Jagung (1 Karung Meniran)", satuan: "kg", hargaJual: 10500 },
  { id: "ayam_11", kategori: "Ayam", namaProduk: "Jagung (1 Karung Kasar)", satuan: "kg", hargaJual: 10500 },
  { id: "ayam_12", kategori: "Ayam", namaProduk: "Jagung (Unyil Kristal)", satuan: "pcs", hargaJual: 13000 },
  { id: "ayam_13", kategori: "Ayam", namaProduk: "524 A (Karung)", satuan: "kg", hargaJual: 9000 },
  { id: "ayam_14", kategori: "Ayam", namaProduk: "324KJ (Karung)", satuan: "kg", hargaJual: 9500 },
  { id: "ayam_15", kategori: "Ayam", namaProduk: "CP 124 P", satuan: "kg", hargaJual: 11000 },
  { id: "burung_1", kategori: "Burung", namaProduk: "Leopard (MD Halus)", satuan: "pcs", hargaJual: 8000 },
  { id: "burung_2", kategori: "Burung", namaProduk: "Leopard (MD Kasar)", satuan: "pcs", hargaJual: 8000 },
  { id: "burung_3", kategori: "Burung", namaProduk: "Leopard (Hijau Kasar)", satuan: "pcs", hargaJual: 8500 },
  { id: "burung_4", kategori: "Burung", namaProduk: "Topsong (Top Song Coklat)", satuan: "pcs", hargaJual: 12000 },
  { id: "burung_5", kategori: "Burung", namaProduk: "Topsong (Top Song Hijau)", satuan: "pcs", hargaJual: 12000 },
  { id: "burung_6", kategori: "Burung", namaProduk: "SKM (SKM Halus)", satuan: "pcs", hargaJual: 4500 },
  { id: "burung_7", kategori: "Burung", namaProduk: "SKM (SKM Kasar)", satuan: "pcs", hargaJual: 4500 },
  { id: "burung_8", kategori: "Burung", namaProduk: "Kroto Sari (KSK)", satuan: "pcs", hargaJual: 3500 },
  { id: "burung_9", kategori: "Burung", namaProduk: "Kroto Sari (Krotosari Kasar)", satuan: "pcs", hargaJual: 3500 },
  { id: "burung_10", kategori: "Burung", namaProduk: "Alam Sakti (Love Bird)", satuan: "pcs", hargaJual: 10500 },
  { id: "burung_11", kategori: "Burung", namaProduk: "Alam Sakti (Kenari)", satuan: "pcs", hargaJual: 11500 },
  { id: "burung_12", kategori: "Burung", namaProduk: "Madura Koung (Madura Koung)", satuan: "pcs", hargaJual: 9500 },
  { id: "burung_13", kategori: "Burung", namaProduk: "Kutut Profit (Profit)", satuan: "pcs", hargaJual: 8500 },
  { id: "burung_14", kategori: "Burung", namaProduk: "Derkuku Comet (Comet Derkuku)", satuan: "pcs", hargaJual: 7500 },
  { id: "burung_15", kategori: "Burung", namaProduk: "Gold Coin (Kutut 250gr)", satuan: "pcs", hargaJual: 8500 },
  { id: "burung_16", kategori: "Burung", namaProduk: "Gold Coin (Hijau Seaweed 450gr)", satuan: "pcs", hargaJual: 12000 },
  { id: "burung_17", kategori: "Burung", namaProduk: "Gold Coin (Canary)", satuan: "pcs", hargaJual: 10000 },
  { id: "burung_18", kategori: "Burung", namaProduk: "Ebod Canary (Ebod)", satuan: "pcs", hargaJual: 9000 },
  { id: "burung_19", kategori: "Burung", namaProduk: "Chirpy (Besar)", satuan: "pcs", hargaJual: 10000 },
  { id: "burung_20", kategori: "Burung", namaProduk: "Chirpy (Kecil)", satuan: "pcs", hargaJual: 7000 },
  { id: "burung_21", kategori: "Burung", namaProduk: "Fancy (Besar)", satuan: "pcs", hargaJual: 14500 },
  { id: "burung_22", kategori: "Burung", namaProduk: "Fancy (Kecil 250gr)", satuan: "pcs", hargaJual: 8000 },
  { id: "burung_23", kategori: "Burung", namaProduk: "Ketan Hitam", satuan: "pcs", hargaJual: 8500 },
  { id: "burung_24", kategori: "Burung", namaProduk: "Milet Putih (1kg)", satuan: "kg", hargaJual: 14500 },
  { id: "burung_25", kategori: "Burung", namaProduk: "Milet Merah", satuan: "pcs", hargaJual: 14500 },
  { id: "burung_26", kategori: "Burung", namaProduk: "Kenari Seed (1kg)", satuan: "kg", hargaJual: 15500 },
  { id: "burung_27", kategori: "Burung", namaProduk: "Trucuk Pisang Ijo SM", satuan: "pcs", hargaJual: 4500 },
  { id: "burung_28", kategori: "Burung", namaProduk: "521 (521 Coklat)", satuan: "kg", hargaJual: 8500 },
  { id: "burung_29", kategori: "Burung", namaProduk: "521 (521 Hijau)", satuan: "kg", hargaJual: 8500 },
  { id: "ikan_1", kategori: "Ikan", namaProduk: "781 (-1)", satuan: "pcs", hargaJual: 16500 },
  { id: "ikan_2", kategori: "Ikan", namaProduk: "781 (-2)", satuan: "pcs", hargaJual: 16000 },
  { id: "ikan_3", kategori: "Ikan", namaProduk: "781 (-3)", satuan: "pcs", hargaJual: 15500 },
  { id: "ikan_4", kategori: "Ikan", namaProduk: "782 (-2)", satuan: "pcs", hargaJual: 14500 },
  { id: "ikan_5", kategori: "Ikan", namaProduk: "782 (-3)", satuan: "pcs", hargaJual: 14000 },
  { id: "ikan_6", kategori: "Ikan", namaProduk: "782 (-4)", satuan: "pcs", hargaJual: 14000 },
  { id: "ikan_7", kategori: "Ikan", namaProduk: "T78 (-2) kg", satuan: "pcs", hargaJual: 12500 },
  { id: "ikan_8", kategori: "Ikan", namaProduk: "T78 (-3) kg", satuan: "pcs", hargaJual: 12000 },
  { id: "ikan_9", kategori: "Ikan", namaProduk: "T78 (-4) kg", satuan: "pcs", hargaJual: 12000 },
  { id: "ikan_10", kategori: "Ikan", namaProduk: "Hiu (-2)", satuan: "pcs", hargaJual: 8500 },
  { id: "ikan_11", kategori: "Ikan", namaProduk: "Hiu (-3)", satuan: "pcs", hargaJual: 8500 },
  { id: "ikan_12", kategori: "Ikan", namaProduk: "Hiu (-5)", satuan: "pcs", hargaJual: 8500 },
  { id: "ikan_13", kategori: "Ikan", namaProduk: "Takari (100 gr)", satuan: "pcs", hargaJual: 4500 },
  { id: "kucing_1", kategori: "Kucing", namaProduk: "Bolt (Ikan Ungu 800gr)", satuan: "pcs", hargaJual: 19000 },
  { id: "kucing_2", kategori: "Kucing", namaProduk: "Bolt (Donat Kuning 800gr)", satuan: "pcs", hargaJual: 19000 },
  { id: "kucing_3", kategori: "Kucing", namaProduk: "Bolt (Pink Bulat 800gr)", satuan: "pcs", hargaJual: 19000 },
  { id: "kucing_4", kategori: "Kucing", namaProduk: "Bolt (Kitten Bolt 500gr)", satuan: "pcs", hargaJual: 13000 },
  { id: "kucing_5", kategori: "Kucing", namaProduk: "Felibite (Felibite Ikan)", satuan: "pcs", hargaJual: 12000 },
  { id: "kucing_6", kategori: "Kucing", namaProduk: "Felibite (Felibite Donat)", satuan: "pcs", hargaJual: 12000 },
  { id: "kucing_7", kategori: "Kucing", namaProduk: "Felibite (Felibite Kitten Donat)", satuan: "pcs", hargaJual: 13000 },
  { id: "kucing_8", kategori: "Kucing", namaProduk: "Excel (Adult Ikan 500gr)", satuan: "pcs", hargaJual: 11500 },
  { id: "kucing_9", kategori: "Kucing", namaProduk: "Excel (Adult Donat)", satuan: "pcs", hargaJual: 11500 },
  { id: "kucing_10", kategori: "Kucing", namaProduk: "Excel (Adult Segitiga Oren)", satuan: "pcs", hargaJual: 11500 },
  { id: "kucing_11", kategori: "Kucing", namaProduk: "Excel (Kitten Pink 500gr)", satuan: "pcs", hargaJual: 13000 },
  { id: "kucing_12", kategori: "Kucing", namaProduk: "Cat Choize (Hijau Adult 800gr)", satuan: "pcs", hargaJual: 18000 },
  { id: "kucing_13", kategori: "Kucing", namaProduk: "Cat Choize (Oren Adult 800gr)", satuan: "pcs", hargaJual: 18000 },
  { id: "kucing_14", kategori: "Kucing", namaProduk: "Cat Choize (Kitten Tuna Pink 1kg)", satuan: "pcs", hargaJual: 24500 },
  { id: "kucing_15", kategori: "Kucing", namaProduk: "Cat Choize (Kitten Salmon Kuning 1kg)", satuan: "pcs", hargaJual: 24500 },
  { id: "kucing_16", kategori: "Kucing", namaProduk: "Chester (800gr)", satuan: "pcs", hargaJual: 17000 },
  { id: "kucing_17", kategori: "Kucing", namaProduk: "Whiskas Pouch (1 Dus 28 Pcs Junior)", satuan: "pcs", hargaJual: 6000 },
  { id: "kucing_18", kategori: "Kucing", namaProduk: "Whiskas Pouch (1 Dus isi 28 Pcs Adult)", satuan: "pcs", hargaJual: 6000 },
  { id: "kucing_19", kategori: "Kucing", namaProduk: "Life Cat (1 Dus Pouch 24pcs)", satuan: "pcs", hargaJual: 5000 },
  { id: "kucing_20", kategori: "Kucing", namaProduk: "Life Cat (Kaleng Adult 400gr)", satuan: "pcs", hargaJual: 13500 },
  { id: "kucing_21", kategori: "Kucing", namaProduk: "Life Cat (Kaleng Kitten 400gr)", satuan: "pcs", hargaJual: 13500 },
  { id: "obat_1", kategori: "Obat", namaProduk: "Vita Tetra Chlor (Kapsul isi 10)", satuan: "pcs", hargaJual: 6000 },
  { id: "obat_2", kategori: "Obat", namaProduk: "Koleridin (Kapsul isi 10)", satuan: "pcs", hargaJual: 5500 },
  { id: "obat_3", kategori: "Obat", namaProduk: "Vita Stress (Sachet 10gr)", satuan: "pcs", hargaJual: 5000 },
  { id: "obat_4", kategori: "Obat", namaProduk: "Super N (15 ml)", satuan: "pcs", hargaJual: 20000 },
  { id: "obat_5", kategori: "Obat", namaProduk: "Biodin Spray Antiseptik (100 ml)", satuan: "pcs", hargaJual: 28000 },
  { id: "obat_6", kategori: "Obat", namaProduk: "Scabies Cream / Salep Jamur Kucing", satuan: "pcs", hargaJual: 16000 },
  { id: "obat_7", kategori: "Obat", namaProduk: "Detick Obat Kutu Kucing (1-10kg)", satuan: "pcs", hargaJual: 22000 },
  { id: "obat_8", kategori: "Obat", namaProduk: "Albenworm Obat Cacing Kucing", satuan: "pcs", hargaJual: 18000 },
  { id: "obat_9", kategori: "Obat", namaProduk: "Minyak Ikan / Fish Oil (Botol 50 butir)", satuan: "pcs", hargaJual: 12000 },
  { id: "obat_10", kategori: "Obat", namaProduk: "Gendol / Tetraclor Cair Ternak (100 ml)", satuan: "pcs", hargaJual: 14000 },
  { id: "obat_11", kategori: "Obat", namaProduk: "Doxyvet Serbuk (Sachet 5gr)", satuan: "pcs", hargaJual: 6000 },
  { id: "obat_12", kategori: "Obat", namaProduk: "Obat Kutu Serbuk Asuntol (100gr)", satuan: "pcs", hargaJual: 15000 }
];


// Inisialisasi Saat Dokumen Dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadStoredProducts();
  renderCategories();
  renderProducts();
  renderCatalogManager();
  updateCartUI();
  updateDashboard();
  renderQuickBalanceChips();

  const prodInput = document.getElementById("setting-product-script-url");
  if (prodInput) prodInput.value = productScriptUrl;
  const salesInput = document.getElementById("setting-sales-script-url");
  if (salesInput) salesInput.value = salesScriptUrl;

  const headerBal = document.getElementById("header-balance-preview");
  if (headerBal) headerBal.innerText = formatRupiah(currentBalance);

  setupKeyboardShortcuts();

  // Jalankan sinkronisasi otomatis saat pertama kali dibuka (onLoad)
  autoSync();

  // Mekanisme polling berkala setiap 5 menit (300.000 ms) agar data selalu up to date
  setInterval(() => {
    console.log("[AutoSync] Menjalankan sinkronisasi berkala 5 menit...");
    autoSync(true); // silent = true agar tidak mengganggu kasir jika sedang transaksi
  }, 5 * 60 * 1000);
});

// FUNGSI SINKRONISASI OTOMATIS (ONLOAD & POLLING 5 MENIT)
async function autoSync(silent = false) {
  const pUrl = getProductUrl();
  const sUrl = getSalesUrl();
  if (!pUrl && !sUrl) return;
  try {
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.classList.remove("hidden");
      syncBadge.innerText = "Menyinkronkan...";
    }
    await syncData();
    if (syncBadge) {
      syncBadge.innerText = "Tersinkron";
      setTimeout(() => syncBadge.classList.add("hidden"), 3000);
    }
  } catch (e) {
    if (!silent) console.warn("[AutoSync Error]:", e);
  }
}

// KEYBOARD SHORTCUTS KHUSUS DESKTOP
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // F2: Shortcut Bayar Kasir Langsung
    if (e.key === "F2") {
      e.preventDefault();
      const { totalAmount } = getCartTotals();
      if (totalAmount <= 0) {
        alert("Keranjang masih kosong! Silakan pilih produk terlebih dahulu.");
        return;
      }
      const desktopSidebar = document.getElementById("desktop-cart-items-container");
      if (desktopSidebar && window.innerWidth >= 1024) {
        submitDesktopPayment();
      } else {
        openPaymentModal();
      }
    }

    // / : Shortcut Fokus ke Pencarian Produk
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      const sInput = document.getElementById("search-input");
      if (sInput) {
        sInput.focus();
        sInput.select();
      }
    }

    // Escape : Tutup Semua Modal
    if (e.key === "Escape") {
      closeCartModal();
      closePaymentModal();
      closeReceiptModal();
      closeAddProductModal();
      closeSettingsModal();
      closeQuickEditPriceModal();
    }
  });
}

function loadStoredProducts() {
  const isCleanSlate = localStorage.getItem("petshop_clean_slate") === "true";
  const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  const overrides = JSON.parse(localStorage.getItem("petshop_price_overrides") || "{}");
  const deletedIds = JSON.parse(localStorage.getItem("petshop_deleted_product_ids") || "[]");
  
  const baseCatalog = isCleanSlate ? [] : defaultCatalog;
  const all = [...baseCatalog, ...custom].filter(p => !deletedIds.includes(p.id));
  
  products = all.map(p => {
    const cleanedName = sanitizeProductName(p.namaProduk);
    const normSatuan = normalizeSatuan(p.satuan, cleanedName);
    let finalPrice = p.hargaJual;
    if (overrides[p.id] !== undefined) {
      finalPrice = Number(overrides[p.id]);
    }
    return { ...p, namaProduk: cleanedName, satuan: normSatuan, hargaJual: finalPrice };
  });
}

// FORMAT RUPIAH
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number || 0);
}

// FORMAT KUANTITAS (0.5 kg, 1 kg, 2 pcs)
function formatQty(qty, satuan) {
  if (satuan === "kg") {
    const formatted = (qty % 1 === 0) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, "");
    return `${formatted} kg`;
  }
  return `${Math.round(qty)} pcs`;
}

// TAB SWITCHER RESPONSIF (KASIR, KATALOG, DASHBOARD, RIWAYAT)
function switchTab(tab) {
  ["kasir", "katalog", "dashboard", "riwayat"].forEach(t => {
    const screen = document.getElementById(`screen-${t}`);
    if (screen) screen.classList.add("hidden");

    // Mobile nav
    const btn = document.getElementById(`nav-${t}`);
    if (btn) {
      btn.className = "flex-1 py-1.5 px-1 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition text-slate-500 hover:bg-slate-100";
    }

    // Desktop nav
    const deskBtn = document.getElementById(`desktop-nav-${t}`);
    if (deskBtn) {
      deskBtn.className = "py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition text-slate-600 hover:text-slate-900 hover:bg-white/60";
    }
  });

  const activeScreen = document.getElementById(`screen-${tab}`);
  if (activeScreen) activeScreen.classList.remove("hidden");

  const activeBtn = document.getElementById(`nav-${tab}`);
  if (activeBtn) {
    activeBtn.className = "flex-1 py-1.5 px-1 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition bg-blue-600 text-white shadow-sm";
  }

  const activeDeskBtn = document.getElementById(`desktop-nav-${tab}`);
  if (activeDeskBtn) {
    activeDeskBtn.className = "py-1.5 px-3.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition bg-blue-600 text-white shadow-sm";
  }

  if (tab === "katalog") renderCatalogManager();
  if (tab === "dashboard") updateDashboard();
  if (tab === "riwayat") loadRecentSales();
  if (window.lucide) lucide.createIcons();
}

// KATEGORI FILTER KASIR
function renderCategories() {
  const cats = [
    { id: "Semua", label: "🔍 Semua" },
    { id: "Ayam", label: "🐔 Ayam" },
    { id: "Burung", label: "🐦 Burung" },
    { id: "Kucing", label: "🐱 Kucing" },
    { id: "Ikan", label: "🐟 Ikan" },
    { id: "Obat", label: "💊 Obat" }
  ];

  const container = document.getElementById("category-chips");
  if (!container) return;
  container.innerHTML = cats.map(c => {
    const isAct = selectedCategory === c.id;
    return `
      <button onclick="selectCategory('${c.id}')" class="whitespace-nowrap py-1.5 px-3.5 rounded-xl text-xs font-bold transition ${
        isAct ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
      }">
        ${c.label}
      </button>
    `;
  }).join("");
}

function selectCategory(cat) {
  selectedCategory = cat;
  renderCategories();
  renderProducts();
}

// RENDER GRID PRODUK KASIR
function renderProducts() {
  const searchInput = document.getElementById("search-input");
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const filtered = products.filter(p => {
    const matchCat = (selectedCategory === "Semua") || (p.kategori.toLowerCase() === selectedCategory.toLowerCase());
    const matchSearch = p.namaProduk.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-2 sm:col-span-3 xl:col-span-4 py-16 px-4 text-center max-w-md mx-auto space-y-3">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
            <i data-lucide="sparkles" class="w-8 h-8"></i>
          </div>
          <h3 class="text-base font-bold text-slate-800">Katalog Produk Masih Bersih & Kosong</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Spreadsheet telah disiapkan dengan format Emerald Green modern. Anda dapat mulai menambahkan produk langsung di Google Sheets atau menggunakan tombol di bawah.
          </p>
          <div class="pt-2 flex justify-center space-x-2">
            <button onclick="openAddProductModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>+ Tambah Produk Baru</span>
            </button>
          </div>
        </div>
      `;
    } else {
      grid.innerHTML = `
        <div class="col-span-2 sm:col-span-3 xl:col-span-4 py-16 text-center text-slate-400 space-y-2">
          <i data-lucide="package-search" class="w-12 h-12 mx-auto stroke-1 text-slate-300"></i>
          <p class="text-sm font-semibold">Tidak ditemukan produk terkait</p>
          <p class="text-xs text-slate-400">Coba ganti kata kunci atau pilih kategori lain</p>
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const cartItem = cart[p.id];
    const qty = cartItem ? cartItem.qty : 0;
    const isKg = p.satuan === "kg";
    
    let catIcon = "box";
    if (p.kategori === "Ayam") catIcon = "egg";
    if (p.kategori === "Burung") catIcon = "feather";
    if (p.kategori === "Kucing") catIcon = "cat";
    if (p.kategori === "Ikan") catIcon = "fish";
    if (p.kategori === "Obat") catIcon = "pill";

    return `
      <div class="bg-white rounded-2xl p-3 sm:p-3.5 border ${qty > 0 ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 hover:border-slate-300'} shadow-sm flex flex-col justify-between transition relative overflow-hidden group">
        ${qty > 0 ? `<div class="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">${formatQty(qty, p.satuan)}</div>` : ''}
        
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <div class="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center text-xs transition">
              <i data-lucide="${catIcon}" class="w-4 h-4"></i>
            </div>
            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isKg ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">
              ${p.satuan}
            </span>
          </div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">${p.kategori}</span>
          <h4 class="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mt-0.5">${p.namaProduk}</h4>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span class="text-xs sm:text-sm font-black text-blue-700">${formatRupiah(p.hargaJual)}</span>
            <span class="text-[10px] text-slate-400 block">/${p.satuan}</span>
          </div>
          
          <div class="flex items-center space-x-1">
            ${qty > 0 ? `
              <button onclick="decrementCart('${p.id}')" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black transition" title="Kurangi">-</button>
            ` : ''}
            <button onclick="addToCart('${p.id}')" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${qty > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'} flex items-center justify-center text-xs font-black transition shadow-sm" title="Tambah ke keranjang">+</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// LOGIKA LAYAR MENU KATALOG & EDIT HARGA
function renderCatalogCategories() {
  const cats = [
    { id: "Semua", label: "🔍 Semua" },
    { id: "Ayam", label: "🐔 Ayam" },
    { id: "Burung", label: "🐦 Burung" },
    { id: "Kucing", label: "🐱 Kucing" },
    { id: "Ikan", label: "🐟 Ikan" },
    { id: "Obat", label: "💊 Obat" }
  ];

  const container = document.getElementById("katalog-category-chips");
  if (!container) return;
  container.innerHTML = cats.map(c => {
    const isAct = katalogSelectedCategory === c.id;
    return `
      <button onclick="selectKatalogCategory('${c.id}')" class="whitespace-nowrap py-1.5 px-3.5 rounded-xl text-xs font-bold transition ${
        isAct ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
      }">
        ${c.label}
      </button>
    `;
  }).join("");
}

function selectKatalogCategory(cat) {
  katalogSelectedCategory = cat;
  renderCatalogCategories();
  renderCatalogManager();
}

function renderCatalogManager() {
  renderCatalogCategories();
  const searchInput = document.getElementById("katalog-search-input");
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const listContainer = document.getElementById("katalog-products-list");
  if (!listContainer) return;

  const filtered = products.filter(p => {
    const matchCat = (katalogSelectedCategory === "Semua") || (p.kategori.toLowerCase() === katalogSelectedCategory.toLowerCase());
    const matchSearch = p.namaProduk.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  const badge = document.getElementById("katalog-total-badge");
  if (badge) badge.innerText = `${filtered.length} dari ${products.length} Produk`;

  if (filtered.length === 0) {
    if (products.length === 0) {
      listContainer.innerHTML = `
        <div class="col-span-1 sm:col-span-2 lg:col-span-3 py-16 px-4 text-center max-w-md mx-auto space-y-3">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
            <i data-lucide="sparkles" class="w-8 h-8"></i>
          </div>
          <h3 class="text-base font-bold text-slate-800">Katalog Master Bersih & Kosong</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Format spreadsheet Emerald Green telah siap. Anda dapat menginput produk di spreadsheet atau klik tombol Tambah Produk di bawah.
          </p>
          <div class="pt-2 flex justify-center space-x-2">
            <button onclick="openAddProductModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>+ Tambah Produk Baru</span>
            </button>
          </div>
        </div>
      `;
    } else {
      listContainer.innerHTML = `
        <div class="col-span-1 sm:col-span-2 lg:col-span-3 py-16 text-center text-slate-400 space-y-2">
          <i data-lucide="package-search" class="w-12 h-12 mx-auto stroke-1 text-slate-300"></i>
          <p class="text-sm font-semibold">Tidak ada produk ditemukan</p>
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  listContainer.innerHTML = filtered.map(p => {
    let catIcon = "box";
    if (p.kategori === "Ayam") catIcon = "egg";
    if (p.kategori === "Burung") catIcon = "feather";
    if (p.kategori === "Kucing") catIcon = "cat";
    if (p.kategori === "Ikan") catIcon = "fish";
    if (p.kategori === "Obat") catIcon = "pill";
    const isKg = p.satuan === "kg";

    return `
      <div class="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${isKg ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'} uppercase tracking-wider">
              ${p.kategori} • ${p.satuan}
            </span>
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              <i data-lucide="${catIcon}" class="w-3.5 h-3.5"></i>
            </div>
          </div>
          <h4 class="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">${p.namaProduk}</h4>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Harga Jual</span>
            <span class="text-base font-black text-blue-700">${formatRupiah(p.hargaJual)}</span>
            <span class="text-[10px] text-slate-400">/${p.satuan}</span>
          </div>

          <div class="flex items-center space-x-1.5">
            <button onclick="openEditPriceModal('${p.id}')" class="py-1.5 px-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs rounded-xl transition flex items-center space-x-1 border border-blue-200 hover:border-transparent">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              <span>Ubah</span>
            </button>
            <button onclick="confirmDeleteProduct('${p.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200" title="Hapus Produk dari Katalog & Spreadsheet">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// MODAL EDIT HARGA CEPAT
function openEditPriceModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  document.getElementById("edit-price-prod-id").value = p.id;
  document.getElementById("edit-price-prod-name").innerText = p.namaProduk;
  document.getElementById("edit-price-prod-cat").innerText = `${p.kategori} • Satuan: ${p.satuan}`;
  document.getElementById("edit-price-current-disp").innerText = `${formatRupiah(p.hargaJual)} / ${p.satuan}`;

  const input = document.getElementById("edit-price-new-input");
  input.value = p.hargaJual;
  document.getElementById("err-edit-price").classList.add("hidden");

  renderEditPriceQuickChips(p.hargaJual);

  document.getElementById("quick-edit-price-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function closeQuickEditPriceModal() {
  document.getElementById("quick-edit-price-modal").classList.add("hidden");
}

function deleteCurrentEditProduct() {
  const pId = document.getElementById("edit-price-prod-id").value;
  if (!pId) return;
  confirmDeleteProduct(pId);
}

function confirmDeleteProduct(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const confirmed = confirm(`Apakah Anda yakin ingin menghapus produk "${p.namaProduk}" (${p.kategori}) dari katalog dan spreadsheet?`);
  if (!confirmed) return;

  deleteProduct(productId);
}

function deleteProduct(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const prodName = p.namaProduk;
  const prodCat = p.kategori;

  // 1. Catat ID produk di petshop_deleted_product_ids
  const deletedIds = JSON.parse(localStorage.getItem("petshop_deleted_product_ids") || "[]");
  if (!deletedIds.includes(productId)) {
    deletedIds.push(productId);
    localStorage.setItem("petshop_deleted_product_ids", JSON.stringify(deletedIds));
  }

  // 2. Hapus dari custom products jika ada
  let custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  custom = custom.filter(x => x.id !== productId);
  localStorage.setItem("petshop_custom_products", JSON.stringify(custom));

  // 3. Hapus dari state produk saat ini
  products = products.filter(x => x.id !== productId);

  // 4. Hapus dari keranjang jika ada
  if (cart[productId]) {
    delete cart[productId];
    updateCartUI();
  }

  // 5. Tutup modal edit jika sedang terbuka
  const editModal = document.getElementById("quick-edit-price-modal");
  if (editModal && !editModal.classList.contains("hidden")) {
    closeQuickEditPriceModal();
  }

  // 6. Re-render tampilan
  renderProducts();
  renderCatalogManager();
  updateDashboard();

  // 7. Kirim permintaan hapus ke Google Spreadsheet
  const prodUrl = getProductUrl();
  if (prodUrl) {
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.classList.remove("hidden");
      syncBadge.innerText = "Menghapus dari Sheets...";
    }

    try {
      // POST
      fetch(prodUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "delete_product",
          id: productId,
          namaProduk: prodName,
          kategori: prodCat
        })
      });

      // GET fallback untuk Google 302 redirect
      const getUrl = `${prodUrl}${prodUrl.includes('?') ? '&' : '?'}action=delete_product&id=${encodeURIComponent(productId)}&namaProduk=${encodeURIComponent(prodName)}&kategori=${encodeURIComponent(prodCat)}&t=${Date.now()}`;
      fetch(getUrl, { mode: "no-cors" }).then(() => {
        if (syncBadge) {
          syncBadge.innerText = "Produk Dihapus!";
          setTimeout(() => syncBadge.classList.add("hidden"), 3000);
        }
      });
    } catch (e) {
      console.warn("Gagal dispatch delete_product:", e);
    }
  }

  alert(`Produk "${prodName}" berhasil dihapus dari katalog dan spreadsheet!`);
}

function exportAllProductsToSheets() {
  const prodUrl = getProductUrl();
  if (!prodUrl) {
    alert("Silakan masukkan URL Spreadsheet terlebih dahulu di menu Pengaturan!");
    return;
  }

  const syncBadge = document.getElementById("header-sync-badge");
  if (syncBadge) {
    syncBadge.classList.remove("hidden");
    syncBadge.innerText = "Mengisi Sheets...";
  }

  try {
    const triggerUrl = `${prodUrl}${prodUrl.includes('?') ? '&' : '?'}action=setup_produk&t=${Date.now()}`;
    fetch(triggerUrl, { mode: "no-cors" }).then(() => {
      if (syncBadge) {
        syncBadge.innerText = "Sheets Terisi Lengkap!";
        setTimeout(() => syncBadge.classList.add("hidden"), 3500);
      }
      alert("Permintaan pengisian tab Burung, Ayam, Kucing, Ikan, dan Penjualan telah dikirim ke Google Spreadsheet Anda!\\n\\nSilakan periksa Google Spreadsheet Anda, semua tab kategori produk akan otomatis dibuat.");
    });
  } catch (e) {
    alert("Gagal mengirim perintah ke Spreadsheet: " + e.message);
  }
}

function renderEditPriceQuickChips(basePrice) {
  const container = document.getElementById("edit-price-quick-chips");
  if (!container) return;
  const chips = [
    { label: "+1.000", delta: 1000 },
    { label: "+2.000", delta: 2000 },
    { label: "+5.000", delta: 5000 },
    { label: "+10.000", delta: 10000 },
    { label: "-1.000", delta: -1000 }
  ];
  container.innerHTML = chips.map(c => `
    <button type="button" onclick="adjustEditPrice(${c.delta})" class="py-1 px-2.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-bold text-xs rounded-lg transition border border-slate-200">
      ${c.label}
    </button>
  `).join("");
}

function adjustEditPrice(delta) {
  const input = document.getElementById("edit-price-new-input");
  const cur = Number(input.value) || 0;
  const newVal = Math.max(500, cur + delta);
  input.value = newVal;
}

async function saveQuickPrice() {
  const pId = document.getElementById("edit-price-prod-id").value;
  const newPrice = Number(document.getElementById("edit-price-new-input").value) || 0;
  
  if (newPrice <= 0) {
    document.getElementById("err-edit-price").classList.remove("hidden");
    return;
  }

  // Simpan override ke local storage
  const overrides = JSON.parse(localStorage.getItem("petshop_price_overrides") || "{}");
  overrides[pId] = newPrice;
  localStorage.setItem("petshop_price_overrides", JSON.stringify(overrides));

  // Update memori produk
  const prod = products.find(x => x.id === pId);
  if (prod) {
    prod.hargaJual = newPrice;
    prod.hargaBelumDiisi = false;
  }

  // Update pada custom products jika ada
  const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  const customItem = custom.find(x => x.id === pId);
  if (customItem) {
    customItem.hargaJual = newPrice;
    localStorage.setItem("petshop_custom_products", JSON.stringify(custom));
  }

  // Update item di keranjang jika produk ini sedang ada di keranjang
  if (cart[pId]) {
    cart[pId].product.hargaJual = newPrice;
    updateCartUI();
  }

  renderProducts();
  renderCatalogManager();
  closeQuickEditPriceModal();

  // Sinkronkan perubahan harga langsung ke Google Spreadsheet Produk
  const prodUrl = getProductUrl();
  if (prodUrl && prod) {
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.classList.remove("hidden");
      syncBadge.innerText = "Menyimpan ke Sheets...";
    }
    try {
      await fetch(prodUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "update_product_price",
          id: pId,
          kategori: prod.kategori,
          namaProduk: prod.namaProduk,
          hargaJual: newPrice
        })
      });
      if (syncBadge) {
        syncBadge.innerText = "Harga Tersinkron!";
        setTimeout(() => syncBadge.classList.add("hidden"), 3000);
      }
    } catch (e) {
      console.warn("Gagal sinkron harga ke Google Sheets:", e);
      if (syncBadge) {
        syncBadge.innerText = "Tersimpan Lokal";
        setTimeout(() => syncBadge.classList.add("hidden"), 3000);
      }
    }
  }
}

// LOGIKA KERANJANG BELANJA (DUKUNGAN DESIMAL KG & PCS INTEGER)
function addToCart(productId, delta = null) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const isKg = prod.satuan === "kg";
  const defaultStep = isKg ? 0.5 : 1;
  const change = (delta !== null) ? delta : (cart[productId] ? defaultStep : (isKg ? 1 : 1));

  if (!cart[productId]) {
    cart[productId] = { product: prod, qty: (delta !== null ? Math.max(0.1, delta) : (isKg ? 1 : 1)) };
  } else {
    const updated = Math.round((cart[productId].qty + change) * 100) / 100;
    cart[productId].qty = Math.max(0.1, updated);
  }
  updateCartUI();
  renderProducts();
}

function decrementCart(productId) {
  if (!cart[productId]) return;
  const isKg = cart[productId].product.satuan === "kg";
  const step = isKg ? 0.5 : 1;
  const updated = Math.round((cart[productId].qty - step) * 100) / 100;
  if (updated <= 0) {
    delete cart[productId];
  } else {
    cart[productId].qty = updated;
  }
  updateCartUI();
  renderProducts();
}

function setCartItemQty(productId, qtyVal) {
  if (!cart[productId]) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    cart[productId] = { product: prod, qty: 1 };
  }
  const isKg = cart[productId].product.satuan === "kg";
  let val = Number(qtyVal);
  if (isNaN(val) || val <= 0) {
    val = isKg ? 0.1 : 1;
  }
  cart[productId].qty = isKg ? Math.round(val * 100) / 100 : Math.round(val);
  updateCartUI();
  renderProducts();
}

function removeCartItem(productId) {
  delete cart[productId];
  updateCartUI();
  renderProducts();
}

function clearCart() {
  cart = {};
  updateCartUI();
  renderProducts();
  closeCartModal();
}

function getCartTotals() {
  let totalQty = 0;
  let totalAmount = 0;
  Object.values(cart).forEach(item => {
    totalQty += item.qty;
    totalAmount += Math.round(item.qty * item.product.hargaJual);
  });
  return { totalQty, totalAmount };
}

// PERBARUI SELURUH TAMPILAN KERANJANG (MOBILE & DESKTOP SIDEBAR)
function updateCartUI() {
  const { totalQty, totalAmount } = getCartTotals();
  const itemCount = Object.keys(cart).length;

  // 1. Mobile Floating Bottom Bar
  const bar = document.getElementById("floating-cart-bar");
  if (bar) {
    if (itemCount > 0) {
      bar.classList.remove("hidden");
      const badge = document.getElementById("cart-badge");
      if (badge) badge.innerText = itemCount;
      const totalTxt = document.getElementById("cart-total-text");
      if (totalTxt) totalTxt.innerText = formatRupiah(totalAmount);
    } else {
      bar.classList.add("hidden");
    }
  }

  // 2. Desktop Sticky Sidebar
  const deskBadge = document.getElementById("desktop-cart-count-badge");
  if (deskBadge) deskBadge.innerText = `${itemCount} Produk`;

  const deskTotal = document.getElementById("desktop-total-display");
  if (deskTotal) deskTotal.innerText = formatRupiah(totalAmount);

  const deskQris = document.getElementById("desktop-qris-amount");
  if (deskQris) deskQris.innerText = formatRupiah(totalAmount);

  // Render Item List Desktop
  renderDesktopCartItems();

  // Update Nominal Tunai Default Desktop
  const deskCashInput = document.getElementById("desktop-cash-paid-input");
  if (deskCashInput) {
    const curVal = Number(deskCashInput.value) || 0;
    if (curVal === 0 || curVal < totalAmount) {
      deskCashInput.value = totalAmount;
    }
    renderDesktopQuickCashChips(totalAmount);
    calculateDesktopChange();
  }

  // Header Balance Sync
  const headerBal = document.getElementById("header-balance-preview");
  if (headerBal) headerBal.innerText = formatRupiah(currentBalance);
}

// RENDER ITEM KERANJANG DI SIDEBAR DESKTOP
function renderDesktopCartItems() {
  const container = document.getElementById("desktop-cart-items-container");
  if (!container) return;

  const items = Object.values(cart);
  if (items.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-400 space-y-1">
        <i data-lucide="shopping-cart" class="w-8 h-8 mx-auto stroke-1 text-slate-300"></i>
        <p class="text-xs font-semibold">Keranjang kosong</p>
        <p class="text-[10px] text-slate-400">Pilih produk di katalog untuk mulai transaksi</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = items.map(item => {
    const isKg = item.product.satuan === "kg";
    const subtotal = Math.round(item.qty * item.product.hargaJual);

    return `
      <div class="p-2.5 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200/90 flex flex-col space-y-1.5 transition">
        <div class="flex items-start justify-between">
          <div class="flex-1 pr-2 min-w-0">
            <h5 class="text-xs font-bold text-slate-800 truncate">${item.product.namaProduk}</h5>
            <div class="flex items-center space-x-1.5 text-[10px] text-slate-500 mt-0.5">
              <span class="font-bold text-blue-700">${formatRupiah(item.product.hargaJual)}</span>
              <span>/ ${item.product.satuan}</span>
            </div>
          </div>
          <button onclick="removeCartItem('${item.product.id}')" class="p-1 text-slate-400 hover:text-red-600 transition" title="Hapus">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Kontrol Kuantitas: Desimal untuk kg, bulat untuk pcs -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-200/70">
          ${isKg ? `
            <div class="flex items-center space-x-1">
              <button onclick="decrementCart('${item.product.id}')" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-black flex items-center justify-center hover:bg-slate-200 transition" title="Kurangi 0,5 kg">-</button>
              <input type="number" step="0.1" min="0.1" value="${item.qty}" onchange="setCartItemQty('${item.product.id}', this.value)" class="w-14 px-1 py-0.5 text-center text-xs font-black bg-white border border-slate-300 rounded-md text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-600">
              <span class="text-[10px] font-bold text-slate-500">kg</span>
              <button onclick="addToCart('${item.product.id}', 0.5)" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-black flex items-center justify-center hover:bg-slate-200 transition" title="Tambah 0,5 kg">+</button>
            </div>
          ` : `
            <div class="flex items-center space-x-1.5">
              <button onclick="decrementCart('${item.product.id}')" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-200 transition">-</button>
              <span class="text-xs font-extrabold text-slate-800 w-5 text-center">${Math.round(item.qty)}</span>
              <span class="text-[10px] font-bold text-slate-400">pcs</span>
              <button onclick="addToCart('${item.product.id}', 1)" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-200 transition">+</button>
            </div>
          `}
          
          <span class="text-xs font-black text-blue-700">${formatRupiah(subtotal)}</span>
        </div>

        ${isKg ? `
          <!-- Quick Weight Chips untuk Barang Kiloan -->
          <div class="flex items-center space-x-1 pt-0.5 overflow-x-auto no-scrollbar">
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Takar:</span>
            ${[0.25, 0.5, 1, 1.5, 2].map(w => `
              <button type="button" onclick="setCartItemQty('${item.product.id}', ${w})" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${Math.abs(item.qty - w) < 0.01 ? 'bg-blue-600 text-white shadow-sm' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'} transition">
                ${w} kg
              </button>
            `).join("")}
          </div>
        ` : ''}
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// KALKULATOR KEMBALIAN DESKTOP
function calculateDesktopChange() {
  const { totalAmount } = getCartTotals();
  const input = document.getElementById("desktop-cash-paid-input");
  const raw = Number(input ? input.value : 0) || 0;
  const change = Math.max(0, raw - totalAmount);
  const isUnderpaid = raw < totalAmount && totalAmount > 0;

  const disp = document.getElementById("desktop-change-amount-display");
  if (disp) disp.innerText = formatRupiah(change);

  const warn = document.getElementById("desktop-cash-underpaid-warning");
  if (warn) {
    if (isUnderpaid) {
      warn.innerText = `Kurang ${formatRupiah(totalAmount - raw)}`;
      warn.classList.remove("hidden");
    } else {
      warn.classList.add("hidden");
    }
  }
}

// QUICK CASH CHIPS DESKTOP
function renderDesktopQuickCashChips(totalAmount) {
  const container = document.getElementById("desktop-quick-cash-chips");
  if (!container) return;

  const baseAmounts = [10000, 20000, 50000, 100000, 200000];
  const valid = baseAmounts.filter(a => a >= totalAmount);

  let chips = [{ label: "Uang Pas", val: totalAmount }];
  if (valid.length > 0) {
    valid.slice(0, 4).forEach(v => chips.push({ label: formatRupiah(v), val: v }));
  } else {
    const next10k = Math.ceil(totalAmount / 10000) * 10000;
    const next50k = Math.ceil(totalAmount / 50000) * 50000;
    if (next10k > totalAmount) chips.push({ label: formatRupiah(next10k), val: next10k });
    if (next50k > next10k) chips.push({ label: formatRupiah(next50k), val: next50k });
  }

  container.innerHTML = chips.map(c => `
    <button onclick="setDesktopCashInput(${c.val})" class="py-1 px-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[10px] font-bold rounded-md transition">
      ${c.label}
    </button>
  `).join("");
}

function setDesktopCashInput(val) {
  const input = document.getElementById("desktop-cash-paid-input");
  if (input) {
    input.value = val;
    calculateDesktopChange();
  }
}

// METODE PEMBAYARAN TOGGLE (SINKRON DESKTOP & MOBILE)
function setPaymentMethod(method) {
  currentPaymentMethod = method;

  // Desktop Elements
  const deskBtnTunai = document.getElementById("desktop-btn-tunai");
  const deskBtnQris = document.getElementById("desktop-btn-qris");
  const deskPanelTunai = document.getElementById("desktop-panel-tunai");
  const deskPanelQris = document.getElementById("desktop-panel-qris");
  const deskSubmitText = document.getElementById("desktop-btn-submit-text");

  // Mobile Elements
  const btnTunai = document.getElementById("btn-method-tunai");
  const btnQris = document.getElementById("btn-method-qris");
  const panelTunai = document.getElementById("panel-tunai");
  const panelQris = document.getElementById("panel-qris");
  const submitText = document.getElementById("btn-submit-text");

  if (method === "Tunai") {
    if (deskBtnTunai) deskBtnTunai.className = "py-2 px-2.5 rounded-xl border-2 border-blue-600 bg-blue-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition";
    if (deskBtnQris) deskBtnQris.className = "py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition";
    if (deskPanelTunai) deskPanelTunai.classList.remove("hidden");
    if (deskPanelQris) deskPanelQris.classList.add("hidden");
    if (deskSubmitText) deskSubmitText.innerText = "Bayar & Cetak Struk (F2)";

    if (btnTunai) btnTunai.className = "py-2.5 px-3 rounded-xl border-2 border-blue-600 bg-blue-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition";
    if (btnQris) btnQris.className = "py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition";
    if (panelTunai) panelTunai.classList.remove("hidden");
    if (panelQris) panelQris.classList.add("hidden");
    if (submitText) submitText.innerText = "Simpan & Cetak Struk";
  } else {
    if (deskBtnQris) deskBtnQris.className = "py-2 px-2.5 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition";
    if (deskBtnTunai) deskBtnTunai.className = "py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition";
    if (deskPanelTunai) deskPanelTunai.classList.add("hidden");
    if (deskPanelQris) deskPanelQris.classList.remove("hidden");
    if (deskSubmitText) deskSubmitText.innerText = "Konfirmasi QRIS Lunas & Cetak (F2)";

    if (btnQris) btnQris.className = "py-2.5 px-3 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition";
    if (btnTunai) btnTunai.className = "py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition";
    if (panelTunai) panelTunai.classList.add("hidden");
    if (panelQris) panelQris.classList.remove("hidden");
    if (submitText) submitText.innerText = "Konfirmasi QRIS Lunas & Cetak Struk";
  }
}

// PROSES TRANSAKSI KASIR DESKTOP LANGSUNG
async function submitDesktopPayment() {
  const { totalQty, totalAmount } = getCartTotals();
  if (totalAmount <= 0) {
    alert("Keranjang belanja masih kosong! Pilih produk terlebih dahulu.");
    return;
  }

  let paidAmount = totalAmount;
  let changeAmount = 0;

  if (currentPaymentMethod === "Tunai") {
    const input = document.getElementById("desktop-cash-paid-input");
    paidAmount = Number(input ? input.value : 0) || 0;
    if (paidAmount < totalAmount) {
      alert(`Nominal pembayaran tunai (${formatRupiah(paidAmount)}) masih kurang dari total belanja (${formatRupiah(totalAmount)})!`);
      if (input) input.focus();
      return;
    }
    changeAmount = paidAmount - totalAmount;
  }

  const btn = document.getElementById("desktop-btn-submit");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Menyimpan ke Spreadsheet...";
  }

  await processCheckout("-", paidAmount, changeAmount, totalAmount, totalQty);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="printer" class="w-4 h-4"></i><span id="desktop-btn-submit-text">Bayar & Cetak Struk (F2)</span>`;
  }
}

// PROSES TRANSAKSI DARI MODAL MOBILE
async function submitPayment() {
  const { totalQty, totalAmount } = getCartTotals();
  if (totalAmount <= 0) return;

  let paidAmount = totalAmount;
  let changeAmount = 0;

  if (currentPaymentMethod === "Tunai") {
    const input = document.getElementById("cash-paid-input");
    paidAmount = Number(input ? input.value : 0) || 0;
    if (paidAmount < totalAmount) {
      alert("Nominal pembayaran tunai masih kurang!");
      return;
    }
    changeAmount = paidAmount - totalAmount;
  }

  const btn = document.getElementById("btn-submit-payment");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Menyimpan Transaksi...";
  }

  closePaymentModal();
  await processCheckout("-", paidAmount, changeAmount, totalAmount, totalQty);

  if (btn) {
    btn.disabled = false;
    btn.innerText = "Simpan & Cetak Struk";
  }
}

// CORE FUNGSI CHECKOUT & PENCATATAN 7 KOLOM
async function processCheckout(customerName, paidAmount, changeAmount, totalAmount, totalQty) {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const tanggal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const jam = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const receiptNumber = `PS-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const itemsList = Object.values(cart);
  const productSummary = itemsList.map(it => `${it.product.namaProduk} (${formatQty(it.qty, it.product.satuan)})`).join(", ");

  const transactionData = {
    action: "sale",
    receiptNumber: receiptNumber,
    customerName: customerName || "-",
    paymentMethod: currentPaymentMethod,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    changeAmount: changeAmount,
    totalItems: totalQty,
    productNamesSummary: productSummary,
    items: itemsList.map(it => ({
      kategori: it.product.kategori,
      namaProduk: it.product.namaProduk,
      satuan: it.product.satuan,
      jumlah: it.qty,
      hargaJual: it.product.hargaJual,
      subtotal: Math.round(it.qty * it.product.hargaJual),
      hargaBeli: 0
    }))
  };

  // Simpan ke local sales history
  saveLocalSale(transactionData, tanggal, jam);

  // Akumulasi saldo kas toko
  currentBalance += totalAmount;
  localStorage.setItem("petshop_current_balance", currentBalance);

  // POST ke Google Apps Script Spreadsheet (7 Kolom Mutasi Kas)
  const salesUrl = getSalesUrl();
  if (salesUrl) {
    try {
      await fetch(salesUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(transactionData)
      });
    } catch (e) {
      console.warn("Gagal POST transaksi ke Google Sheets:", e);
    }
  }

  // Tampilkan Struk Thermal
  activeReceipt = {
    receiptNumber: receiptNumber,
    date: tanggal,
    time: jam,
    items: itemsList,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    changeAmount: changeAmount,
    paymentMethod: currentPaymentMethod
  };
  openReceiptModal();

  // Reset keranjang
  cart = {};
  updateCartUI();
  renderProducts();
  updateDashboard();
}

// MODAL KERANJANG (MOBILE)
function openCartModal() {
  renderCartModalItems();
  const modal = document.getElementById("cart-modal");
  if (modal) modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeCartModal() {
  const modal = document.getElementById("cart-modal");
  if (modal) modal.classList.add("hidden");
}

function renderCartModalItems() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  const items = Object.values(cart);
  const { totalAmount } = getCartTotals();

  const totalEl = document.getElementById("cart-modal-total");
  if (totalEl) totalEl.innerText = formatRupiah(totalAmount);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-400 text-xs">Keranjang masih kosong</div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const isKg = item.product.satuan === "kg";
    const subtotal = Math.round(item.qty * item.product.hargaJual);

    return `
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col space-y-2">
        <div class="flex items-start justify-between">
          <div class="flex-1 pr-2">
            <h5 class="text-xs font-bold text-slate-800 line-clamp-1">${item.product.namaProduk}</h5>
            <span class="text-[11px] text-slate-500">${formatRupiah(item.product.hargaJual)} / ${item.product.satuan}</span>
          </div>
          <button onclick="removeCartItem('${item.product.id}')" class="p-1 text-red-500 hover:text-red-700">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <div class="flex items-center justify-between pt-1 border-t border-slate-200">
          ${isKg ? `
            <div class="flex items-center space-x-1">
              <button onclick="decrementCart('${item.product.id}')" class="w-7 h-7 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center">-</button>
              <input type="number" step="0.1" min="0.1" value="${item.qty}" onchange="setCartItemQty('${item.product.id}', this.value)" class="w-14 px-1 py-1 text-center text-xs font-black bg-white border border-slate-300 rounded-md text-blue-900 focus:outline-none">
              <span class="text-[10px] font-bold text-slate-500">kg</span>
              <button onclick="addToCart('${item.product.id}', 0.5)" class="w-7 h-7 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center">+</button>
            </div>
          ` : `
            <div class="flex items-center space-x-2">
              <button onclick="decrementCart('${item.product.id}')" class="w-7 h-7 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center">-</button>
              <span class="text-xs font-bold text-slate-800 w-6 text-center">${Math.round(item.qty)}</span>
              <span class="text-[10px] font-bold text-slate-400">pcs</span>
              <button onclick="addToCart('${item.product.id}', 1)" class="w-7 h-7 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center">+</button>
            </div>
          `}
          
          <span class="text-xs font-black text-blue-700">${formatRupiah(subtotal)}</span>
        </div>

        ${isKg ? `
          <div class="flex items-center space-x-1 pt-0.5 overflow-x-auto no-scrollbar">
            <span class="text-[9px] font-bold text-slate-400 uppercase">Takar:</span>
            ${[0.25, 0.5, 1, 1.5, 2].map(w => `
              <button type="button" onclick="setCartItemQty('${item.product.id}', ${w})" class="px-2 py-0.5 rounded text-[10px] font-bold ${Math.abs(item.qty - w) < 0.01 ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}">
                ${w} kg
              </button>
            `).join("")}
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
  if (window.lucide) lucide.createIcons();
}

// MODAL PEMBAYARAN (MOBILE)
function openPaymentModal() {
  const { totalAmount } = getCartTotals();
  if (totalAmount <= 0) return;

  const totalDisp = document.getElementById("pay-total-display");
  if (totalDisp) totalDisp.innerText = formatRupiah(totalAmount);

  const qrisAmt = document.getElementById("qris-exact-amount");
  if (qrisAmt) qrisAmt.innerText = formatRupiah(totalAmount);
  
  setPaymentMethod("Tunai");
  const cashInput = document.getElementById("cash-paid-input");
  if (cashInput) cashInput.value = totalAmount;
  renderQuickCashChips(totalAmount);
  calculateChange();

  const payModal = document.getElementById("payment-modal");
  if (payModal) payModal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closePaymentModal() {
  const modal = document.getElementById("payment-modal");
  if (modal) modal.classList.add("hidden");
}

function renderQuickCashChips(totalAmount) {
  const container = document.getElementById("quick-cash-chips");
  if (!container) return;
  const baseAmounts = [5000, 10000, 20000, 50000, 100000];
  const valid = baseAmounts.filter(a => a >= totalAmount);

  let chips = [{ label: "Uang Pas", val: totalAmount }];
  if (valid.length > 0) {
    valid.slice(0, 4).forEach(v => chips.push({ label: formatRupiah(v), val: v }));
  } else {
    const next10k = Math.ceil(totalAmount / 10000) * 10000;
    const next50k = Math.ceil(totalAmount / 50000) * 50000;
    if (next10k > totalAmount) chips.push({ label: formatRupiah(next10k), val: next10k });
    if (next50k > next10k) chips.push({ label: formatRupiah(next50k), val: next50k });
  }

  container.innerHTML = chips.map(c => `
    <button onclick="setCashInput(${c.val})" class="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition">
      ${c.label}
    </button>
  `).join("");
}

function setCashInput(val) {
  const input = document.getElementById("cash-paid-input");
  if (input) {
    input.value = val;
    calculateChange();
  }
}

function calculateChange() {
  const { totalAmount } = getCartTotals();
  const input = document.getElementById("cash-paid-input");
  const raw = Number(input ? input.value : 0) || 0;
  const change = Math.max(0, raw - totalAmount);
  const isUnderpaid = raw < totalAmount;

  const chgDisp = document.getElementById("change-amount-display");
  if (chgDisp) chgDisp.innerText = formatRupiah(change);
  
  const warn = document.getElementById("cash-underpaid-warning");
  if (warn) {
    if (isUnderpaid) {
      warn.innerText = `Uang pembayaran kurang ${formatRupiah(totalAmount - raw)}`;
      warn.classList.remove("hidden");
    } else {
      warn.classList.add("hidden");
    }
  }
}

// STRUK THERMAL
function openReceiptModal() {
  if (!activeReceipt) return;

  const dtEl = document.getElementById("rcpt-datetime");
  if (dtEl) dtEl.innerText = `${activeReceipt.date} ${activeReceipt.time}`;

  const numEl = document.getElementById("rcpt-number");
  if (numEl) numEl.innerText = activeReceipt.receiptNumber;

  const totEl = document.getElementById("rcpt-total");
  if (totEl) totEl.innerText = formatRupiah(activeReceipt.totalAmount);

  const methEl = document.getElementById("rcpt-method");
  if (methEl) methEl.innerText = activeReceipt.paymentMethod;

  const paidEl = document.getElementById("rcpt-paid");
  if (paidEl) paidEl.innerText = formatRupiah(activeReceipt.paidAmount);

  const chgEl = document.getElementById("rcpt-change");
  if (chgEl) chgEl.innerText = formatRupiah(activeReceipt.changeAmount);

  const list = document.getElementById("rcpt-items-list");
  if (list) {
    list.innerHTML = activeReceipt.items.map(it => `
      <div class="flex justify-between">
        <span class="line-clamp-1 flex-1 pr-2">${it.product.namaProduk} x${formatQty(it.qty, it.product.satuan)}</span>
        <span>${formatRupiah(Math.round(it.product.hargaJual * it.qty))}</span>
      </div>
    `).join("");
  }

  const modal = document.getElementById("receipt-modal");
  if (modal) modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeReceiptModal() {
  const modal = document.getElementById("receipt-modal");
  if (modal) modal.classList.add("hidden");
}

// SIMPAN & AMBIL RIWAYAT LOCAL
function saveLocalSale(tx, tanggal, jam) {
  const history = JSON.parse(localStorage.getItem("petshop_local_sales") || "[]");
  history.unshift({
    noStruk: tx.receiptNumber,
    tanggal: tanggal,
    jam: jam,
    total: tx.totalAmount,
    metodeBayar: tx.paymentMethod,
    productSummary: tx.productNamesSummary,
    totalQty: tx.totalItems
  });
  localStorage.setItem("petshop_local_sales", JSON.stringify(history.slice(0, 50)));
}

function loadRecentSales() {
  const container = document.getElementById("history-list");
  if (!container) return;
  const history = JSON.parse(localStorage.getItem("petshop_local_sales") || "[]");

  if (history.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-400 text-xs">
        <i data-lucide="history" class="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2"></i>
        <p class="font-bold">Belum ada riwayat transaksi</p>
        <p class="text-[11px] text-slate-400">Transaksi baru akan otomatis tersimpan di sini dan Google Sheets</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = history.map(h => `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 hover:border-slate-300 transition">
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold text-slate-800 text-sm">${h.noStruk}</span>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${h.metodeBayar === 'QRIS' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${h.metodeBayar}</span>
      </div>
      <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">${h.productSummary || '-'}</p>
      <div class="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
        <span class="text-slate-400 text-[11px] flex items-center space-x-1">
          <i data-lucide="clock" class="w-3.5 h-3.5"></i>
          <span>${h.tanggal} ${h.jam}</span>
        </span>
        <span class="font-black text-blue-700 text-sm">${formatRupiah(h.total)}</span>
      </div>
    </div>
  `).join("");
  if (window.lucide) lucide.createIcons();
}

// DASHBOARD METRICS
function updateDashboard() {
  const history = JSON.parse(localStorage.getItem("petshop_local_sales") || "[]");
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let todayTotal = 0;
  let todayCount = 0;

  history.forEach(h => {
    if (h.tanggal === todayStr) {
      todayTotal += Number(h.total) || 0;
      todayCount += 1;
    }
  });

  const balanceEl = document.getElementById("dash-total-balance");
  if (balanceEl) balanceEl.innerText = formatRupiah(currentBalance);

  const headerBal = document.getElementById("header-balance-preview");
  if (headerBal) headerBal.innerText = formatRupiah(currentBalance);

  const settingBal = document.getElementById("setting-balance-preview-active");
  if (settingBal) settingBal.innerText = formatRupiah(currentBalance);

  const tTotal = document.getElementById("dash-today-total");
  if (tTotal) tTotal.innerText = formatRupiah(todayTotal);

  const tCount = document.getElementById("dash-today-count");
  if (tCount) tCount.innerText = todayCount;

  const tDate = document.getElementById("dash-today-date");
  if (tDate) tDate.innerText = todayStr;

  const tProds = document.getElementById("dash-total-products");
  if (tProds) tProds.innerText = products.length;
  
  const cartCnt = document.getElementById("dash-cart-count");
  if (cartCnt) cartCnt.innerText = Object.keys(cart).length;

  if (window.lucide) lucide.createIcons();
}

// FORM TAMBAH PRODUK (DENGAN PILIHAN SATUAN KG & PCS)
function openAddProductModal() {
  document.getElementById("new-prod-name").value = "";
  document.getElementById("new-prod-unit").value = "pcs";
  document.getElementById("new-prod-price").value = "";
  document.getElementById("err-new-prod-name").classList.add("hidden");
  document.getElementById("err-new-prod-unit").classList.add("hidden");
  document.getElementById("err-new-prod-price").classList.add("hidden");
  document.getElementById("product-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeAddProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function saveNewProduct() {
  const nameInput = document.getElementById("new-prod-name");
  const catInput = document.getElementById("new-prod-cat");
  const unitInput = document.getElementById("new-prod-unit");
  const priceInput = document.getElementById("new-prod-price");

  const name = nameInput.value.trim();
  const cat = catInput.value;
  const rawUnit = unitInput.value.trim();
  const price = Number(priceInput.value) || 0;

  let hasError = false;
  if (!name) {
    document.getElementById("err-new-prod-name").classList.remove("hidden");
    hasError = true;
  } else {
    document.getElementById("err-new-prod-name").classList.add("hidden");
  }

  if (!rawUnit) {
    document.getElementById("err-new-prod-unit").classList.remove("hidden");
    hasError = true;
  } else {
    document.getElementById("err-new-prod-unit").classList.add("hidden");
  }

  if (price <= 0) {
    document.getElementById("err-new-prod-price").classList.remove("hidden");
    hasError = true;
  } else {
    document.getElementById("err-new-prod-price").classList.add("hidden");
  }

  if (hasError) return;

  const unit = normalizeSatuan(rawUnit, name);

  const newProd = {
    id: `custom_${Date.now()}`,
    kategori: cat,
    namaProduk: name,
    satuan: unit,
    hargaJual: price
  };

  const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  custom.push(newProd);
  localStorage.setItem("petshop_custom_products", JSON.stringify(custom));

  products.push(newProd);
  renderProducts();
  renderCatalogManager();
  closeAddProductModal();

  // Kirim dan sinkronkan produk baru ke Google Spreadsheet
  const prodUrl = getProductUrl();
  if (prodUrl) {
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.classList.remove("hidden");
      syncBadge.innerText = "Menambah ke Sheets...";
    }
    try {
      fetch(prodUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "add_product",
          kategori: cat,
          namaProduk: name,
          satuan: unit,
          hargaJual: price
        })
      }).then(() => {
        if (syncBadge) {
          syncBadge.innerText = "Produk Tersinkron!";
          setTimeout(() => syncBadge.classList.add("hidden"), 3000);
        }
      }).catch(e => {
        console.warn("Gagal kirim produk baru ke Google Sheets:", e);
      });
    } catch (e) {
      console.warn("Gagal dispatch add_product:", e);
    }
  }

  alert(`Produk "${name}" (${unit}) berhasil ditambahkan dan disinkronkan ke Google Spreadsheet!`);
}

// MODAL PENGATURAN TOKO & ATUR SALDO KAS
function openSettingsModal() {
  openSettingsWithTab("sheets");
}

function openSettingsWithTab(tab) {
  const pInput = document.getElementById("setting-product-script-url");
  if (pInput) pInput.value = productScriptUrl;
  const sInput = document.getElementById("setting-sales-script-url");
  if (sInput) sInput.value = salesScriptUrl;
  
  const activeBal = document.getElementById("setting-balance-preview-active");
  if (activeBal) activeBal.innerText = formatRupiah(currentBalance);

  switchSettingsTab(tab);
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeSettingsModal() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.add("hidden");
}

function switchSettingsTab(tab) {
  const btnSheets = document.getElementById("tab-btn-sheets");
  const btnBalance = document.getElementById("tab-btn-balance");
  const viewSheets = document.getElementById("settings-view-sheets");
  const viewBalance = document.getElementById("settings-view-balance");

  if (tab === "sheets") {
    btnSheets.className = "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 bg-white text-blue-700 shadow-sm";
    btnBalance.className = "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 text-slate-500 hover:text-slate-800";
    viewSheets.classList.remove("hidden");
    viewBalance.classList.add("hidden");
  } else {
    btnBalance.className = "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 bg-white text-blue-700 shadow-sm";
    btnSheets.className = "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 text-slate-500 hover:text-slate-800";
    viewBalance.classList.remove("hidden");
    viewSheets.classList.add("hidden");
    updateProjectedBalance();
  }
}

// LOGIKA ATUR SALDO KAS
function setMutationType(type) {
  currentMutationType = type;
  const btnAdd = document.getElementById("mut-btn-add");
  const btnWithdraw = document.getElementById("mut-btn-withdraw");
  const btnSet = document.getElementById("mut-btn-set");
  const lblAmount = document.getElementById("lbl-balance-amount");
  const btnText = document.getElementById("btn-mutation-text");
  const reasonInput = document.getElementById("input-mutation-reason");

  [btnAdd, btnWithdraw, btnSet].forEach(b => {
    if (b) b.className = "py-2 px-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold transition flex items-center justify-center space-x-1 hover:bg-slate-50";
  });

  if (type === 'add') {
    if (btnAdd) btnAdd.className = "py-2 px-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center justify-center space-x-1";
    if (lblAmount) lblAmount.innerText = "Nominal Tambah Saldo (Rp):";
    if (btnText) btnText.innerText = "Catat Tambah Kas ke Spreadsheet";
    if (reasonInput && (reasonInput.value === "Tarik Kasir" || reasonInput.value === "Setel Saldo Kas")) {
      reasonInput.value = "Tambah Modal Kasir";
    }
  } else if (type === 'withdraw') {
    if (btnWithdraw) btnWithdraw.className = "py-2 px-2.5 rounded-xl border-2 border-red-500 bg-red-50 text-red-800 text-xs font-bold transition flex items-center justify-center space-x-1";
    if (lblAmount) lblAmount.innerText = "Nominal Tarik Saldo (Rp):";
    if (btnText) btnText.innerText = "Catat Tarik Kas dari Spreadsheet";
    if (reasonInput && (reasonInput.value === "Tambah Modal Kasir" || reasonInput.value === "Setel Saldo Kas")) {
      reasonInput.value = "Tarik Kasir";
    }
  } else {
    if (btnSet) btnSet.className = "py-2 px-2.5 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-800 text-xs font-bold transition flex items-center justify-center space-x-1";
    if (lblAmount) lblAmount.innerText = "Setel Saldo Baru Menjadi (Rp):";
    if (btnText) btnText.innerText = "Setel Saldo Kas di Spreadsheet";
    if (reasonInput) reasonInput.value = "Setel Saldo Kas";
  }
  updateProjectedBalance();
}

function renderQuickBalanceChips() {
  const container = document.getElementById("quick-balance-chips");
  if (!container) return;
  const values = [50000, 100000, 200000, 500000, 1000000];
  container.innerHTML = values.map(v => `
    <button onclick="setMutationAmountInput(${v})" class="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg whitespace-nowrap transition">
      +${formatRupiah(v)}
    </button>
  `).join("");
}

function setMutationAmountInput(v) {
  const input = document.getElementById("input-mutation-amount");
  if (input) {
    input.value = v;
    updateProjectedBalance();
  }
}

function updateProjectedBalance() {
  const input = document.getElementById("input-mutation-amount");
  const raw = Number(input ? input.value : 0) || 0;
  let projected = currentBalance;

  if (currentMutationType === 'add') {
    projected = currentBalance + raw;
  } else if (currentMutationType === 'withdraw') {
    projected = Math.max(0, currentBalance - raw);
  } else {
    projected = raw;
  }

  const disp = document.getElementById("projected-balance-display");
  if (disp) {
    disp.innerText = formatRupiah(projected);
    if (currentMutationType === 'withdraw' && raw > currentBalance) {
      disp.className = "font-black text-sm text-red-600";
    } else {
      disp.className = "font-black text-sm text-blue-700";
    }
  }
}

async function executeBalanceMutation() {
  const input = document.getElementById("input-mutation-amount");
  const amt = Number(input ? input.value : 0) || 0;
  if (amt <= 0) {
    alert("Masukkan nominal mutasi yang lebih besar dari Rp 0!");
    return;
  }

  if (currentMutationType === 'withdraw' && amt > currentBalance) {
    alert(`Saldo kas (${formatRupiah(currentBalance)}) tidak mencukupi penarikan sebesar ${formatRupiah(amt)}!`);
    return;
  }

  let newBal = currentBalance;
  if (currentMutationType === 'add') {
    newBal = currentBalance + amt;
  } else if (currentMutationType === 'withdraw') {
    newBal = Math.max(0, currentBalance - amt);
  } else {
    newBal = amt;
  }

  const reasonInput = document.getElementById("input-mutation-reason");
  const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : 
    (currentMutationType === 'add' ? 'Tambah Modal Kasir' : (currentMutationType === 'withdraw' ? 'Tarik Kasir' : 'Penyesuaian Saldo Kas'));

  const btn = document.getElementById("btn-save-mutation");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Mencatat ke Spreadsheet...";
  }

  currentBalance = newBal;
  localStorage.setItem("petshop_current_balance", currentBalance);
  updateDashboard();

  const salesUrl = getSalesUrl();
  if (salesUrl) {
    try {
      await fetch(salesUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "adjust_balance",
          mutationType: currentMutationType,
          amount: amt,
          newBalance: newBal,
          reason: reason
        })
      });
    } catch (e) {
      console.warn("Gagal POST mutasi saldo:", e);
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i><span>Catat Mutasi ke Spreadsheet</span>`;
  }
  if (input) input.value = "";
  updateProjectedBalance();
  if (window.lucide) lucide.createIcons();

  alert(`Mutasi saldo (${formatRupiah(amt)}) berhasil dicatat ke Google Sheets! Saldo kas sekarang: ${formatRupiah(newBal)}`);
}

function saveSettings() {
  const pInput = document.getElementById("setting-product-script-url");
  const sInput = document.getElementById("setting-sales-script-url");
  
  const pUrl = pInput ? pInput.value.trim() : "";
  const sUrl = sInput ? sInput.value.trim() : "";

  productScriptUrl = pUrl;
  salesScriptUrl = sUrl;

  localStorage.setItem("petshop_product_script_url", pUrl);
  localStorage.setItem("petshop_sales_script_url", sUrl);
  localStorage.setItem("petshop_apps_script_url", pUrl || sUrl);

  alert("Pengaturan kedua link Google Spreadsheet berhasil disimpan!");
}

async function syncData() {
  const pUrl = getProductUrl();
  const sUrl = getSalesUrl();

  if (!pUrl && !sUrl) {
    alert("Harap masukkan URL Google Apps Script di Pengaturan terlebih dahulu.");
    openSettingsModal();
    return;
  }

  // 1. Ambil Katalog Produk dari Google Spreadsheet Produk
  if (pUrl) {
    try {
      const res = await fetch(`${pUrl}?action=products&t=${Date.now()}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.products)) {
        if (data.products.length === 0) {
          // Spreadsheet berstatus bersih / kosong setelah reset total
          localStorage.setItem("petshop_clean_slate", "true");
          localStorage.removeItem("petshop_custom_products");
          localStorage.removeItem("petshop_price_overrides");
          localStorage.removeItem("petshop_deleted_product_ids");
          products = [];
          renderProducts();
          renderCatalogManager();
          console.log("[Sync] Spreadsheet berstatus kosong/bersih. Katalog produk direset.");
        } else {
          localStorage.removeItem("petshop_clean_slate");
          const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
          const overrides = JSON.parse(localStorage.getItem("petshop_price_overrides") || "{}");
          
          // Tata ulang setiap objek produk agar properti kategori, harga, dan nama konsisten 100%
          const syncedProducts = data.products.map((p, idx) => {
            const cleanedName = sanitizeProductName(p.namaProduk || p.nama || "Produk");
            const rawKat = String(p.kategori || "Lainnya").trim();
            const formattedKategori = rawKat.charAt(0).toUpperCase() + rawKat.slice(1).toLowerCase();
            const normSatuan = normalizeSatuan(p.satuan, cleanedName);
            
            let finalPrice = Number(p.hargaJual) || 0;
            if (overrides[p.id] !== undefined && Number(overrides[p.id]) > 0) {
              finalPrice = Number(overrides[p.id]);
            }

            return {
              id: p.id || `${formattedKategori}_${idx + 1}`,
              kategori: formattedKategori,
              namaProduk: cleanedName,
              satuan: normSatuan,
              satuanAsli: p.satuanAsli || p.satuan || normSatuan,
              hargaJual: finalPrice,
              hargaBeli: Number(p.hargaBeli) || 0,
              hargaBelumDiisi: Boolean(p.hargaBelumDiisi || finalPrice <= 0),
              catatan: p.catatan || ""
            };
          });

          // Gabungkan produk custom lokal jika ada
          const formattedCustom = custom.map(c => ({
            ...c,
            namaProduk: sanitizeProductName(c.namaProduk),
            satuan: normalizeSatuan(c.satuan, c.namaProduk)
          }));

          products = [...syncedProducts, ...formattedCustom];
          renderProducts();
          renderCatalogManager();
          console.log(`[Sync] Berhasil menyinkronkan ${products.length} produk dari Spreadsheet.`);
        }
      }
    } catch (err) {
      console.warn("Gagal sync katalog produk dari spreadsheet:", err);
    }
  }

  // 2. Ambil Saldo Kas & Riwayat Terakhir dari Google Spreadsheet Penjualan
  if (sUrl) {
    try {
      const resSales = await fetch(`${sUrl}?action=recent&t=${Date.now()}`);
      const dataSales = await resSales.json();
      if (dataSales && dataSales.currentBalance !== undefined && dataSales.currentBalance !== null) {
        currentBalance = Number(dataSales.currentBalance) || 0;
        localStorage.setItem("petshop_current_balance", currentBalance);
        updateDashboard();
      }
      if (dataSales && Array.isArray(dataSales.recentTransactions) && dataSales.recentTransactions.length > 0) {
        const formatted = dataSales.recentTransactions.map(tx => {
          let prodSummary = "-";
          if (Array.isArray(tx.items) && tx.items.length > 0) {
            prodSummary = tx.items.map(i => `${i.namaProduk} (${formatQty(i.jumlah || 1, normalizeSatuan(i.satuan))})`).join(", ");
          }
          return {
            noStruk: tx.noStruk,
            tanggal: tx.tanggal,
            jam: tx.jam,
            total: tx.total || 0,
            metodeBayar: tx.metodeBayar || "Tunai",
            productSummary: prodSummary,
            totalQty: Array.isArray(tx.items) ? tx.items.reduce((acc, cur) => acc + (cur.jumlah || 1), 0) : 1
          };
        });
        localStorage.setItem("petshop_local_sales", JSON.stringify(formatted));
        updateDashboard();
        if (document.getElementById("screen-riwayat") && !document.getElementById("screen-riwayat").classList.contains("hidden")) {
          loadRecentSales();
        }
      }
    } catch (err) {
      console.warn("Gagal sync saldo & riwayat dari Google Sheets:", err);
    }
  }
}

// FUNGSI SALIN KODE GOOGLE APPS SCRIPT LENGKAP KE CLIPBOARD
function copyAppsScriptCode() {
  const code = `/**
 * GOOGLE APPS SCRIPT (Code.gs) - KASIR PET SHOP & MUTASI SALDO KAS
 * Mendukung pembacaan & update 4 kategori (Ayam, Burung, Kucing, Ikan)
 * dan pencatatan mutasi kasir 7 kolom di tab Penjualan.
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "products";
  
  if (action === "products") {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      ensureSalesSheetWithHeaders(ss);
    } catch (ignore) {}
    return getProductsJson();
  } else if (action === "update_product_price" || action === "update_price") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonResponse(updateProductPriceInSheets(ss, e.parameter || {}));
  } else if (action === "add_product") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonResponse(addProductToSheets(ss, e.parameter || {}));
  } else if (action === "delete_product" || action === "hapus_produk") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return jsonResponse(deleteProductFromSheets(ss, e.parameter || {}));
  } else if (action === "reset_and_format" || action === "bersihkan_semua" || action === "format_estetik") {
    var resultMsg = bersihkanDanFormatSemuaSheet();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "hapus_modal" || action === "clean_cost" || action === "hapus_harga_beli") {
    var resultMsg = hapusKolomHargaModalOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "recent" || action === "balance" || action === "get_balance") {
    return getRecentSalesJson();
  } else if (action === "setup" || action === "init" || action === "buat_saldo") {
    var resultMsg = buatKolomSaldoOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "setup_produk" || action === "isi_produk" || action === "isi_database") {
    var resultMsg = isiDataProdukOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else if (action === "setup_obat" || action === "buat_obat" || action === "isi_obat") {
    var resultMsg = buatSheetObatOtomatis();
    return jsonResponse({ success: true, message: resultMsg });
  } else {
    return jsonResponse({ success: false, message: "Action tidak dikenal: " + action });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      return jsonResponse({ success: false, message: "Tidak ada data yang dikirim" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (requestData.action === "update_product_price" || requestData.action === "update_price") {
      return jsonResponse(updateProductPriceInSheets(ss, requestData));
    }

    if (requestData.action === "add_product" || requestData.action === "tambah_produk") {
      return jsonResponse(addProductToSheets(ss, requestData));
    }

    if (requestData.action === "delete_product" || requestData.action === "hapus_produk") {
      return jsonResponse(deleteProductFromSheets(ss, requestData));
    }

    var salesSheet = ensureSalesSheetWithHeaders(ss);
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var tanggal = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, tz, "HH:mm:ss");
    var currentBalance = getLastCashBalance(salesSheet);

    if (requestData.action === "adjust_balance" || requestData.action === "set_balance") {
      var mutationType = String(requestData.mutationType || "").toLowerCase();
      var amount = Number(requestData.amount) || 0;
      var reason = String(requestData.reason || "").trim();
      var targetBalance = Number(requestData.newBalance);

      var masuk = 0;
      var keluar = 0;
      var finalBalance = currentBalance;
      var metodeKet = "Kas Toko";

      if (mutationType === "add" || mutationType === "tambah") {
        masuk = amount;
        finalBalance = currentBalance + amount;
        metodeKet = "Kas Toko (Tambah)";
        if (!reason) reason = "Tambah Modal Kasir";
      } else if (mutationType === "withdraw" || mutationType === "tarik" || mutationType === "kurang") {
        keluar = amount;
        finalBalance = Math.max(0, currentBalance - amount);
        metodeKet = "Kas Toko (Tarik)";
        if (!reason) reason = "Tarik Saldo Kas / Keperluan Toko";
      } else {
        if (isNaN(targetBalance)) targetBalance = amount;
        var diff = targetBalance - currentBalance;
        if (diff >= 0) { masuk = diff; metodeKet = "Koreksi Tambah"; }
        else { keluar = Math.abs(diff); metodeKet = "Koreksi Kurang"; }
        finalBalance = targetBalance;
        if (!reason) reason = "Penyesuaian Saldo Kasir";
      }

      salesSheet.appendRow([tanggal, jam, reason, masuk, keluar, finalBalance, metodeKet]);
      var lastR = salesSheet.getLastRow();
      salesSheet.getRange(lastR, 4, 1, 3).setNumberFormat('"Rp"#,##0');

      return jsonResponse({ success: true, balance: finalBalance, message: "Mutasi saldo kas berhasil dicatat! Saldo: Rp " + finalBalance });
    }

    // Penjualan Kasir
    var receiptNumber = requestData.receiptNumber || ("PS-" + Utilities.formatDate(now, tz, "yyyyMMdd-HHmmss"));
    var items = requestData.items || [];
    var productSummary = requestData.productNamesSummary || items.map(function(it) {
      return (it.namaProduk || "Produk") + " (" + (it.jumlah || 1) + " " + (it.satuan || "pcs") + ")";
    }).join(", ") || "Penjualan Toko";

    var totalPrice = Number(requestData.totalAmount) || 0;
    var paymentMethod = String(requestData.paymentMethod || "Tunai");
    var newBalance = currentBalance + totalPrice;

    salesSheet.appendRow([tanggal, jam, productSummary, totalPrice, 0, newBalance, paymentMethod]);
    var newRow = salesSheet.getLastRow();
    salesSheet.getRange(newRow, 4, 1, 3).setNumberFormat('"Rp"#,##0');

    return jsonResponse({
      success: true,
      message: "Transaksi berhasil dicatat ke spreadsheet",
      receiptNumber: receiptNumber,
      date: tanggal,
      time: jam,
      balance: newBalance
    });

  } catch (err) {
    return jsonResponse({ success: false, message: "Gagal memproses data: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function buatKolomSaldoOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Penjualan");
  var headers = ["Tanggal", "Jam", "Keterangan / Transaksi", "Masuk (+)", "Keluar (-)", "Saldo Kas Akhir", "Metode"];
  if (!sheet) { sheet = ss.insertSheet("Penjualan"); }

  var totalCols = sheet.getMaxColumns();
  if (totalCols > 7) { sheet.deleteColumns(8, totalCols - 7); }
  sheet.getRange(1, 1, 1, 7).setValues([headers]);
  formatHeaderRow(sheet, 7);
  sheet.setFrozenRows(1);

  if (sheet.getLastRow() <= 1) {
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    sheet.appendRow([Utilities.formatDate(now, tz, "yyyy-MM-dd"), Utilities.formatDate(now, tz, "HH:mm:ss"), "Saldo Awal Kasir", 0, 0, 0, "Sistem"]);
  }
  var maxR = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, 4, maxR - 1, 3).setNumberFormat('"Rp"#,##0');
  sheet.autoResizeColumns(1, 7);

  hapusKolomHargaModalOtomatis();

  return "Berhasil merapikan tab Penjualan 7 kolom dan membersihkan kolom modal di seluruh sheet!";
}

function hapusKolomHargaModalOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var cleanedSheets = [];

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName();
    if (sheetName === "Penjualan" || sheetName === "Rekap") continue;

    var values = sheet.getDataRange().getValues();
    if (!values || values.length === 0) continue;

    var headerRow = values[0];
    for (var col = headerRow.length - 1; col >= 0; col--) {
      var headerText = String(headerRow[col] || "").trim().toLowerCase();
      if (headerText.indexOf("beli") >= 0 || headerText.indexOf("modal") >= 0) {
        sheet.deleteColumn(col + 1);
        cleanedSheets.push(sheetName + " (kolom " + (col + 1) + ")");
      }
    }
  }

  return "Berhasil menghapus seluruh kolom Harga Modal/Beli dari spreadsheet! " + (cleanedSheets.length > 0 ? "Sheet dibersihkan: " + cleanedSheets.join(", ") : "Semua sheet sudah bersih tanpa kolom modal.");
}

function isiDataProdukOtomatis() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buatKolomSaldoOtomatis();

  var dataBurung = [
    [1, "SKM (SKM Halus)", "pcs", 4500, ""],
    [2, "SKM (SKM Kasar)", "pcs", 4500, ""],
    [3, "Kroto Sari (KSK)", "pcs", 3500, ""],
    [4, "Kroto Sari (Krotosari Kasar)", "pcs", 3500, ""],
    [5, "Alam Sakti (Love Bird)", "pcs", 10500, ""],
    [6, "Alam Sakti (Kenari)", "pcs", 11500, ""],
    [7, "Topsong (Top Song Coklat)", "pcs", 12000, ""],
    [8, "Topsong (Top Song Hijau)", "pcs", 12000, ""],
    [9, "Leopard (Kuning Kasar)", "pcs", 8500, ""],
    [10, "Leopard (Hijau Kasar)", "pcs", 8500, ""],
    [11, "Chirpy (Besar)", "pcs", 8500, ""],
    [12, "Madura Koung (Madura Koung)", "pcs", 9500, ""],
    [13, "Kutut Profit (Profit)", "pcs", 8500, ""],
    [14, "Derkuku Comet (Comet Derkuku)", "pcs", 7500, ""],
    [15, "Gold Coin (Kutut 250gr)", "pcs", 8500, ""],
    [16, "Gold Coin (Hijau Seaweed 450gr)", "pcs", 12000, ""],
    [17, "Gold Coin (Canary)", "pcs", 10000, ""],
    [18, "Ebod Canary (Ebod)", "pcs", 9000, ""],
    [19, "Fancy (9 Bintang Anti Stress)", "pcs", 8000, ""],
    [20, "Fancy (Love Bird)", "pcs", 14500, ""],
    [21, "Fancy (Bintang Seaweed/Gold)", "pcs", 14500, ""],
    [22, "Milet Racik Lovebird", "pcs", 10000, ""],
    [23, "Milet Putih Kiloan", "kg", 14500, ""],
    [24, "Milet Merah Kiloan", "kg", 14500, ""],
    [25, "Bintang Kebumen (Halus)", "pcs", 9000, ""],
    [26, "Phoenix Perkutut", "pcs", 12500, ""],
    [27, "Canary Post (Biji Sawi)", "kg", 16000, ""],
    [28, "Kwaci Hitam Kiloan", "kg", 22000, ""],
    [29, "Jagung Kristal Merah", "kg", 10000, ""]
  ];
  isiSheetKategori(ss, "Burung", dataBurung);

  var dataAyam = [
    [1, "511 (1 Karung)", "kg", 11500, "Dijual per kg (dari karung)"],
    [2, "511 (511 K)", "kg", 14500, ""],
    [3, "591 (591k)", "kg", 14500, ""],
    [4, "592 (592k)", "kg", 14500, ""],
    [5, "594 (594k)", "kg", 14500, ""],
    [6, "BR-1 Super", "kg", 12000, ""],
    [7, "BR-611", "kg", 10000, ""],
    [8, "Buras (1 Karung)", "kg", 7000, ""],
    [9, "EH 610 (1 Karung)", "kg", 9500, ""],
    [10, "Jagung (1 Karung Meniran)", "kg", 10500, ""],
    [11, "Jagung (1 Karung Kasar)", "kg", 10500, ""],
    [12, "Konsentrat 144", "kg", 13500, ""],
    [13, "Katul Super", "kg", 5500, ""],
    [14, "Polard Gandum", "kg", 7000, ""],
    [15, "Kupang Halus", "kg", 4000, ""]
  ];
  isiSheetKategori(ss, "Ayam", dataAyam);

  var dataKucing = [
    [1, "Bolt Ikan Tuna (Kiloan)", "kg", 24000, ""],
    [2, "Bolt Salmon (Kiloan)", "kg", 25000, ""],
    [3, "Bolt Kitten Salmon", "kg", 26000, ""],
    [4, "Me-O Adult Seafood", "kg", 36000, ""],
    [5, "Me-O Adult Tuna", "kg", 36000, ""],
    [6, "Me-O Kitten Ocean Fish", "kg", 38000, ""],
    [7, "Whiskas Adult Tuna", "kg", 37000, ""],
    [8, "Whiskas Junior Ocean Fish", "kg", 39000, ""],
    [9, "Cat Choize Tuna", "kg", 21000, ""],
    [10, "Cat Choize Salmon", "kg", 21500, ""],
    [11, "Cat Choize Kitten", "kg", 23000, ""],
    [12, "Ori Cat Kitten", "kg", 20000, ""],
    [13, "Ori Cat Adult", "kg", 19500, ""],
    [14, "Life Cat Pouch Tuna 85gr", "pcs", 6000, ""],
    [15, "Life Cat Pouch Salmon 85gr", "pcs", 6000, ""],
    [16, "Whiskas Pouch Tuna 85gr", "pcs", 8000, ""],
    [17, "Pasir Kucing Gumpal 5L", "pcs", 27000, ""],
    [18, "Pasir Kucing Gumpal 10L", "pcs", 50000, ""]
  ];
  isiSheetKategori(ss, "Kucing", dataKucing);

  var dataIkan = [
    [1, "Takari Hijau 100gr", "pcs", 6500, ""],
    [2, "Takari Merah 100gr", "pcs", 6500, ""],
    [3, "Takari 250gr", "pcs", 13500, ""],
    [4, "Takari 500gr", "pcs", 24000, ""],
    [5, "Akari Premium Red 100gr", "pcs", 16000, ""],
    [6, "Akari Premium Maxi 100gr", "pcs", 16000, ""],
    [7, "Sanyu Turtle Food 100gr", "pcs", 13000, ""],
    [8, "Pelet Lele 781-1 Kiloan", "kg", 14000, ""],
    [9, "Pelet Lele 781-2 Kiloan", "kg", 13500, ""],
    [10, "Pelet Lele -1 Kiloan", "kg", 13000, ""],
    [11, "Pelet Nila LP-1 Kiloan", "kg", 13500, ""],
    [12, "Pelet Nila LP-2 Kiloan", "kg", 13000, ""],
    [13, "Pelet Apung Feng-Li 0", "kg", 20000, ""],
    [14, "Pelet Apung Feng-Li 1", "kg", 19000, ""],
    [15, "Pelet Koi CP 1kg", "pcs", 26000, ""],
    [16, "Pelet Mas Koki 100gr", "pcs", 8000, ""]
  ];
  isiSheetKategori(ss, "Ikan", dataIkan);

  // 6. Data Kategori Obat & Vitamin Ternak/Hewan (Hanya Harga Jual - Tanpa Modal)
  buatSheetObatOtomatis(ss);

  return "Berhasil mengisi seluruh data produk (5 kolom resmi tanpa modal termasuk Obat) dan sheet Penjualan 7 kolom!";
}

function buatSheetObatOtomatis(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataObat = [
    [1, "Vita Tetra Chlor (Kapsul isi 10)", "pcs", 6000, "Obat ngorok & snot unggas"],
    [2, "Koleridin (Kapsul isi 10)", "pcs", 5500, "Obat kolera & berak hijau"],
    [3, "Vita Stress (Sachet 10gr)", "pcs", 5000, "Vitamin anti stres ayam & burung"],
    [4, "Super N (15 ml)", "pcs", 20000, "Obat infeksi pernapasan burung"],
    [5, "Biodin Spray Antiseptik (100 ml)", "pcs", 28000, "Obat luka, jamur, korep hewan"],
    [6, "Scabies Cream / Salep Jamur Kucing", "pcs", 16000, "Obat jamur & scabies kucing"],
    [7, "Detick Obat Kutu Kucing (1-10kg)", "pcs", 22000, "Obat tetes kutu kucing"],
    [8, "Albenworm Obat Cacing Kucing", "pcs", 18000, "Obat cacing tablet kucing"],
    [9, "Minyak Ikan / Fish Oil (Botol 50 butir)", "pcs", 12000, "Suplemen bulu & nafsu makan"],
    [10, "Gendol / Tetraclor Cair Ternak (100 ml)", "pcs", 14000, "Obat pencernaan ternak"],
    [11, "Doxyvet Serbuk (Sachet 5gr)", "pcs", 6000, "Antibiotik batuk ngorok ternak"],
    [12, "Obat Kutu Serbuk Asuntol (100gr)", "pcs", 15000, "Bedak anti kutu ayam & unggas"]
  ];
  isiSheetKategori(ss, "Obat", dataObat);
  return "Berhasil membuat sheet Obat (12 produk) di spreadsheet!";
}

function isiSheetKategori(ss, sheetName, items) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); } else { sheet.clear(); }
  var headers = ["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"];
  var allRows = [headers];
  for (var i = 0; i < items.length; i++) { allRows.push(items[i]); }
  sheet.getRange(1, 1, allRows.length, 5).setValues(allRows);
  try {
    formatHeaderRow(sheet, 5);
    sheet.setFrozenRows(1);
    if (allRows.length > 1) { sheet.getRange(2, 4, allRows.length - 1, 1).setNumberFormat('"Rp"#,##0'); }
    sheet.autoResizeColumns(1, 5);
  } catch (err) {}
}

function ensureSalesSheetWithHeaders(ss) {
  var sheet = ss.getSheetByName("Penjualan");
  var headers = ["Tanggal", "Jam", "Keterangan / Transaksi", "Masuk (+)", "Keluar (-)", "Saldo Kas Akhir", "Metode"];
  if (!sheet) {
    sheet = ss.insertSheet("Penjualan");
    var totalCols = sheet.getMaxColumns();
    if (totalCols > 7) { sheet.deleteColumns(8, totalCols - 7); }
    sheet.appendRow(headers);
    formatHeaderRow(sheet, 7);
    sheet.setFrozenRows(1);
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    sheet.appendRow([Utilities.formatDate(now, tz, "yyyy-MM-dd"), Utilities.formatDate(now, tz, "HH:mm:ss"), "Saldo Awal Kasir", 0, 0, 0, "Sistem"]);
    sheet.getRange(2, 4, 1, 3).setNumberFormat('"Rp"#,##0');
    sheet.autoResizeColumns(1, 7);
  }
  return sheet;
}

function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu("✨ Kasir Pet Shop")
      .addItem("🧹 Bersihkan & Format Estetik Seluruh Sheet", "bersihkanDanFormatSemuaSheet")
      .addItem("📦 Isi Contoh Data Awal (Opsional)", "isiDataProdukOtomatis")
      .addToUi();
  } catch (err) {}
}

function bersihkanDanFormatSemuaSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var kategoriList = ["Ayam", "Burung", "Kucing", "Ikan", "Obat"];
  
  // 1. Format & Bersihkan ke-5 Kategori Produk (Hanya Header 5 Kolom Tanpa Modal)
  for (var k = 0; k < kategoriList.length; k++) {
    var catName = kategoriList[k];
    var sheet = ss.getSheetByName(catName);
    if (!sheet) {
      sheet = ss.insertSheet(catName);
    } else {
      sheet.clear();
      try { sheet.clearConditionalFormatRules(); } catch (e) {}
      try {
        var bandings = sheet.getBandings();
        for (var b = 0; b < bandings.length; b++) { bandings[b].remove(); }
      } catch (e) {}
    }

    var headers = [["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"]];
    sheet.getRange(1, 1, 1, 5).setValues(headers);

    var headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setBackground("#064e3b"); // Deep Emerald Green
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    headerRange.setFontFamily("Arial");
    headerRange.setVerticalAlignment("middle");
    headerRange.setHorizontalAlignment("center");
    try { sheet.setRowHeight(1, 36); } catch (e) {}
    try { sheet.setFrozenRows(1); } catch (e) {}

    // Lebar Kolom Proporsional & Rapi
    try {
      sheet.setColumnWidth(1, 55);  // NO
      sheet.setColumnWidth(2, 280); // NAMA BARANG
      sheet.setColumnWidth(3, 110); // SATUAN
      sheet.setColumnWidth(4, 135); // HARGA JUAL
      sheet.setColumnWidth(5, 250); // KETERANGAN
    } catch (e) {}

    // Format Alignment Data & Format Angka Mata Uang
    try {
      sheet.getRange(2, 1, 100, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 2, 100, 1).setHorizontalAlignment("left");
      sheet.getRange(2, 3, 100, 1).setHorizontalAlignment("center");
      sheet.getRange(2, 4, 100, 1).setHorizontalAlignment("right");
      sheet.getRange(2, 5, 100, 1).setHorizontalAlignment("left");
      sheet.getRange(2, 4, 100, 1).setNumberFormat('"Rp"#,##0');
    } catch (e) {}

    // Dropdown Data Validation untuk Kolom Satuan (Kg, Bungkus, Karung, Botol, Sachet, Pcs, dll)
    try {
      var satuanOptions = ["Kg", "Bungkus", "Karung", "Botol", "Sachet", "Pcs", "Butir", "Tablet", "Kapsul", "Ekor"];
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(satuanOptions, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(2, 3, 100, 1).setDataValidation(rule);
    } catch (e) {}

    // Alternating Row Colors (Zebra Striping Hijau Emerald Halus)
    try {
      var dataRange = sheet.getRange(1, 1, 100, 5);
      var banding = dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
      banding.setHeaderRowColor("#064e3b");
      banding.setFirstRowColor("#ffffff");
      banding.setSecondRowColor("#f0fdf4");
    } catch (e) {}
  }

  // 2. Format & Bersihkan Sheet Penjualan (Mutasi Kas 7 Kolom)
  var salesSheet = ss.getSheetByName("Penjualan");
  if (!salesSheet) {
    salesSheet = ss.insertSheet("Penjualan");
  } else {
    salesSheet.clear();
    try { salesSheet.clearConditionalFormatRules(); } catch (e) {}
    try {
      var bandings = salesSheet.getBandings();
      for (var b = 0; b < bandings.length; b++) { bandings[b].remove(); }
    } catch (e) {}
  }

  var salesHeaders = [["Tanggal", "Jam", "Keterangan / Transaksi", "Masuk (+)", "Keluar (-)", "Saldo Kas Akhir", "Metode"]];
  salesSheet.getRange(1, 1, 1, 7).setValues(salesHeaders);

  var salesHeaderRange = salesSheet.getRange(1, 1, 1, 7);
  salesHeaderRange.setBackground("#064e3b");
  salesHeaderRange.setFontColor("#FFFFFF");
  salesHeaderRange.setFontWeight("bold");
  salesHeaderRange.setFontSize(11);
  salesHeaderRange.setFontFamily("Arial");
  salesHeaderRange.setVerticalAlignment("middle");
  salesHeaderRange.setHorizontalAlignment("center");
  try { salesSheet.setRowHeight(1, 36); } catch (e) {}
  try { salesSheet.setFrozenRows(1); } catch (e) {}

  // Lebar Kolom Sheet Penjualan
  try {
    salesSheet.setColumnWidth(1, 110);
    salesSheet.setColumnWidth(2, 85);
    salesSheet.setColumnWidth(3, 260);
    salesSheet.setColumnWidth(4, 125);
    salesSheet.setColumnWidth(5, 125);
    salesSheet.setColumnWidth(6, 140);
    salesSheet.setColumnWidth(7, 100);
  } catch (e) {}

  // Baris Pembuka: Saldo Kas Awal Rp 0 (Reset Bersih)
  var now = new Date();
  var tz = Session.getScriptTimeZone() || "GMT+7";
  var openingRow = [
    Utilities.formatDate(now, tz, "yyyy-MM-dd"),
    Utilities.formatDate(now, tz, "HH:mm:ss"),
    "Saldo Kas Awal Toko (Reset Bersih)",
    0,
    0,
    0,
    "Sistem"
  ];
  salesSheet.getRange(2, 1, 1, 7).setValues([openingRow]);

  try {
    salesSheet.getRange(2, 1, 100, 1).setHorizontalAlignment("center");
    salesSheet.getRange(2, 2, 100, 1).setHorizontalAlignment("center");
    salesSheet.getRange(2, 3, 100, 1).setHorizontalAlignment("left");
    salesSheet.getRange(2, 4, 100, 3).setHorizontalAlignment("right");
    salesSheet.getRange(2, 7, 100, 1).setHorizontalAlignment("center");
    salesSheet.getRange(2, 4, 100, 3).setNumberFormat('"Rp"#,##0');
  } catch (e) {}

  // Zebra Striping Sheet Penjualan
  try {
    var salesRange = salesSheet.getRange(1, 1, 100, 7);
    var salesBanding = salesRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    salesBanding.setHeaderRowColor("#064e3b");
    salesBanding.setFirstRowColor("#ffffff");
    salesBanding.setSecondRowColor("#f0fdf4");
  } catch (e) {}

  // Hapus sheet default "Sheet1" jika masih ada dan kosong
  try {
    var sheet1 = ss.getSheetByName("Sheet1");
    if (sheet1 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet1);
    }
  } catch (e) {}

  return "Berhasil mereset seluruh sheet dan memformat estetik tema Emerald Green!";
}

function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#064e3b");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  try { sheet.setRowHeight(1, 36); } catch (e) {}
}

function getLastCashBalance(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  for (var r = lastRow; r >= 2; r--) {
    var rowVal = parseNumber(sh.getRange(r, 6).getValue());
    if (!isNaN(rowVal) && rowVal > 0) return rowVal;
  }
  return 0;
}

function getRecentSalesJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ensureSalesSheetWithHeaders(ss);
    var data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return jsonResponse({ success: true, currentBalance: 0, todayTotal: 0, todayCount: 0, recentTransactions: [] });
    }
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "GMT+7";
    var todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    var todayTotal = 0, todayCount = 0, currentBalance = 0, recent = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var rawT = row[0];
      var tgl = (rawT instanceof Date) ? Utilities.formatDate(rawT, tz, "yyyy-MM-dd") : String(rawT || "").trim();
      var rawJ = row[1];
      var jam = (rawJ instanceof Date) ? Utilities.formatDate(rawJ, tz, "HH:mm:ss") : String(rawJ || "").trim();
      var ket = String(row[2] || "-");
      var masuk = parseNumber(row[3]);
      var keluar = parseNumber(row[4]);
      var rowBal = parseNumber(row[5]);
      var metode = String(row[6] || "Kas");

      if (rowBal > 0) currentBalance = rowBal;
      else if (masuk > 0) currentBalance += masuk;
      else if (keluar > 0) currentBalance = Math.max(0, currentBalance - keluar);

      var isMutationNote = ket.toLowerCase().includes("saldo") || ket.toLowerCase().includes("modal") || ket.toLowerCase().includes("tarik");
      if (tgl === todayStr && masuk > 0 && !isMutationNote) {
        todayTotal += masuk;
        todayCount++;
      }

      var noStruk = "PS-" + (tgl ? tgl.replace(/-/g, "") : "TRX") + "-" + (r < 10 ? "00" + r : (r < 100 ? "0" + r : r));
      var nominalTrx = masuk > 0 ? masuk : keluar;
      recent.push({
        noStruk: noStruk,
        tanggal: tgl,
        jam: jam,
        namaPembeli: isMutationNote ? "Internal Toko" : "-",
        metodeBayar: metode,
        bayar: nominalTrx,
        kembalian: 0,
        total: nominalTrx,
        tipeMutasi: masuk > 0 ? "masuk" : "keluar",
        saldoAkhir: currentBalance,
        items: [{
          kategori: isMutationNote ? "Mutasi Kas" : "Penjualan",
          namaProduk: ket,
          satuan: "trx",
          jumlah: 1,
          hargaJual: nominalTrx,
          subtotal: nominalTrx
        }]
      });
    }

    return jsonResponse({
      success: true,
      currentBalance: currentBalance,
      todayTotal: todayTotal,
      todayCount: todayCount,
      recentTransactions: recent.slice(-30).reverse()
    });
  } catch (err) {
    return jsonResponse({ success: false, message: "Gagal membaca riwayat: " + err.toString() });
  }
}

function getProductsJson() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var allProducts = [];

    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var rawName = sheet.getName().trim();
      var lowerName = rawName.toLowerCase();
      if (lowerName === "penjualan" || lowerName === "rekap" || lowerName === "summary" || lowerName === "laporan") continue;

      var catName = rawName;
      if (lowerName.indexOf("obat") >= 0) catName = "Obat";
      else if (lowerName.indexOf("burung") >= 0) catName = "Burung";
      else if (lowerName.indexOf("ayam") >= 0) catName = "Ayam";
      else if (lowerName.indexOf("kucing") >= 0) catName = "Kucing";
      else if (lowerName.indexOf("ikan") >= 0) catName = "Ikan";

      var data = sheet.getDataRange().getValues();
      if (!data || data.length < 2) continue;
      var headerRow = data[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        colMap[String(headerRow[c]).trim().toLowerCase()] = c;
      }
      var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk", "barang", "nama"]);
      var idxSatuan = findColumnIndex(colMap, ["satuan", "unit"]);
      var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga jual (per satuan)", "harga"]);

      if (idxNama < 0) continue;

      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var namaProduk = (idxNama >= 0 && row[idxNama]) ? String(row[idxNama]).trim() : "";
        if (!namaProduk) continue;

        var satuan = (idxSatuan >= 0 && row[idxSatuan]) ? String(row[idxSatuan]).trim() : "pcs";
        var rawHargaJual = (idxHargaJual >= 0) ? parseNumber(row[idxHargaJual]) : 0;
        var finalSatuan = satuan;
        var note = "";

        if (catName.toLowerCase() === "ayam" && (satuan.toLowerCase() === "zak" || satuan.toLowerCase() === "karung")) {
          finalSatuan = "kg";
          note = "Dijual per kg (dari karung)";
        }

        allProducts.push({
          id: catName + "_" + r,
          kategori: catName,
          namaProduk: namaProduk,
          satuan: finalSatuan,
          satuanAsli: satuan,
          hargaJual: rawHargaJual,
          hargaBeli: 0,
          hargaBelumDiisi: (rawHargaJual <= 0),
          catatan: note
        });
      }
    }

    return jsonResponse({ success: true, products: allProducts, count: allProducts.length });
  } catch (err) {
    return jsonResponse({ success: false, message: "Gagal membaca produk: " + err.toString() });
  }
}

function findColumnIndex(colMap, candidateNames) {
  for (var i = 0; i < candidateNames.length; i++) {
    var name = candidateNames[i].toLowerCase();
    if (colMap.hasOwnProperty(name)) return colMap[name];
  }
  return -1;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  var cleaned = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function updateProductPriceInSheets(ss, data) {
  var targetCat = String(data.kategori || data.category || "").trim();
  var targetName = String(data.namaProduk || data.nama || "").trim();
  var newPrice = Number(data.hargaJual || data.harga || data.newPrice) || 0;
  var productId = String(data.id || data.productId || "").trim();

  var categories = ["Ayam", "Burung", "Kucing", "Ikan", "Obat", "Lainnya"];
  if (targetCat) {
    var formattedCat = targetCat.charAt(0).toUpperCase() + targetCat.slice(1).toLowerCase();
    categories = [formattedCat].concat(categories.filter(function(c) { return c.toLowerCase() !== formattedCat.toLowerCase(); }));
  }

  for (var i = 0; i < categories.length; i++) {
    var catName = categories[i];
    var sheet = ss.getSheetByName(catName);
    if (!sheet) continue;
    var values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) continue;
    var colMap = {};
    for (var c = 0; c < values[0].length; c++) { colMap[String(values[0][c]).trim().toLowerCase()] = c; }
    var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk"]);
    var idxHargaJual = findColumnIndex(colMap, ["harga jual", "harga"]);
    if (idxNama < 0 || idxHargaJual < 0) continue;

    for (var r = 1; r < values.length; r++) {
      var rowName = String(values[r][idxNama] || "").trim();
      var cleanTarget = String(targetName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      var cleanRow = String(rowName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if ((cleanRow && cleanTarget && cleanRow === cleanTarget) || (productId && productId.toLowerCase() === (catName + "_" + r).toLowerCase())) {
        sheet.getRange(r + 1, idxHargaJual + 1).setValue(newPrice);
        sheet.getRange(r + 1, idxHargaJual + 1).setNumberFormat('"Rp"#,##0');
        return { success: true, message: "Harga '" + targetName + "' berhasil diupdate menjadi Rp " + newPrice, kategori: catName, namaProduk: targetName, hargaJual: newPrice };
      }
    }
  }

  return addProductToSheets(ss, { kategori: targetCat || "Lainnya", namaProduk: targetName, satuan: data.satuan || "pcs", hargaJual: newPrice });
}

function addProductToSheets(ss, data) {
  var cat = String(data.kategori || data.category || "Lainnya").trim();
  cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  var name = String(data.namaProduk || data.nama || "").trim();
  var unit = String(data.satuan || data.unit || "pcs").trim();
  var price = Number(data.hargaJual || data.harga || data.price) || 0;

  if (!name) return { success: false, message: "Nama produk tidak boleh kosong" };

  var sheet = ss.getSheetByName(cat);
  if (!sheet) {
    sheet = ss.insertSheet(cat);
    sheet.appendRow(["NO", "NAMA BARANG", "SATUAN", "HARGA JUAL", "KETERANGAN"]);
    formatHeaderRow(sheet, 5);
    sheet.setFrozenRows(1);
  }

  var nextNo = Math.max(1, sheet.getLastRow());
  sheet.appendRow([nextNo, name, unit, price, "Ditambahkan dari Kasir"]);
  var newRowIdx = sheet.getLastRow();
  try {
    sheet.getRange(newRowIdx, 4).setNumberFormat('"Rp"#,##0');
    sheet.autoResizeColumns(1, 5);
  } catch (err) {}

  return { success: true, message: "Produk '" + name + "' berhasil ditambahkan ke tab " + cat, kategori: cat, namaProduk: name, hargaJual: price };
}

function deleteProductFromSheets(ss, data) {
  var targetName = String(data.namaProduk || data.nama || "").trim();
  var targetCat = String(data.kategori || data.category || "").trim();
  var productId = String(data.id || data.productId || "").trim();
  if (!targetName && !productId) return { success: false, message: "Nama produk atau ID harus diisi" };

  var categories = ["Ayam", "Burung", "Kucing", "Ikan", "Obat", "Lainnya"];
  if (targetCat) {
    var formattedCat = targetCat.charAt(0).toUpperCase() + targetCat.slice(1).toLowerCase();
    categories = [formattedCat].concat(categories.filter(function(c) { return c.toLowerCase() !== formattedCat.toLowerCase(); }));
  }

  for (var i = 0; i < categories.length; i++) {
    var catName = categories[i];
    var sheet = ss.getSheetByName(catName);
    if (!sheet) continue;
    var values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) continue;
    var colMap = {};
    for (var c = 0; c < values[0].length; c++) { colMap[String(values[0][c]).trim().toLowerCase()] = c; }
    var idxNama = findColumnIndex(colMap, ["nama produk", "nama barang", "produk"]);
    if (idxNama < 0) continue;

    for (var r = values.length - 1; r >= 1; r--) {
      var rowName = String(values[r][idxNama] || "").trim();
      var cleanTarget = String(targetName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      var cleanRow = String(rowName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if ((cleanRow && cleanTarget && cleanRow === cleanTarget) || (productId && productId.toLowerCase() === (catName + "_" + r).toLowerCase())) {
        sheet.deleteRow(r + 1);
        return { success: true, message: "Produk '" + targetName + "' berhasil dihapus dari tab " + catName, kategori: catName, namaProduk: targetName };
      }
    }
  }

  return { success: true, message: "Produk '" + targetName + "' dihapus dari katalog", namaProduk: targetName };
}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById("btn-copy-apps-script-text");
      if (btn) btn.innerText = "Tersalin! ✅";
      setTimeout(() => { if (btn) btn.innerText = "Salin Kode"; }, 2500);
      alert("Kode Google Apps Script (Code.gs) berhasil disalin ke Clipboard!\n\nSilakan buka spreadsheet Anda > Ekstensi > Apps Script > Tempel (Ctrl+V) > Simpan & Deploy.");
    }).catch(() => {
      fallbackCopyText(code);
    });
  } else {
    fallbackCopyText(code);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  alert("Kode Google Apps Script berhasil disalin ke Clipboard!");
}

async function buatSheetObatDiSheets() {
  const prodUrl = getProductUrl();
  if (!prodUrl) {
    alert("URL Google Apps Script belum diisi di Pengaturan!");
    return;
  }

  const btn = document.getElementById("btn-create-obat-text");
  if (btn) btn.innerText = "Membuat Sheet...";

  try {
    const res = await fetch(`${prodUrl}?action=setup_obat&t=${Date.now()}`);
    const data = await res.json();
    if (data && data.success) {
      alert("SUKSES!\n\n" + data.message);
      syncWithSpreadsheet();
    } else {
      alert("Pemberitahuan: " + (data ? data.message : "Tidak ada respon dari Apps Script"));
    }
  } catch (err) {
    alert("Permintaan pembuatan sheet Obat terkirim.\nJika Apps Script belum diupdate, silakan Salin Kode Apps Script terbaru dan jalankan fungsi 'buatSheetObatOtomatis' di Google Apps Script editor.");
  } finally {
    if (btn) btn.innerText = "+ Buat Sheet Obat";
  }
}

async function hapusKolomModalDiSheets() {
  const prodUrl = getProductUrl();
  if (!prodUrl) {
    alert("URL Google Apps Script belum diisi di Pengaturan!");
    return;
  }

  const btn = document.getElementById("btn-clean-cost-col-text");
  if (btn) btn.innerText = "Membersihkan...";

  try {
    const res = await fetch(`${prodUrl}?action=hapus_modal&t=${Date.now()}`);
    const data = await res.json();
    if (data && data.success) {
      alert("SUKSES!\n\n" + data.message);
      syncWithSpreadsheet();
    } else {
      alert("Pemberitahuan: " + (data ? data.message : "Tidak ada respon dari Apps Script"));
    }
  } catch (err) {
    alert("Proses pembersihan kolom modal terkirim ke spreadsheet.\nJika script baru belum dideploy, silakan Salin Kode Apps Script terbaru dan jalankan fungsi 'hapusKolomHargaModalOtomatis' di Google Apps Script.");
  } finally {
    if (btn) btn.innerText = "Bersihkan Kolom Modal";
  }
}

async function resetDanFormatSpreadsheet() {
  const pUrl = getProductUrl();
  if (!pUrl) {
    alert("URL Google Apps Script belum diisi di Pengaturan!");
    return;
  }
  if (!confirm("Peringatan: Seluruh data produk dan riwayat transaksi di spreadsheet akan dibersihkan total dan diformat ulang dengan tema Emerald Green modern.\n\nLanjutkan?")) {
    return;
  }
  try {
    const res = await fetch(`${pUrl}?action=reset_and_format&t=${Date.now()}`);
    const data = await res.json();
    if (data && data.success) {
      alert("SUKSES!\n\n" + data.message);
      localStorage.setItem("petshop_clean_slate", "true");
      localStorage.setItem("petshop_current_balance", "0");
      localStorage.removeItem("petshop_custom_products");
      localStorage.removeItem("petshop_price_overrides");
      localStorage.removeItem("petshop_deleted_product_ids");
      localStorage.removeItem("petshop_local_sales");
      products = [];
      currentBalance = 0;
      updateDashboard();
      renderProducts();
      renderCatalogManager();
    } else {
      alert("Pemberitahuan: " + (data ? data.message : "Tidak ada respon dari Apps Script"));
    }
  } catch (err) {
    alert("Permintaan format terkirim ke spreadsheet.\nJika Apps Script belum diupdate, silakan jalankan fungsi 'bersihkanDanFormatSemuaSheet' di Google Apps Script editor.");
  }
}


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
let scriptUrl = localStorage.getItem("petshop_apps_script_url") || "https://script.google.com/macros/s/AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp/exec";

if (scriptUrl.includes("AKfycbzPytd") || scriptUrl.includes("AKfycbxuIhr") || !scriptUrl.startsWith("https://script.google.com")) {
  scriptUrl = "https://script.google.com/macros/s/AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp/exec";
  localStorage.setItem("petshop_apps_script_url", scriptUrl);
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
  { id: "burung_6", kategori: "Burung", namaProduk: "SKM (SKM Halus)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_7", kategori: "Burung", namaProduk: "SKM (SKM Kasar)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_8", kategori: "Burung", namaProduk: "Kroto Sari (KSK)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_9", kategori: "Burung", namaProduk: "Kroto Sari (Krotosari Kasar)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_10", kategori: "Burung", namaProduk: "Alam Sakti (Love Bird)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_11", kategori: "Burung", namaProduk: "Alam Sakti (Kenari)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_12", kategori: "Burung", namaProduk: "Madura Koung (Madura Koung)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_13", kategori: "Burung", namaProduk: "Kutut Profit (Profit)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_14", kategori: "Burung", namaProduk: "Derkuku Comet (Comet Derkuku)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_15", kategori: "Burung", namaProduk: "Gold Coin (Kutut 250gr)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_16", kategori: "Burung", namaProduk: "Gold Coin (Hijau Seaweed 450gr)", satuan: "pcs", hargaJual: 12000 },
  { id: "burung_17", kategori: "Burung", namaProduk: "Gold Coin (Canary)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_18", kategori: "Burung", namaProduk: "Ebod Canary (Ebod)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_19", kategori: "Burung", namaProduk: "Chirpy (Besar)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_20", kategori: "Burung", namaProduk: "Chirpy (Kecil)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_21", kategori: "Burung", namaProduk: "Fancy (Besar)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_22", kategori: "Burung", namaProduk: "Fancy (Kecil 250gr)", satuan: "pcs", hargaJual: 0 },
  { id: "burung_23", kategori: "Burung", namaProduk: "Ketan Hitam", satuan: "pcs", hargaJual: 0 },
  { id: "burung_24", kategori: "Burung", namaProduk: "Milet Putih (1kg)", satuan: "kg", hargaJual: 0 },
  { id: "burung_25", kategori: "Burung", namaProduk: "Milet Merah", satuan: "pcs", hargaJual: 0 },
  { id: "burung_26", kategori: "Burung", namaProduk: "Kenari Seed (1kg)", satuan: "kg", hargaJual: 0 },
  { id: "burung_27", kategori: "Burung", namaProduk: "Trucuk Pisang Ijo SM", satuan: "pcs", hargaJual: 0 },
  { id: "burung_28", kategori: "Burung", namaProduk: "521 (521 Coklat)", satuan: "kg", hargaJual: 0 },
  { id: "burung_29", kategori: "Burung", namaProduk: "521 (521 Hijau)", satuan: "kg", hargaJual: 0 },
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

  const scriptInput = document.getElementById("setting-script-url");
  if (scriptInput) scriptInput.value = scriptUrl;

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
  if (!scriptUrl) return;
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
  const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  const overrides = JSON.parse(localStorage.getItem("petshop_price_overrides") || "{}");
  
  products = [...defaultCatalog, ...custom].map(p => {
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
    { id: "Ikan", label: "🐟 Ikan" }
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
    grid.innerHTML = `
      <div class="col-span-2 sm:col-span-3 xl:col-span-4 py-16 text-center text-slate-400 space-y-2">
        <i data-lucide="package-search" class="w-12 h-12 mx-auto stroke-1 text-slate-300"></i>
        <p class="text-sm font-semibold">Tidak ditemukan produk terkait</p>
        <p class="text-xs text-slate-400">Coba ganti kata kunci atau pilih kategori lain</p>
      </div>
    `;
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
    { id: "Ikan", label: "🐟 Ikan" }
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
    listContainer.innerHTML = `
      <div class="col-span-1 sm:col-span-2 lg:col-span-3 py-16 text-center text-slate-400 space-y-2">
        <i data-lucide="package-search" class="w-12 h-12 mx-auto stroke-1 text-slate-300"></i>
        <p class="text-sm font-semibold">Tidak ada produk ditemukan</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  listContainer.innerHTML = filtered.map(p => {
    let catIcon = "box";
    if (p.kategori === "Ayam") catIcon = "egg";
    if (p.kategori === "Burung") catIcon = "feather";
    if (p.kategori === "Kucing") catIcon = "cat";
    if (p.kategori === "Ikan") catIcon = "fish";
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

          <button onclick="openEditPriceModal('${p.id}')" class="py-2 px-3.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm border border-blue-200 hover:border-transparent">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            <span>Ubah Harga</span>
          </button>
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

  // Sinkronkan perubahan harga langsung ke Google Spreadsheet
  if (scriptUrl && prod) {
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.classList.remove("hidden");
      syncBadge.innerText = "Menyimpan ke Sheets...";
    }
    try {
      await fetch(scriptUrl, {
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
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
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
  if (scriptUrl) {
    const syncBadge = document.getElementById("header-sync-badge");
    if (syncBadge) {
      syncBadge.classList.remove("hidden");
      syncBadge.innerText = "Menambah ke Sheets...";
    }
    try {
      fetch(scriptUrl, {
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
  const urlInput = document.getElementById("setting-script-url");
  if (urlInput) urlInput.value = scriptUrl;
  
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

  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
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
  const urlInput = document.getElementById("setting-script-url");
  const url = urlInput ? urlInput.value.trim() : "";
  scriptUrl = url;
  localStorage.setItem("petshop_apps_script_url", url);
  alert("URL Google Spreadsheet berhasil disimpan!");
}

async function syncData() {
  if (!scriptUrl) {
    alert("Harap masukkan URL Google Apps Script di Pengaturan terlebih dahulu.");
    openSettingsModal();
    return;
  }

  // 1. Ambil Katalog Produk dari setiap sheet kategori (Ayam, Burung, Kucing, Ikan, Lainnya)
  try {
    const res = await fetch(`${scriptUrl}?action=products&t=${Date.now()}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
      const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
      const overrides = JSON.parse(localStorage.getItem("petshop_price_overrides") || "{}");
      
      // Tata ulang setiap objek produk agar properti kategori, harga, dan nama konsisten 100%
      const syncedProducts = data.products.map((p, idx) => {
        const cleanedName = sanitizeProductName(p.namaProduk || p.nama || "Produk");
        const rawKat = String(p.kategori || "Lainnya").trim();
        // Normalisasi huruf kapital kategori (Ayam, Burung, Kucing, Ikan, Lainnya)
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
      console.log(`[Sync] Berhasil menyinkronkan ${syncedProducts.length} produk dari seluruh sheet kategori.`);
    }
  } catch (err) {
    console.warn("Gagal sync katalog produk dari spreadsheet:", err);
  }

  // 2. Ambil Saldo Kas & Riwayat Terakhir dari Google Sheets
  try {
    const resSales = await fetch(`${scriptUrl}?action=recent`);
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

/**
 * Kasir Pet Shop Web POS (Desktop Workstation & Mobile iOS/Android PWA)
 */

// State
let products = [];
let cart = {}; // productId -> { product, qty }
let selectedCategory = "Semua";
let currentPaymentMethod = "Tunai";
let activeReceipt = null;
let currentMutationType = "add"; // 'add', 'withdraw', 'set'
let currentBalance = Number(localStorage.getItem("petshop_current_balance")) || 0;
let scriptUrl = localStorage.getItem("petshop_apps_script_url") || "https://script.google.com/macros/s/AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp/exec";

if (scriptUrl.includes("AKfycbzPytd") || scriptUrl.includes("AKfycbxuIhr") || !scriptUrl.startsWith("https://script.google.com")) {
  scriptUrl = "https://script.google.com/macros/s/AKfycbxcTpjehRlmfjmTll9V3LYOW79wP5X1WwznkwMn_VlFd9-0Szp1p4ize5bxPTK5Iplp/exec";
  localStorage.setItem("petshop_apps_script_url", scriptUrl);
}

const defaultCatalog = [
  // Ayam
  { id: "ayam_1", kategori: "Ayam", namaProduk: "511 Bravo Pakan Ayam", satuan: "kg", hargaJual: 14000 },
  { id: "ayam_2", kategori: "Ayam", namaProduk: "BR-1 Pakan Ayam Starter", satuan: "kg", hargaJual: 13500 },
  { id: "ayam_3", kategori: "Ayam", namaProduk: "Vita Chick Vitamin Ayam", satuan: "sachet", hargaJual: 3500 },
  { id: "ayam_4", kategori: "Ayam", namaProduk: "Jagung Giling Halus", satuan: "kg", hargaJual: 8500 },

  // Burung
  { id: "burung_1", kategori: "Burung", namaProduk: "Topsong Rumput Laut", satuan: "bungkus", hargaJual: 9000 },
  { id: "burung_2", kategori: "Burung", namaProduk: "Kroto Sari Pakan Burung", satuan: "bungkus", hargaJual: 6000 },
  { id: "burung_3", kategori: "Burung", namaProduk: "Milet Putih Super", satuan: "kg", hargaJual: 16000 },
  { id: "burung_4", kategori: "Burung", namaProduk: "Bio Bird Vitamin Kicau", satuan: "botol", hargaJual: 25000 },

  // Kucing
  { id: "kucing_1", kategori: "Kucing", namaProduk: "Whiskas Tuna Adult 1kg", satuan: "bungkus", hargaJual: 42000 },
  { id: "kucing_2", kategori: "Kucing", namaProduk: "Bolt Cat Food Tuna 1kg", satuan: "bungkus", hargaJual: 24000 },
  { id: "kucing_3", kategori: "Kucing", namaProduk: "Pasir Kucing Gumpal Wangi 5L", satuan: "sak", hargaJual: 32000 },
  { id: "kucing_4", kategori: "Kucing", namaProduk: "Me-O Creamy Treats 4x15g", satuan: "pack", hargaJual: 18000 },

  // Ikan
  { id: "ikan_1", kategori: "Ikan", namaProduk: "Takari Fish Food 100g", satuan: "bungkus", hargaJual: 7500 },
  { id: "ikan_2", kategori: "Ikan", namaProduk: "Pelet PF-500 Bibit Ikan", satuan: "kg", hargaJual: 22000 },
  { id: "ikan_3", kategori: "Ikan", namaProduk: "Metil Biru Obat Ikan", satuan: "botol", hargaJual: 5000 },
  { id: "ikan_4", kategori: "Ikan", namaProduk: "Aquarium Pump Filter", satuan: "unit", hargaJual: 45000 }
];

// Inisialisasi Saat Dokumen Dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadStoredProducts();
  renderCategories();
  renderProducts();
  updateCartUI();
  updateDashboard();
  renderQuickBalanceChips();

  const scriptInput = document.getElementById("setting-script-url");
  if (scriptInput) scriptInput.value = scriptUrl;

  const headerBal = document.getElementById("header-balance-preview");
  if (headerBal) headerBal.innerText = formatRupiah(currentBalance);

  setupKeyboardShortcuts();

  if (scriptUrl) {
    syncData();
  }
});

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
    }
  });
}

function loadStoredProducts() {
  const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  products = [...defaultCatalog, ...custom];
}

// FORMAT RUPIAH
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number || 0);
}

// TAB SWITCHER RESPONSIF
function switchTab(tab) {
  ["kasir", "dashboard", "riwayat"].forEach(t => {
    const screen = document.getElementById(`screen-${t}`);
    if (screen) screen.classList.add("hidden");

    // Mobile nav
    const btn = document.getElementById(`nav-${t}`);
    if (btn) {
      btn.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition text-slate-500 hover:bg-slate-100";
    }

    // Desktop nav
    const deskBtn = document.getElementById(`desktop-nav-${t}`);
    if (deskBtn) {
      deskBtn.className = "py-1.5 px-4 rounded-lg text-xs font-bold flex items-center space-x-2 transition text-slate-600 hover:text-slate-900 hover:bg-white/60";
    }
  });

  const activeScreen = document.getElementById(`screen-${tab}`);
  if (activeScreen) activeScreen.classList.remove("hidden");

  const activeBtn = document.getElementById(`nav-${tab}`);
  if (activeBtn) {
    activeBtn.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition bg-blue-600 text-white shadow-sm";
  }

  const activeDeskBtn = document.getElementById(`desktop-nav-${tab}`);
  if (activeDeskBtn) {
    activeDeskBtn.className = "py-1.5 px-4 rounded-lg text-xs font-bold flex items-center space-x-2 transition bg-blue-600 text-white shadow-sm";
  }

  if (tab === "dashboard") updateDashboard();
  if (tab === "riwayat") loadRecentSales();
  if (window.lucide) lucide.createIcons();
}

// KATEGORI FILTER
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

// RENDER GRID PRODUK
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
    
    let catIcon = "box";
    if (p.kategori === "Ayam") catIcon = "egg";
    if (p.kategori === "Burung") catIcon = "feather";
    if (p.kategori === "Kucing") catIcon = "cat";
    if (p.kategori === "Ikan") catIcon = "fish";

    return `
      <div class="bg-white rounded-2xl p-3 sm:p-3.5 border ${qty > 0 ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 hover:border-slate-300'} shadow-sm flex flex-col justify-between transition relative overflow-hidden group">
        ${qty > 0 ? `<div class="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm">${qty}</div>` : ''}
        
        <div>
          <div class="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center text-xs mb-2 transition">
            <i data-lucide="${catIcon}" class="w-4 h-4"></i>
          </div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">${p.kategori} • ${p.satuan}</span>
          <h4 class="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mt-0.5">${p.namaProduk}</h4>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs sm:text-sm font-black text-blue-700">${formatRupiah(p.hargaJual)}</span>
          
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

// LOGIKA KERANJANG BELANJA
function addToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  if (!cart[productId]) {
    cart[productId] = { product: prod, qty: 1 };
  } else {
    cart[productId].qty += 1;
  }
  updateCartUI();
  renderProducts();
}

function decrementCart(productId) {
  if (!cart[productId]) return;
  cart[productId].qty -= 1;
  if (cart[productId].qty <= 0) {
    delete cart[productId];
  }
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
    totalAmount += (item.qty * item.product.hargaJual);
  });
  return { totalQty, totalAmount };
}

// PERBARUI SELURUH TAMPILAN KERANJANG (MOBILE & DESKTOP SIDEBAR)
function updateCartUI() {
  const { totalQty, totalAmount } = getCartTotals();

  // 1. Mobile Floating Bottom Bar
  const bar = document.getElementById("floating-cart-bar");
  if (bar) {
    if (totalQty > 0) {
      bar.classList.remove("hidden");
      const badge = document.getElementById("cart-badge");
      if (badge) badge.innerText = totalQty;
      const totalTxt = document.getElementById("cart-total-text");
      if (totalTxt) totalTxt.innerText = formatRupiah(totalAmount);
    } else {
      bar.classList.add("hidden");
    }
  }

  // 2. Desktop Sticky Sidebar
  const deskBadge = document.getElementById("desktop-cart-count-badge");
  if (deskBadge) deskBadge.innerText = `${totalQty} Item`;

  const deskTotal = document.getElementById("desktop-total-display");
  if (deskTotal) deskTotal.innerText = formatRupiah(totalAmount);

  const deskQris = document.getElementById("desktop-qris-amount");
  if (deskQris) deskQris.innerText = formatRupiah(totalAmount);

  // Render Item List Desktop
  renderDesktopCartItems();

  // Update Nominal Tunai Default Desktop jika belum diisi atau kurang
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

  container.innerHTML = items.map(item => `
    <div class="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between transition">
      <div class="flex-1 pr-2 min-w-0">
        <h5 class="text-xs font-bold text-slate-800 truncate">${item.product.namaProduk}</h5>
        <div class="flex items-center space-x-1.5 text-[10px] text-slate-500 mt-0.5">
          <span>${formatRupiah(item.product.hargaJual)}</span>
          <span>•</span>
          <span>${item.product.satuan}</span>
        </div>
      </div>

      <div class="flex items-center space-x-1.5 flex-shrink-0">
        <button onclick="decrementCart('${item.product.id}')" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-200 transition">-</button>
        <span class="text-xs font-extrabold text-slate-800 w-5 text-center">${item.qty}</span>
        <button onclick="addToCart('${item.product.id}')" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-200 transition">+</button>
        <button onclick="removeCartItem('${item.product.id}')" class="p-1 text-slate-400 hover:text-red-600 transition" title="Hapus">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>
  `).join("");

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

  const custInput = document.getElementById("desktop-cust-name");
  const customerName = (custInput && custInput.value.trim()) ? custInput.value.trim() : "Pelanggan Umum";

  const btn = document.getElementById("desktop-btn-submit");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Menyimpan ke Spreadsheet...";
  }

  await processCheckout(customerName, paidAmount, changeAmount, totalAmount, totalQty);

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
  await processCheckout("Pelanggan Umum", paidAmount, changeAmount, totalAmount, totalQty);

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
  const productSummary = itemsList.map(it => `${it.product.namaProduk} (${it.qty} ${it.product.satuan})`).join(", ");

  const transactionData = {
    action: "sale",
    receiptNumber: receiptNumber,
    customerName: customerName,
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

  container.innerHTML = items.map(item => `
    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
      <div class="flex-1 pr-2">
        <h5 class="text-xs font-bold text-slate-800 line-clamp-1">${item.product.namaProduk}</h5>
        <span class="text-[11px] text-slate-500">${formatRupiah(item.product.hargaJual)} / ${item.product.satuan}</span>
      </div>

      <div class="flex items-center space-x-2">
        <button onclick="decrementCart('${item.product.id}'); renderCartModalItems();" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center">-</button>
        <span class="text-xs font-bold text-slate-800 w-4 text-center">${item.qty}</span>
        <button onclick="addToCart('${item.product.id}'); renderCartModalItems();" class="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center">+</button>
        <button onclick="removeCartItem('${item.product.id}')" class="p-1 text-red-500 hover:text-red-700">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>
  `).join("");
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
        <span class="line-clamp-1 flex-1 pr-2">${it.product.namaProduk} x${it.qty}</span>
        <span>${formatRupiah(it.product.hargaJual * it.qty)}</span>
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
  
  const { totalQty } = getCartTotals();
  const cartCnt = document.getElementById("dash-cart-count");
  if (cartCnt) cartCnt.innerText = totalQty;

  if (window.lucide) lucide.createIcons();
}

// FORM TAMBAH PRODUK
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
  const unit = unitInput.value.trim();
  const price = Number(priceInput.value) || 0;

  let hasError = false;
  if (!name) {
    document.getElementById("err-new-prod-name").classList.remove("hidden");
    hasError = true;
  } else {
    document.getElementById("err-new-prod-name").classList.add("hidden");
  }

  if (!unit) {
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
  closeAddProductModal();
  alert(`Produk "${name}" berhasil ditambahkan ke katalog kasir!`);
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

  // 1. Ambil Katalog Produk dari Google Sheets
  try {
    const res = await fetch(`${scriptUrl}?action=products`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
      const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
      products = [...data.products, ...custom];
      renderProducts();
    }
  } catch (err) {
    console.warn("Gagal sync katalog produk:", err);
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
          prodSummary = tx.items.map(i => `${i.namaProduk} (${i.jumlah} ${i.satuan || ''})`).join(", ");
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

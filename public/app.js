/**
 * Kasir Pet Shop Web POS (Vercel & iOS Safari PWA)
 */

// State
let products = [];
let cart = {}; // productId -> { product, qty }
let selectedCategory = "Semua";
let currentPaymentMethod = "Tunai";
let activeReceipt = null;
let scriptUrl = localStorage.getItem("petshop_apps_script_url") || "";

const defaultCatalog = [
  // Ayam
  { id: "ayam_1", kategori: "Ayam", namaProduk: "511 Bravo Pakan Ayam", satuan: "kg", hargaJual: 14000 },
  { id: "ayam_2", kategori: "Ayam", namaProduk: "BR-1 Pakan Ayam Starter", satuan: "kg", hargaJual: 13500 },
  { id: "ayam_3", kategori: "Ayam", namaProduk: "Vita Chick Vitamin Ayam", satuan: "sachet", hargaJual: 3500 },
  { id: "ayam_4", kategori: "Ayam", namaProduk: "Jagung Giling Halus", satuan: "kg", hargaJual: 8500 },

  // Burung
  { id: "burung_1", kategori: "Burung", namaProduk: "Topsong Kuning 3in1", satuan: "bungkus", hargaJual: 12000 },
  { id: "burung_2", kategori: "Burung", namaProduk: "Milet Putih Super Bersih", satuan: "kg", hargaJual: 16000 },
  { id: "burung_3", kategori: "Burung", namaProduk: "Chirpy Seaweed Pellet", satuan: "bungkus", hargaJual: 15000 },
  { id: "burung_4", kategori: "Burung", namaProduk: "Kroto Kering Organik", satuan: "botol", hargaJual: 25000 },

  // Kucing
  { id: "kucing_1", kategori: "Kucing", namaProduk: "Whiskas Tuna 1.2kg", satuan: "bungkus", hargaJual: 68000 },
  { id: "kucing_2", kategori: "Kucing", namaProduk: "Bolt Cat Food Tuna 1kg", satuan: "kg", hargaJual: 23000 },
  { id: "kucing_3", kategori: "Kucing", namaProduk: "Me-O Creamy Treats 4x15g", satuan: "bungkus", hargaJual: 22000 },
  { id: "kucing_4", kategori: "Kucing", namaProduk: "Pasir Kucing Wangi Bentonite", satuan: "zak", hargaJual: 32000 },

  // Ikan
  { id: "ikan_1", kategori: "Ikan", namaProduk: "Takari Fish Food Mix", satuan: "bungkus", hargaJual: 8000 },
  { id: "ikan_2", kategori: "Ikan", namaProduk: "Akari Premium Red Pellet", satuan: "botol", hargaJual: 45000 },
  { id: "ikan_3", kategori: "Ikan", namaProduk: "Pelet Feng-Li Udang/Ikan", satuan: "kg", hargaJual: 28000 }
];

// Inisialisasi
document.addEventListener("DOMContentLoaded", () => {
  loadStoredProducts();
  renderCategories();
  renderProducts();
  updateCartUI();
  updateDashboard();

  document.getElementById("setting-script-url").value = scriptUrl;

  if (scriptUrl) {
    syncData();
  }
});

function loadStoredProducts() {
  const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  products = [...defaultCatalog, ...custom];
}

// FORMAT RUPIAH
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}

// TAB SWITCHER
function switchTab(tab) {
  ["kasir", "dashboard", "riwayat"].forEach(t => {
    document.getElementById(`screen-${t}`).classList.add("hidden");
    const btn = document.getElementById(`nav-${t}`);
    btn.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition text-slate-500 hover:bg-slate-100";
  });

  document.getElementById(`screen-${tab}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`nav-${tab}`);
  activeBtn.className = "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition bg-blue-600 text-white shadow-sm";

  if (tab === "dashboard") updateDashboard();
  if (tab === "riwayat") loadRecentSales();
  if (window.lucide) lucide.createIcons();
}

// KATEGORI
function renderCategories() {
  const cats = [
    { id: "Semua", label: "🔍 Semua" },
    { id: "Ayam", label: "🐔 Ayam" },
    { id: "Burung", label: "🐦 Burung" },
    { id: "Kucing", label: "🐱 Kucing" },
    { id: "Ikan", label: "🐟 Ikan" }
  ];

  const container = document.getElementById("category-chips");
  container.innerHTML = cats.map(c => {
    const isAct = selectedCategory === c.id;
    return `
      <button onclick="selectCategory('${c.id}')" class="whitespace-nowrap py-1.5 px-3 rounded-xl text-xs font-bold transition ${
        isAct ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
  const search = document.getElementById("search-input").value.toLowerCase().trim();
  const grid = document.getElementById("product-grid");

  const filtered = products.filter(p => {
    const matchCat = (selectedCategory === "Semua") || (p.kategori.toLowerCase() === selectedCategory.toLowerCase());
    const matchSearch = p.namaProduk.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-2 py-12 text-center text-slate-400 space-y-2">
        <i data-lucide="package-search" class="w-10 h-10 mx-auto stroke-1"></i>
        <p class="text-xs">Tidak ditemukan produk terkait</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const cartItem = cart[p.id];
    const qty = cartItem ? cartItem.qty : 0;
    
    // Ikon Kategori
    let catIcon = "box";
    if (p.kategori === "Ayam") catIcon = "egg";
    if (p.kategori === "Burung") catIcon = "feather";
    if (p.kategori === "Kucing") catIcon = "cat";
    if (p.kategori === "Ikan") catIcon = "fish";

    return `
      <div class="bg-white rounded-2xl p-3 border ${qty > 0 ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'} shadow-sm flex flex-col justify-between transition relative overflow-hidden">
        ${qty > 0 ? `<div class="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">${qty}</div>` : ''}
        
        <div>
          <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs mb-2">
            <i data-lucide="${catIcon}" class="w-4 h-4"></i>
          </div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">${p.kategori} • ${p.satuan}</span>
          <h4 class="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mt-0.5">${p.namaProduk}</h4>
        </div>

        <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs font-extrabold text-blue-700">${formatRupiah(p.hargaJual)}</span>
          
          <div class="flex items-center space-x-1">
            ${qty > 0 ? `
              <button onclick="decrementCart('${p.id}')" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black transition">-</button>
            ` : ''}
            <button onclick="addToCart('${p.id}')" class="w-7 h-7 rounded-lg ${qty > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'} flex items-center justify-center text-xs font-black transition shadow-sm">+</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// LOGIKA KERANJANG
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
  renderCartModalItems();
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

function updateCartUI() {
  const { totalQty, totalAmount } = getCartTotals();
  const bar = document.getElementById("floating-cart-bar");

  if (totalQty > 0) {
    bar.classList.remove("hidden");
    document.getElementById("cart-badge").innerText = totalQty;
    document.getElementById("cart-total-text").innerText = formatRupiah(totalAmount);
  } else {
    bar.classList.add("hidden");
  }
}

// MODAL KERANJANG
function openCartModal() {
  renderCartModalItems();
  document.getElementById("cart-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeCartModal() {
  document.getElementById("cart-modal").classList.add("hidden");
}

function renderCartModalItems() {
  const container = document.getElementById("cart-items-container");
  const items = Object.values(cart);
  const { totalAmount } = getCartTotals();

  document.getElementById("cart-modal-total").innerText = formatRupiah(totalAmount);

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
}

// MODAL PEMBAYARAN
function openPaymentModal() {
  const { totalAmount } = getCartTotals();
  if (totalAmount <= 0) return;

  document.getElementById("pay-total-display").innerText = formatRupiah(totalAmount);
  document.getElementById("qris-exact-amount").innerText = formatRupiah(totalAmount);
  
  // Set default Tunai dengan nominal pas
  setPaymentMethod("Tunai");
  document.getElementById("cash-paid-input").value = totalAmount;
  renderQuickCashChips(totalAmount);
  calculateChange();

  document.getElementById("payment-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closePaymentModal() {
  document.getElementById("payment-modal").classList.add("hidden");
}

function setPaymentMethod(method) {
  currentPaymentMethod = method;
  const btnTunai = document.getElementById("btn-method-tunai");
  const btnQris = document.getElementById("btn-method-qris");
  const panelTunai = document.getElementById("panel-tunai");
  const panelQris = document.getElementById("panel-qris");
  const submitText = document.getElementById("btn-submit-text");

  if (method === "Tunai") {
    btnTunai.className = "py-2.5 px-3 rounded-xl border-2 border-blue-600 bg-blue-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition";
    btnQris.className = "py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition";
    panelTunai.classList.remove("hidden");
    panelQris.classList.add("hidden");
    submitText.innerText = "Simpan & Cetak Struk";
  } else {
    btnQris.className = "py-2.5 px-3 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition";
    btnTunai.className = "py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition";
    panelTunai.classList.add("hidden");
    panelQris.classList.remove("hidden");
    submitText.innerText = "Konfirmasi QRIS Lunas & Cetak Struk";
  }
}

function renderQuickCashChips(totalAmount) {
  const container = document.getElementById("quick-cash-chips");
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
  document.getElementById("cash-paid-input").value = val;
  calculateChange();
}

function calculateChange() {
  const { totalAmount } = getCartTotals();
  const raw = Number(document.getElementById("cash-paid-input").value) || 0;
  const change = Math.max(0, raw - totalAmount);
  const isUnderpaid = raw < totalAmount;

  document.getElementById("change-amount-display").innerText = formatRupiah(change);
  
  const warn = document.getElementById("cash-underpaid-warning");
  if (isUnderpaid) {
    warn.innerText = `Uang pembayaran kurang ${formatRupiah(totalAmount - raw)}`;
    warn.classList.remove("hidden");
  } else {
    warn.classList.add("hidden");
  }
}

// PROSES SUBMIT PEMBAYARAN KE SPREADSHEET (6 KOLOM)
async function submitPayment() {
  const { totalQty, totalAmount } = getCartTotals();
  if (totalAmount <= 0) return;

  let paidAmount = totalAmount;
  let changeAmount = 0;

  if (currentPaymentMethod === "Tunai") {
    paidAmount = Number(document.getElementById("cash-paid-input").value) || 0;
    if (paidAmount < totalAmount) {
      alert("Nominal pembayaran tunai masih kurang!");
      return;
    }
    changeAmount = paidAmount - totalAmount;
  }

  const btn = document.getElementById("btn-submit-payment");
  btn.disabled = true;
  btn.innerText = "Menyimpan Transaksi...";

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const tanggal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const jam = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const receiptNumber = `PS-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  // Ringkasan semua nama produk dalam 1 baris
  const itemsList = Object.values(cart);
  const productSummary = itemsList.map(it => `${it.product.namaProduk} (${it.qty} ${it.product.satuan})`).join(", ");

  const transactionData = {
    action: "sale",
    receiptNumber: receiptNumber,
    customerName: "-",
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

  // Simpan ke local history
  saveLocalSale(transactionData, tanggal, jam);

  // POST ke Google Apps Script Spreadsheet jika URL terisi
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(transactionData)
      });
    } catch (e) {
      console.warn("Gagal POST ke Google Sheets:", e);
    }
  }

  // Buat struk
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

  btn.disabled = false;
  btn.innerText = "Simpan & Cetak Struk";

  // Reset keranjang
  cart = {};
  updateCartUI();
  renderProducts();

  closePaymentModal();
  showReceipt(activeReceipt);
  updateDashboard();
}

// STRUK PEMBAYARAN
function showReceipt(rcpt) {
  document.getElementById("rcpt-datetime").innerText = `${rcpt.date} ${rcpt.time}`;
  document.getElementById("rcpt-number").innerText = rcpt.receiptNumber;
  document.getElementById("rcpt-total").innerText = formatRupiah(rcpt.totalAmount);
  document.getElementById("rcpt-method").innerText = rcpt.paymentMethod;
  document.getElementById("rcpt-paid").innerText = formatRupiah(rcpt.paidAmount);
  document.getElementById("rcpt-change").innerText = formatRupiah(rcpt.changeAmount);

  const container = document.getElementById("rcpt-items-list");
  container.innerHTML = rcpt.items.map(it => `
    <div>
      <div class="font-bold">${it.product.namaProduk}</div>
      <div class="flex justify-between text-slate-500">
        <span>${it.qty} x ${formatRupiah(it.product.hargaJual)}</span>
        <span class="font-bold text-slate-800">${formatRupiah(it.qty * it.product.hargaJual)}</span>
      </div>
    </div>
  `).join("");

  document.getElementById("receipt-modal").classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeReceiptModal() {
  document.getElementById("receipt-modal").classList.add("hidden");
}

// LOCAL SALES STORAGE
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
  const history = JSON.parse(localStorage.getItem("petshop_local_sales") || "[]");

  if (history.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-xs">Belum ada riwayat penjualan</div>
    `;
    return;
  }

  container.innerHTML = history.map(h => `
    <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
      <div class="flex justify-between items-center text-xs">
        <span class="font-bold text-slate-700">${h.noStruk}</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${h.metodeBayar === 'QRIS' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${h.metodeBayar}</span>
      </div>
      <p class="text-xs text-slate-600 line-clamp-2">${h.productSummary || '-'}</p>
      <div class="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
        <span class="text-slate-400 text-[11px]">${h.tanggal} ${h.jam}</span>
        <span class="font-black text-blue-700">${formatRupiah(h.total)}</span>
      </div>
    </div>
  `).join("");
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

  document.getElementById("dash-today-total").innerText = formatRupiah(todayTotal);
  document.getElementById("dash-today-count").innerText = todayCount;
  document.getElementById("dash-today-date").innerText = todayStr;
  document.getElementById("dash-total-products").innerText = products.length;
  
  const { totalQty } = getCartTotals();
  document.getElementById("dash-cart-count").innerText = totalQty;
}

// FORM TAMBAH PRODUK (DENGAN VALIDASI)
function openAddProductModal() {
  document.getElementById("new-prod-name").value = "";
  document.getElementById("new-prod-unit").value = "pcs";
  document.getElementById("new-prod-price").value = "";
  
  document.getElementById("err-new-prod-name").classList.add("hidden");
  document.getElementById("err-new-prod-unit").classList.add("hidden");
  document.getElementById("err-new-prod-price").classList.add("hidden");

  document.getElementById("product-modal").classList.remove("hidden");
}

function closeAddProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function saveNewProduct() {
  const name = document.getElementById("new-prod-name").value.trim();
  const cat = document.getElementById("new-prod-cat").value;
  const unit = document.getElementById("new-prod-unit").value.trim();
  const priceRaw = Number(document.getElementById("new-prod-price").value) || 0;

  let hasError = false;

  // Validasi Nama
  const errName = document.getElementById("err-new-prod-name");
  if (!name) {
    errName.classList.remove("hidden");
    hasError = true;
  } else {
    errName.classList.add("hidden");
  }

  // Validasi Satuan
  const errUnit = document.getElementById("err-new-prod-unit");
  if (!unit) {
    errUnit.classList.remove("hidden");
    hasError = true;
  } else {
    errUnit.classList.add("hidden");
  }

  // Validasi Harga (Tidak boleh <= 0)
  const errPrice = document.getElementById("err-new-prod-price");
  if (priceRaw <= 0) {
    errPrice.innerText = priceRaw < 0 ? "Harga jual tidak boleh bernilai negatif" : "Harga jual tidak boleh Rp 0 (harus lebih dari 0)";
    errPrice.classList.remove("hidden");
    hasError = true;
  } else {
    errPrice.classList.add("hidden");
  }

  if (hasError) return;

  const newProd = {
    id: `custom_${Date.now()}`,
    kategori: cat,
    namaProduk: name,
    satuan: unit,
    hargaJual: priceRaw
  };

  const customList = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
  customList.push(newProd);
  localStorage.setItem("petshop_custom_products", JSON.stringify(customList));

  loadStoredProducts();
  renderProducts();
  closeAddProductModal();
  alert(`Produk '${name}' berhasil ditambahkan ke katalog!`);
}

// PENGATURAN SPREADSHEET
function openSettingsModal() {
  document.getElementById("settings-modal").classList.remove("hidden");
}

function closeSettingsModal() {
  document.getElementById("settings-modal").classList.add("hidden");
}

function saveSettings() {
  const url = document.getElementById("setting-script-url").value.trim();
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

  try {
    const res = await fetch(`${scriptUrl}?action=products`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
      const custom = JSON.parse(localStorage.getItem("petshop_custom_products") || "[]");
      products = [...data.products, ...custom];
      renderProducts();
      alert(`Berhasil menyinkronkan ${data.products.length} produk dari Google Spreadsheet!`);
    }
  } catch (err) {
    console.warn("Gagal sync:", err);
  }
}

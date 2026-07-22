let selectedPaymentMethod = 'Cash';
let pendingRxProduct = null;
let pendingRxUnitDose = false;

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', () => {
    renderPosGrid();
    renderPosCart();
  });
  window.addEventListener('app-stock-updated', () => {
    renderPosGrid();
    renderPosCart();
  });

  const searchInput = document.getElementById('pos-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.filters.posSearch = e.target.value;
      renderPosGrid();
    });
  }

  const paymentBtns = document.querySelectorAll('.pos-payment-btn');
  paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentBtns.forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-600');
        b.classList.add('bg-slate-50', 'dark:bg-slate-800', 'text-slate-900', 'dark:text-slate-100');
      });
      btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-600');
      btn.classList.remove('bg-slate-50', 'dark:bg-slate-800');
      selectedPaymentMethod = btn.getAttribute('data-method') || 'Cash';
    });
  });

  const btnComplete = document.getElementById('btn-complete-sale');
  if (btnComplete) {
    btnComplete.addEventListener('click', completeSale);
  }

  const btnConfirmRx = document.getElementById('btn-confirm-rx');
  if (btnConfirmRx) {
    btnConfirmRx.addEventListener('click', confirmRxVerification);
  }

  const btnCancelRx = document.getElementById('btn-cancel-rx');
  if (btnCancelRx) {
    btnCancelRx.addEventListener('click', () => {
      pendingRxProduct = null;
      document.getElementById('modal-rx-warning')?.classList.add('hidden');
    });
  }

  const btnCloseInvoice = document.getElementById('btn-close-invoice');
  if (btnCloseInvoice) {
    btnCloseInvoice.addEventListener('click', () => {
      document.getElementById('modal-invoice-print')?.classList.add('hidden');
    });
  }
});

function renderPosGrid() {
  const container = document.getElementById('pos-medicine-grid');
  if (!container) return;

  const products = appState.products || [];
  const batches = appState.batches || [];
  const searchTerm = (appState.filters.posSearch || '').toLowerCase().trim();

  const stockMap = {};
  const priceMap = {};
  batches.forEach(b => {
    if (b.status === 'active' && b.current_quantity > 0) {
      stockMap[b.product_id] = (stockMap[b.product_id] || 0) + parseFloat(b.current_quantity || 0);
      priceMap[b.product_id] = b.selling_price;
    }
  });

  const filtered = products.filter(p => {
    if (!searchTerm) return true;
    const nameMatch = p.name.toLowerCase().includes(searchTerm);
    const barcodeMatch = (p.barcode || '').toLowerCase().includes(searchTerm);
    const catMatch = p.category.toLowerCase().includes(searchTerm);
    return nameMatch || barcodeMatch || catMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        <i data-lucide="package-search" class="w-10 h-10 mx-auto mb-2 opacity-60 stroke-1"></i>
        <p class="font-bold text-sm">No medicines found matching search query.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(p => {
    const totalQty = stockMap[p.id] || 0;
    const price = priceMap[p.id] || 0;
    const isOut = totalQty === 0;
    const taxRate = p.tax_rate !== undefined ? p.tax_rate : 18;
    const isBlister = p.pack_size > 1 || p.unit === 'Blister Pack';
    const packSize = p.pack_size || 10;
    const unitPrice = Math.round((price / packSize) * 100) / 100;

    return `
      <div onclick="${isOut || isBlister ? '' : `addToCart('${p.id}', false)`}" class="w-full p-4 rounded-2xl border ${isOut ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed' : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm hover:shadow-md'} transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4 min-w-0 flex-1">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
            ${p.image_url ? `<img src="${p.image_url}" alt="" class="w-full h-full object-cover" />` : `<i data-lucide="pill" class="w-6 h-6 text-emerald-600"></i>`}
          </div>
          <div class="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-extrabold text-base text-slate-900 dark:text-white truncate" title="${p.name}">${p.name}</h4>
                ${p.requires_prescription ? `
                  <span class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold font-mono">Rx</span>
                ` : `
                  <span class="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold font-mono">OTC</span>
                `}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">SKU: ${p.barcode} • GST: ${taxRate}%</p>
            </div>
            <div class="flex-shrink-0">
              <span class="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold uppercase">${p.category}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-6 sm:pl-4 sm:border-l border-slate-100 dark:border-slate-700/60 flex-shrink-0">
          <div class="text-left sm:text-right font-mono">
            <div class="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">${formatCurrency(price)}</div>
            <div class="text-xs font-bold ${isOut ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}">
              ${isOut ? 'Out of Stock' : `${Math.round(totalQty * 100) / 100} ${p.unit} left`}
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            ${isOut ? `
              <span class="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold text-xs font-mono">Sold Out</span>
            ` : isBlister ? `
              <button onclick="event.stopPropagation(); addToCart('${p.id}', false)" class="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap">
                + Pack (${formatCurrency(price)})
              </button>
              <button onclick="event.stopPropagation(); addToCart('${p.id}', true)" class="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap" title="Sell single tablet/dose from blister pack">
                + 1 Tab (${formatCurrency(unitPrice)})
              </button>
            ` : `
              <button onclick="event.stopPropagation(); addToCart('${p.id}', false)" class="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add to Cart
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function addToCart(productId, isUnitDose = false) {
  const prod = appState.products.find(p => p.id === productId);
  if (!prod) return;

  const stockMap = {};
  const priceMap = {};
  appState.batches.forEach(b => {
    if (b.product_id === productId && b.status === 'active' && b.current_quantity > 0) {
      stockMap[productId] = (stockMap[productId] || 0) + parseFloat(b.current_quantity || 0);
      if (!priceMap[productId]) priceMap[productId] = b.selling_price;
    }
  });

  const availablePacks = stockMap[productId] || 0;
  const packSize = prod.pack_size || 1;
  const availableUnits = isUnitDose ? (availablePacks * packSize) : availablePacks;

  if (availableUnits <= 0) {
    showToast('This item is out of stock.', 'error');
    return;
  }

  const existing = appState.cart.find(item => item.product_id === productId && item.is_unit_dose === isUnitDose);
  if (existing) {
    if (existing.quantity >= availableUnits) {
      showToast('Maximum available stock reached (' + Math.round(availableUnits * 100) / 100 + ').', 'warning');
      return;
    }
    existing.quantity += 1;
    existing.subtotal = existing.quantity * existing.unit_price;
    existing.tax_amount = (existing.subtotal * (existing.tax_rate || 0)) / 100;
    showToast('Increased quantity: ' + prod.name + (isUnitDose ? ' (Single Dose)' : ''), 'info');
    renderPosCart();
    return;
  }

  if (prod.requires_prescription) {
    pendingRxProduct = prod;
    pendingRxUnitDose = isUnitDose;
    const nameEl = document.getElementById('rx-medicine-name');
    const docSelect = document.getElementById('rx-doctor-select');
    if (nameEl) nameEl.textContent = prod.name + (isUnitDose ? ' (Single Dose / Tablet)' : ' (Full Pack)');
    if (docSelect && typeof refreshDoctorDropdowns === 'function') {
      refreshDoctorDropdowns();
    }
    document.getElementById('modal-rx-warning')?.classList.remove('hidden');
    return;
  }

  const basePrice = priceMap[productId] || 0;
  const unitPrice = isUnitDose ? (basePrice / packSize) : basePrice;
  const taxRate = prod.tax_rate !== undefined ? prod.tax_rate : 18;
  const taxAmount = (unitPrice * taxRate) / 100;

  appState.cart.push({
    id: 'cart-' + Date.now() + (isUnitDose ? '-unit' : '-pack'),
    product_id: productId,
    name: prod.name + (isUnitDose ? ' (Single Dose / Tab)' : ''),
    unit: isUnitDose ? 'Unit Dose' : prod.unit,
    unit_price: Math.round(unitPrice * 100) / 100,
    tax_rate: taxRate,
    quantity: 1,
    subtotal: Math.round(unitPrice * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    requires_prescription: false,
    vet_doctor_name: null,
    is_unit_dose: isUnitDose,
    pack_size: packSize
  });

  showToast('Added to cart: ' + prod.name + (isUnitDose ? ' (Single Dose / Tab)' : ''), 'success');
  renderPosCart();
}

function confirmRxVerification() {
  if (!pendingRxProduct) return;
  const docSelect = document.getElementById('rx-doctor-select');
  const doctorName = docSelect ? docSelect.value : (appState.vetDoctors[0] || 'Verified Vet Doctor');

  if (!doctorName) {
    showToast('Please select a prescribing veterinarian doctor.', 'error');
    return;
  }

  const productId = pendingRxProduct.id;
  const basePrice = appState.batches.find(b => b.product_id === productId && b.status === 'active')?.selling_price || 0;
  const packSize = pendingRxProduct.pack_size || 1;
  const isUnitDose = pendingRxUnitDose || false;
  const unitPrice = isUnitDose ? (basePrice / packSize) : basePrice;
  const taxRate = pendingRxProduct.tax_rate !== undefined ? pendingRxProduct.tax_rate : 18;
  const taxAmount = (unitPrice * taxRate) / 100;

  appState.cart.push({
    id: 'cart-' + Date.now() + (isUnitDose ? '-unit' : '-pack'),
    product_id: productId,
    name: pendingRxProduct.name + (isUnitDose ? ' (Single Dose / Tab)' : ''),
    unit: isUnitDose ? 'Unit Dose' : pendingRxProduct.unit,
    unit_price: Math.round(unitPrice * 100) / 100,
    tax_rate: taxRate,
    quantity: 1,
    subtotal: Math.round(unitPrice * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    requires_prescription: true,
    vet_doctor_name: doctorName,
    is_unit_dose: isUnitDose,
    pack_size: packSize
  });

  pendingRxProduct = null;
  pendingRxUnitDose = false;
  document.getElementById('modal-rx-warning')?.classList.add('hidden');
  showToast('Prescription verified by ' + doctorName, 'success');
  renderPosCart();
}

function renderPosCart() {
  const container = document.getElementById('pos-cart-items');
  const qtyEl = document.getElementById('pos-cart-qty');
  const subtotalEl = document.getElementById('pos-cart-subtotal');
  const taxEl = document.getElementById('pos-cart-tax');
  const totalEl = document.getElementById('pos-cart-total');
  if (!container) return;

  const cart = appState.cart || [];
  let totalQty = 0;
  let subtotalPayable = 0;
  let totalTaxPayable = 0;

  cart.forEach(item => {
    totalQty += item.quantity;
    const itemSub = item.quantity * item.unit_price;
    const itemTax = (itemSub * (item.tax_rate || 0)) / 100;
    item.subtotal = itemSub;
    item.tax_amount = itemTax;
    subtotalPayable += itemSub;
    totalTaxPayable += itemTax;
  });

  const netPayable = subtotalPayable + totalTaxPayable;

  if (qtyEl) qtyEl.textContent = totalQty;
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotalPayable);
  if (taxEl) taxEl.textContent = formatCurrency(totalTaxPayable);
  if (totalEl) totalEl.textContent = formatCurrency(netPayable);

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500 dark:text-slate-400">
        <i data-lucide="shopping-cart" class="w-10 h-10 mx-auto mb-2 opacity-40 stroke-1"></i>
        <p class="font-bold text-xs">Cart is empty. Click or scan SKUs to add items.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="py-3.5 flex items-center justify-between gap-3 font-sans border-b border-slate-100 dark:border-slate-800/60 last:border-0">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <h5 class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title="${item.name}">${item.name}</h5>
          ${item.requires_prescription ? `<span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-bold font-mono">Rx</span>` : ''}
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">${formatCurrency(item.unit_price)} / ${item.unit} (+${item.tax_rate || 0}% GST)</p>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 font-mono text-xs">
          <button onclick="updateCartQty('${item.id}', -1)" class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">-</button>
          <span class="px-2.5 font-bold">${item.quantity}</span>
          <button onclick="updateCartQty('${item.id}', 1)" class="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">+</button>
        </div>

        <button onclick="removeFromCart('${item.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function updateCartQty(cartItemId, delta) {
  const item = appState.cart.find(i => i.id === cartItemId || i.product_id === cartItemId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(item.id || item.product_id);
    return;
  }

  const stockMap = {};
  appState.batches.forEach(b => {
    if (b.product_id === item.product_id && b.status === 'active' && b.current_quantity > 0) {
      stockMap[item.product_id] = (stockMap[item.product_id] || 0) + parseFloat(b.current_quantity || 0);
    }
  });

  const availablePacks = stockMap[item.product_id] || 0;
  const packSize = item.pack_size || 1;
  const availableUnits = item.is_unit_dose ? (availablePacks * packSize) : availablePacks;

  if (newQty > availableUnits) {
    showToast('Cannot exceed total available stock (' + Math.round(availableUnits * 100) / 100 + ').', 'warning');
    return;
  }

  item.quantity = newQty;
  item.subtotal = item.quantity * item.unit_price;
  item.tax_amount = (item.subtotal * (item.tax_rate || 0)) / 100;
  renderPosCart();
}

function removeFromCart(cartItemId) {
  appState.cart = appState.cart.filter(i => i.id !== cartItemId && i.product_id !== cartItemId);
  renderPosCart();
}

function clearCart() {
  if (appState.cart.length === 0) return;
  appState.cart = [];
  renderPosCart();
  showToast('Checkout cart cleared.', 'info');
}

async function completeSale() {
  if (appState.cart.length === 0) {
    showToast('Please add items to cart before completing sale.', 'warning');
    return;
  }

  let subtotalAmount = 0;
  let totalTax = 0;
  let totalAmount = 0;
  let totalProfit = 0;
  let hasRx = false;
  let vetDoctor = null;

  const stockMap = {};
  appState.batches.forEach(b => {
    if (b.status === 'active' && b.current_quantity > 0) {
      stockMap[b.product_id] = (stockMap[b.product_id] || 0) + parseFloat(b.current_quantity || 0);
    }
  });

  for (const item of appState.cart) {
    const packSize = item.pack_size || 1;
    const packsNeeded = item.is_unit_dose ? (item.quantity / packSize) : item.quantity;
    if ((stockMap[item.product_id] || 0) < packsNeeded) {
      showToast('Insufficient stock for SKU: ' + item.name, 'error');
      return;
    }
    if (item.requires_prescription) {
      hasRx = true;
      vetDoctor = item.vet_doctor_name || vetDoctor;
    }
  }

  const now = new Date();
  const receiptNum = 'INV-' + now.getFullYear() + ('0' + (now.getMonth()+1)).slice(-2) + ('0' + now.getDate()).slice(-2) + '-' + Math.floor(100 + Math.random() * 900);
  const txnId = 'txn-' + Date.now();
  const cashier = appState.currentUser || { id: 'cashier-demo-id', full_name: 'Ali Raza' };

  const petSelect = document.getElementById('pos-pet-select');
  const selectedPetId = petSelect && petSelect.value ? petSelect.value : null;
  let customerName = 'Walk-in Client';
  let customerPhone = 'N/A';
  let petInfo = null;

  if (selectedPetId) {
    const pet = (appState.pets || []).find(p => p.id === selectedPetId);
    if (pet) {
      const owner = (appState.owners || []).find(o => o.id === pet.owner_id);
      if (owner) {
        customerName = owner.name;
        customerPhone = owner.phone;
        petInfo = { pet_id: pet.id, pet_name: pet.name, pet_species: pet.species, owner_id: owner.id, owner_name: owner.name, owner_phone: owner.phone };
      }
    }
  }

  const transactionItems = [];
  appState.cart.forEach(item => {
    const itemSub = item.quantity * item.unit_price;
    const itemTax = (itemSub * (item.tax_rate || 0)) / 100;
    subtotalAmount += itemSub;
    totalTax += itemTax;

    const packSize = item.pack_size || 1;
    let remainingPacks = item.is_unit_dose ? (item.quantity / packSize) : item.quantity;
    let remainingUnits = item.quantity;

    const activeBatches = appState.batches
      .filter(b => b.product_id === item.product_id && b.status === 'active' && b.current_quantity > 0)
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

    for (const batch of activeBatches) {
      if (remainingPacks <= 0) break;
      const deductPacks = Math.min(parseFloat(batch.current_quantity), remainingPacks);
      batch.current_quantity = Math.round((parseFloat(batch.current_quantity) - deductPacks) * 100) / 100;
      if (batch.current_quantity <= 0) batch.status = 'depleted';

      const deductUnits = item.is_unit_dose ? Math.round(deductPacks * packSize) : deductPacks;
      const unitCost = item.is_unit_dose ? (batch.purchase_price / packSize) : batch.purchase_price;
      totalProfit += deductUnits * (item.unit_price - unitCost);

      transactionItems.push({
        product_id: item.product_id,
        name: item.name,
        quantity: deductUnits,
        unit: item.unit,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0,
        subtotal: Math.round((deductUnits * item.unit_price) * 100) / 100,
        tax_amount: Math.round(((deductUnits * item.unit_price * (item.tax_rate || 0)) / 100) * 100) / 100,
        is_unit_dose: item.is_unit_dose || false
      });
      remainingPacks = Math.round((remainingPacks - deductPacks) * 100) / 100;
    }
  });

  totalAmount = subtotalAmount + totalTax;

  if (!navigator.onLine) {
    showToast('Network error: No internet connection. Cart preserved, please try again.', 'error');
    return;
  }

  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    try {
      const itemsPayload = appState.cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0
      }));

      const { data, error } = await supabaseClient.rpc('process_pos_checkout', {
        p_transaction_id: txnId,
        p_receipt_number: receiptNum,
        p_total_amount: totalAmount,
        p_net_profit: totalProfit,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_payment_method: selectedPaymentMethod,
        p_cashier_id: cashier.id,
        p_cashier_name: cashier.full_name,
        p_prescription_verified: hasRx,
        p_vet_doctor_name: vetDoctor,
        p_items: itemsPayload
      });

      if (error) throw error;
      if (typeof logAuditEvent === 'function') logAuditEvent('SALE_PROCESSED', 'POS checkout completed: ' + receiptNum + ' (' + formatCurrency(totalAmount) + ')', txnId);
      await loadInitialData();
      openInvoiceModal(txnId, receiptNum, cashier.full_name, selectedPaymentMethod, hasRx, vetDoctor, null, petInfo);
      appState.cart = [];
      renderPosCart();
      return;
    } catch (err) {
      if (!navigator.onLine || (err && (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('connection') || err.message?.includes('offline') || err.name === 'TypeError'))) {
        showToast('Network error: No internet connection. Cart preserved, please try again.', 'error');
      } else {
        showToast('Transaction error: ' + (err.message || 'Failed to complete sale. Cart preserved.'), 'error');
      }
      return;
    }
  }

  const newTxn = {
    id: txnId,
    receipt_number: receiptNum,
    subtotal_amount: subtotalAmount,
    total_tax: totalTax,
    total_amount: totalAmount,
    net_profit: totalProfit,
    customer_name: customerName,
    customer_phone: customerPhone,
    payment_method: selectedPaymentMethod,
    cashier_id: cashier.id,
    cashier_name: cashier.full_name,
    prescription_verified: hasRx,
    vet_doctor_name: vetDoctor,
    transaction_date: now.toISOString(),
    items: transactionItems
  };

  appState.transactions.unshift(newTxn);
  if (typeof logAuditEvent === 'function') logAuditEvent('SALE_PROCESSED', 'POS checkout completed: ' + receiptNum + ' (' + formatCurrency(totalAmount) + ')', txnId);
  playBeepSound(1046, 0.25);
  showToast('Sale Completed successfully! Invoice receipt generated.', 'success');

  openInvoiceModal(newTxn.id, receiptNum, cashier.full_name, selectedPaymentMethod, hasRx, vetDoctor, transactionItems, petInfo);
  appState.cart = [];
  renderPosCart();
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

function openInvoiceModal(txnId, receiptNum, cashierName, paymentMethod, hasRx, vetDoctor, cartSnapshot = null, petInfo = null) {
  const modal = document.getElementById('modal-invoice-print');
  if (!modal) return;

  const txn = appState.transactions.find(t => t.id === txnId);
  const items = cartSnapshot || (txn && txn.items ? txn.items : []);

  document.getElementById('inv-receipt-number').textContent = receiptNum;
  document.getElementById('inv-date-time').textContent = formatDate(new Date().toISOString()) + ' - ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('inv-cashier-name').textContent = 'Cashier: ' + cashierName;
  document.getElementById('inv-payment-method').textContent = paymentMethod;

  const crmSec = document.getElementById('inv-crm-section');
  if (crmSec) {
    if (petInfo || (txn && txn.customer_name && txn.customer_name !== 'Walk-in Client')) {
      crmSec.classList.remove('hidden');
      const pName = petInfo ? (petInfo.pet_name + ' [' + petInfo.pet_species + ']') : 'Patient Record';
      const oInfo = petInfo ? ('Owner: ' + petInfo.owner_name + ' (' + petInfo.owner_phone + ')') : ('Customer: ' + (txn.customer_name || 'N/A') + ' (' + (txn.customer_phone || 'N/A') + ')');
      document.getElementById('inv-pet-name').textContent = pName;
      document.getElementById('inv-owner-info').textContent = oInfo;
    } else {
      crmSec.classList.add('hidden');
    }
  }

  let totalSub = 0;
  let totalGST = 0;
  const tbody = document.getElementById('inv-items-tbody');
  if (tbody) {
    tbody.innerHTML = items.map(i => {
      const sub = (i.quantity || 1) * (i.unit_price || 0);
      const taxRate = i.tax_rate !== undefined ? i.tax_rate : 18;
      const tax = (sub * taxRate) / 100;
      totalSub += sub;
      totalGST += tax;
      return `
        <tr class="border-b border-slate-200">
          <td class="py-1.5 font-bold">
            <span class="block text-slate-900">${i.name || 'Medicine SKU'}</span>
            <span class="block text-[10px] text-slate-500 font-normal">GST (${taxRate}%): ${formatCurrency(tax)}</span>
          </td>
          <td class="py-1.5 text-center font-bold">${i.quantity}</td>
          <td class="py-1.5 text-right">${formatCurrency(i.unit_price)}</td>
          <td class="py-1.5 text-right font-bold">${formatCurrency(sub)}</td>
        </tr>
      `;
    }).join('');
  }

  const subtotalDisplay = txn && txn.subtotal_amount !== undefined ? txn.subtotal_amount : totalSub;
  const taxDisplay = txn && txn.total_tax !== undefined ? txn.total_tax : totalGST;
  const totalDisplay = txn && txn.total_amount !== undefined ? txn.total_amount : (subtotalDisplay + taxDisplay);

  document.getElementById('inv-subtotal').textContent = formatCurrency(subtotalDisplay);
  document.getElementById('inv-tax').textContent = formatCurrency(taxDisplay);
  document.getElementById('inv-total-amount').textContent = formatCurrency(totalDisplay);

  const rxSec = document.getElementById('inv-rx-section');
  if (rxSec) {
    if (hasRx && vetDoctor) {
      rxSec.classList.remove('hidden');
      document.getElementById('inv-doctor-name').textContent = vetDoctor;
    } else {
      rxSec.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

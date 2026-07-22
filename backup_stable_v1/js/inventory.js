let compressedImageBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', () => {
    renderInventory();
    refreshSupplierDropdowns();
    refreshDoctorDropdowns();
  });
  window.addEventListener('app-stock-updated', renderInventory);
  window.addEventListener('app-rbac-changed', renderInventory);

  const searchInput = document.getElementById('inv-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.filters.inventorySearch = e.target.value;
      renderInventory();
    });
  }

  const catFilter = document.getElementById('inv-category-filter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      appState.filters.inventoryCategory = e.target.value;
      renderInventory();
    });
  }

  const btnOpenAddProduct = document.getElementById('btn-open-add-product');
  if (btnOpenAddProduct) {
    btnOpenAddProduct.addEventListener('click', openAddProductModal);
  }

  const btnOpenAddBatch = document.getElementById('btn-open-add-batch');
  if (btnOpenAddBatch) {
    btnOpenAddBatch.addEventListener('click', () => openAddBatchModal());
  }

  const formAddProduct = document.getElementById('form-add-product');
  if (formAddProduct) {
    formAddProduct.addEventListener('submit', handleAddProductSubmit);
  }

  const formAddBatch = document.getElementById('form-add-batch');
  if (formAddBatch) {
    formAddBatch.addEventListener('submit', handleAddBatchSubmit);
  }

  const imgFileInput = document.getElementById('prod-image-file');
  if (imgFileInput) {
    imgFileInput.addEventListener('change', handleImageCompression);
  }

  const batchProdSelect = document.getElementById('batch-product-id');
  if (batchProdSelect) {
    batchProdSelect.addEventListener('change', (e) => {
      autoFillBatchPrices(e.target.value);
    });
  }

  const btnOpenAddSupplier = document.getElementById('btn-open-add-supplier');
  if (btnOpenAddSupplier) {
    btnOpenAddSupplier.addEventListener('click', () => {
      document.getElementById('modal-add-supplier')?.classList.remove('hidden');
    });
  }

  const formAddSupplier = document.getElementById('form-add-supplier');
  if (formAddSupplier) {
    formAddSupplier.addEventListener('submit', handleAddSupplierSubmit);
  }

  const btnOpenAddDoctor = document.getElementById('btn-open-add-doctor');
  if (btnOpenAddDoctor) {
    btnOpenAddDoctor.addEventListener('click', () => {
      document.getElementById('modal-add-doctor')?.classList.remove('hidden');
    });
  }

  const formAddDoctor = document.getElementById('form-add-doctor');
  if (formAddDoctor) {
    formAddDoctor.addEventListener('submit', handleAddDoctorSubmit);
  }
});

function renderInventory() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  const products = appState.products || [];
  const batches = appState.batches || [];
  const isAdmin = appState.currentUser && appState.currentUser.role === 'Admin';
  const searchTerm = (appState.filters.inventorySearch || '').toLowerCase().trim();
  const catTerm = appState.filters.inventoryCategory || 'ALL';

  const stockMap = {};
  const supplierMap = {};
  batches.forEach(b => {
    if (b.status === 'active' && b.current_quantity > 0) {
      stockMap[b.product_id] = (stockMap[b.product_id] || 0) + parseFloat(b.current_quantity || 0);
      supplierMap[b.product_id] = b.supplier_name;
    }
  });

  const filtered = products.filter(p => {
    if (catTerm !== 'ALL' && p.category !== catTerm) return false;
    if (!searchTerm) return true;
    const nameMatch = p.name.toLowerCase().includes(searchTerm);
    const barcodeMatch = (p.barcode || '').toLowerCase().includes(searchTerm);
    const catMatch = p.category.toLowerCase().includes(searchTerm);
    return nameMatch || barcodeMatch || catMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-16 text-center text-slate-500 dark:text-slate-400">
          <i data-lucide="folder-search" class="w-12 h-12 mx-auto mb-3 opacity-60 stroke-1"></i>
          <p class="font-bold text-base">No medicine SKUs found matching your filter criteria.</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const totalQty = stockMap[p.id] || 0;
    const isLow = totalQty <= (p.min_stock_level || 10);
    const supplier = supplierMap[p.id] || appState.suppliers[0] || 'Direct Distributor (Islamabad)';
    const defaultPrice = batches.find(b => b.product_id === p.id && b.status === 'active')?.selling_price || 0;

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
        <td class="py-4 px-6 font-semibold">
          <div class="flex items-center gap-3 min-w-[200px]">
            <div class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
              ${p.image_url ? `<img src="${p.image_url}" alt="" class="w-full h-full object-cover" />` : `<i data-lucide="pill" class="w-5 h-5 text-emerald-600"></i>`}
            </div>
            <div>
              <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100">${p.name}</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">SKU: ${p.barcode} • ${formatCurrency(defaultPrice)}</p>
            </div>
          </div>
        </td>
        <td class="py-4 px-6 text-center whitespace-nowrap">
          <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[6.5rem]">
            ${p.category}
          </span>
        </td>
        <td class="py-4 px-6 text-center whitespace-nowrap">
          ${p.requires_prescription ? `
            <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold font-mono whitespace-nowrap min-w-[4.5rem]">Rx Req</span>
          ` : `
            <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold font-mono whitespace-nowrap min-w-[4.5rem]">OTC</span>
          `}
        </td>
        <td class="py-4 px-6 text-center font-mono text-xs text-amber-600 dark:text-amber-400 font-bold whitespace-nowrap">
          ${p.tax_rate !== undefined ? p.tax_rate : 18}%
        </td>
        <td class="py-4 px-6 text-center font-mono text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
          ${p.min_stock_level} ${p.unit} ${p.pack_size > 1 ? `(${p.pack_size} tabs)` : ''}
        </td>
        <td class="py-4 px-6 text-center font-mono whitespace-nowrap">
          <span class="inline-flex items-center justify-center px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap min-w-[6rem] ${isLow ? (totalQty === 0 ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800') : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'}">
            ${Math.round(totalQty * 100) / 100} ${p.unit}
          </span>
        </td>
        <td class="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] font-medium">
          ${supplier}
        </td>
        <td class="py-4 px-6 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-2">
            <button onclick="openAddBatchModal('${p.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 text-xs font-semibold transition-colors flex items-center gap-1">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Batch
            </button>
            ${isAdmin ? `
              <button onclick="deleteProduct('${p.id}')" class="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors" title="Delete SKU">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function refreshSupplierDropdowns() {
  const supplierSelects = document.querySelectorAll('#batch-supplier');
  supplierSelects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = appState.suppliers.map(s => `
      <option value="${s}" ${s === currentVal ? 'selected' : ''}>${s}</option>
    `).join('');
  });
}

function refreshDoctorDropdowns() {
  const doctorSelects = document.querySelectorAll('#prod-vet-doctor, #rx-doctor-select');
  doctorSelects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = appState.vetDoctors.map(d => `
      <option value="${d}" ${d === currentVal ? 'selected' : ''}>${d}</option>
    `).join('');
  });
}

function handleAddSupplierSubmit(e) {
  e.preventDefault();
  const inputEl = document.getElementById('new-supplier-name');
  const name = inputEl ? inputEl.value.trim() : '';
  if (!name) return;

  if (!appState.suppliers.includes(name)) {
    appState.suppliers.unshift(name);
  }

  refreshSupplierDropdowns();
  const batchSupplierSelect = document.getElementById('batch-supplier');
  if (batchSupplierSelect) batchSupplierSelect.value = name;

  if (inputEl) inputEl.value = '';
  document.getElementById('modal-add-supplier')?.classList.add('hidden');
  showToast('Supplier registered: ' + name, 'success');
}

function handleAddDoctorSubmit(e) {
  e.preventDefault();
  const inputEl = document.getElementById('new-doctor-name');
  const name = inputEl ? inputEl.value.trim() : '';
  if (!name) return;

  if (!appState.vetDoctors.includes(name)) {
    appState.vetDoctors.unshift(name);
  }

  refreshDoctorDropdowns();
  const rxDocSelect = document.getElementById('rx-doctor-select');
  const prodDocSelect = document.getElementById('prod-vet-doctor');
  if (rxDocSelect) rxDocSelect.value = name;
  if (prodDocSelect) prodDocSelect.value = name;

  if (inputEl) inputEl.value = '';
  document.getElementById('modal-add-doctor')?.classList.add('hidden');
  showToast('Prescribing Vet Doctor added: ' + name, 'success');
}

async function handleImageCompression(e) {
  const file = e.target.files[0];
  const statusEl = document.getElementById('compression-status-text');
  if (!file) {
    compressedImageBase64 = null;
    if (statusEl) statusEl.textContent = '';
    return;
  }

  if (statusEl) statusEl.textContent = 'Compressing image client-side strictly <200KB...';

  try {
    const options = {
      maxSizeMB: 0.18,
      maxWidthOrHeight: 800,
      useWebWorker: true
    };
    const compressedFile = await imageCompression(file, options);
    const reader = new FileReader();
    reader.onload = function(evt) {
      compressedImageBase64 = evt.target.result;
      const sizeKB = Math.round(compressedFile.size / 1024);
      if (statusEl) statusEl.textContent = `Compressed successfully: ${sizeKB} KB (${compressedFile.type})`;
    };
    reader.readAsDataURL(compressedFile);
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Compression error: ' + err.message;
    compressedImageBase64 = null;
  }
}

function openAddProductModal() {
  const modal = document.getElementById('modal-add-product');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('form-add-product')?.reset();
  compressedImageBase64 = null;
  const statusEl = document.getElementById('compression-status-text');
  if (statusEl) statusEl.textContent = '';
  refreshDoctorDropdowns();

  const unitSelect = document.getElementById('prod-unit');
  const packSizeInput = document.getElementById('prod-pack-size');
  if (unitSelect && packSizeInput) {
    packSizeInput.value = (unitSelect.value === 'Blister Pack' || unitSelect.value === 'Pack') ? '10' : '1';
    unitSelect.onchange = () => {
      packSizeInput.value = (unitSelect.value === 'Blister Pack' || unitSelect.value === 'Pack') ? '10' : '1';
    };
  }
}

async function handleAddProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('prod-name').value.trim();
  const barcode = document.getElementById('prod-barcode').value.trim();
  const category = document.getElementById('prod-category').value;
  const unit = document.getElementById('prod-unit').value;
  const packSize = parseInt(document.getElementById('prod-pack-size')?.value) || 1;
  const minStock = parseInt(document.getElementById('prod-min-stock').value) || 10;
  const taxRate = parseFloat(document.getElementById('prod-tax-rate').value) || 0;
  const requiresRx = document.getElementById('prod-requires-rx').checked;
  const description = document.getElementById('prod-description').value.trim();

  const id = 'prod-' + Date.now();
  const newProduct = {
    id: id,
    barcode: barcode,
    name: name,
    category: category,
    unit: unit,
    pack_size: packSize,
    min_stock_level: minStock,
    tax_rate: taxRate,
    description: description,
    requires_prescription: requiresRx,
    image_url: compressedImageBase64 || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
  };

  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    const { error } = await supabaseClient.from('products').insert([newProduct]);
    if (error) {
      showToast('Supabase SKU error: ' + error.message, 'error');
      return;
    }
  }

  appState.products.push(newProduct);
  document.getElementById('modal-add-product')?.classList.add('hidden');
  if (typeof logAuditEvent === 'function') logAuditEvent('STOCK_LOSS', 'Registered new SKU: ' + name + ' (Barcode: ' + barcode + ')', id);
  showToast('Registered new SKU: ' + name + ' (GST: ' + taxRate + '%)', 'success');
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

function openAddBatchModal(preselectedProductId = null) {
  const modal = document.getElementById('modal-add-batch');
  if (!modal) return;
  modal.classList.remove('hidden');

  refreshSupplierDropdowns();

  const select = document.getElementById('batch-product-id');
  if (select) {
    select.innerHTML = appState.products.map(p => `
      <option value="${p.id}" ${p.id === preselectedProductId ? 'selected' : ''}>${p.name} (${p.barcode})</option>
    `).join('');

    const targetId = preselectedProductId || (appState.products[0] ? appState.products[0].id : null);
    if (targetId) autoFillBatchPrices(targetId);
  }

  const batchNum = document.getElementById('batch-number');
  if (batchNum) batchNum.value = 'BATCH-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

  const expDate = document.getElementById('batch-expiry-date');
  if (expDate) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    expDate.value = d.toISOString().split('T')[0];
  }
}

function autoFillBatchPrices(productId) {
  const latestBatch = appState.batches.find(b => b.product_id === productId);
  const pPrice = document.getElementById('batch-purchase-price');
  const sPrice = document.getElementById('batch-selling-price');
  const supplierSelect = document.getElementById('batch-supplier');

  if (latestBatch) {
    if (pPrice) pPrice.value = latestBatch.purchase_price;
    if (sPrice) sPrice.value = latestBatch.selling_price;
    if (supplierSelect) supplierSelect.value = latestBatch.supplier_name || appState.suppliers[0];
  } else {
    if (pPrice) pPrice.value = '1200.00';
    if (sPrice) sPrice.value = '1850.00';
    if (supplierSelect) supplierSelect.value = appState.suppliers[0] || 'BioVet Pakistan Pharma (Islamabad)';
  }
}

async function handleAddBatchSubmit(e) {
  e.preventDefault();
  const productId = document.getElementById('batch-product-id').value;
  const batchNum = document.getElementById('batch-number').value.trim();
  const supplier = document.getElementById('batch-supplier').value || appState.suppliers[0] || 'BioVet Pakistan Pharma (Islamabad)';
  const pPrice = parseFloat(document.getElementById('batch-purchase-price').value) || 0;
  const sPrice = parseFloat(document.getElementById('batch-selling-price').value) || 0;
  const qty = parseInt(document.getElementById('batch-quantity').value) || 1;
  const expDate = document.getElementById('batch-expiry-date').value;

  const id = 'batch-' + Date.now();
  const newBatch = {
    id: id,
    product_id: productId,
    batch_number: batchNum,
    supplier_name: supplier,
    purchase_price: pPrice,
    selling_price: sPrice,
    initial_quantity: qty,
    current_quantity: qty,
    expiry_date: expDate,
    received_date: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    const { error } = await supabaseClient.from('stock_batches').insert([newBatch]);
    if (error) {
      showToast('Supabase Batch error: ' + error.message, 'error');
      return;
    }
  }

  appState.batches.push(newBatch);
  document.getElementById('modal-add-batch')?.classList.add('hidden');
  if (typeof logAuditEvent === 'function') logAuditEvent('STOCK_LOSS', 'Received stock batch: ' + batchNum + ' (' + qty + ' units) from ' + supplier, id);
  showToast('Received stock batch: ' + batchNum + ' (' + qty + ' units)', 'success');
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

async function deleteProduct(productId) {
  if (!confirm('Are you certain you wish to delete this medicine SKU and all associated stock batches?')) return;

  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    const { error } = await supabaseClient.from('products').delete().eq('id', productId);
    if (error) {
      showToast('Error deleting SKU: ' + error.message, 'error');
      return;
    }
  }

  appState.products = appState.products.filter(p => p.id !== productId);
  appState.batches = appState.batches.filter(b => b.product_id !== productId);
  if (typeof logAuditEvent === 'function') logAuditEvent('STOCK_LOSS', 'Deleted SKU record and associated stock batches', productId);
  showToast('Product SKU deleted successfully.', 'info');
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

let compressedImageBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', () => {
    renderInventory();
    refreshSupplierDropdowns();
    refreshDoctorDropdowns();
  });
  window.addEventListener('app-stock-updated', renderInventory);
  window.addEventListener('app-rbac-changed', renderInventory);

  const searchInput = document.getElementById('inv-search-input') || document.getElementById('inventory-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.filters.inventorySearch = e.target.value;
      renderInventory();
    });
  }

  const catFilter = document.getElementById('inv-category-filter') || document.getElementById('inventory-category-filter');
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

  const formEditProduct = document.getElementById('form-edit-product');
  if (formEditProduct) {
    formEditProduct.addEventListener('submit', handleEditProductSubmit);
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
              <span class="block text-xs text-slate-500 dark:text-slate-400 font-mono">SKU: ${p.barcode}</span>
              <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">${formatCurrency(defaultPrice)}</span>
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
        <td class="py-4 px-6 text-right whitespace-nowrap min-w-[240px]">
          <div class="inline-flex items-center gap-2">
            <button onclick="openEditProductModal('${p.id}')" class="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-600 dark:text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit
            </button>
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
    select.innerHTML = appState.vetDoctors.map(d => {
      const name = typeof d === 'object' && d ? d.name : d;
      return `<option value="${name}" ${name === currentVal ? 'selected' : ''}>${name}</option>`;
    }).join('');
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
  if (typeof renderAdminView === 'function') renderAdminView();
  const batchSupplierSelect = document.getElementById('batch-supplier');
  if (batchSupplierSelect) batchSupplierSelect.value = name;

  if (inputEl) inputEl.value = '';
  document.getElementById('modal-add-supplier')?.classList.add('hidden');
  showToast('Supplier registered: ' + name, 'success');
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

function openSelectEditModal() {
  const modal = document.getElementById('modal-select-edit-inventory');
  if (!modal) return;
  const select = document.getElementById('select-edit-product-dropdown');
  if (select) {
    select.innerHTML = appState.products.map(p => {
      const stockMap = appState.batches.reduce((acc, b) => {
        if (b.product_id === p.id && b.status === 'active') acc += (b.current_quantity || 0);
        return acc;
      }, 0);
      return `<option value="${p.id}">${p.name} (${p.category} • SKU: ${p.barcode} • Stock: ${stockMap})</option>`;
    }).join('');
  }
  modal.classList.remove('hidden');
}

function closeSelectEditModal() {
  const modal = document.getElementById('modal-select-edit-inventory');
  if (modal) modal.classList.add('hidden');
}

function confirmSelectEditProduct() {
  const select = document.getElementById('select-edit-product-dropdown');
  if (!select || !select.value) return;
  closeSelectEditModal();
  openEditProductModal(select.value);
}

function openEditProductModal(productId) {
  const p = appState.products.find(item => item.id === productId);
  if (!p) return;
  const modal = document.getElementById('modal-edit-product');
  if (!modal) return;

  document.getElementById('edit-prod-id').value = p.id;
  document.getElementById('edit-prod-name').value = p.name || '';
  document.getElementById('edit-prod-barcode').value = p.barcode || '';
  document.getElementById('edit-prod-category').value = p.category || 'Antibiotics';
  document.getElementById('edit-prod-unit').value = p.unit || 'Blister Pack';
  document.getElementById('edit-prod-pack-size').value = p.pack_size || 1;
  document.getElementById('edit-prod-min-stock').value = p.min_stock_level || 10;
  document.getElementById('edit-prod-tax-rate').value = p.tax_rate !== undefined ? p.tax_rate : 18;
  document.getElementById('edit-prod-requires-rx').checked = !!p.requires_rx;
  document.getElementById('edit-prod-description').value = p.description || '';

  const vetSelect = document.getElementById('edit-prod-vet-doctor');
  if (vetSelect) {
    vetSelect.innerHTML = `<option value="">-- No Specific Vet --</option>` +
      (appState.vets || []).map(v => `<option value="${v.id}" ${p.vet_doctor === v.id ? 'selected' : ''}>${v.full_name || v.name}</option>`).join('');
  }

  const container = document.getElementById('edit-prod-batches-container');
  if (container) {
    const prodBatches = appState.batches.filter(b => b.product_id === p.id);
    if (prodBatches.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic py-2">No active stock batches found for this product.</p>`;
    } else {
      container.innerHTML = prodBatches.map(b => `
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
            <span class="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">Batch ID: ${b.batch_number || b.id}</span>
            <button type="button" onclick="removeEditBatch('${b.id}')" class="p-1 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-200 text-xs flex items-center gap-1">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove Batch
            </button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Batch Number</label>
              <input type="text" id="edit-batch-num-${b.id}" value="${b.batch_number || ''}" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Supplier</label>
              <input type="text" id="edit-batch-supplier-${b.id}" value="${b.supplier_name || ''}" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Purchase Price</label>
              <input type="number" step="0.01" id="edit-batch-pprice-${b.id}" value="${b.purchase_price || 0}" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Selling Price</label>
              <input type="number" step="0.01" id="edit-batch-sprice-${b.id}" value="${b.selling_price || 0}" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-600" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Current Stock Qty</label>
              <input type="number" id="edit-batch-qty-${b.id}" value="${b.current_quantity || 0}" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-indigo-600" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
              <input type="date" id="edit-batch-exp-${b.id}" value="${(b.expiry_date || '').split('T')[0]}" class="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold" />
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
  modal.classList.remove('hidden');
}

function closeEditProductModal() {
  const modal = document.getElementById('modal-edit-product');
  if (modal) modal.classList.add('hidden');
}

async function removeEditBatch(batchId) {
  if (!confirm('Are you sure you want to remove this stock batch?')) return;
  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    const { error } = await supabaseClient.from('stock_batches').delete().eq('id', batchId);
    if (error) {
      showToast('Error removing batch: ' + error.message, 'error');
      return;
    }
  }
  appState.batches = appState.batches.filter(b => b.id !== batchId);
  const prodId = document.getElementById('edit-prod-id')?.value;
  if (prodId) openEditProductModal(prodId);
  if (typeof logAuditEvent === 'function') logAuditEvent('STOCK_LOSS', 'Removed batch ID ' + batchId, prodId);
  showToast('Batch removed successfully', 'info');
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

async function handleEditProductSubmit(e) {
  e.preventDefault();
  const productId = document.getElementById('edit-prod-id').value;
  const p = appState.products.find(item => item.id === productId);
  if (!p) return;

  p.name = document.getElementById('edit-prod-name').value.trim();
  p.barcode = document.getElementById('edit-prod-barcode').value.trim();
  p.category = document.getElementById('edit-prod-category').value;
  p.unit = document.getElementById('edit-prod-unit').value;
  p.pack_size = parseInt(document.getElementById('edit-prod-pack-size').value) || 1;
  p.min_stock_level = parseInt(document.getElementById('edit-prod-min-stock').value) || 10;
  p.tax_rate = parseFloat(document.getElementById('edit-prod-tax-rate').value) || 0;
  p.requires_rx = document.getElementById('edit-prod-requires-rx').checked;
  p.description = document.getElementById('edit-prod-description').value.trim();
  p.vet_doctor = document.getElementById('edit-prod-vet-doctor')?.value || null;

  const prodBatches = appState.batches.filter(b => b.product_id === p.id);
  for (const b of prodBatches) {
    const numEl = document.getElementById(`edit-batch-num-${b.id}`);
    const supEl = document.getElementById(`edit-batch-supplier-${b.id}`);
    const ppEl = document.getElementById(`edit-batch-pprice-${b.id}`);
    const spEl = document.getElementById(`edit-batch-sprice-${b.id}`);
    const qtyEl = document.getElementById(`edit-batch-qty-${b.id}`);
    const expEl = document.getElementById(`edit-batch-exp-${b.id}`);

    if (numEl) b.batch_number = numEl.value.trim();
    if (supEl) b.supplier_name = supEl.value.trim();
    if (ppEl) b.purchase_price = parseFloat(ppEl.value) || 0;
    if (spEl) b.selling_price = parseFloat(spEl.value) || 0;
    if (qtyEl) {
      b.current_quantity = parseInt(qtyEl.value) || 0;
      b.initial_quantity = Math.max(b.initial_quantity || 0, b.current_quantity);
    }
    if (expEl) b.expiry_date = expEl.value;

    if (appState.mode === 'SUPABASE' && window.supabaseClient) {
      await supabaseClient.from('stock_batches').update({
        batch_number: b.batch_number,
        supplier_name: b.supplier_name,
        purchase_price: b.purchase_price,
        selling_price: b.selling_price,
        current_quantity: b.current_quantity,
        expiry_date: b.expiry_date
      }).eq('id', b.id);
    }
  }

  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    await supabaseClient.from('products').update({
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      unit: p.unit,
      pack_size: p.pack_size,
      min_stock_level: p.min_stock_level,
      tax_rate: p.tax_rate,
      requires_rx: p.requires_rx,
      description: p.description,
      vet_doctor: p.vet_doctor
    }).eq('id', p.id);
  }

  closeEditProductModal();
  if (typeof logAuditEvent === 'function') logAuditEvent('INVENTORY_EDITED', 'Edited product SKU details and stock batches for ' + p.name, p.id);
  showToast('Product and stock changes saved successfully!', 'success');
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

window.openSelectEditModal = openSelectEditModal;
window.closeSelectEditModal = closeSelectEditModal;
window.confirmSelectEditProduct = confirmSelectEditProduct;
window.openEditProductModal = openEditProductModal;
window.closeEditProductModal = closeEditProductModal;
window.removeEditBatch = removeEditBatch;

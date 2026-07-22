let activeEditingTxnId = null;
let editingItemsSnapshot = [];

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', () => {
    renderSales();
    renderAdminAlerts();
  });
  window.addEventListener('app-stock-updated', () => {
    renderSales();
    renderAdminAlerts();
  });
  window.addEventListener('app-rbac-changed', () => {
    renderAdminAlerts();
  });

  const searchInput = document.getElementById('sales-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.filters.salesSearch = e.target.value;
      renderSales();
    });
  }

  const btnSaveEdit = document.getElementById('btn-save-edited-sale');
  if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', saveEditedSale);
  }

  const btnAdminAlerts = document.getElementById('btn-admin-alerts');
  if (btnAdminAlerts) {
    btnAdminAlerts.addEventListener('click', () => {
      renderAdminAlerts();
      document.getElementById('modal-admin-alerts')?.classList.remove('hidden');
    });
  }

  const btnMarkAllChecked = document.getElementById('btn-mark-all-checked');
  if (btnMarkAllChecked) {
    btnMarkAllChecked.addEventListener('click', () => {
      if (appState.notifications) {
        appState.notifications.forEach(n => n.checked = true);
        localStorage.setItem('fahad_vet_notifications', JSON.stringify(appState.notifications));
      }
      renderAdminAlerts();
      if (typeof logAuditEvent === 'function') logAuditEvent('ALERT_CHECKED', 'Admin marked all modification alerts as checked');
      showToast('All audit alerts marked as checked!', 'success');
    });
  }
});

function closeAdminAlertsModal(acknowledge = false) {
  if (acknowledge && appState.notifications) {
    appState.notifications.forEach(n => n.checked = true);
    localStorage.setItem('fahad_vet_notifications', JSON.stringify(appState.notifications));
    renderAdminAlerts();
    if (typeof logAuditEvent === 'function') logAuditEvent('ALERT_CHECKED', 'Admin acknowledged and closed modification alerts');
    showToast('Audit alerts acknowledged and marked checked.', 'success');
  }
  document.getElementById('modal-admin-alerts')?.classList.add('hidden');
}
window.closeAdminAlertsModal = closeAdminAlertsModal;

function renderSales() {
  const tbody = document.getElementById('sales-tbody');
  if (!tbody) return;

  const transactions = appState.transactions || [];
  const searchTerm = (appState.filters.salesSearch || '').toLowerCase().trim();
  const todayStr = new Date().toISOString().split('T')[0];

  let todayRev = 0;
  let todayCount = 0;
  let todayUnits = 0;

  transactions.forEach(t => {
    const isToday = (t.transaction_date || '').startsWith(todayStr);
    if (isToday) {
      todayRev += parseFloat(t.total_amount) || 0;
      todayCount += 1;
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach(i => {
          todayUnits += parseInt(i.quantity) || 0;
        });
      } else {
        todayUnits += 1;
      }
    }
  });

  const revEl = document.getElementById('sales-today-revenue');
  const countEl = document.getElementById('sales-today-count');
  const unitsEl = document.getElementById('sales-today-units');

  if (revEl) revEl.textContent = formatCurrency(todayRev);
  if (countEl) countEl.textContent = `${todayCount} Invoices`;
  if (unitsEl) unitsEl.textContent = `${todayUnits} Units`;

  const filtered = transactions.filter(t => {
    if (!searchTerm) return true;
    const recMatch = (t.receipt_number || '').toLowerCase().includes(searchTerm);
    const custMatch = (t.customer_name || '').toLowerCase().includes(searchTerm);
    const cashMatch = (t.cashier_name || '').toLowerCase().includes(searchTerm);
    return recMatch || custMatch || cashMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-16 text-center text-slate-500 dark:text-slate-400">
          <i data-lucide="receipt" class="w-12 h-12 mx-auto mb-3 opacity-60 stroke-1"></i>
          <p class="font-bold text-base">No sales transactions found matching your criteria.</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    let itemsDesc = '1 item';
    if (t.items && Array.isArray(t.items)) {
      itemsDesc = t.items.map(i => `${i.name || 'SKU'} (x${i.quantity})`).join(', ');
    }

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
        <td class="py-4 px-6 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
          ${t.receipt_number}
        </td>
        <td class="py-4 px-6 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
          ${formatDate(t.transaction_date)}
        </td>
        <td class="py-4 px-6 text-sm font-bold text-slate-900 dark:text-slate-100">
          <div>${t.customer_name}</div>
          <div class="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-[220px]">${itemsDesc}</div>
          ${t.prescription_verified ? `<div class="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">Rx: ${t.vet_doctor_name || 'Verified Vet'}</div>` : ''}
        </td>
        <td class="py-4 px-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
          ${t.cashier_name || 'Ali Raza (Cashier)'}
        </td>
        <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300">
          <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">${t.payment_method}</span>
        </td>
        <td class="py-4 px-6 text-right font-mono text-sm font-extrabold text-slate-900 dark:text-white">
          ${formatCurrency(t.total_amount)}
        </td>
        <td class="py-4 px-6 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-2">
            <button onclick="openEditSaleModal('${t.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 text-xs font-semibold transition-colors flex items-center gap-1">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Sale
            </button>
            ${appState.currentUser && appState.currentUser.role === 'Admin' ? `
              <button onclick="voidTransaction('${t.id}')" class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1" title="Void Sale & Restore Stock">
                <i data-lucide="ban" class="w-3.5 h-3.5"></i> Void Sale
              </button>
            ` : ''}
            <button onclick="reprintReceipt('${t.id}')" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors" title="Reprint Receipt">
              <i data-lucide="printer" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openEditSaleModal(txnId) {
  const txn = appState.transactions.find(t => t.id === txnId);
  if (!txn) return;

  activeEditingTxnId = txnId;
  editingItemsSnapshot = JSON.parse(JSON.stringify(txn.items || []));

  document.getElementById('edit-sale-receipt').textContent = txn.receipt_number;
  renderEditSaleItems();
  document.getElementById('modal-edit-sale')?.classList.remove('hidden');
}

function renderEditSaleItems() {
  const container = document.getElementById('edit-sale-items-list');
  const totalEl = document.getElementById('edit-sale-total');
  if (!container) return;

  let totalPayable = 0;
  editingItemsSnapshot.forEach(item => {
    const sub = item.quantity * item.unit_price;
    const tax = (sub * (item.tax_rate || 0)) / 100;
    totalPayable += (sub + tax);
  });

  if (totalEl) totalEl.textContent = formatCurrency(totalPayable);

  if (editingItemsSnapshot.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-500 dark:text-slate-400">
        <p class="font-bold text-xs">No items left in invoice. Saving will void this sale and restore all stock.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = editingItemsSnapshot.map((item, idx) => `
    <div class="py-3 flex items-center justify-between gap-3 font-sans">
      <div class="min-w-0 flex-1">
        <h5 class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">${item.name || 'Medicine SKU'}</h5>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">${formatCurrency(item.unit_price)} each (+${item.tax_rate || 0}% GST)</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 font-mono text-xs">
          <button onclick="updateEditItemQty(${idx}, -1)" class="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold">-</button>
          <span class="px-3 font-bold">${item.quantity}</span>
          <button onclick="updateEditItemQty(${idx}, 1)" class="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold">+</button>
        </div>
        <button onclick="removeEditItem(${idx})" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function updateEditItemQty(index, delta) {
  const item = editingItemsSnapshot[index];
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeEditItem(index);
    return;
  }

  if (delta > 0) {
    const stockMap = {};
    appState.batches.forEach(b => {
      if (b.product_id === item.product_id && b.status === 'active' && b.current_quantity > 0) {
        stockMap[item.product_id] = (stockMap[item.product_id] || 0) + parseInt(b.current_quantity || 0);
      }
    });
    const available = stockMap[item.product_id] || 0;
    if (available < delta) {
      showToast('Cannot add more quantity. Insufficient stock in batches.', 'warning');
      return;
    }
  }

  item.quantity = newQty;
  item.subtotal = item.quantity * item.unit_price;
  item.tax_amount = (item.subtotal * (item.tax_rate || 0)) / 100;
  renderEditSaleItems();
}

function removeEditItem(index) {
  editingItemsSnapshot.splice(index, 1);
  renderEditSaleItems();
}

function saveEditedSale() {
  if (!activeEditingTxnId) return;
  const txn = appState.transactions.find(t => t.id === activeEditingTxnId);
  if (!txn) return;

  const oldItemsMap = {};
  (txn.items || []).forEach(i => {
    oldItemsMap[i.product_id] = (oldItemsMap[i.product_id] || 0) + i.quantity;
  });

  const newItemsMap = {};
  editingItemsSnapshot.forEach(i => {
    newItemsMap[i.product_id] = (newItemsMap[i.product_id] || 0) + i.quantity;
  });

  const allProductIds = new Set([...Object.keys(oldItemsMap), ...Object.keys(newItemsMap)]);
  const auditDetails = [];

  allProductIds.forEach(prodId => {
    const oldQty = oldItemsMap[prodId] || 0;
    const newQty = newItemsMap[prodId] || 0;
    const delta = oldQty - newQty;

    if (delta !== 0) {
      const prod = appState.products.find(p => p.id === prodId) || { name: 'Unknown SKU' };
      if (delta > 0) {
        const targetBatch = appState.batches.find(b => b.product_id === prodId) || appState.batches[0];
        if (targetBatch) {
          targetBatch.current_quantity += delta;
          if (targetBatch.status === 'depleted' && targetBatch.current_quantity > 0) {
            targetBatch.status = 'active';
          }
        }
        auditDetails.push(`Restored +${delta} units of ${prod.name} back to stock`);
      } else if (delta < 0) {
        let deductNeeded = Math.abs(delta);
        const activeBatches = appState.batches
          .filter(b => b.product_id === prodId && b.status === 'active' && b.current_quantity > 0)
          .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

        for (const batch of activeBatches) {
          if (deductNeeded <= 0) break;
          const take = Math.min(batch.current_quantity, deductNeeded);
          batch.current_quantity -= take;
          if (batch.current_quantity <= 0) batch.status = 'depleted';
          deductNeeded -= take;
        }
        auditDetails.push(`Deducted ${Math.abs(delta)} units of ${prod.name}`);
      }
    }
  });

  let newSubtotal = 0;
  let newTax = 0;
  editingItemsSnapshot.forEach(i => {
    const sub = i.quantity * i.unit_price;
    const tax = (sub * (i.tax_rate || 0)) / 100;
    newSubtotal += sub;
    newTax += tax;
  });

  txn.items = JSON.parse(JSON.stringify(editingItemsSnapshot));
  txn.subtotal_amount = newSubtotal;
  txn.total_tax = newTax;
  txn.total_amount = newSubtotal + newTax;

  if (auditDetails.length > 0) {
    const modifierName = appState.currentUser ? `${appState.currentUser.full_name} (${appState.currentUser.role})` : 'Staff Member';
    appState.notifications.unshift({
      id: 'notif-' + Date.now(),
      timestamp: new Date().toISOString(),
      cashier_name: modifierName,
      action: `Modified Sale ${txn.receipt_number}: ${auditDetails.join('; ')}`,
      checked: false
    });
    localStorage.setItem('fahad_vet_notifications', JSON.stringify(appState.notifications));
    if (typeof logAuditEvent === 'function') logAuditEvent('SALE_EDITED', 'Modified Sale ' + txn.receipt_number + ': ' + auditDetails.join('; '), txn.id);

    if (appState.currentUser && appState.currentUser.role === 'Cashier') {
      showToast('Sale modified! Stock updated automatically. Admin has been notified of these changes.', 'info');
    } else {
      showToast('Sale modified successfully. Stock inventory adjusted.', 'success');
    }
  } else {
    showToast('No net changes made to item quantities.', 'info');
  }

  document.getElementById('modal-edit-sale')?.classList.add('hidden');
  activeEditingTxnId = null;
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}

function reprintReceipt(txnId) {
  const txn = appState.transactions.find(t => t.id === txnId);
  if (!txn) return;
  openInvoiceModal(
    txn.id,
    txn.receipt_number,
    txn.cashier_name || 'Ali Raza (Cashier)',
    txn.payment_method || 'Cash',
    txn.prescription_verified || false,
    txn.vet_doctor_name || null,
    txn.items || []
  );
}

function cleanExpiredNotifications() {
  if (!appState.notifications || !Array.isArray(appState.notifications)) return;
  const todayStr = new Date().toDateString();
  const beforeLen = appState.notifications.length;
  appState.notifications = appState.notifications.filter(n => {
    if (!n.timestamp) return false;
    try {
      return new Date(n.timestamp).toDateString() === todayStr;
    } catch (err) {
      return false;
    }
  });
  if (appState.notifications.length !== beforeLen) {
    localStorage.setItem('fahad_vet_notifications', JSON.stringify(appState.notifications));
  }
}

function renderAdminAlerts() {
  const saved = localStorage.getItem('fahad_vet_notifications');
  if (saved) {
    try {
      appState.notifications = JSON.parse(saved);
    } catch (err) {}
  }

  cleanExpiredNotifications();

  const btnEl = document.getElementById('btn-admin-alerts');
  const countEl = document.getElementById('header-alert-count');
  const listEl = document.getElementById('admin-alerts-list');

  const notifs = appState.notifications || [];
  const isAdmin = appState.currentUser && appState.currentUser.role === 'Admin';
  const unreadCount = notifs.filter(n => !n.checked).length;

  if (btnEl) {
    if (isAdmin && notifs.length > 0) {
      btnEl.classList.remove('hidden');
      if (unreadCount > 0) {
        btnEl.classList.add('animate-pulse');
        if (countEl) {
          countEl.textContent = unreadCount;
          countEl.className = 'font-mono px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] shadow-sm';
          countEl.classList.remove('hidden');
        }
      } else {
        btnEl.classList.remove('animate-pulse');
        if (countEl) {
          countEl.textContent = '0';
          countEl.classList.add('hidden');
        }
      }
    } else {
      btnEl.classList.add('hidden');
    }
  }

  if (listEl) {
    if (notifs.length === 0) {
      listEl.innerHTML = `
        <div class="py-12 text-center text-slate-500 dark:text-slate-400">
          <i data-lucide="shield-check" class="w-10 h-10 mx-auto mb-2 opacity-60 stroke-1 text-emerald-500"></i>
          <p class="font-bold text-xs">No modification alerts recorded.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = notifs.map(n => `
        <div class="py-3.5 flex items-start justify-between gap-4 font-sans">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-bold text-xs font-mono">${n.cashier_name}</span>
              <span class="text-xs text-slate-400 font-mono">${formatDate(n.timestamp)}</span>
              <span class="px-2 py-0.5 rounded ${n.checked ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'} font-bold text-[10px] uppercase font-mono">${n.checked ? 'Checked' : 'New Alert'}</span>
            </div>
            <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">${n.action}</p>
          </div>
        </div>
      `).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
}

async function voidTransaction(transactionId) {
  const user = appState.currentUser;
  if (!user || user.role !== 'Admin') {
    showToast('Void Sale operation is restricted to Admin role.', 'error');
    return;
  }

  const txn = (appState.transactions || []).find(t => t.id === transactionId);
  if (!txn) {
    showToast('Transaction record not found.', 'error');
    return;
  }

  if (!confirm('Are you sure you want to VOID invoice ' + txn.receipt_number + '? This will restore all sold item quantities back into active stock batches and delete the transaction.')) {
    return;
  }

  let itemsSnapshot = txn.items || [];
  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    try {
      const { data: dbItems, error: itemsErr } = await supabaseClient.from('transaction_items').select('*').eq('transaction_id', transactionId);
      if (!itemsErr && dbItems && dbItems.length > 0) {
        itemsSnapshot = dbItems;
      }
    } catch (e) {}
  }

  itemsSnapshot.forEach(item => {
    const qty = parseInt(item.quantity) || 0;
    if (qty <= 0) return;

    if (item.batch_id) {
      const batch = (appState.batches || []).find(b => b.id === item.batch_id);
      if (batch) {
        batch.current_quantity = parseFloat(batch.current_quantity || 0) + qty;
        if (batch.status === 'depleted' && batch.current_quantity > 0) {
          batch.status = 'active';
        }
        if (appState.mode === 'SUPABASE' && window.supabaseClient) {
          supabaseClient.from('stock_batches').update({
            current_quantity: batch.current_quantity,
            status: batch.status
          }).eq('id', batch.id).then(() => {}).catch(() => {});
        }
      }
    } else if (item.product_id) {
      const activeBatches = (appState.batches || [])
        .filter(b => b.product_id === item.product_id && (b.status === 'active' || b.status === 'depleted'))
        .sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date));

      if (activeBatches.length > 0) {
        const targetBatch = activeBatches[0];
        targetBatch.current_quantity = parseFloat(targetBatch.current_quantity || 0) + qty;
        if (targetBatch.status === 'depleted' && targetBatch.current_quantity > 0) {
          targetBatch.status = 'active';
        }
        if (appState.mode === 'SUPABASE' && window.supabaseClient) {
          supabaseClient.from('stock_batches').update({
            current_quantity: targetBatch.current_quantity,
            status: targetBatch.status
          }).eq('id', targetBatch.id).then(() => {}).catch(() => {});
        }
      }
    }
  });

  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    try {
      await supabaseClient.from('transaction_items').delete().eq('transaction_id', transactionId);
      const { error: delErr } = await supabaseClient.from('transactions').delete().eq('id', transactionId);
      if (delErr) throw delErr;
    } catch (err) {
      showToast('Error deleting transaction from database: ' + err.message, 'error');
      return;
    }
  }

  appState.transactions = (appState.transactions || []).filter(t => t.id !== transactionId);

  if (typeof logAuditEvent === 'function') {
    logAuditEvent('SALE_VOIDED', 'Admin voided sale receipt ' + txn.receipt_number + ' (' + formatCurrency(txn.total_amount) + ') and restored stock quantities.', transactionId);
  }

  showToast('Sale voided successfully. Stock restored.', 'success');
  renderSales();
  window.dispatchEvent(new CustomEvent('app-stock-updated'));
}
window.voidTransaction = voidTransaction;

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', renderDashboard);
  window.addEventListener('app-stock-updated', renderDashboard);
});

function renderDashboard() {
  const products = appState.products || [];
  const batches = appState.batches || [];

  const totalSkusEl = document.getElementById('kpi-total-skus');
  if (totalSkusEl) totalSkusEl.textContent = products.length;

  let totalValuation = 0;
  const stockMap = {};

  batches.forEach(b => {
    if (b.status === 'active' && b.current_quantity > 0) {
      totalValuation += parseFloat(b.purchase_price || 0) * parseInt(b.current_quantity || 0);
      stockMap[b.product_id] = (stockMap[b.product_id] || 0) + parseInt(b.current_quantity || 0);
    }
  });

  const stockValueEl = document.getElementById('kpi-stock-value');
  if (stockValueEl) stockValueEl.textContent = formatCurrency(totalValuation);

  const lowStockItems = products.filter(p => {
    const currentQty = stockMap[p.id] || 0;
    return currentQty <= (p.min_stock_level || 10);
  });

  const lowCountEl = document.getElementById('kpi-low-count');
  const badgeLowEl = document.getElementById('badge-dash-low');
  const headerLowEl = document.getElementById('header-low-count');
  if (lowCountEl) lowCountEl.textContent = lowStockItems.length;
  if (badgeLowEl) badgeLowEl.textContent = `${lowStockItems.length} SKUs`;
  if (headerLowEl) headerLowEl.textContent = lowStockItems.length;

  const lowStockContainer = document.getElementById('dashboard-low-stock-list');
  if (lowStockContainer) {
    if (lowStockItems.length === 0) {
      lowStockContainer.innerHTML = `
        <div class="py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          <i data-lucide="check-circle-2" class="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80 stroke-1"></i>
          <p class="font-bold text-base">All product stocks are healthy above minimum levels.</p>
        </div>
      `;
    } else {
      lowStockContainer.innerHTML = lowStockItems.map(p => {
        const currentQty = stockMap[p.id] || 0;
        const isZero = currentQty === 0;
        return `
          <div class="p-4 rounded-2xl border ${isZero ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'} flex items-center justify-between gap-4 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl ${isZero ? 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'} flex items-center justify-center flex-shrink-0 font-bold font-mono text-xs">
                ${isZero ? '0' : currentQty}
              </div>
              <div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100">${p.name}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">Barcode: ${p.barcode} • Min Threshold: ${p.min_stock_level} ${p.unit}</p>
              </div>
            </div>
            <button onclick="switchAndAddBatch('${p.id}')" class="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs whitespace-nowrap hover:opacity-90 transition-opacity">
              + Restock
            </button>
          </div>
        `;
      }).join('');
    }
  }

  const now = new Date();
  const sevenMonthsMs = 210 * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(now.getTime() + sevenMonthsMs);

  const expiringBatches = batches.filter(b => {
    if (b.status !== 'active' || b.current_quantity <= 0) return false;
    const exp = new Date(b.expiry_date);
    return exp <= cutoffDate;
  }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  const expCountEl = document.getElementById('kpi-expiry-count');
  const badgeExpEl = document.getElementById('badge-dash-expiry');
  const headerExpEl = document.getElementById('header-exp-count');
  if (expCountEl) expCountEl.textContent = expiringBatches.length;
  if (badgeExpEl) badgeExpEl.textContent = `${expiringBatches.length} Batches`;
  if (headerExpEl) headerExpEl.textContent = expiringBatches.length;

  const expiryContainer = document.getElementById('dashboard-expiry-list');
  if (expiryContainer) {
    if (expiringBatches.length === 0) {
      expiryContainer.innerHTML = `
        <div class="py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          <i data-lucide="shield-check" class="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80 stroke-1"></i>
          <p class="font-bold text-base">No active batches expiring within the next 7 months.</p>
        </div>
      `;
    } else {
      expiryContainer.innerHTML = expiringBatches.map(b => {
        const prod = products.find(p => p.id === b.product_id) || { name: 'Unknown SKU', unit: 'Units' };
        const expDate = new Date(b.expiry_date);
        const daysRemaining = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        const isAlreadyExpired = daysRemaining <= 0;
        const isCritical = daysRemaining <= 60 && !isAlreadyExpired;

        return `
          <div class="p-4 rounded-2xl border ${isAlreadyExpired ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : isCritical ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'} flex items-center justify-between gap-4 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl ${isAlreadyExpired ? 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300' : isCritical ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300'} flex items-center justify-center flex-shrink-0 font-bold font-mono text-xs">
                ${isAlreadyExpired ? 'EXP' : daysRemaining + 'd'}
              </div>
              <div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100">${prod.name}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">Batch: ${b.batch_number} • Qty: ${b.current_quantity} ${prod.unit} • Expires: ${formatDate(b.expiry_date)}</p>
              </div>
            </div>
            ${isAlreadyExpired ? `
              <span class="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs whitespace-nowrap shadow-sm">Expired</span>
            ` : `
              <span class="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 font-semibold text-xs whitespace-nowrap">${daysRemaining} Days Left</span>
            `}
          </div>
        `;
      }).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
}

function switchAndAddBatch(productId) {
  const invTab = document.querySelector('.nav-tab[data-view="inventory"]');
  if (invTab) invTab.click();
  setTimeout(() => {
    openAddBatchModal(productId);
  }, 150);
}

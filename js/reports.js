let financialChartInstance = null;
let categoryChartInstance = null;
let paymentChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', renderReports);
  window.addEventListener('app-rbac-changed', renderReports);
  window.addEventListener('app-stock-updated', renderReports);
  window.addEventListener('app-theme-changed', renderReports);

  const monthFilter = document.getElementById('reports-month-filter');
  if (monthFilter) {
    monthFilter.addEventListener('change', (e) => {
      appState.filters.reportMonth = e.target.value;
      renderReports();
    });
  }

  ['reports-ledger-search', 'reports-ledger-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderReports);
  });

  ['audit-trail-search', 'audit-trail-date', 'audit-filter-role'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderAuditTrail);
  });
});

function renderReports() {
  if (appState.currentUser && appState.currentUser.role !== 'Admin') return;
  const viewEl = document.getElementById('view-reports');
  if (!viewEl || viewEl.classList.contains('hidden')) return;

  const selectedMonth = appState.filters.reportMonth || '2026-07';
  const monthLabelEl = document.getElementById('reports-month-label');
  if (monthLabelEl) {
    const monthNames = { '2026-07': 'July 2026', '2026-06': 'June 2026', '2026-05': 'May 2026', 'ALL': 'All Time Historical' };
    monthLabelEl.textContent = monthNames[selectedMonth] || selectedMonth;
  }

  const transactions = appState.transactions || [];
  const losses = appState.stockLosses || [];

  const ledgerSearchEl = document.getElementById('reports-ledger-search');
  const ledgerSearchTerm = ledgerSearchEl ? ledgerSearchEl.value.toLowerCase().trim() : '';
  const ledgerDateEl = document.getElementById('reports-ledger-date');
  const ledgerDateFilter = ledgerDateEl ? ledgerDateEl.value : '';

  const filteredTxns = transactions.filter(t => {
    if (selectedMonth !== 'ALL' && !(t.transaction_date || '').startsWith(selectedMonth)) return false;
    if (ledgerDateFilter && !(t.transaction_date || '').startsWith(ledgerDateFilter)) return false;
    if (ledgerSearchTerm) {
      const refStr = (t.receipt_number || '').toLowerCase();
      const custStr = (t.customer_name || '').toLowerCase();
      const methStr = (t.payment_method || '').toLowerCase();
      const vetStr = (t.vet_doctor_name || '').toLowerCase();
      if (!refStr.includes(ledgerSearchTerm) && !custStr.includes(ledgerSearchTerm) && !methStr.includes(ledgerSearchTerm) && !vetStr.includes(ledgerSearchTerm)) {
        return false;
      }
    }
    return true;
  });

  const filteredLosses = losses.filter(l => {
    if (selectedMonth !== 'ALL' && !(l.reported_date || '').startsWith(selectedMonth)) return false;
    if (ledgerDateFilter && !(l.reported_date || '').startsWith(ledgerDateFilter)) return false;
    if (ledgerSearchTerm) {
      const prod = appState.products.find(p => p.id === l.product_id);
      const prodStr = prod ? prod.name.toLowerCase() : '';
      const reasonStr = (l.reason || '').toLowerCase();
      const idStr = (l.id || '').toLowerCase();
      if (!prodStr.includes(ledgerSearchTerm) && !reasonStr.includes(ledgerSearchTerm) && !idStr.includes(ledgerSearchTerm)) {
        return false;
      }
    }
    return true;
  });

  let periodRevenue = 0;
  let periodProfit = 0;
  let periodQtySold = 0;

  filteredTxns.forEach(t => {
    periodRevenue += parseFloat(t.total_amount) || 0;
    periodProfit += parseFloat(t.net_profit) || 0;
    if (t.items && Array.isArray(t.items)) {
      t.items.forEach(i => {
        periodQtySold += parseInt(i.quantity) || 0;
      });
    } else {
      periodQtySold += 1;
    }
  });

  let periodLossValue = 0;
  filteredLosses.forEach(l => {
    periodLossValue += parseFloat(l.total_loss_value) || 0;
  });

  const kpiRev = document.getElementById('report-kpi-revenue');
  const kpiProf = document.getElementById('report-kpi-profit');
  const kpiQty = document.getElementById('report-kpi-qty');
  const kpiLoss = document.getElementById('report-kpi-loss');

  if (kpiRev) kpiRev.textContent = formatCurrency(periodRevenue);
  if (kpiProf) kpiProf.textContent = formatCurrency(periodProfit);
  if (kpiQty) kpiQty.textContent = `${periodQtySold} units`;
  if (kpiLoss) kpiLoss.textContent = formatCurrency(periodLossValue);

  renderFinancialChart(transactions);
  renderCategoryChart(transactions);
  renderPaymentChart(transactions);

  const tbody = document.getElementById('reports-ledger-tbody');
  if (tbody) {
    const combinedLedger = [
      ...filteredTxns.map(t => ({
        type: 'SALE',
        id: t.id,
        reference: t.receipt_number,
        date: t.transaction_date,
        entity: t.customer_name + (t.prescription_verified ? ` (Rx: ${t.vet_doctor_name || 'Verified Vet'})` : ''),
        method: t.payment_method,
        cashier: t.cashier_name || 'Staff',
        hasRx: t.prescription_verified || false,
        vetDoctor: t.vet_doctor_name || '',
        gross: parseFloat(t.total_amount) || 0,
        net: parseFloat(t.net_profit) || 0
      })),
      ...filteredLosses.map(l => {
        const prod = appState.products.find(p => p.id === l.product_id);
        return {
          type: 'LOSS',
          id: l.id,
          reference: `LOSS-${(l.reason || 'expired').toUpperCase()}`,
          date: l.reported_date,
          entity: `${prod ? prod.name : 'Unknown SKU'} (${l.quantity_lost} units ${l.reason})`,
          method: 'Inventory Adjustment',
          cashier: 'System Admin',
          hasRx: false,
          vetDoctor: '',
          gross: 0,
          net: -(parseFloat(l.total_loss_value) || 0)
        };
      })
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (combinedLedger.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-16 text-center text-slate-500 dark:text-slate-400">
            <i data-lucide="file-minus" class="w-12 h-12 mx-auto mb-3 opacity-60 stroke-1"></i>
            <p class="font-bold text-base">No transactions or stock losses recorded matching criteria.</p>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = combinedLedger.map(row => {
        const isSale = row.type === 'SALE';
        const cashierSafe = (row.cashier || 'Staff').replace(/'/g, "\\'");
        const vetSafe = (row.vetDoctor || '').replace(/'/g, "\\'");
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 ${!isSale ? 'bg-red-50/50 dark:bg-red-950/20' : ''}">
            <td class="py-4 px-6 font-mono font-bold text-xs ${isSale ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
              <span class="inline-flex items-center gap-1.5 ${isSale ? 'cursor-pointer hover:underline' : ''}" ${isSale ? `onclick="openInvoiceModal('${row.id}', '${row.reference}', '${cashierSafe}', '${row.method}', ${row.hasRx ? 'true' : 'false'}, '${vetSafe}')"` : ''}>
                <i data-lucide="${isSale ? 'receipt' : 'alert-triangle'}" class="w-4 h-4"></i>
                ${row.reference}
              </span>
            </td>
            <td class="py-4 px-6 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
              ${formatDate(row.date)}
            </td>
            <td class="py-4 px-6 text-sm font-bold text-slate-900 dark:text-slate-100">
              ${row.entity}
            </td>
            <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300">
              <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">${row.method}</span>
            </td>
            <td class="py-4 px-6 text-right font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
              ${isSale ? formatCurrency(row.gross) : formatCurrency(0)}
            </td>
            <td class="py-4 px-6 text-right font-mono text-sm font-extrabold ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
              ${row.net >= 0 ? '+' : ''}${formatCurrency(row.net)}
            </td>
            <td class="py-4 px-6 text-right">
              ${isSale ? `
                <button type="button" onclick="openInvoiceModal('${row.id}', '${row.reference}', '${cashierSafe}', '${row.method}', ${row.hasRx ? 'true' : 'false'}, '${vetSafe}')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i> Details
                </button>
              ` : `
                <span class="text-xs font-mono text-slate-400">N/A</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  if (typeof renderAuditTrail === 'function') renderAuditTrail();
  if (window.lucide) lucide.createIcons();
}

function renderFinancialChart(allTransactions) {
  const canvas = document.getElementById('financialChartCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(203, 213, 225, 0.6)';

  const monthlyData = {
    '2026-05': { label: 'May 2026', revenue: 0, profit: 0 },
    '2026-06': { label: 'June 2026', revenue: 0, profit: 0 },
    '2026-07': { label: 'July 2026', revenue: 0, profit: 0 }
  };

  allTransactions.forEach(t => {
    const monthKey = (t.transaction_date || '').substring(0, 7);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { label: monthKey, revenue: 0, profit: 0 };
    }
    monthlyData[monthKey].revenue += parseFloat(t.total_amount) || 0;
    monthlyData[monthKey].profit += parseFloat(t.net_profit) || 0;
  });

  const sortedKeys = Object.keys(monthlyData).sort();
  const labels = sortedKeys.map(k => monthlyData[k].label);
  const revenueData = sortedKeys.map(k => monthlyData[k].revenue);
  const profitData = sortedKeys.map(k => monthlyData[k].profit);

  if (financialChartInstance) {
    financialChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const revGrad = ctx.createLinearGradient(0, 0, 0, 320);
  revGrad.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.85)' : 'rgba(16, 185, 129, 0.9)');
  revGrad.addColorStop(1, isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.25)');

  const profGrad = ctx.createLinearGradient(0, 0, 0, 320);
  profGrad.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.85)' : 'rgba(79, 70, 229, 0.9)');
  profGrad.addColorStop(1, isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.25)');

  financialChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Revenue (PKR)',
          data: revenueData,
          backgroundColor: revGrad,
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false,
          barPercentage: 0.6
        },
        {
          label: 'Net Profit (PKR)',
          data: profitData,
          backgroundColor: profGrad,
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          titleColor: textColor,
          bodyColor: textColor,
          titleFont: { family: 'Inter', size: 14, weight: 'bold' },
          bodyFont: { family: 'JetBrains Mono', size: 13 },
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: tickColor, font: { family: 'Inter', weight: '600' } }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: tickColor,
            font: { family: 'JetBrains Mono' },
            callback: function(value) { return 'Rs. ' + Number(value).toLocaleString('en-PK'); }
          }
        }
      }
    }
  });
}

function renderCategoryChart(allTransactions) {
  const canvas = document.getElementById('categoryChartCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  const categoryMap = {
    'Antibiotics': 0,
    'Antiparasitic': 0,
    'Vaccines': 0,
    'Pain Management': 0,
    'Supplements': 0,
    'Dermatological': 0
  };

  allTransactions.forEach(t => {
    (t.items || []).forEach(item => {
      const prod = (appState.products || []).find(p => p.id === item.product_id || p.name === item.name);
      const cat = prod && prod.category ? prod.category : 'Antibiotics';
      const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      categoryMap[cat] = (categoryMap[cat] || 0) + subtotal;
    });
  });

  const labels = Object.keys(categoryMap);
  const data = Object.values(categoryMap);

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'
        ],
        borderColor: isDark ? '#0f172a' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 11, weight: '600' },
            padding: 14,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      cutout: '64%'
    }
  });
}

function renderPaymentChart(allTransactions) {
  const canvas = document.getElementById('paymentChartCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  const methodMap = {
    'Cash': 0,
    'Card': 0,
    'Online': 0
  };

  allTransactions.forEach(t => {
    let m = t.payment_method || 'Cash';
    if (m === 'Mobile/Online' || m.toLowerCase().includes('online') || m.toLowerCase().includes('raast') || m.toLowerCase().includes('ibft')) {
      m = 'Online';
    } else if (m.toLowerCase().includes('card') || m.toLowerCase().includes('debit') || m.toLowerCase().includes('credit')) {
      m = 'Card';
    } else if (m.toLowerCase().includes('cash')) {
      m = 'Cash';
    }
    const amt = parseFloat(t.total_amount) || 0;
    methodMap[m] = (methodMap[m] || 0) + amt;
  });

  const labels = Object.keys(methodMap);
  const data = Object.values(methodMap);

  if (paymentChartInstance) {
    paymentChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  paymentChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'
        ],
        borderColor: isDark ? '#0f172a' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 11, weight: '600' },
            padding: 14,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      }
    }
  });
}

function renderAuditTrail() {
  const tbody = document.getElementById('audit-trail-tbody');
  if (!tbody) return;
  const logs = appState.auditLogs || [];
  const roleFilterEl = document.getElementById('audit-filter-role');
  const roleFilter = roleFilterEl ? roleFilterEl.value : 'ALL';
  const searchEl = document.getElementById('audit-trail-search');
  const searchTerm = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const dateEl = document.getElementById('audit-trail-date');
  const dateFilter = dateEl ? dateEl.value : '';

  const getRole = (l) => {
    if (l.role === 'Admin') return 'Admin';
    if (l.user_name && (l.user_name.toLowerCase().includes('chief') || l.user_name.toLowerCase().includes('fahad') || l.user_name.toLowerCase().includes('admin'))) return 'Admin';
    const matched = (appState.users || []).find(u => (l.user_id && u.id === l.user_id) || (l.user_name && (u.full_name === l.user_name || u.email === l.user_name || l.user_name.includes(u.full_name))));
    if (matched && matched.role === 'Admin') return 'Admin';
    return l.role || 'Cashier';
  };

  const filteredLogs = logs.filter(l => {
    const displayRole = getRole(l);
    if (roleFilter !== 'ALL' && displayRole !== roleFilter) return false;
    if (dateFilter && !(l.created_at || '').startsWith(dateFilter)) return false;
    if (searchTerm) {
      const targetStr = (l.target_id || '').toLowerCase();
      const descStr = (l.description || '').toLowerCase();
      const userStr = (l.user_name || '').toLowerCase();
      const actionStr = (l.action_type || '').toLowerCase();
      const idStr = (l.id || '').toLowerCase();
      if (!targetStr.includes(searchTerm) && !descStr.includes(searchTerm) && !userStr.includes(searchTerm) && !actionStr.includes(searchTerm) && !idStr.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  if (filteredLogs.length === 0) {
    tbody.innerHTML = '<tr><td colSpan="6" class="p-6 text-center text-slate-400 font-mono">No sensitive actions logged matching filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filteredLogs.map(l => {
    const badgeColor = l.action_type === 'SALE_PROCESSED' || l.action_type === 'CLIENT_REGISTERED' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' :
      l.action_type === 'SALE_EDITED' || l.action_type === 'STOCK_LOSS' || l.action_type === 'ALERT_CHECKED' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' :
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    const displayRole = getRole(l);

    return `
      <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
        <td class="p-3.5 font-mono text-xs text-slate-400">${l.id || 'N/A'}</td>
        <td class="p-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">${formatDate(l.created_at)}</td>
        <td class="p-3.5 text-xs font-bold text-slate-900 dark:text-white">${l.user_name || 'System User'}</td>
        <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${displayRole === 'Admin' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'}">${displayRole}</span></td>
        <td class="p-3.5"><span class="px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase ${badgeColor}">${l.action_type}</span></td>
        <td class="p-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono">${l.description || ''}</td>
      </tr>
    `;
  }).join('');
}

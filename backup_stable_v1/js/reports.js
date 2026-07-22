let financialChartInstance = null;

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

  const filteredTxns = transactions.filter(t => {
    if (selectedMonth === 'ALL') return true;
    return (t.transaction_date || '').startsWith(selectedMonth);
  });

  const filteredLosses = losses.filter(l => {
    if (selectedMonth === 'ALL') return true;
    return (l.reported_date || '').startsWith(selectedMonth);
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
          gross: 0,
          net: -(parseFloat(l.total_loss_value) || 0)
        };
      })
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (combinedLedger.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-16 text-center text-slate-500 dark:text-slate-400">
            <i data-lucide="file-minus" class="w-12 h-12 mx-auto mb-3 opacity-60 stroke-1"></i>
            <p class="font-bold text-base">No transactions or stock losses recorded for this period.</p>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = combinedLedger.map(row => {
        const isSale = row.type === 'SALE';
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 ${!isSale ? 'bg-red-50/50 dark:bg-red-950/20' : ''}">
            <td class="py-4 px-6 font-mono font-bold text-xs ${isSale ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
              <span class="inline-flex items-center gap-1.5">
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
  financialChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Revenue (PKR)',
          data: revenueData,
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.75)' : 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.65
        },
        {
          label: 'Net Profit (PKR)',
          data: profitData,
          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.8)' : 'rgba(79, 70, 229, 0.85)',
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.65
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 12, weight: '600' }
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
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'Inter', weight: '600' } }
        },
        y: {
          grid: { color: gridColor },
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

function renderAuditTrail() {
  const tbody = document.getElementById('audit-trail-tbody');
  if (!tbody) return;
  const logs = appState.auditLogs || [];

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colSpan="5" class="p-6 text-center text-slate-400 font-mono">No sensitive actions logged yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const badgeColor = l.action_type === 'SALE_PROCESSED' || l.action_type === 'CLIENT_REGISTERED' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' :
      l.action_type === 'SALE_EDITED' || l.action_type === 'STOCK_LOSS' || l.action_type === 'ALERT_CHECKED' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' :
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';

    return `
      <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
        <td class="p-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">${formatDate(l.created_at)}</td>
        <td class="p-3.5"><span class="px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase ${badgeColor}">${l.action_type}</span></td>
        <td class="p-3.5 text-xs font-bold text-slate-900 dark:text-white">${l.user_name} <span class="font-normal text-slate-400">(${l.role})</span></td>
        <td class="p-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono">${l.description}</td>
        <td class="p-3.5 text-xs font-mono text-slate-400">${l.target_id || 'N/A'}</td>
      </tr>
    `;
  }).join('');
}

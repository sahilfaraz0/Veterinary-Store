const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) ? window.ENV.SUPABASE_URL : 'https://demo-project.supabase.co';
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) ? window.ENV.SUPABASE_ANON_KEY : 'demo-anon-key-placeholder';

window.supabaseClient = null;

window.appState = {
  mode: 'PRODUCTION',
  currentUser: null,
  products: [],
  batches: [],
  transactions: [],
  stockLosses: [],
  owners: [],
  pets: [],
  auditLogs: [],
  suppliers: [
    'BioVet Pakistan Pharma (Islamabad)',
    'Prime Health Vet Supplies (Rawalpindi)',
    'Apex Veterinary Distribution (Lahore)',
    'Greenbelt Animal Nutrition (Peshawar)',
    'VaxCo Pakistan (Islamabad)',
    'Direct Distributor (Islamabad)'
  ],
  vetDoctors: [],
  users: [],
  staffAccounts: [],
  notifications: JSON.parse(localStorage.getItem('vet_store_notifications') || localStorage.getItem('fahad_vet_notifications') || 'null') || [],
  cart: [],
  activeView: 'dashboard',
  filters: {
    inventoryCategory: 'ALL',
    inventorySearch: '',
    posSearch: '',
    salesSearch: '',
    reportMonth: '2026-07'
  },
  theme: localStorage.getItem('vet_store_theme') || localStorage.getItem('fahad_vet_theme') || 'dark'
};

function initSupabase() {
  const url = window.ENV?.SUPABASE_URL || window.SUPABASE_URL || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '');
  const key = window.ENV?.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');
  if (typeof supabase !== 'undefined' && url && key) {
    try {
      if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        });
      }
      appState.mode = 'SUPABASE';
    } catch (err) {
      appState.mode = 'PRODUCTION';
    }
  } else {
    appState.mode = 'PRODUCTION';
  }
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (err) {
    return dateString;
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 6);
  const colors = {
    success: 'bg-emerald-500/20 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-100 border-emerald-500/40 shadow-emerald-900/20',
    error: 'bg-rose-500/20 dark:bg-rose-950/70 text-rose-900 dark:text-rose-100 border-rose-500/40 shadow-rose-900/20',
    warning: 'bg-amber-500/20 dark:bg-amber-950/70 text-amber-900 dark:text-amber-100 border-amber-500/40 shadow-amber-900/20',
    info: 'bg-indigo-500/20 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100 border-indigo-500/40 shadow-indigo-900/20'
  };

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  const el = document.createElement('div');
  el.id = id;
  el.className = `pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-full border backdrop-blur-2xl shadow-2xl ${colors[type] || colors.info}`;
  el.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-5 h-5 flex-shrink-0"></i>
    <span class="text-xs font-bold tracking-wide flex-1">${message}</span>
    <button onclick="dismissToast('${id}')" class="opacity-70 hover:opacity-100 ml-2 transition-opacity">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(el);
  if (window.lucide) lucide.createIcons({ root: el });

  if (typeof anime !== 'undefined') {
    anime({
      targets: el,
      translateY: [60, 0],
      scale: [0.75, 1],
      opacity: [0, 1],
      duration: 900,
      easing: 'spring(1, 80, 10, 0)'
    });
  } else {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }

  setTimeout(() => dismissToast(id), 4500);
}

function dismissToast(id) {
  const item = document.getElementById(id);
  if (!item || item.dataset.dismissing === 'true') return;
  item.dataset.dismissing = 'true';

  if (typeof anime !== 'undefined') {
    anime({
      targets: item,
      translateY: -24,
      opacity: 0,
      scale: 0.9,
      filter: ['blur(0px)', 'blur(10px)'],
      duration: 450,
      easing: 'easeInQuad',
      complete: () => item.remove()
    });
  } else {
    item.style.opacity = '0';
    item.style.transform = 'translateY(-20px)';
    setTimeout(() => item.remove(), 400);
  }
}

function playBeepSound(freq = 880, duration = 0.15) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {}
}

function initTheme() {
  const current = localStorage.getItem('vet_store_theme') || localStorage.getItem('fahad_vet_theme') || (typeof appState !== 'undefined' && appState.theme ? appState.theme : 'dark');
  if (typeof appState !== 'undefined' && appState) appState.theme = current;
  if (current === 'dark') {
    document.documentElement.classList.add('dark');
    if (document.body) document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    if (document.body) document.body.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark') || (document.body && document.body.classList.contains('dark'));
  const nextTheme = isDark ? 'light' : 'dark';
  if (typeof appState !== 'undefined' && appState) appState.theme = nextTheme;
  localStorage.setItem('vet_store_theme', nextTheme);
  localStorage.setItem('fahad_vet_theme', nextTheme);
  if (nextTheme === 'dark') {
    document.documentElement.classList.add('dark');
    if (document.body) document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    if (document.body) document.body.classList.remove('dark');
  }
  window.dispatchEvent(new CustomEvent('app-theme-changed'));
  if (window.lucide) lucide.createIcons();
}

async function loadInitialData() {
  initSupabase();
  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  if (client) {
    try {
      const safeQuery = async (builder) => {
        try {
          const res = await builder;
          return res || { data: [], error: null };
        } catch (e) {
          return { error: e, data: [] };
        }
      };
      const [pRes, bRes, tRes, tiRes, lRes, oRes, ptRes, aRes, vRes, uRes] = await Promise.race([
        Promise.all([
          safeQuery(client.from('products').select('*').order('name')),
          safeQuery(client.from('stock_batches').select('*').order('expiry_date')),
          safeQuery(client.from('transactions').select('*').order('transaction_date', { ascending: false })),
          safeQuery(client.from('transaction_items').select('*')),
          safeQuery(client.from('stock_losses').select('*').order('reported_date', { ascending: false })),
          safeQuery(client.from('owners').select('*').order('name')),
          safeQuery(client.from('pets').select('*').order('name')),
          safeQuery(client.from('audit_logs').select('*').order('created_at', { ascending: false })),
          safeQuery(client.from('vet_doctors').select('*').order('name')),
          safeQuery(client.from('user_profiles').select('*').order('full_name'))
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ]);
      if (pRes.error) console.error("Error loading products:", pRes.error);
      if (bRes.error) console.error("Error loading stock_batches:", bRes.error);
      if (tRes.error) console.error("Error loading transactions:", tRes.error);
      if (tiRes.error) console.error("Error loading transaction_items:", tiRes.error);
      if (lRes.error) console.error("Error loading stock_losses:", lRes.error);
      if (oRes.error) console.error("Error loading owners:", oRes.error);
      if (ptRes.error) console.error("Error loading pets:", ptRes.error);
      if (aRes.error) console.error("Error loading audit_logs:", aRes.error);
      if (vRes.error) console.error("Error loading vet_doctors:", vRes.error);
      if (uRes.error) console.error("Error loading user_profiles:", uRes.error);
      if (pRes.error || bRes.error || tRes.error) {
        const primaryErr = (pRes.error && pRes.error.message) || (bRes.error && bRes.error.message) || (tRes.error && tRes.error.message) || "Failed to fetch cloud data.";
        showToast("Warning: " + primaryErr, "error");
      }
      appState.products = (!pRes.error && pRes.data) ? pRes.data : [];
      appState.batches = (!bRes.error && bRes.data) ? bRes.data : [];
      const rawTxns = (!tRes.error && tRes.data) ? tRes.data : [];
      const allTxnItems = (!tiRes.error && tiRes.data) ? tiRes.data : [];
      appState.transactions = rawTxns.map(t => {
        const items = allTxnItems.filter(i => i.transaction_id === t.id).map(i => {
          const prod = appState.products.find(p => p.id === i.product_id);
          return {
            ...i,
            name: prod ? prod.name : 'Medicine SKU',
            tax_rate: prod && prod.tax_rate !== undefined ? prod.tax_rate : 18
          };
        });
        let subtotal = 0;
        let tax = 0;
        items.forEach(i => {
          const s = (i.quantity || 1) * (i.unit_price || 0);
          const tr = i.tax_rate !== undefined ? i.tax_rate : 18;
          subtotal += s;
          tax += (s * tr) / 100;
        });
        return {
          ...t,
          items: items,
          subtotal_amount: t.subtotal_amount !== undefined ? t.subtotal_amount : Math.round(subtotal * 100) / 100,
          total_tax: t.total_tax !== undefined ? t.total_tax : Math.round(tax * 100) / 100
        };
      });
      appState.stockLosses = (!lRes.error && lRes.data) ? lRes.data : [];
      appState.owners = (!oRes.error && oRes.data) ? oRes.data : [];
      appState.pets = (!ptRes.error && ptRes.data) ? ptRes.data : [];
      appState.auditLogs = (!aRes.error && aRes.data) ? aRes.data : [];
      appState.vetDoctors = (!vRes.error && vRes.data) ? vRes.data : [];
      appState.users = (!uRes.error && uRes.data) ? uRes.data : [];
      appState.staffAccounts = appState.users;
      window.dispatchEvent(new CustomEvent('app-data-loaded'));
      return;
    } catch (err) {
      console.error("loadInitialData caught exception:", err);
      const errMsg = err.message === 'timeout' ? 'Cloud connection timed out (15s). Please verify your Supabase URL and keys in env.js.' : (err.message || 'Failed to fetch cloud data. Check API keys or permissions.');
      showToast("Warning: " + errMsg, "error");
    }
  }

  appState.products = [];
  appState.batches = [];
  appState.transactions = [];
  appState.stockLosses = [];
  appState.owners = [];
  appState.pets = [];
  appState.auditLogs = [];
  appState.vetDoctors = [];
  appState.users = [];
  appState.staffAccounts = [];
  window.dispatchEvent(new CustomEvent('app-data-loaded'));
}

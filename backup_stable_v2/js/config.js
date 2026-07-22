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
  vetDoctors: [
    'Dr. Fahad Al-Rahman (Senior Vet)',
    'Dr. Tariq Mahmood (Clinical Vet)',
    'Dr. Ayesha Sheraz (Surgeon)',
    'Dr. Bilal Khan (Livestock Specialist)',
    'Dr. Usman Qureshi (Pet Care)'
  ],
  staffAccounts: [],
  notifications: JSON.parse(localStorage.getItem('fahad_vet_notifications') || 'null') || [],
  cart: [],
  activeView: 'dashboard',
  filters: {
    inventoryCategory: 'ALL',
    inventorySearch: '',
    posSearch: '',
    salesSearch: '',
    reportMonth: '2026-07'
  },
  theme: localStorage.getItem('fahad_vet_theme') || 'dark'
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
    success: 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/20',
    error: 'bg-rose-600 border-rose-400 text-white shadow-rose-900/20',
    warning: 'bg-amber-600 border-amber-400 text-white shadow-amber-900/20',
    info: 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/20'
  };

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  const el = document.createElement('div');
  el.id = id;
  el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl transition-all duration-300 ${colors[type] || colors.info}`;
  el.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-5 h-5 flex-shrink-0"></i>
    <span class="text-xs font-semibold tracking-wide flex-1">${message}</span>
    <button onclick="document.getElementById('${id}')?.remove()" class="text-white/80 hover:text-white ml-2">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(el);
  if (window.lucide) lucide.createIcons({ root: el });

  setTimeout(() => {
    const item = document.getElementById(id);
    if (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      setTimeout(() => item.remove(), 300);
    }
  }, 4000);
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
  const current = localStorage.getItem('fahad_vet_theme') || (typeof appState !== 'undefined' && appState.theme ? appState.theme : 'dark');
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
  if (window.supabaseClient) {
    try {
      const [pRes, bRes, tRes, lRes, oRes, ptRes, aRes] = await Promise.all([
        supabaseClient.from('products').select('*').order('name'),
        supabaseClient.from('stock_batches').select('*').order('expiry_date'),
        supabaseClient.from('transactions').select('*').order('transaction_date', { ascending: false }),
        supabaseClient.from('stock_losses').select('*').order('reported_date', { ascending: false }),
        supabaseClient.from('owners').select('*').order('name'),
        supabaseClient.from('pets').select('*').order('name'),
        supabaseClient.from('audit_logs').select('*').order('created_at', { ascending: false })
      ]);
      const errors = [pRes.error, bRes.error, tRes.error, lRes.error, oRes.error, ptRes.error, aRes.error].filter(Boolean);
      if (errors.length > 0) {
        errors.forEach(err => console.error(err));
        showToast("Warning: Failed to fetch cloud data. Check API keys or permissions.", "error");
      }
      appState.products = (!pRes.error && pRes.data) ? pRes.data : [];
      appState.batches = (!bRes.error && bRes.data) ? bRes.data : [];
      appState.transactions = (!tRes.error && tRes.data) ? tRes.data : [];
      appState.stockLosses = (!lRes.error && lRes.data) ? lRes.data : [];
      appState.owners = (!oRes.error && oRes.data) ? oRes.data : [];
      appState.pets = (!ptRes.error && ptRes.data) ? ptRes.data : [];
      appState.auditLogs = (!aRes.error && aRes.data) ? aRes.data : [];
      window.dispatchEvent(new CustomEvent('app-data-loaded'));
      return;
    } catch (err) {
      console.error(err);
      showToast("Warning: Failed to fetch cloud data. Check API keys or permissions.", "error");
    }
  }

  appState.products = [];
  appState.batches = [];
  appState.transactions = [];
  appState.stockLosses = [];
  appState.owners = [];
  appState.pets = [];
  appState.auditLogs = [];
  window.dispatchEvent(new CustomEvent('app-data-loaded'));
}

document.addEventListener('DOMContentLoaded', () => {
  const formAuth = document.getElementById('form-auth');
  if (formAuth) {
    formAuth.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      await handleLoginSubmit(email, password);
    });
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  const formAddCashier = document.getElementById('form-add-cashier');
  if (formAddCashier) {
    formAddCashier.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-cashier-name').value.trim();
      const email = document.getElementById('new-cashier-email').value.trim();
      const password = document.getElementById('new-cashier-password').value.trim();
      const roleSelect = document.getElementById('new-cashier-role');
      const role = roleSelect ? roleSelect.value : 'Cashier';

      if (!name || !email || !password) {
        showToast('Please enter user name, email, and password.', 'warning');
        return;
      }

      if (window.supabaseClient && window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
        try {
          const tempClient = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            }
          });
          const { data, error } = await tempClient.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                full_name: name,
                role: role
              }
            }
          });
          if (error) throw error;
          if (data && data.user) {
            const formattedName = role === 'Admin' ? name : name + ' (Cashier)';
            const newProfile = {
              id: data.user.id,
              email: email,
              full_name: formattedName,
              role: role
            };
            await window.supabaseClient.from('user_profiles').upsert([newProfile]);
            if (!appState.users.some(u => u.id === newProfile.id)) {
              appState.users.unshift(newProfile);
              appState.staffAccounts = appState.users;
            }
            if (typeof renderAdminView === 'function') renderAdminView();
          }
          document.getElementById('modal-add-cashier')?.classList.add('hidden');
          formAddCashier.reset();
          showToast('New user registered: ' + name + ' (' + role + ')', 'success');
          if (typeof logAuditEvent === 'function') {
            logAuditEvent('CASHIER_CREATED', 'Admin registered new cashier account: ' + name + ' (' + email + ')', data?.user?.id || null);
          }
          return;
        } catch (err) {
          showToast('Error registering cashier: ' + err.message, 'error');
          return;
        }
      }

      document.getElementById('modal-add-cashier')?.classList.add('hidden');
      formAddCashier.reset();
      showToast('Supabase not connected. Could not register cashier.', 'error');
    });
  }
});

async function initAuth() {
  const storedUser = sessionStorage.getItem('vet_store_user') || sessionStorage.getItem('fahad_vet_user');
  if (storedUser) {
    try {
      appState.currentUser = JSON.parse(storedUser);
      updateAuthUI();
    } catch (e) {
      sessionStorage.removeItem('vet_store_user');
      sessionStorage.removeItem('fahad_vet_user');
    }
  }

  if (window.supabaseClient) {
    try {
      const { data, error } = await Promise.race([
        window.supabaseClient.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      if (!error && data && data.session && data.session.user) {
        let profData = null;
        try {
          const res = await Promise.race([
            window.supabaseClient.from('user_profiles').select('*').eq('id', data.session.user.id).single(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
          ]);
          profData = res.data;
        } catch (e) {}

        const isAdminUser = data.session.user.email === 'admin@vetstore.com' || data.session.user.email === 'admin@fahadvet.com' || (data.session.user.email && (data.session.user.email.toLowerCase().includes('admin') || data.session.user.email.toLowerCase().includes('fahad'))) || (profData && profData.role === 'Admin');
        appState.currentUser = {
          id: data.session.user.id,
          email: data.session.user.email,
          full_name: profData ? profData.full_name : (isAdminUser ? 'Chief Administrator' : 'Staff Member'),
          role: isAdminUser ? 'Admin' : (profData ? profData.role : 'Cashier')
        };
        sessionStorage.setItem('vet_store_user', JSON.stringify(appState.currentUser));
        sessionStorage.setItem('fahad_vet_user', JSON.stringify(appState.currentUser));
        updateAuthUI();
        return;
      } else if (!storedUser) {
        appState.currentUser = null;
        sessionStorage.removeItem('vet_store_user');
        sessionStorage.removeItem('fahad_vet_user');
        window.location.href = 'login.html';
        return;
      }
    } catch (err) {
      if (!storedUser) {
        appState.currentUser = null;
        sessionStorage.removeItem('vet_store_user');
        sessionStorage.removeItem('fahad_vet_user');
        window.location.href = 'login.html';
        return;
      }
    }
  } else if (!storedUser) {
    appState.currentUser = null;
    sessionStorage.removeItem('vet_store_user');
    sessionStorage.removeItem('fahad_vet_user');
    window.location.href = 'login.html';
    return;
  }

  if (!appState.currentUser) {
    window.location.href = 'login.html';
  } else {
    updateAuthUI();
  }
}

async function handleLoginSubmit(email, password) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profData } = await supabaseClient.from('user_profiles').select('*').eq('id', data.user.id).single();
      const isAdminUser = data.user.email === 'admin@vetstore.com' || data.user.email === 'admin@fahadvet.com' || (data.user.email && (data.user.email.toLowerCase().includes('admin') || data.user.email.toLowerCase().includes('fahad'))) || (profData && profData.role === 'Admin');
      appState.currentUser = {
        id: data.user.id,
        email: data.user.email,
        full_name: profData ? profData.full_name : (isAdminUser ? 'Chief Administrator' : 'Staff Member'),
        role: isAdminUser ? 'Admin' : (profData ? profData.role : 'Cashier')
      };
      sessionStorage.setItem('vet_store_user', JSON.stringify(appState.currentUser));
      sessionStorage.setItem('fahad_vet_user', JSON.stringify(appState.currentUser));
      updateAuthUI();
      showToast('Logged in as ' + appState.currentUser.full_name, 'success');
      if (typeof loadInitialData === 'function') await loadInitialData();
      return;
    } catch (err) {
      showToast('Login error: ' + err.message, 'error');
      return;
    }
  }

  showToast('Supabase database connection not initialized.', 'error');
}

async function logout(isIdle = false) {
  if (isIdle === true || (typeof isIdle === 'object' && isIdle && isIdle.isIdle === true)) {
    try {
      sessionStorage.setItem('idle_logout_reason', 'inactivity');
    } catch (e) {}
  }

  if (window.supabaseClient) {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (e) {}
  } else if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {}
  }

  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (e) {}

  sessionStorage.removeItem('vet_store_user');
  sessionStorage.removeItem('fahad_vet_user');
  if (typeof appState !== 'undefined' && appState) {
    appState.currentUser = null;
  }
  window.location.replace('login.html');
}

function updateAuthUI() {
  const user = appState.currentUser;
  const usernameEl = document.getElementById('topbar-username');
  const roleEl = document.getElementById('topbar-role');
  const reportsTab = document.getElementById('tab-reports');
  const adminTab = document.getElementById('tab-admin');
  const authLoading = document.getElementById('auth-loading');
  const appContent = document.getElementById('app-content');

  if (!user) {
    if (usernameEl) usernameEl.textContent = 'Not Logged In';
    if (roleEl) roleEl.textContent = 'Guest';
    if (reportsTab) reportsTab.classList.add('hidden');
    if (adminTab) adminTab.classList.add('hidden');
    if (typeof renderAdminAlerts === 'function') renderAdminAlerts();
    window.location.href = 'login.html';
    return;
  }

  if (authLoading) authLoading.classList.add('hidden');
  if (appContent) appContent.classList.remove('hidden');
  if (usernameEl) usernameEl.textContent = user.full_name || 'Staff Member';
  if (roleEl) {
    roleEl.textContent = user.role || 'Cashier';
    if (user.role === 'Admin') {
      roleEl.className = 'block text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap';
    } else {
      roleEl.className = 'block text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider whitespace-nowrap';
    }
  }

  if (reportsTab) {
    if (user.role === 'Admin') {
      reportsTab.classList.remove('hidden');
    } else {
      reportsTab.classList.add('hidden');
      if (appState.activeView === 'reports') {
        const dashTab = document.querySelector('.nav-tab[data-view="dashboard"]');
        if (dashTab) dashTab.click();
      }
    }
  }

  if (adminTab) {
    if (user.role === 'Admin') {
      adminTab.classList.remove('hidden');
    } else {
      adminTab.classList.add('hidden');
      if (appState.activeView === 'admin') {
        const dashTab = document.querySelector('.nav-tab[data-view="dashboard"]');
        if (dashTab) dashTab.click();
      }
    }
  }

  if (typeof renderAdminAlerts === 'function') renderAdminAlerts();
  setupIdleLogoutWatchdog();
  window.dispatchEvent(new CustomEvent('app-rbac-changed'));
  if (window.lucide) lucide.createIcons();
}

let idleTimer = null;
let warningTimer = null;
let lastInteraction = Date.now();
let hasIdleWatchdogStarted = false;

function setupIdleLogoutWatchdog() {
  if (hasIdleWatchdogStarted) return;
  hasIdleWatchdogStarted = true;

  const resetIdleTimers = () => {
    const now = Date.now();
    if (now - lastInteraction < 1000 && idleTimer !== null) return;
    lastInteraction = now;

    if (idleTimer) clearTimeout(idleTimer);
    if (warningTimer) clearTimeout(warningTimer);

    warningTimer = setTimeout(() => {
      if (appState.currentUser && typeof showToast === 'function') {
        showToast('⏳ Inactivity Warning: You will be automatically logged out in 60 seconds due to inactivity. Click or press any key to stay logged in.', 'warning');
      }
    }, 14 * 60 * 1000);

    idleTimer = setTimeout(() => {
      if (appState.currentUser) {
        logout(true);
      }
    }, 15 * 60 * 1000);
  };

  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimers, { passive: true });
  });

  resetIdleTimers();
}

window.logout = logout;
window.setupIdleLogoutWatchdog = setupIdleLogoutWatchdog;
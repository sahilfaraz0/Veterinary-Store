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

  const btnOpenAddCashier = document.getElementById('btn-open-add-cashier');
  if (btnOpenAddCashier) {
    btnOpenAddCashier.addEventListener('click', () => {
      document.getElementById('modal-add-cashier')?.classList.remove('hidden');
    });
  }

  const formAddCashier = document.getElementById('form-add-cashier');
  if (formAddCashier) {
    formAddCashier.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-cashier-name').value.trim();
      const email = document.getElementById('new-cashier-email').value.trim();
      const password = document.getElementById('new-cashier-password').value.trim();

      if (!name || !email || !password) {
        showToast('Please enter cashier name, email, and password.', 'warning');
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
                role: 'Cashier'
              }
            }
          });
          if (error) throw error;
          if (data && data.user) {
            await window.supabaseClient.from('user_profiles').upsert([{
              id: data.user.id,
              email: email,
              full_name: name + ' (Cashier)',
              role: 'Cashier'
            }]);
          }
          document.getElementById('modal-add-cashier')?.classList.add('hidden');
          formAddCashier.reset();
          showToast('New cashier registered: ' + name + ' (' + email + ')', 'success');
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
  const storedUser = sessionStorage.getItem('fahad_vet_user');
  if (storedUser) {
    try {
      appState.currentUser = JSON.parse(storedUser);
      updateAuthUI();
    } catch (e) {
      sessionStorage.removeItem('fahad_vet_user');
    }
  }

  if (window.supabaseClient) {
    try {
      const { data, error } = await Promise.race([
        window.supabaseClient.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
      ]);
      if (!error && data && data.session && data.session.user) {
        let profData = null;
        try {
          const res = await Promise.race([
            window.supabaseClient.from('user_profiles').select('*').eq('id', data.session.user.id).single(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
          ]);
          profData = res.data;
        } catch (e) {}

        appState.currentUser = {
          id: data.session.user.id,
          email: data.session.user.email,
          full_name: profData ? profData.full_name : (data.session.user.email === 'admin@fahadvet.com' ? 'Dr. Fahad Al-Rahman' : 'Staff Member'),
          role: profData ? profData.role : (data.session.user.email === 'admin@fahadvet.com' ? 'Admin' : 'Cashier')
        };
        sessionStorage.setItem('fahad_vet_user', JSON.stringify(appState.currentUser));
        updateAuthUI();
        return;
      } else if (!storedUser) {
        appState.currentUser = null;
        sessionStorage.removeItem('fahad_vet_user');
        window.location.href = 'login.html';
        return;
      }
    } catch (err) {
      if (!storedUser) {
        appState.currentUser = null;
        sessionStorage.removeItem('fahad_vet_user');
        window.location.href = 'login.html';
        return;
      }
    }
  } else if (!storedUser) {
    appState.currentUser = null;
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
      appState.currentUser = {
        id: data.user.id,
        email: data.user.email,
        full_name: profData ? profData.full_name : 'Staff Member',
        role: profData ? profData.role : 'Cashier'
      };
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

async function logout() {
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
  const btnOpenAddCashier = document.getElementById('btn-open-add-cashier');
  const authLoading = document.getElementById('auth-loading');
  const appContent = document.getElementById('app-content');

  if (!user) {
    if (usernameEl) usernameEl.textContent = 'Not Logged In';
    if (roleEl) roleEl.textContent = 'Guest';
    if (btnOpenAddCashier) btnOpenAddCashier.classList.add('hidden');
    if (typeof renderAdminAlerts === 'function') renderAdminAlerts();
    window.location.href = 'login.html';
    return;
  }

  if (usernameEl) usernameEl.textContent = user.full_name;
  if (roleEl) {
    roleEl.textContent = `${user.role} Role`;
    if (user.role === 'Admin') {
      roleEl.className = 'block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap';
    } else {
      roleEl.className = 'block text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider whitespace-nowrap';
    }
  }

  if (btnOpenAddCashier) {
    if (user.role === 'Admin') {
      btnOpenAddCashier.classList.remove('hidden');
    } else {
      btnOpenAddCashier.classList.add('hidden');
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

  if (typeof renderAdminAlerts === 'function') renderAdminAlerts();
  window.dispatchEvent(new CustomEvent('app-rbac-changed'));
  if (window.lucide) lucide.createIcons();
}
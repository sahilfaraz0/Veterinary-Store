document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  initLoginSupabase();

  const toggleBtn = document.getElementById('toggle-login-password');
  const passInput = document.getElementById('login-password');
  const passEye = document.getElementById('login-password-eye');
  if (toggleBtn && passInput && passEye) {
    toggleBtn.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        passEye.setAttribute('data-lucide', 'eye-off');
      } else {
        passInput.type = 'password';
        passEye.setAttribute('data-lucide', 'eye');
      }
      if (window.lucide) lucide.createIcons();
    });
  }

  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value.trim() || '';
      const password = document.getElementById('login-password')?.value.trim() || '';
      const errorBox = document.getElementById('login-error-box');
      const submitBtn = document.getElementById('login-submit-btn');

      if (errorBox) errorBox.classList.add('hidden');

      if (!email || !password) {
        showLoginError('Please enter both email and password.');
        return;
      }

      initLoginSupabase();

      if (!window.supabaseClient) {
        showLoginError('Supabase client connection not initialized.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Verifying Credentials...';
      }

      try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          throw error;
        }

        if (data && data.user) {
          let profData = null;
          try {
            const res = await Promise.race([
              window.supabaseClient.from('user_profiles').select('*').eq('id', data.user.id).single(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
            ]);
            profData = res.data;
          } catch (e) {}

          const isAdmin = data.user.email === 'admin@vetstore.com' || data.user.email === 'admin@fahadvet.com' || (data.user.email && (data.user.email.toLowerCase().includes('admin') || data.user.email.toLowerCase().includes('fahad'))) || (profData && profData.role === 'Admin');
          const userObj = {
            id: data.user.id,
            email: data.user.email,
            full_name: profData ? profData.full_name : (isAdmin ? 'Chief Administrator' : 'Staff Member'),
            role: isAdmin ? 'Admin' : (profData ? profData.role : 'Cashier')
          };

          sessionStorage.setItem('vet_store_user', JSON.stringify(userObj));
          sessionStorage.setItem('fahad_vet_user', JSON.stringify(userObj));
          window.location.href = 'index.html';
          return;
        }
      } catch (err) {
        const errorMsg = err.message || err.error_description || (typeof err === 'object' && Object.keys(err).length > 0 ? JSON.stringify(err) : 'Invalid login credentials. Please verify email and password.');
        showLoginError(errorMsg);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i><span>Sign In to Portal</span>';
          if (window.lucide) lucide.createIcons();
        }
      }
    });
  }
});

function initLoginSupabase() {
  const url = window.ENV?.SUPABASE_URL || window.SUPABASE_URL || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '');
  const key = window.ENV?.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');
  if (!window.supabaseClient && typeof supabase !== 'undefined' && url && key) {
    try {
      window.supabaseClient = supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
    } catch (err) {}
  }
}

function showLoginError(msg) {
  const errorBox = document.getElementById('login-error-box');
  const errorText = document.getElementById('login-error-text');
  if (errorText) errorText.textContent = msg;
  if (errorBox) errorBox.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  window.addEventListener('beforeunload', () => {
    if (typeof closePosCamera === 'function') closePosCamera();
    if (typeof closeUniversalScanner === 'function') closeUniversalScanner();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (typeof closePosCamera === 'function') closePosCamera();
      if (typeof closeUniversalScanner === 'function') closeUniversalScanner();
    }
  });

  initTheme();
  if (typeof initSupabase === 'function') initSupabase();
  if (typeof initAuth === 'function') await initAuth();
  if (!appState.currentUser) return;
  setupNavigation();
  setupGlobalModalListeners();
  setupCrmListeners();
  await loadInitialData();

  const authLoading = document.getElementById('auth-loading');
  const appContent = document.getElementById('app-content');
  if (authLoading) authLoading.classList.add('hidden');
  if (appContent) {
    appContent.classList.remove('hidden');
    appContent.classList.add('flex');
  }

  if (window.lucide) lucide.createIcons();
});

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const viewId = tab.getAttribute('data-view');
      if (viewId) switchView(viewId);
    });
  });
}

function switchView(viewId) {
  if (viewId !== 'pos' && typeof closePosCamera === 'function') {
    closePosCamera();
  }

  if (viewId === 'reports' && appState.currentUser && appState.currentUser.role !== 'Admin') {
    showToast('Unauthorized access. Reports view is restricted to Admin role.', 'error');
    return;
  }

  appState.activeView = viewId;

  const views = ['dashboard', 'inventory', 'pos', 'sales', 'reports', 'clients'];
  views.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) {
      if (v === viewId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    const tabView = tab.getAttribute('data-view');
    if (tabView === viewId) {
      tab.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:text-slate-900', 'dark:hover:text-slate-100', 'hover:bg-white/60', 'dark:hover:bg-slate-800/60');
      tab.classList.add('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
    } else {
      tab.classList.remove('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
      tab.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:text-slate-900', 'dark:hover:text-slate-100', 'hover:bg-white/60', 'dark:hover:bg-slate-800/60');
    }
  });

  if (viewId === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if (viewId === 'inventory' && typeof renderInventory === 'function') renderInventory();
  if (viewId === 'pos' && typeof renderPosGrid === 'function' && typeof renderPosCart === 'function') {
    renderPosGrid();
    renderPosCart();
    if (typeof populatePosPetSelector === 'function') populatePosPetSelector();
  }
  if (viewId === 'sales' && typeof renderSales === 'function') renderSales();
  if (viewId === 'reports' && typeof renderReports === 'function') renderReports();
  if (viewId === 'clients' && typeof renderClientsView === 'function') renderClientsView();

  if (window.lucide) lucide.createIcons();
}

function setupGlobalModalListeners() {
  const closeBtns = document.querySelectorAll('.btn-close-modal');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('modal-add-product')?.classList.add('hidden');
      document.getElementById('modal-add-batch')?.classList.add('hidden');
      document.getElementById('modal-scanner')?.classList.add('hidden');
      document.getElementById('modal-rx-warning')?.classList.add('hidden');
      document.getElementById('modal-add-supplier')?.classList.add('hidden');
      document.getElementById('modal-add-doctor')?.classList.add('hidden');
      document.getElementById('modal-edit-sale')?.classList.add('hidden');
      document.getElementById('modal-admin-alerts')?.classList.add('hidden');
      document.getElementById('modal-add-cashier')?.classList.add('hidden');
      document.getElementById('modal-add-owner')?.classList.add('hidden');
      document.getElementById('modal-add-pet')?.classList.add('hidden');
    });
  });
}

async function logAuditEvent(actionType, description, targetId = null) {
  const user = appState.currentUser || { id: null, full_name: 'System User', role: 'Staff' };
  const logObj = {
    id: 'log-' + Date.now(),
    action_type: actionType,
    description: description,
    target_id: targetId,
    user_id: user.id || null,
    user_name: user.full_name || user.name || 'System User',
    role: user.role || 'Staff',
    created_at: new Date().toISOString()
  };

  appState.auditLogs = [logObj, ...(appState.auditLogs || [])];

  if (window.supabaseClient) {
    try {
      await supabaseClient.from('audit_logs').insert([{
        action_type: actionType,
        description: description,
        target_id: targetId,
        user_id: user.id || null,
        user_name: user.full_name || user.name || 'System User',
        role: user.role || 'Staff',
        created_at: logObj.created_at
      }]);
    } catch (err) {}
  }

  if (typeof renderAuditTrail === 'function' && appState.activeView === 'reports') {
    renderAuditTrail();
  }
}

function setupCrmListeners() {
  const btnAddOwner = document.getElementById('btn-open-add-owner');
  if (btnAddOwner) {
    btnAddOwner.addEventListener('click', () => {
      document.getElementById('form-add-owner')?.reset();
      document.getElementById('modal-add-owner')?.classList.remove('hidden');
    });
  }

  const btnAddPet = document.getElementById('btn-open-add-pet');
  if (btnAddPet) {
    btnAddPet.addEventListener('click', () => {
      populatePetOwnerSelect();
      document.getElementById('form-add-pet')?.reset();
      document.getElementById('modal-add-pet')?.classList.remove('hidden');
    });
  }

  const formOwner = document.getElementById('form-add-owner');
  if (formOwner) {
    formOwner.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('owner-name').value.trim();
      const phone = document.getElementById('owner-phone').value.trim();
      const email = document.getElementById('owner-email').value.trim();
      const address = document.getElementById('owner-address').value.trim();

      const newOwner = {
        id: 'own-' + Date.now(),
        name: name,
        phone: phone,
        email: email,
        address: address,
        created_at: new Date().toISOString()
      };

      if (appState.mode === 'SUPABASE' && window.supabaseClient) {
        try {
          const { data, error } = await supabaseClient.from('owners').insert([{
            name: name,
            phone: phone,
            email: email,
            address: address
          }]).select();
          if (!error && data && data[0]) {
            newOwner.id = data[0].id;
          }
        } catch (err) {}
      }

      appState.owners = [newOwner, ...(appState.owners || [])];
      document.getElementById('modal-add-owner')?.classList.add('hidden');
      showToast('Client ' + name + ' registered successfully!');
      logAuditEvent('CLIENT_REGISTERED', 'Registered new pet owner profile: ' + name + ' (' + phone + ')', newOwner.id);
      if (appState.activeView === 'clients') renderClientsView();
    });
  }

  const formPet = document.getElementById('form-add-pet');
  if (formPet) {
    formPet.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ownerId = document.getElementById('pet-owner-select').value;
      const name = document.getElementById('pet-name').value.trim();
      const species = document.getElementById('pet-species').value;
      const breed = document.getElementById('pet-breed').value.trim();
      const age = parseFloat(document.getElementById('pet-age').value) || 0;
      const weight = parseFloat(document.getElementById('pet-weight').value) || 0;
      const notes = document.getElementById('pet-notes').value.trim();

      if (!ownerId) {
        showToast('Please select a registered owner.', 'error');
        return;
      }

      const newPet = {
        id: 'pet-' + Date.now(),
        owner_id: ownerId,
        name: name,
        species: species,
        breed: breed,
        age: age,
        weight: weight,
        notes: notes,
        created_at: new Date().toISOString()
      };

      if (appState.mode === 'SUPABASE' && window.supabaseClient) {
        try {
          const { data, error } = await supabaseClient.from('pets').insert([{
            owner_id: ownerId,
            name: name,
            species: species,
            breed: breed,
            age: age,
            weight: weight,
            notes: notes
          }]).select();
          if (!error && data && data[0]) {
            newPet.id = data[0].id;
          }
        } catch (err) {}
      }

      appState.pets = [newPet, ...(appState.pets || [])];
      document.getElementById('modal-add-pet')?.classList.add('hidden');
      showToast('Patient ' + name + ' registered successfully!');
      logAuditEvent('CLIENT_REGISTERED', 'Registered new patient ' + name + ' (' + species + ')', newPet.id);
      if (appState.activeView === 'clients') renderClientsView();
      if (typeof populatePosPetSelector === 'function') populatePosPetSelector();
    });
  }

  const searchInput = document.getElementById('clients-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderClientsView();
    });
  }

  window.addEventListener('app-data-loaded', () => {
    if (appState.activeView === 'clients') renderClientsView();
    if (typeof populatePosPetSelector === 'function') populatePosPetSelector();
  });
}

function populatePetOwnerSelect() {
  const select = document.getElementById('pet-owner-select');
  if (!select) return;
  const owners = appState.owners || [];
  let html = '<option value="">-- Select Owner --</option>';
  owners.forEach(o => {
    html += '<option value="' + o.id + '">' + o.name + ' (' + o.phone + ')</option>';
  });
  select.innerHTML = html;
}

function populatePosPetSelector() {
  const select = document.getElementById('pos-pet-select');
  if (!select) return;
  const pets = appState.pets || [];
  const owners = appState.owners || [];
  const ownerMap = {};
  owners.forEach(o => { ownerMap[o.id] = o; });

  let html = '<option value="">Walk-in Client (No Patient Linked)</option>';
  pets.forEach(p => {
    const o = ownerMap[p.owner_id] || { name: 'Unknown Owner', phone: 'N/A' };
    html += '<option value="' + p.id + '" data-owner-id="' + p.owner_id + '">' + p.name + ' [' + p.species + '] - Owner: ' + o.name + ' (' + o.phone + ')</option>';
  });
  select.innerHTML = html;
}

function renderClientsView() {
  const grid = document.getElementById('clients-grid');
  const countEl = document.getElementById('clients-total-count');
  const searchInput = document.getElementById('clients-search-input');
  if (!grid) return;

  const query = (searchInput ? searchInput.value.trim().toLowerCase() : '');
  const owners = appState.owners || [];
  const pets = appState.pets || [];

  if (countEl) countEl.textContent = owners.length;

  const filteredOwners = owners.filter(o => {
    const ownerMatch = o.name?.toLowerCase().includes(query) || o.phone?.toLowerCase().includes(query) || o.email?.toLowerCase().includes(query);
    const petMatch = pets.some(p => p.owner_id === o.id && (p.name?.toLowerCase().includes(query) || p.species?.toLowerCase().includes(query)));
    return ownerMatch || petMatch;
  });

  if (filteredOwners.length === 0) {
    grid.innerHTML = '<div class="col-span-full p-12 text-center text-slate-400 font-bold">No clients or pets found matching search criteria.</div>';
    if (window.lucide) lucide.createIcons();
    return;
  }

  let html = '';
  filteredOwners.forEach(o => {
    const ownerPets = pets.filter(p => p.owner_id === o.id);
    html += '<div class="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4 flex flex-col justify-between">' +
      '<div>' +
        '<div class="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">' +
          '<div>' +
            '<h4 class="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">' +
              '<i data-lucide="user" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i> ' + o.name +
            '</h4>' +
            '<p class="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">' + o.phone + '</p>' +
            (o.email ? '<p class="text-[11px] text-slate-400 mt-0.5">' + o.email + '</p>' : '') +
            (o.address ? '<p class="text-[11px] text-slate-400 mt-0.5"><i data-lucide="map-pin" class="w-3 h-3 inline"></i> ' + o.address + '</p>' : '') +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            '<span class="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] font-mono whitespace-nowrap">' + ownerPets.length + ' Pet(s)</span>' +
            '<button onclick="deleteOwnerProfile(\'' + o.id + '\')" class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-all" title="Delete Client Profile"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="space-y-2.5">' +
          '<span class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Registered Patients</span>';

    if (ownerPets.length === 0) {
      html += '<p class="text-xs italic text-slate-400">No pets linked to this profile yet.</p>';
    } else {
      ownerPets.forEach(p => {
        html += '<div class="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">' +
          '<div>' +
            '<div class="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">' +
              '<i data-lucide="paw-print" class="w-3.5 h-3.5 text-emerald-500"></i> ' + p.name +
              '<span class="text-[10px] text-slate-400 font-normal">(' + p.species + ')</span>' +
            '</div>' +
            (p.breed ? '<div class="text-[11px] text-slate-500">Breed: ' + p.breed + (p.age ? ' • ' + p.age + ' yrs' : '') + (p.weight ? ' • ' + p.weight + ' kg' : '') + '</div>' : '') +
            (p.notes ? '<div class="text-[10px] text-amber-600 dark:text-amber-400 mt-1 italic">' + p.notes + '</div>' : '') +
          '</div>' +
          '<button onclick="deletePetProfile(\'' + p.id + '\')" class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-all" title="Delete Patient"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>' +
        '</div>';
      });
    }

    html += '</div>' +
      '</div>' +
      '<div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">' +
        '<button onclick="openAddPetForOwner(\'' + o.id + '\')" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all">' +
          '<i data-lucide="plus" class="w-3.5 h-3.5 text-emerald-400"></i> Add Pet' +
        '</button>' +
      '</div>' +
    '</div>';
  });

  grid.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function openAddPetForOwner(ownerId) {
  populatePetOwnerSelect();
  const select = document.getElementById('pet-owner-select');
  if (select) select.value = ownerId;
  document.getElementById('form-add-pet')?.reset();
  if (select) select.value = ownerId;
  document.getElementById('modal-add-pet')?.classList.remove('hidden');
}
window.openAddPetForOwner = openAddPetForOwner;

async function deleteOwnerProfile(ownerId) {
  const user = appState.currentUser;
  if (!user || user.role !== 'Admin') {
    showToast('Delete operation is restricted to Admin role.', 'error');
    return;
  }
  const owner = (appState.owners || []).find(o => o.id === ownerId);
  if (!owner) return;
  if (!confirm('Are you sure you want to delete client profile "' + owner.name + '" and all linked pet records? This action cannot be undone.')) {
    return;
  }
  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    try {
      const { error } = await supabaseClient.from('owners').delete().eq('id', ownerId);
      if (error) throw error;
    } catch (err) {
      showToast('Error deleting client from Supabase: ' + err.message, 'error');
      return;
    }
  }
  appState.owners = (appState.owners || []).filter(o => o.id !== ownerId);
  appState.pets = (appState.pets || []).filter(p => p.owner_id !== ownerId);
  if (typeof logAuditEvent === 'function') logAuditEvent('CLIENT_DELETED', 'Deleted client profile: ' + owner.name + ' (' + owner.phone + ')', ownerId);
  showToast('Client profile and linked pets deleted.', 'success');
  if (appState.activeView === 'clients') renderClientsView();
  if (typeof populatePosPetSelector === 'function') populatePosPetSelector();
}
window.deleteOwnerProfile = deleteOwnerProfile;

async function deletePetProfile(petId) {
  const user = appState.currentUser;
  if (!user || user.role !== 'Admin') {
    showToast('Delete operation is restricted to Admin role.', 'error');
    return;
  }
  const pet = (appState.pets || []).find(p => p.id === petId);
  if (!pet) return;
  if (!confirm('Are you sure you want to delete patient profile "' + pet.name + '" (' + pet.species + ')?')) {
    return;
  }
  if (appState.mode === 'SUPABASE' && window.supabaseClient) {
    try {
      const { error } = await supabaseClient.from('pets').delete().eq('id', petId);
      if (error) throw error;
    } catch (err) {
      showToast('Error deleting patient from Supabase: ' + err.message, 'error');
      return;
    }
  }
  appState.pets = (appState.pets || []).filter(p => p.id !== petId);
  if (typeof logAuditEvent === 'function') logAuditEvent('CLIENT_DELETED', 'Deleted patient profile: ' + pet.name + ' (' + pet.species + ')', petId);
  showToast('Patient profile deleted.', 'success');
  if (appState.activeView === 'clients') renderClientsView();
  if (typeof populatePosPetSelector === 'function') populatePosPetSelector();
}
window.deletePetProfile = deletePetProfile;

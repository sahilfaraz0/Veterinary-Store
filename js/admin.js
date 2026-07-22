document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('app-data-loaded', () => {
    if (typeof renderAdminView === 'function') renderAdminView();
  });

  window.addEventListener('app-rbac-changed', () => {
    if (typeof renderAdminView === 'function') renderAdminView();
  });

  const formAddVet = document.getElementById('form-admin-add-vet');
  if (formAddVet) {
    formAddVet.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputEl = document.getElementById('admin-new-vet-name');
      const name = inputEl ? inputEl.value.trim() : '';
      if (!name) return;

      const newDoc = {
        id: 'doc-' + Date.now(),
        name: name,
        created_at: new Date().toISOString()
      };

      if (window.supabaseClient) {
        try {
          const { error } = await window.supabaseClient.from('vet_doctors').insert([newDoc]);
          if (error) throw error;
        } catch (err) {
          console.error(err);
          showToast('Warning: Cloud sync failed. Added vet locally.', 'warning');
        }
      }

      appState.vetDoctors.unshift(newDoc);
      if (typeof refreshDoctorDropdowns === 'function') refreshDoctorDropdowns();
      if (typeof renderAdminView === 'function') renderAdminView();

      if (inputEl) inputEl.value = '';
      document.getElementById('modal-admin-add-vet')?.classList.add('hidden');
      showToast('Veterinarian added to system: ' + name, 'success');
    });
  }
});

function renderAdminView() {
  const usersTbody = document.getElementById('admin-users-tbody');
  const vetsTbody = document.getElementById('admin-vets-tbody');

  if (usersTbody) {
    const users = appState.users || [];
    if (users.length === 0) {
      usersTbody.innerHTML = `
        <tr>
          <td colspan="3" class="py-6 text-center text-slate-400 font-semibold">No system users found.</td>
        </tr>
      `;
    } else {
      usersTbody.innerHTML = users.map(u => {
        const isCurrent = appState.currentUser && appState.currentUser.id === u.id;
        const safeName = (u.full_name || 'Staff Member').replace(/'/g, "\\'");
        return `
          <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
            <td class="py-3.5 px-3">
              <div class="font-extrabold text-slate-900 dark:text-white">${u.full_name || 'Staff Member'}</div>
              <div class="text-[11px] font-normal text-slate-400 dark:text-slate-500">${u.email || ''}</div>
            </td>
            <td class="py-3.5 px-3">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800'}">${u.role || 'Cashier'}</span>
            </td>
            <td class="py-3.5 px-3 text-right">
              ${isCurrent ? '<span class="text-[11px] font-bold text-slate-400 italic">Active Session</span>' : `<button type="button" onclick="deleteSystemUser('${u.id}', '${safeName}')" class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-all shadow-sm">Delete</button>`}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  if (vetsTbody) {
    const vets = appState.vetDoctors || [];
    if (vets.length === 0) {
      vetsTbody.innerHTML = `
        <tr>
          <td colspan="3" class="py-6 text-center text-slate-400 font-semibold">No veterinarians registered.</td>
        </tr>
      `;
    } else {
      vetsTbody.innerHTML = vets.map(doc => {
        const id = typeof doc === 'object' && doc ? doc.id : doc;
        const name = typeof doc === 'object' && doc ? doc.name : doc;
        const dateStr = typeof doc === 'object' && doc && doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : 'System Default';
        const safeName = (name || '').replace(/'/g, "\\'");
        return `
          <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
            <td class="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">${name}</td>
            <td class="py-3.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-xs">${dateStr}</td>
            <td class="py-3.5 px-3 text-right">
              <button type="button" onclick="deleteVetDoctor('${id}', '${safeName}')" class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-all shadow-sm">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  const suppliersTbody = document.getElementById('admin-suppliers-tbody');
  if (suppliersTbody) {
    const suppliers = appState.suppliers || [];
    if (suppliers.length === 0) {
      suppliersTbody.innerHTML = `
        <tr>
          <td colspan="2" class="py-6 text-center text-slate-400 font-semibold">No suppliers registered.</td>
        </tr>
      `;
    } else {
      suppliersTbody.innerHTML = suppliers.map(s => {
        const safeName = (s || '').replace(/'/g, "\\'");
        return `
          <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
            <td class="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">${s}</td>
            <td class="py-3.5 px-3 text-right">
              <button type="button" onclick="deleteSupplier('${safeName}')" class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-all shadow-sm">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

async function deleteSystemUser(id, name) {
  if (appState.currentUser && appState.currentUser.id === id) {
    showToast('Cannot delete active logged-in administrator account.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to delete system user: ' + name + '?')) return;

  if (window.supabaseClient) {
    try {
      const { error } = await window.supabaseClient.from('user_profiles').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      showToast('Error deleting user from cloud: ' + err.message, 'error');
      return;
    }
  }

  appState.users = appState.users.filter(u => u.id !== id);
  appState.staffAccounts = appState.users;
  renderAdminView();
  showToast('System user deleted: ' + name, 'success');
}

async function deleteVetDoctor(idOrName, name) {
  if (!confirm('Are you sure you want to delete veterinarian doctor: ' + name + '?')) return;

  if (window.supabaseClient) {
    try {
      const { error } = await window.supabaseClient.from('vet_doctors').delete().eq('id', idOrName);
      if (error) {
        await window.supabaseClient.from('vet_doctors').delete().eq('name', name);
      }
    } catch (err) {
      console.error(err);
      showToast('Warning: Cloud delete failed. Removed locally.', 'warning');
    }
  }

  appState.vetDoctors = appState.vetDoctors.filter(d => {
    if (typeof d === 'object' && d) {
      return d.id !== idOrName && d.name !== name;
    }
    return d !== idOrName && d !== name;
  });

  if (typeof refreshDoctorDropdowns === 'function') refreshDoctorDropdowns();
  renderAdminView();
  showToast('Veterinarian doctor removed: ' + name, 'success');
}

function deleteSupplier(name) {
  if (!confirm('Are you sure you want to delete supplier: ' + name + '?')) return;
  appState.suppliers = (appState.suppliers || []).filter(s => s !== name);
  if (typeof refreshSupplierDropdowns === 'function') refreshSupplierDropdowns();
  renderAdminView();
  showToast('Supplier removed: ' + name, 'success');
}

window.deleteSystemUser = deleteSystemUser;
window.deleteVetDoctor = deleteVetDoctor;
window.deleteSupplier = deleteSupplier;
window.renderAdminView = renderAdminView;

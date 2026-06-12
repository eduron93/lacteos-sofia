// =====================================================================
// LÁCTEOS SOFÍA — Panel de Administración (API mode)
// =====================================================================

const API = window.location.origin; // mismo servidor que sirve el frontend

// ── Token JWT ─────────────────────────────────────────────────────────
const getToken  = ()      => localStorage.getItem('ls_token');
const setToken  = (t)     => localStorage.setItem('ls_token', t);
const clearToken= ()      => localStorage.removeItem('ls_token');

function authHeader() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

// ── HTTP helpers ──────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res  = await fetch(`${API}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const apiGet  = (path)        => apiFetch(path, { headers: authHeader() });
const apiPost = (path, body)  => apiFetch(path, { method:'POST',  headers: authHeader(), body: JSON.stringify(body) });
const apiPut  = (path, body)  => apiFetch(path, { method:'PUT',   headers: authHeader(), body: JSON.stringify(body) });
const apiDel  = (path)        => apiFetch(path, { method:'DELETE',headers: authHeader() });

// ── Toast ─────────────────────────────────────────────────────────────
function toast(msg, type = 'green') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Auth ──────────────────────────────────────────────────────────────
function checkAuth() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}

async function logout() {
  clearToken();
  window.location.href = 'login.html';
}

// ── Navigation ────────────────────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelectorAll(`.nav-item[data-section="${id}"]`).forEach(n => n.classList.add('active'));

  const titles = {
    empresa:   '🏪 Información de la Empresa',
    productos: '📦 Gestión de Productos',
    promos:    '🎁 Promociones',
    mision:    '📖 Misión y Visión',
    password:  '🔒 Cambiar Contraseña',
  };
  document.getElementById('topbarTitle').textContent = titles[id] || 'Panel Admin';

  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');

  if (id === 'empresa')   loadEmpresa();
  if (id === 'productos') loadProductos();
  if (id === 'promos')    loadPromos();
  if (id === 'mision')    loadMisionVision();
}

// ── EMPRESA ───────────────────────────────────────────────────────────
async function loadEmpresa() {
  try {
    const data = await apiGet('/api/empresa');
    Object.keys(data).forEach(k => {
      const el = document.getElementById('e_' + k);
      if (el) el.value = data[k] || '';
    });
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

async function saveEmpresa() {
  const fields = ['nombre','tagline','telefono','whatsapp','correo','direccion','horario','facebook','instagram'];
  const body   = {};
  fields.forEach(k => { body[k] = document.getElementById('e_' + k)?.value?.trim() || ''; });
  try {
    await apiPut('/api/empresa', body);
    toast('✅ Información guardada');
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

// ── PRODUCTOS ─────────────────────────────────────────────────────────
async function loadProductos() {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#999">Cargando…</td></tr>';
  try {
    const products = await apiGet('/api/productos');
    renderProductsTable(products);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;padding:16px">❌ ${err.message}</td></tr>`;
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTableBody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No hay productos. Agrega uno.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${resolveImg(p.imagen)}" alt="${p.nombre}" class="td-img"
          onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'52\' height=\'52\'><rect width=\'52\' height=\'52\' fill=\'%23D6EFD8\'/><text x=\'50%\' y=\'55%\' text-anchor=\'middle\' font-size=\'22\'>🧀</text></svg>'" /></td>
      <td><strong>${p.nombre}</strong>${p.badge ? `<br><span class="badge badge-gold" style="margin-top:4px">${p.badge}</span>` : ''}</td>
      <td>L. ${Number(p.precio).toFixed(2)}<br><span style="color:#999;font-size:0.78rem">${p.unidad}</span></td>
      <td><span class="badge ${p.agotado ? 'badge-red' : 'badge-green'}">${p.agotado ? 'Agotado' : 'Disponible'}</span></td>
      <td class="td-actions">
        <button class="btn btn-outline btn-sm btn-icon" onclick="openProductModal(${p.id})" title="Editar">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteProduct(${p.id})" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// Ajusta rutas relativas de assets para mostrarlas en el panel admin
function resolveImg(img) {
  if (!img) return '';
  if (img.startsWith('http') || img.startsWith('//')) return img;
  // Si viene como "assets/..." lo convertimos a raíz del sitio
  return img.startsWith('assets/') ? `/${img}` : img;
}

let editingProductId = null;

async function openProductModal(id = null) {
  editingProductId = id;
  const title = document.getElementById('productModalTitle');

  if (id) {
    try {
      const products = await apiGet('/api/productos');
      const p = products.find(x => x.id === id);
      if (!p) return;
      title.textContent = 'Editar Producto';
      document.getElementById('pm_nombre').value    = p.nombre;
      document.getElementById('pm_desc').value      = p.descripcion;
      document.getElementById('pm_precio').value    = p.precio;
      document.getElementById('pm_unidad').value    = p.unidad;
      document.getElementById('pm_img').value       = p.imagen;
      document.getElementById('pm_badge').value     = p.badge || '';
      document.getElementById('pm_agotado').checked = p.agotado;
    } catch (err) {
      toast('❌ ' + err.message, 'red'); return;
    }
  } else {
    title.textContent = 'Agregar Producto';
    document.getElementById('productForm').reset();
  }
  document.getElementById('productModal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  editingProductId = null;
}

async function saveProduct() {
  const nombre  = document.getElementById('pm_nombre').value.trim();
  const precio  = parseFloat(document.getElementById('pm_precio').value) || 0;
  if (!nombre || !precio) { toast('⚠️ Nombre y precio son requeridos', 'red'); return; }

  const body = {
    nombre,
    descripcion: document.getElementById('pm_desc').value.trim(),
    precio,
    unidad:  document.getElementById('pm_unidad').value.trim() || 'por libra',
    imagen:  document.getElementById('pm_img').value.trim(),
    badge:   document.getElementById('pm_badge').value.trim(),
    agotado: document.getElementById('pm_agotado').checked,
  };

  try {
    if (editingProductId) {
      await apiPut(`/api/productos/${editingProductId}`, body);
      toast('✅ Producto actualizado');
    } else {
      await apiPost('/api/productos', body);
      toast('✅ Producto agregado');
    }
    closeProductModal();
    loadProductos();
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    await apiDel(`/api/productos/${id}`);
    toast('🗑️ Producto eliminado', 'red');
    loadProductos();
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

// ── PROMOCIONES ───────────────────────────────────────────────────────
async function loadPromos() {
  const tbody = document.getElementById('promosTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#999">Cargando…</td></tr>';
  try {
    const promos = await apiGet('/api/promociones/todas');
    renderPromosTable(promos);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;padding:16px">❌ ${err.message}</td></tr>`;
  }
}

function renderPromosTable(promos) {
  const tbody = document.getElementById('promosTableBody');
  if (!promos.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">🎁</div><div class="empty-state-text">No hay promociones. Agrega una.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = promos.map(p => `
    <tr>
      <td><span class="badge badge-gold">${p.tag || '—'}</span></td>
      <td><strong style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#B8860B">${p.descuento}</strong></td>
      <td><strong>${p.titulo}</strong><br><span style="color:#999;font-size:0.8rem">${(p.descripcion||'').substring(0,60)}${(p.descripcion||'').length>60?'…':''}</span></td>
      <td><span class="badge ${p.activo ? 'badge-green' : 'badge-gray'}">${p.activo ? 'Activa' : 'Oculta'}</span></td>
      <td class="td-actions">
        <button class="btn btn-outline btn-sm btn-icon" onclick="openPromoModal(${p.id})" title="Editar">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deletePromo(${p.id})" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `).join('');
}

let editingPromoId = null;

async function openPromoModal(id = null) {
  editingPromoId = id;
  const title = document.getElementById('promoModalTitle');

  if (id) {
    try {
      const promos = await apiGet('/api/promociones/todas');
      const p = promos.find(x => x.id === id);
      if (!p) return;
      title.textContent = 'Editar Promoción';
      document.getElementById('prm_tag').value       = p.tag || '';
      document.getElementById('prm_descuento').value = p.descuento || '';
      document.getElementById('prm_titulo').value    = p.titulo;
      document.getElementById('prm_desc').value      = p.descripcion || '';
      document.getElementById('prm_img').value       = p.imagen || '';
      document.getElementById('prm_activo').checked  = p.activo;
    } catch (err) {
      toast('❌ ' + err.message, 'red'); return;
    }
  } else {
    title.textContent = 'Agregar Promoción';
    document.getElementById('promoForm').reset();
    document.getElementById('prm_activo').checked = true;
  }
  document.getElementById('promoModal').classList.add('open');
}

function closePromoModal() {
  document.getElementById('promoModal').classList.remove('open');
  editingPromoId = null;
}

async function savePromo() {
  const titulo    = document.getElementById('prm_titulo').value.trim();
  const descuento = document.getElementById('prm_descuento').value.trim();
  if (!titulo) { toast('⚠️ El título es requerido', 'red'); return; }

  const body = {
    tag:         document.getElementById('prm_tag').value.trim(),
    descuento,
    titulo,
    descripcion: document.getElementById('prm_desc').value.trim(),
    imagen:      document.getElementById('prm_img').value.trim(),
    activo:      document.getElementById('prm_activo').checked,
  };

  try {
    if (editingPromoId) {
      await apiPut(`/api/promociones/${editingPromoId}`, body);
      toast('✅ Promoción actualizada');
    } else {
      await apiPost('/api/promociones', body);
      toast('✅ Promoción agregada');
    }
    closePromoModal();
    loadPromos();
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

async function deletePromo(id) {
  if (!confirm('¿Eliminar esta promoción?')) return;
  try {
    await apiDel(`/api/promociones/${id}`);
    toast('🗑️ Promoción eliminada', 'red');
    loadPromos();
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

// ── MISIÓN Y VISIÓN ───────────────────────────────────────────────────
async function loadMisionVision() {
  try {
    const data = await apiGet('/api/contenido');
    document.getElementById('mv_mision').value = data.mision || '';
    document.getElementById('mv_vision').value = data.vision || '';
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

async function saveMisionVision() {
  const body = {
    mision: document.getElementById('mv_mision').value.trim(),
    vision: document.getElementById('mv_vision').value.trim(),
  };
  try {
    await apiPut('/api/contenido', body);
    toast('✅ Misión y visión guardadas');
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

// ── CONTRASEÑA ────────────────────────────────────────────────────────
async function changePassword() {
  const currentPassword = document.getElementById('pwd_current').value;
  const newPassword     = document.getElementById('pwd_new').value;
  const confirm         = document.getElementById('pwd_confirm').value;

  if (!currentPassword || !newPassword || !confirm) { toast('⚠️ Completa todos los campos', 'red'); return; }
  if (newPassword !== confirm) { toast('⚠️ Las contraseñas nuevas no coinciden', 'red'); return; }
  if (newPassword.length < 6) { toast('⚠️ Mínimo 6 caracteres', 'red'); return; }

  try {
    await apiPost('/api/auth/password', { currentPassword, newPassword });
    document.getElementById('pwdForm').reset();
    toast('✅ Contraseña actualizada. Vuelve a iniciar sesión.');
    setTimeout(() => logout(), 2000);
  } catch (err) {
    toast('❌ ' + err.message, 'red');
  }
}

// ── MOBILE SIDEBAR ────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarBackdrop').classList.toggle('open');
}

// ── INIT ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  showSection('empresa');
});

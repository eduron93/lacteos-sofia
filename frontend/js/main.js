// =====================================================================
// LÁCTEOS SOFÍA — datos consumidos desde la API
// =====================================================================

// Catálogo activo (se llena al cargar la página desde la API)
let EMPRESA  = {};
let PRODUCTS = {}; // { nombre -> { price, unit, img, agotado } }

// ── Render de productos ───────────────────────────────────────────────
function renderProductsGrid(productos) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!productos || !productos.length) {
    grid.innerHTML = '<p style="text-align:center;color:#888;padding:40px">No hay productos disponibles.</p>';
    return;
  }
  grid.innerHTML = productos.map((p, i) => {
    const delay    = ['reveal-delay-1','reveal-delay-2','reveal-delay-3'][i % 3];
    const badge    = p.badge ? `<span class="product-card-badge">${p.badge}</span>` : '';
    const btnClass = p.agotado ? 'btn-agotado' : 'btn-cart';
    const btnText  = p.agotado ? '🚫 Agotado' : '+ Pedir';
    const btnAttr  = p.agotado ? 'disabled' : `onclick="addToCart('${p.nombre.replace(/'/g, "\\'")}')"`;
    return `
      <div class="product-card reveal ${delay}">
        <div class="product-card-img">
          <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" onerror="this.src='assets/Logo.png'" />
          ${badge}
        </div>
        <div class="product-card-body">
          <h3 class="product-card-name">${p.nombre}</h3>
          <p class="product-card-desc">${p.descripcion}</p>
          <div class="product-card-footer">
            <div>
              <div class="product-price">L. ${Number(p.precio).toFixed(0)}<span style="font-size:0.9rem">.00</span></div>
              <div class="product-price-label">${p.unidad}</div>
            </div>
            <button id="btn-${p.nombre}" class="${btnClass}" ${btnAttr}>${btnText}</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Re-activar IntersectionObserver para los nuevos elementos
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
}

// ── Render de promociones ─────────────────────────────────────────────
function renderPromos(promos) {
  const section = document.getElementById('promociones');
  const grid    = document.getElementById('promosGrid');
  if (!grid || !section) return;

  if (!promos || !promos.length) { section.style.display = 'none'; return; }

  section.style.display = '';
  grid.innerHTML = promos.map((p, i) => {
    const delay   = ['reveal-delay-1','reveal-delay-2','reveal-delay-3'][i % 3];
    const bgStyle = p.imagen
      ? `background-image:url('${p.imagen}')`
      : 'background:linear-gradient(135deg,#1A5C2A,#2E8B47)';
    return `
      <div class="promo-card reveal ${delay}">
        <div class="promo-card-bg" style="${bgStyle}"></div>
        <div class="promo-card-content">
          <span class="promo-tag">${p.tag || '🎁 Promoción'}</span>
          <div class="promo-discount">${p.descuento}</div>
          <h3 class="promo-title">${p.titulo}</h3>
          <p class="promo-desc">${p.descripcion}</p>
          <a href="#contacto" class="btn btn-gold">Pedir Ahora</a>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
}

// ── Aplicar datos de empresa al DOM ──────────────────────────────────
function applyEmpresa(E) {
  document.getElementById('pageTitle').textContent =
    `${E.nombre} – Frescura y calidad para tu familia`;
  document.getElementById('pageDesc').setAttribute('content',
    `${E.nombre}: productores artesanales de leche fresca, quesos, mantequilla, yogurt y más.`);

  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.getAttribute('data-bind');
    if (E[key] !== undefined) el.textContent = E[key];
  });

  const wa    = `https://wa.me/${E.whatsapp}`;
  const waMsg = encodeURIComponent(`Hola, quiero hacer un pedido de ${E.nombre} `);
  document.getElementById('waFloat').href          = `${wa}?text=${waMsg}`;
  document.getElementById('linkWhatsapp').href     = wa;
  document.getElementById('linkFacebook').href     = E.facebook;
  document.getElementById('linkInstagram').href    = E.instagram;
  document.getElementById('footerLinkWhatsapp').href  = wa;
  document.getElementById('footerLinkFacebook').href  = E.facebook;
  document.getElementById('footerLinkInstagram').href = E.instagram;
}

// ── Cargar todo desde la API ──────────────────────────────────────────
async function initSitio() {
  try {
    const res  = await fetch('/api/sitio');
    const data = await res.json();

    // Empresa
    EMPRESA = data.empresa || {};
    applyEmpresa(EMPRESA);

    // Productos → llenar catálogo para el carrito
    (data.productos || []).forEach(p => {
      PRODUCTS[p.nombre] = { price: Number(p.precio), unit: p.unidad, img: p.imagen, agotado: p.agotado, emoji: '🧀' };
    });
    renderProductsGrid(data.productos);

    // Promociones
    renderPromos(data.promos);

    // Misión y visión
    const elM = document.getElementById('textoMision');
    const elV = document.getElementById('textoVision');
    if (elM) elM.textContent = data.mision || '';
    if (elV) elV.textContent = data.vision || '';

  } catch (err) {
    console.error('Error al cargar datos del sitio:', err);
    // Mostrar mensaje de error discreto en la consola; el sitio queda con estructura visible
  }
}

initSitio();


let cart = {}; // { productName: quantity }

// ============ CART UI ============
function toggleCart() {
  document.getElementById('cartDrawer').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

function renderCart() {
  const keys = Object.keys(cart);
  const isEmpty = keys.length === 0;

  // Empty / items visibility
  document.getElementById('cartEmpty').style.display = isEmpty ? 'block' : 'none';
  document.getElementById('cartItems').style.display = isEmpty ? 'none' : 'block';
  document.getElementById('cartFooter').style.display = isEmpty ? 'none' : 'block';

  // Subtitle
  const totalQty = keys.reduce((s, k) => s + cart[k], 0);
  document.getElementById('cartSubtitle').textContent =
    totalQty === 0 ? '0 productos' : `${totalQty} producto${totalQty > 1 ? 's' : ''}`;

  // Render items
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  keys.forEach(name => {
    const p = PRODUCTS[name];
    const qty = cart[name];
    const lineTotal = p.price * qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-item-img" src="${p.img}" alt="${name}" loading="lazy" />
      <div class="cart-item-info">
        <div class="cart-item-name">${name}</div>
        <div class="cart-item-unit">${p.unit} · L. ${p.price}.00 c/u</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty('${name}', -1)">−</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" onclick="changeQty('${name}', 1)">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <span class="cart-item-price">L. ${lineTotal.toFixed(2)}</span>
        <button class="cart-item-remove" onclick="removeItem('${name}')" title="Eliminar">✕</button>
      </div>
    `;
    container.appendChild(div);
  });

  // Totals
  const subtotal = keys.reduce((s, k) => s + PRODUCTS[k].price * cart[k], 0);
  document.getElementById('cartSubtotal').textContent = `L. ${subtotal.toFixed(2)}`;
  document.getElementById('cartTotal').textContent    = `L. ${subtotal.toFixed(2)}`;

  // Nav count badge
  const countEl = document.getElementById('cartNavCount');
  const prevCount = parseInt(countEl.textContent) || 0;
  countEl.textContent = totalQty;
  if (totalQty !== prevCount) {
    countEl.classList.add('bump');
    setTimeout(() => countEl.classList.remove('bump'), 300);
  }
}

function addToCart(name) {
  if (!PRODUCTS[name]) return;
  
  // Bloquear si está agotado
  if (PRODUCTS[name].agotado) {
    showToast('🚫 Este producto está agotado por el momento');
    return;
  }

  cart[name] = (cart[name] || 0) + 1;
  renderCart();
  showToast(`✅ ${PRODUCTS[name].emoji} ${name} agregado al carrito`);

  // Briefly tint the button
  const btns = document.querySelectorAll('.btn-cart');
  btns.forEach(b => {
    if (b.getAttribute('onclick') === `addToCart('${name}')`) {
      b.classList.add('btn-cart-added');
      b.textContent = '✓ Agregado';
      setTimeout(() => { b.classList.remove('btn-cart-added'); b.textContent = '+ Pedir'; }, 1600);
    }
  });
}
function changeQty(name, delta) {
  if (!cart[name]) return;
  cart[name] += delta;
  if (cart[name] <= 0) delete cart[name];
  renderCart();
}

function removeItem(name) {
  delete cart[name];
  renderCart();
  showToast(`🗑️ ${name} eliminado del carrito`);
}

function clearCart() {
  if (!Object.keys(cart).length) return;
  if (confirm('¿Vaciar el carrito?')) { cart = {}; renderCart(); }
}

// ============ CHECKOUT VIA WHATSAPP ============
function checkoutWhatsApp() {
  const keys = Object.keys(cart);
  if (!keys.length) { showToast('⚠️ El carrito está vacío'); return; }

  const lines = keys.map(name => {
    const p = PRODUCTS[name];
    const qty = cart[name];
    return `  • ${name} × ${qty} (${p.unit}) = L. ${(p.price * qty).toFixed(2)}`;
  });

  const subtotal = keys.reduce((s, k) => s + PRODUCTS[k].price * cart[k], 0);
  const note = document.getElementById('cartNote').value.trim();

  const msg =
    `*Pedido – ${EMPRESA.nombre}*\n\n` +
    `${lines.join('\n')}\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `*Total: L. ${subtotal.toFixed(2)}*\n` +
    (note ? `\n Nota: ${note}` : '') +
    `\n\n¡Gracias! Confirmo disponibilidad enseguida `;

  window.open(`https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  showToast(' Redirigiendo a WhatsApp con tu pedido…');
}

// ============ INIT RENDER ============
renderCart();

// ============ EXISTING FUNCTIONS ============
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

let slideIndex = 0;
function getVisible() { return window.innerWidth <= 768 ? 1 : 3; }
function slideTestimonials(dir) {
  const track = document.getElementById('testimonialTrack');
  const cards = track.querySelectorAll('.testimonial-card');
  const visible = getVisible();
  const max = cards.length - visible;
  slideIndex = Math.max(0, Math.min(slideIndex + dir, max));
  const cardWidth = cards[0].offsetWidth + 28;
  track.style.transform = `translateX(-${slideIndex * cardWidth}px)`;
}
window.addEventListener('resize', () => slideTestimonials(0));

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function submitForm() {
  const nombre   = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const correo   = document.getElementById('correo').value.trim();
  const mensaje  = document.getElementById('mensaje').value.trim();
  if (!nombre || !telefono) { showToast(' Por favor completa nombre y teléfono.'); return; }
  const text = `Hola ${EMPRESA.nombre} \n\nNombre: ${nombre}\nTeléfono: ${telefono}\nCorreo: ${correo || 'N/A'}\n\nMensaje:\n${mensaje || 'Sin mensaje adicional.'}`;
  window.open(`https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
  showToast(' Redirigiendo a WhatsApp…');
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('correo').value = '';
  document.getElementById('mensaje').value = '';
}



// Año automático en el copyright
document.getElementById('copyright-year').textContent = new Date().getFullYear();


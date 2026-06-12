require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Servir el frontend estático
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ── Rutas API ─────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/empresa',     require('./routes/empresa'));
app.use('/api/productos',   require('./routes/productos'));
app.use('/api/promociones', require('./routes/promociones'));
app.use('/api/contenido',   require('./routes/contenido'));

// Endpoint combinado: el sitio carga todo de una vez al abrir la página
app.get('/api/sitio', async (req, res) => {
  const pool = require('./db');
  try {
    const [empresa, productos, promos, contenido] = await Promise.all([
      pool.query('SELECT * FROM empresa LIMIT 1'),
      pool.query('SELECT * FROM productos ORDER BY orden ASC, id ASC'),
      pool.query('SELECT * FROM promociones WHERE activo=TRUE ORDER BY orden ASC, id ASC'),
      pool.query('SELECT clave, valor FROM contenido'),
    ]);

    const contenidoMap = {};
    contenido.rows.forEach(r => { contenidoMap[r.clave] = r.valor; });

    res.json({
      empresa:    empresa.rows[0] || {},
      productos:  productos.rows,
      promos:     promos.rows,
      mision:     contenidoMap.mision || '',
      vision:     contenidoMap.vision || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback: cualquier ruta no API devuelve el index
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ── Iniciar ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;

async function startServer() {
  // Ejecutar setup de DB al arrancar (crea tablas y datos si no existen)
  try {
    await require('./setup-db').run();
  } catch (err) {
    console.error('Advertencia en setup DB:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n🥛 Lácteos Sofía API corriendo en http://localhost:${PORT}`);
    console.log(`   Panel admin: http://localhost:${PORT}/admin/login.html\n`);
  });
}

startServer();

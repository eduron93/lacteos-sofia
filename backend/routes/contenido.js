const express     = require('express');
const pool        = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/contenido  (público)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT clave, valor FROM contenido');
    const data = {};
    rows.forEach(r => { data[r.clave] = r.valor; });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contenido  (protegido)
router.put('/', requireAuth, async (req, res) => {
  const { mision, vision } = req.body;
  try {
    await pool.query(
      'INSERT INTO contenido (clave,valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor=$2',
      ['mision', mision || '']
    );
    await pool.query(
      'INSERT INTO contenido (clave,valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor=$2',
      ['vision', vision || '']
    );
    res.json({ mision, vision });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

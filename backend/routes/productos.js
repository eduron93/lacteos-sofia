const express     = require('express');
const pool        = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/productos  (público)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM productos ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos  (protegido)
router.post('/', requireAuth, async (req, res) => {
  const { nombre, descripcion, precio, unidad, imagen, badge, agotado, orden } = req.body;
  if (!nombre || precio === undefined) return res.status(400).json({ error: 'nombre y precio son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO productos (nombre,descripcion,precio,unidad,imagen,badge,agotado,orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nombre, descripcion || '', precio, unidad || 'por libra', imagen || '', badge || '', agotado ?? false, orden ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/productos/:id  (protegido)
router.put('/:id', requireAuth, async (req, res) => {
  const { nombre, descripcion, precio, unidad, imagen, badge, agotado, orden } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE productos SET nombre=$1,descripcion=$2,precio=$3,unidad=$4,imagen=$5,badge=$6,agotado=$7,orden=$8
       WHERE id=$9 RETURNING *`,
      [nombre, descripcion, precio, unidad, imagen, badge, agotado, orden ?? 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/productos/:id  (protegido)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express     = require('express');
const pool        = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/promociones  (público — devuelve solo las activas)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM promociones WHERE activo=TRUE ORDER BY orden ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/promociones/todas  (protegido — devuelve todas, activas e inactivas)
router.get('/todas', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM promociones ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promociones  (protegido)
router.post('/', requireAuth, async (req, res) => {
  const { tag, descuento, titulo, descripcion, imagen, activo, orden } = req.body;
  if (!titulo) return res.status(400).json({ error: 'titulo es requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO promociones (tag,descuento,titulo,descripcion,imagen,activo,orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tag || '', descuento || '', titulo, descripcion || '', imagen || '', activo ?? true, orden ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/promociones/:id  (protegido)
router.put('/:id', requireAuth, async (req, res) => {
  const { tag, descuento, titulo, descripcion, imagen, activo, orden } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE promociones SET tag=$1,descuento=$2,titulo=$3,descripcion=$4,imagen=$5,activo=$6,orden=$7
       WHERE id=$8 RETURNING *`,
      [tag, descuento, titulo, descripcion, imagen, activo, orden ?? 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Promoción no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/promociones/:id  (protegido)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM promociones WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Promoción no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

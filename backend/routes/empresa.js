const express     = require('express');
const pool        = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/empresa  (público — el sitio lo consume)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM empresa LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/empresa  (protegido)
router.put('/', requireAuth, async (req, res) => {
  const { nombre, tagline, telefono, whatsapp, correo, direccion, horario, facebook, instagram } = req.body;
  try {
    const { rows } = await pool.query('SELECT id FROM empresa LIMIT 1');
    if (rows.length) {
      await pool.query(
        `UPDATE empresa SET nombre=$1,tagline=$2,telefono=$3,whatsapp=$4,correo=$5,
         direccion=$6,horario=$7,facebook=$8,instagram=$9 WHERE id=$10`,
        [nombre, tagline, telefono, whatsapp, correo, direccion, horario, facebook, instagram, rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO empresa (nombre,tagline,telefono,whatsapp,correo,direccion,horario,facebook,instagram)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [nombre, tagline, telefono, whatsapp, correo, direccion, horario, facebook, instagram]
      );
    }
    const { rows: updated } = await pool.query('SELECT * FROM empresa LIMIT 1');
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

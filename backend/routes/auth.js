const express = require('express');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');

const router = express.Router();
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

  try {
    const { rows } = await pool.query('SELECT password_hash FROM admin_config LIMIT 1');
    if (!rows.length) return res.status(500).json({ error: 'Admin no configurado' });

    if (sha256(password) !== rows[0].password_hash) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/password
const requireAuth = require('../middleware/auth');
router.post('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan campos' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });

  try {
    const { rows } = await pool.query('SELECT password_hash FROM admin_config LIMIT 1');
    if (sha256(currentPassword) !== rows[0].password_hash) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    await pool.query('UPDATE admin_config SET password_hash=$1', [sha256(newPassword)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

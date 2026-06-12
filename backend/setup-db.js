require('dotenv').config();
const crypto = require('crypto');
const pool   = require('./db');

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

async function setup(closePool = true) {
  const client = await pool.connect();
  try {
    console.log('Conectando a PostgreSQL…');
    await client.query('BEGIN');

    // ── Tablas ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        id            SERIAL PRIMARY KEY,
        password_hash TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS empresa (
        id        SERIAL PRIMARY KEY,
        nombre    TEXT,
        tagline   TEXT,
        telefono  TEXT,
        whatsapp  TEXT,
        correo    TEXT,
        direccion TEXT,
        horario   TEXT,
        facebook  TEXT,
        instagram TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id          SERIAL PRIMARY KEY,
        nombre      TEXT    NOT NULL,
        descripcion TEXT,
        precio      NUMERIC(10,2) NOT NULL DEFAULT 0,
        unidad      TEXT,
        imagen      TEXT,
        badge       TEXT,
        agotado     BOOLEAN NOT NULL DEFAULT FALSE,
        orden       INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS promociones (
        id          SERIAL PRIMARY KEY,
        tag         TEXT,
        descuento   TEXT,
        titulo      TEXT NOT NULL,
        descripcion TEXT,
        imagen      TEXT,
        activo      BOOLEAN NOT NULL DEFAULT TRUE,
        orden       INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS contenido (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );
    `);

    // ── Datos iniciales (solo si las tablas están vacías) ───────────

    // Admin password
    const { rowCount: adminCount } = await client.query('SELECT 1 FROM admin_config LIMIT 1');
    if (adminCount === 0) {
      const pwd = process.env.ADMIN_PASSWORD || 'sofia2024';
      await client.query('INSERT INTO admin_config (password_hash) VALUES ($1)', [sha256(pwd)]);
      console.log(`✅ Admin creado. Contraseña inicial: "${pwd}"`);
    }

    // Empresa
    const { rowCount: empCount } = await client.query('SELECT 1 FROM empresa LIMIT 1');
    if (empCount === 0) {
      await client.query(`
        INSERT INTO empresa (nombre, tagline, telefono, whatsapp, correo, direccion, horario, facebook, instagram)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        'Lácteos Sofía',
        'Calidad Artesanal Desde 1998',
        '+504 9812-6214',
        '50498126214',
        'lacteos.sofia24@gmail.com',
        'Km 11 Carretera a Olancho, Tegucigalpa, Honduras',
        'Lun–Sáb 6:00am – 5:00pm · Dom 7:00am – 12:00pm',
        'https://facebook.com/lacteosdelvalle',
        'https://instagram.com/lacteosdelvalle',
      ]);
      console.log('✅ Empresa inicial cargada.');
    }

    // Productos
    const { rowCount: prodCount } = await client.query('SELECT 1 FROM productos LIMIT 1');
    if (prodCount === 0) {
      const prods = [
        ['Queso Seco',           'Suave, blanco y delicioso. Ideal para acompañar baleadas, plátanos y más.',          85, 'por libra', 'assets/QuesoSeco.png',       '',        false, 1],
        ['Queso Fresco',         'Suave, blanco y delicioso. Ideal para acompañar baleadas, plátanos y más.',          85, 'por libra', 'assets/QuesoFresco.png',      '',        false, 2],
        ['Queso Semiseco',       'Madurado lentamente para un sabor más intenso y una textura firme perfecta.',         90, 'por libra', 'assets/QuesoSemiSeco.png',    '',        false, 3],
        ['Quesillo',             'Nuestro quesillo artesanal, elástico y cremoso, elaborado de forma tradicional.',     69, 'por libra', 'assets/Quesillo.png',         'Especial', false, 4],
        ['Mantequilla Artesanal','Batida a mano con crema pura. Un sabor auténtico que no encontrarás en las tiendas.',70, 'por libra', 'assets/MantequillaCrema.png', '',        false, 5],
        ['Requesón',             'Suave y ricota-like, ideal para recetas dulces y saladas. Alto en proteínas.',        55, 'por libra', 'assets/Requeson.png',         '',        false, 6],
      ];
      for (const p of prods) {
        await client.query(
          'INSERT INTO productos (nombre,descripcion,precio,unidad,imagen,badge,agotado,orden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          p
        );
      }
      console.log('✅ Productos iniciales cargados.');
    }

    // Misión y Visión
    const { rowCount: mvCount } = await client.query("SELECT 1 FROM contenido WHERE clave='mision' LIMIT 1");
    if (mvCount === 0) {
      await client.query("INSERT INTO contenido VALUES ('mision', $1)", [
        'Producir lácteos de la más alta calidad, respetando la naturaleza y garantizando nutrición real a cada familia.'
      ]);
      await client.query("INSERT INTO contenido VALUES ('vision', $1)", [
        'Ser la marca de lácteos más confiable y querida de la región, expandiendo el sabor del campo a todo el país.'
      ]);
      console.log('✅ Misión y visión cargadas.');
    }

    await client.query('COMMIT');
    console.log('✅ Base de datos lista.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en setup DB:', err.message);
    throw err;
  } finally {
    client.release();
    if (closePool) await pool.end();
  }
}

// Exportar para uso desde server.js
module.exports = { run: () => setup(false) };

// Ejecutar directamente si se llama con: node setup-db.js
if (require.main === module) {
  setup(true).catch(() => process.exit(1));
}

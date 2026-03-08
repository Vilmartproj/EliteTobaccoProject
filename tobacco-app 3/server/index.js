// ============================================================
// server/index.js  –  Elite Tobacco Backend (Express + SQLite)
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3001;

// ── Database setup ──────────────────────────────────────────
const db = new Database(path.join(__dirname, 'tobacco.db'), { verbose: console.log });

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS buyers (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    code      TEXT    UNIQUE NOT NULL,
    name      TEXT    NOT NULL,
    password  TEXT    NOT NULL,
    created_at TEXT   DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_code TEXT    UNIQUE NOT NULL,
    buyer_id    INTEGER REFERENCES buyers(id),
    used        INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bags (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_code      TEXT    UNIQUE NOT NULL,
    buyer_id         INTEGER NOT NULL REFERENCES buyers(id),
    buyer_code       TEXT,
    buyer_name       TEXT,
    fcv              TEXT,
    apf_number       TEXT,
    tobacco_grade    TEXT,
    weight           REAL,
    buyer_grade      TEXT,
    date_of_purchase TEXT,
    purchase_location TEXT,
    moisture         REAL,
    colour           TEXT,
    sandy_leaves     REAL,
    total_bales      INTEGER,
    saved_at         TEXT    DEFAULT (datetime('now'))
  );
`);

// Seed default data if empty
const buyerCount = db.prepare('SELECT COUNT(*) as c FROM buyers').get().c;
if (buyerCount === 0) {
  const insertBuyer = db.prepare('INSERT INTO buyers (code, name, password) VALUES (?, ?, ?)');
  insertBuyer.run('B001', 'Ravi Kumar',   'B001');
  insertBuyer.run('B002', 'Suresh Reddy', 'B002');
  insertBuyer.run('B003', 'Anitha Devi',  'B003');

  const insertQR = db.prepare('INSERT INTO qr_codes (unique_code, buyer_id) VALUES (?, ?)');
  insertQR.run('113', 1);
  insertQR.run('114', 1);
  insertQR.run('115', 2);
  insertQR.run('116', null);
  insertQR.run('117', null);

  console.log('✅ Seeded default buyers and QR codes');
}

app.use(cors());
app.use(express.json());

// ── AUTH ────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { code, password, role } = req.body;
  if (role === 'admin') {
    if (code === 'admin' && password === 'admin123') {
      return res.json({ success: true, user: { role: 'admin', name: 'Administrator' } });
    }
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  const buyer = db.prepare('SELECT * FROM buyers WHERE code = ? AND password = ?')
    .get(code?.toUpperCase(), password?.toUpperCase());
  if (!buyer) return res.status(401).json({ error: 'Invalid buyer code or password' });
  res.json({ success: true, user: { role: 'buyer', ...buyer } });
});

// ── BUYERS ──────────────────────────────────────────────────
app.get('/api/buyers', (req, res) => {
  res.json(db.prepare('SELECT * FROM buyers ORDER BY id').all());
});

app.post('/api/buyers', (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name required' });
  try {
    const result = db.prepare('INSERT INTO buyers (code, name, password) VALUES (?, ?, ?)')
      .run(code.toUpperCase(), name, code.toUpperCase());
    res.json(db.prepare('SELECT * FROM buyers WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: 'Buyer code already exists' });
  }
});

// ── QR CODES ────────────────────────────────────────────────
app.get('/api/qrcodes', (req, res) => {
  const rows = db.prepare(`
    SELECT q.*, b.code as buyer_code, b.name as buyer_name
    FROM qr_codes q
    LEFT JOIN buyers b ON q.buyer_id = b.id
    ORDER BY q.id
  `).all();
  res.json(rows);
});

app.post('/api/qrcodes/generate', (req, res) => {
  const { startCode, count, buyerId } = req.body;
  const insert = db.prepare('INSERT OR IGNORE INTO qr_codes (unique_code, buyer_id) VALUES (?, ?)');
  const generated = [];
  const tx = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const code = String(parseInt(startCode) + i);
      const result = insert.run(code, buyerId || null);
      if (result.changes > 0) generated.push(code);
    }
  });
  tx();
  res.json({ generated, count: generated.length });
});

app.put('/api/qrcodes/:id/assign', (req, res) => {
  const { buyerId } = req.body;
  db.prepare('UPDATE qr_codes SET buyer_id = ? WHERE id = ?').run(buyerId, req.params.id);
  res.json({ success: true });
});

app.get('/api/qrcodes/validate/:code', (req, res) => {
  const qr = db.prepare('SELECT * FROM qr_codes WHERE unique_code = ?').get(req.params.code);
  if (!qr) return res.json({ valid: false, error: 'Code not found in system' });
  if (qr.used) {
    // Find which buyer already used it
    const bag = db.prepare('SELECT buyer_code, buyer_name, date_of_purchase FROM bags WHERE unique_code = ?').get(req.params.code);
    const msg = bag
      ? `This code was already entered by ${bag.buyer_name} (${bag.buyer_code}) on ${bag.date_of_purchase}`
      : 'This code has already been used';
    return res.json({ valid: false, error: msg, alreadyUsed: true });
  }
  res.json({ valid: true, qr });
});

// ── BAGS ────────────────────────────────────────────────────
app.get('/api/bags', (req, res) => {
  const { buyer_id } = req.query;
  const query = buyer_id
    ? 'SELECT * FROM bags WHERE buyer_id = ? ORDER BY id DESC'
    : 'SELECT * FROM bags ORDER BY id DESC';
  const rows = buyer_id
    ? db.prepare(query).all(buyer_id)
    : db.prepare(query).all();
  res.json(rows);
});

app.post('/api/bags', (req, res) => {
  const b = req.body;
  try {
    db.prepare(`
      INSERT INTO bags (unique_code, buyer_id, buyer_code, buyer_name, fcv, apf_number,
        tobacco_grade, weight, buyer_grade, date_of_purchase, purchase_location,
        moisture, colour, sandy_leaves, total_bales)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(unique_code) DO UPDATE SET
        fcv=excluded.fcv, apf_number=excluded.apf_number,
        tobacco_grade=excluded.tobacco_grade, weight=excluded.weight,
        buyer_grade=excluded.buyer_grade, date_of_purchase=excluded.date_of_purchase,
        purchase_location=excluded.purchase_location, moisture=excluded.moisture,
        colour=excluded.colour, sandy_leaves=excluded.sandy_leaves,
        total_bales=excluded.total_bales
    `).run(b.unique_code, b.buyer_id, b.buyer_code, b.buyer_name, b.fcv,
      b.apf_number, b.tobacco_grade, b.weight, b.buyer_grade,
      b.date_of_purchase, b.purchase_location, b.moisture,
      b.colour, b.sandy_leaves, b.total_bales);

    // Mark QR as used
    db.prepare('UPDATE qr_codes SET used = 1 WHERE unique_code = ?').run(b.unique_code);

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── DATABASE VIEWER (admin only) ────────────────────────────
app.get('/api/db/tables', (req, res) => {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map(r => r.name);
  res.json(tables);
});

app.get('/api/db/table/:name', (req, res) => {
  const name = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  try {
    const rows = db.prepare(`SELECT * FROM "${name}" ORDER BY id DESC LIMIT 500`).all();
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    // Also get count
    const total = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get().c;
    res.json({ rows, cols, total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/db/query', (req, res) => {
  const { sql } = req.query;
  if (!sql) return res.status(400).json({ error: 'No SQL provided' });
  // Safety: only allow SELECT
  if (!/^\s*SELECT/i.test(sql)) {
    return res.status(403).json({ error: 'Only SELECT queries allowed in viewer' });
  }
  try {
    const rows = db.prepare(sql).all();
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    res.json({ rows, cols, total: rows.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Stats ────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({
    buyers:    db.prepare('SELECT COUNT(*) as c FROM buyers').get().c,
    qrcodes:   db.prepare('SELECT COUNT(*) as c FROM qr_codes').get().c,
    qr_used:   db.prepare('SELECT COUNT(*) as c FROM qr_codes WHERE used=1').get().c,
    qr_avail:  db.prepare('SELECT COUNT(*) as c FROM qr_codes WHERE used=0').get().c,
    bags:      db.prepare('SELECT COUNT(*) as c FROM bags').get().c,
    total_weight: db.prepare('SELECT COALESCE(SUM(weight),0) as w FROM bags').get().w,
  });
});

app.listen(PORT, () => {
  console.log(`\n🌿 Elite Tobacco Server running at http://localhost:${PORT}`);
  console.log(`   Database: ${path.join(__dirname, 'tobacco.db')}\n`);
});

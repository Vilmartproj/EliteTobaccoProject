// ============================================================
// server/index.js  –  Elite Tobacco Backend (Express + In-Memory)
// ============================================================
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// ── In-Memory Database ──────────────────────────────────────
let nextId = { buyers: 4, qr_codes: 6, bags: 1 };

const db = {
  buyers: [
    { id: 1, code: 'B001', name: 'Ravi Kumar', password: 'B001', created_at: new Date().toISOString() },
    { id: 2, code: 'B002', name: 'Suresh Reddy', password: 'B002', created_at: new Date().toISOString() },
    { id: 3, code: 'B003', name: 'Anitha Devi', password: 'B003', created_at: new Date().toISOString() },
  ],
  qr_codes: [
    { id: 1, unique_code: '113', buyer_id: 1, used: 0, created_at: new Date().toISOString() },
    { id: 2, unique_code: '114', buyer_id: 1, used: 0, created_at: new Date().toISOString() },
    { id: 3, unique_code: '115', buyer_id: 2, used: 0, created_at: new Date().toISOString() },
    { id: 4, unique_code: '116', buyer_id: null, used: 0, created_at: new Date().toISOString() },
    { id: 5, unique_code: '117', buyer_id: null, used: 0, created_at: new Date().toISOString() },
  ],
  bags: [
  ],
};

console.log('✅ In-memory database initialized');

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
  const buyer = db.buyers.find(b => b.code === code?.toUpperCase() && b.password === password?.toUpperCase());
  if (!buyer) return res.status(401).json({ error: 'Invalid buyer code or password' });
  res.json({ success: true, user: { role: 'buyer', ...buyer } });
});

// ── BUYERS ──────────────────────────────────────────────────
app.get('/api/buyers', (req, res) => {
  res.json(db.buyers);
});

app.post('/api/buyers', (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name required' });
  const newBuyer = {
    id: nextId.buyers++,
    code: code.toUpperCase(),
    name,
    password: code.toUpperCase(),
    created_at: new Date().toISOString()
  };
  db.buyers.push(newBuyer);
  res.json(newBuyer);
});

// ── QR CODES ────────────────────────────────────────────────
app.get('/api/qrcodes', (req, res) => {
  res.json(db.qr_codes);
});

app.post('/api/qrcodes/generate', (req, res) => {
  const { startCode, count, buyerId } = req.body || {};
  const n = Math.max(1, parseInt(count, 10) || 1);
  const parsedStart = parseInt(startCode, 10);
  const parsedBuyerId = buyerId ? parseInt(buyerId, 10) : null;
  const codes = [];

  if (parsedBuyerId) {
    const buyerExists = db.buyers.some(b => b.id === parsedBuyerId);
    if (!buyerExists) return res.status(400).json({ error: 'Invalid buyerId' });
  }

  const existing = new Set(db.qr_codes.map(q => q.unique_code));

  if (Number.isFinite(parsedStart)) {
    for (let i = 0; i < n; i++) {
      const candidate = String(parsedStart + i);
      if (existing.has(candidate)) {
        return res.status(400).json({ error: `QR code ${candidate} already exists` });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    let generatedCode;

    if (Number.isFinite(parsedStart)) {
      generatedCode = String(parsedStart + i);
    } else {
      do {
        generatedCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      } while (existing.has(generatedCode));
    }

    existing.add(generatedCode);

    const code = {
      id: nextId.qr_codes++,
      unique_code: generatedCode,
      buyer_id: parsedBuyerId,
      used: 0,
      created_at: new Date().toISOString()
    };

    db.qr_codes.push(code);
    codes.push(code);
  }

  res.json({ count: codes.length, codes });
});

app.put('/api/qrcodes/:id/assign', (req, res) => {
  const { id } = req.params;
  const { buyerId } = req.body;
  const qr = db.qr_codes.find(q => q.id == id);
  if (!qr) return res.status(404).json({ error: 'QR code not found' });
  qr.buyer_id = buyerId;
  res.json(qr);
});

app.get('/api/qrcodes/validate/:code', (req, res) => {
  const { code } = req.params;
  const qr = db.qr_codes.find(q => q.unique_code === code);
  if (!qr) return res.json({ valid: false, error: 'QR code not found' });
  if (qr.used) return res.json({ valid: false, alreadyUsed: true, error: 'QR code already used' });
  res.json({ valid: true, qr });
});

// ── BAGS ────────────────────────────────────────────────────
app.get('/api/bags', (req, res) => {
  const { buyer_id } = req.query;
  let bags = db.bags;
  if (buyer_id) bags = bags.filter(b => b.buyer_id == buyer_id);
  res.json(bags);
});

app.post('/api/bags', (req, res) => {
  const body = req.body;
  const now = new Date().toISOString();
  const newBag = {
    id: nextId.bags++,
    unique_code: body.unique_code || '' + Math.random(),
    buyer_id: body.buyer_id,
    buyer_code: body.buyer_code,
    buyer_name: body.buyer_name,
    fcv: body.fcv,
    apf_number: body.apf_number,
    tobacco_grade: body.tobacco_grade,
    weight: body.weight,
    buyer_grade: body.buyer_grade,
    date_of_purchase: body.date_of_purchase,
    purchase_location: body.purchase_location,
    moisture: body.moisture,
    colour: body.colour,
    sandy_leaves: body.sandy_leaves,
    total_bales: body.total_bales,
    saved_at: now,
    updated_at: now
  };
  db.bags.push(newBag);
  
  // Mark QR as used
  const qr = db.qr_codes.find(q => q.unique_code === body.unique_code);
  if (qr) qr.used = 1;
  
  res.json({ success: true, bag: newBag });
});

app.put('/api/bags/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const bag = db.bags.find(b => b.id == id);

  if (!bag) return res.status(404).json({ error: 'Bag not found' });

  const editableFields = [
    'fcv',
    'apf_number',
    'tobacco_grade',
    'weight',
    'buyer_grade',
    'date_of_purchase',
    'purchase_location'
  ];

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      bag[field] = updates[field];
    }
  }

  bag.updated_at = new Date().toISOString();

  res.json({ success: true, bag });
});

// ── DB VIEWER ───────────────────────────────────────────────
app.get('/api/db/tables', (req, res) => {
  res.json({ tables: Object.keys(db) });
});

app.get('/api/db/table/:name', (req, res) => {
  const { name } = req.params;
  if (!db[name]) return res.status(404).json({ error: 'Table not found' });
  const rows = db[name];
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const total = rows.length;
  res.json({ rows, cols, total });
});

app.get('/api/db/query', (req, res) => {
  const { sql } = req.query;
  if (!sql) return res.status(400).json({ error: 'No SQL provided' });
  // Simple query response
  res.json({ message: 'Query executed', sql });
});

// ── STATS ───────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({
    buyers:    db.buyers.length,
    qrcodes:   db.qr_codes.length,
    qr_used:   db.qr_codes.filter(q => q.used).length,
    qr_avail:  db.qr_codes.filter(q => !q.used).length,
    bags:      db.bags.length,
    total_weight: db.bags.reduce((s, b) => s + (b.weight || 0), 0),
  });
});

app.listen(PORT, () => {
  console.log(`\n🌿 Elite Tobacco Server running at http://localhost:${PORT}`);
  console.log(`   Backend ready for API calls\n`);
});

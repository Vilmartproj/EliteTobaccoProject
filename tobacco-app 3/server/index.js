// ============================================================
// server/index.js  –  Elite Tobacco Backend (Express + In-Memory)
// ============================================================
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// ── In-Memory Database ──────────────────────────────────────
let nextId = { buyers: 4, qr_codes: 6, bags: 1, grades: 29 };

const db = {
  buyers: [
    { id: 1, code: 'B001', name: 'Ravi Kumar', password: 'B001', created_at: new Date().toISOString() },
    { id: 2, code: 'B002', name: 'Suresh Reddy', password: 'B002', created_at: new Date().toISOString() },
    { id: 3, code: 'B003', name: 'Anitha Devi', password: 'B003', created_at: new Date().toISOString() },
  ],
  grades: [
    { id: 1, code: 'H1', description: 'High Grade 1', created_at: new Date().toISOString() },
    { id: 2, code: 'H2', description: 'High Grade 2', created_at: new Date().toISOString() },
    { id: 3, code: 'H3', description: 'High Grade 3', created_at: new Date().toISOString() },
    { id: 4, code: 'H4', description: 'High Grade 4', created_at: new Date().toISOString() },
    { id: 5, code: 'C1', description: 'Category C Grade 1', created_at: new Date().toISOString() },
    { id: 6, code: 'C2', description: 'Category C Grade 2', created_at: new Date().toISOString() },
    { id: 7, code: 'C3', description: 'Category C Grade 3', created_at: new Date().toISOString() },
    { id: 8, code: 'C4', description: 'Category C Grade 4', created_at: new Date().toISOString() },
    { id: 9, code: 'B1', description: 'Category B Grade 1', created_at: new Date().toISOString() },
    { id: 10, code: 'B2', description: 'Category B Grade 2', created_at: new Date().toISOString() },
    { id: 11, code: 'B3', description: 'Category B Grade 3', created_at: new Date().toISOString() },
    { id: 12, code: 'B4', description: 'Category B Grade 4', created_at: new Date().toISOString() },
    { id: 13, code: 'X1', description: 'Category X Grade 1', created_at: new Date().toISOString() },
    { id: 14, code: 'X2', description: 'Category X Grade 2', created_at: new Date().toISOString() },
    { id: 15, code: 'X3', description: 'Category X Grade 3', created_at: new Date().toISOString() },
    { id: 16, code: 'X4', description: 'Category X Grade 4', created_at: new Date().toISOString() },
    { id: 17, code: 'L1', description: 'Category L Grade 1', created_at: new Date().toISOString() },
    { id: 18, code: 'L2', description: 'Category L Grade 2', created_at: new Date().toISOString() },
    { id: 19, code: 'L3', description: 'Category L Grade 3', created_at: new Date().toISOString() },
    { id: 20, code: 'L4', description: 'Category L Grade 4', created_at: new Date().toISOString() },
    { id: 21, code: 'G1', description: 'Category G Grade 1', created_at: new Date().toISOString() },
    { id: 22, code: 'G2', description: 'Category G Grade 2', created_at: new Date().toISOString() },
    { id: 23, code: 'G3', description: 'Category G Grade 3', created_at: new Date().toISOString() },
    { id: 24, code: 'G4', description: 'Category G Grade 4', created_at: new Date().toISOString() },
    { id: 25, code: 'F1', description: 'Category F Grade 1', created_at: new Date().toISOString() },
    { id: 26, code: 'F2', description: 'Category F Grade 2', created_at: new Date().toISOString() },
    { id: 27, code: 'F3', description: 'Category F Grade 3', created_at: new Date().toISOString() },
    { id: 28, code: 'F4', description: 'Category F Grade 4', created_at: new Date().toISOString() },
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

// ── GRADES ──────────────────────────────────────────────────
app.get('/api/grades', (req, res) => {
  const rows = [...db.grades].sort((a, b) => a.code.localeCompare(b.code));
  res.json(rows);
});

app.post('/api/grades', (req, res) => {
  const { code, description } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedDesc = String(description || '').trim();

  if (!normalizedCode || !normalizedDesc) {
    return res.status(400).json({ error: 'code and description required' });
  }

  const duplicate = db.grades.some(g => g.code === normalizedCode);
  if (duplicate) return res.status(400).json({ error: 'Grade code already exists' });

  const grade = {
    id: nextId.grades++,
    code: normalizedCode,
    description: normalizedDesc,
    created_at: new Date().toISOString(),
  };

  db.grades.push(grade);
  res.json(grade);
});

app.put('/api/grades/:id', (req, res) => {
  const { id } = req.params;
  const gradeId = Number(id);
  const { code, description } = req.body || {};

  const grade = db.grades.find(g => g.id === gradeId);
  if (!grade) return res.status(404).json({ error: 'Grade not found' });

  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedDesc = String(description || '').trim();
  if (!normalizedCode || !normalizedDesc) {
    return res.status(400).json({ error: 'code and description required' });
  }

  const duplicate = db.grades.some(g => g.id !== gradeId && g.code === normalizedCode);
  if (duplicate) return res.status(400).json({ error: 'Grade code already exists' });

  grade.code = normalizedCode;
  grade.description = normalizedDesc;
  res.json(grade);
});

app.delete('/api/grades/:id', (req, res) => {
  const { id } = req.params;
  const gradeId = Number(id);
  const index = db.grades.findIndex(g => g.id === gradeId);
  if (index === -1) return res.status(404).json({ error: 'Grade not found' });

  const grade = db.grades[index];
  const inUse = db.bags.some(b => b.tobacco_grade === grade.code || b.buyer_grade === grade.code);
  if (inUse) return res.status(400).json({ error: 'Grade is in use and cannot be deleted' });

  const deleted = db.grades.splice(index, 1)[0];
  res.json({ success: true, grade: deleted });
});

app.delete('/api/buyers/:id', (req, res) => {
  const { id } = req.params;
  const buyerId = Number(id);
  const index = db.buyers.findIndex(b => b.id === buyerId);
  if (index === -1) return res.status(404).json({ error: 'Buyer not found' });

  const hasBags = db.bags.some(b => b.buyer_id === buyerId);
  if (hasBags) return res.status(400).json({ error: 'Cannot delete buyer with bags' });

  const hasAssignedQrs = db.qr_codes.some(q => q.buyer_id === buyerId);
  if (hasAssignedQrs) return res.status(400).json({ error: 'Cannot delete buyer with assigned QR codes' });

  const deleted = db.buyers.splice(index, 1)[0];
  res.json({ success: true, buyer: deleted });
});

// ── QR CODES ────────────────────────────────────────────────
app.get('/api/qrcodes', (req, res) => {
  const rows = db.qr_codes.map((qr) => {
    const buyer = qr.buyer_id ? db.buyers.find((b) => b.id === qr.buyer_id) : null;
    return {
      ...qr,
      buyer_code: buyer?.code || null,
      buyer_name: buyer?.name || null,
    };
  });
  res.json(rows);
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

app.delete('/api/qrcodes/:id', (req, res) => {
  const { id } = req.params;
  const qrId = Number(id);
  const index = db.qr_codes.findIndex(q => q.id === qrId);
  if (index === -1) return res.status(404).json({ error: 'QR code not found' });

  const qr = db.qr_codes[index];
  if (qr.used) return res.status(400).json({ error: 'Used QR code cannot be deleted' });

  const deleted = db.qr_codes.splice(index, 1)[0];
  res.json({ success: true, qr: deleted });
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

app.delete('/api/bags/:id', (req, res) => {
  const { id } = req.params;
  const bagId = Number(id);
  const index = db.bags.findIndex(b => b.id === bagId);

  if (index === -1) return res.status(404).json({ error: 'Bag not found' });

  const deletedBag = db.bags.splice(index, 1)[0];

  const qr = db.qr_codes.find(q => q.unique_code === deletedBag.unique_code);
  if (qr) {
    qr.used = 0;
    qr.buyer_id = null;
  }

  res.json({ success: true, bag: deletedBag, qrReset: !!qr });
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

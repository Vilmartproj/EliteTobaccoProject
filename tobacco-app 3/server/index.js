// ============================================================
// server/index.js  –  Elite Tobacco Backend (Express + In-Memory)
// ============================================================
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

const GRADE_TYPES = {
  TOBACCO_BOARD: 'tobacco_board',
  BUYER: 'buyer',
};

const DEFAULT_GRADE_TYPE = GRADE_TYPES.TOBACCO_BOARD;
const GRADE_TYPE_VALUES = new Set(Object.values(GRADE_TYPES));

const seedGradeTemplates = [
  ['H1', 'High Grade 1'],
  ['H2', 'High Grade 2'],
  ['H3', 'High Grade 3'],
  ['H4', 'High Grade 4'],
  ['C1', 'Category C Grade 1'],
  ['C2', 'Category C Grade 2'],
  ['C3', 'Category C Grade 3'],
  ['C4', 'Category C Grade 4'],
  ['B1', 'Category B Grade 1'],
  ['B2', 'Category B Grade 2'],
  ['B3', 'Category B Grade 3'],
  ['B4', 'Category B Grade 4'],
  ['X1', 'Category X Grade 1'],
  ['X2', 'Category X Grade 2'],
  ['X3', 'Category X Grade 3'],
  ['X4', 'Category X Grade 4'],
  ['L1', 'Category L Grade 1'],
  ['L2', 'Category L Grade 2'],
  ['L3', 'Category L Grade 3'],
  ['L4', 'Category L Grade 4'],
  ['G1', 'Category G Grade 1'],
  ['G2', 'Category G Grade 2'],
  ['G3', 'Category G Grade 3'],
  ['G4', 'Category G Grade 4'],
  ['F1', 'Category F Grade 1'],
  ['F2', 'Category F Grade 2'],
  ['F3', 'Category F Grade 3'],
  ['F4', 'Category F Grade 4'],
];

const seedGrades = () => {
  let id = 1;
  const now = new Date().toISOString();

  const createRows = (type) => seedGradeTemplates.map(([code, description]) => ({
    id: id++,
    type,
    code,
    description,
    created_at: now,
  }));

  return [
    ...createRows(GRADE_TYPES.TOBACCO_BOARD),
    ...createRows(GRADE_TYPES.BUYER),
  ];
};

const resolveGradeType = (value, fallback = DEFAULT_GRADE_TYPE) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (GRADE_TYPE_VALUES.has(normalized)) return normalized;
  return null;
};

// ── In-Memory Database ──────────────────────────────────────
let nextId = { buyers: 4, qr_codes: 6, bags: 1, grades: 57, apf_numbers: 6, tobacco_types: 7 };

const db = {
  buyers: [
    { id: 1, code: 'B001', name: 'Ravi Kumar', password: 'B001', created_at: new Date().toISOString() },
    { id: 2, code: 'B002', name: 'Suresh Reddy', password: 'B002', created_at: new Date().toISOString() },
    { id: 3, code: 'B003', name: 'Anitha Devi', password: 'B003', created_at: new Date().toISOString() },
  ],
  apf_numbers: [
    { id: 1, number: '101', description: 'Default APF 101', created_at: new Date().toISOString() },
    { id: 2, number: '102', description: 'Default APF 102', created_at: new Date().toISOString() },
    { id: 3, number: '103', description: 'Default APF 103', created_at: new Date().toISOString() },
    { id: 4, number: '104', description: 'Default APF 104', created_at: new Date().toISOString() },
    { id: 5, number: '105', description: 'Default APF 105', created_at: new Date().toISOString() },
  ],
  tobacco_types: [
    { id: 1, type: 'FCV Virginia', description: '', created_at: new Date().toISOString() },
    { id: 2, type: 'Burley', description: '', created_at: new Date().toISOString() },
    { id: 3, type: 'Natu', description: '', created_at: new Date().toISOString() },
    { id: 4, type: 'White Burley', description: '', created_at: new Date().toISOString() },
    { id: 5, type: 'Rustica', description: '', created_at: new Date().toISOString() },
    { id: 6, type: 'Other', description: '', created_at: new Date().toISOString() },
  ],
  grades: seedGrades(),
  qr_codes: [
    { id: 1, unique_code: '113', buyer_id: 1, used: 0, created_at: new Date().toISOString() },
    { id: 2, unique_code: '114', buyer_id: 1, used: 0, created_at: new Date().toISOString() },
    { id: 3, unique_code: '115', buyer_id: 2, used: 0, created_at: new Date().toISOString() },
    { id: 4, unique_code: '116', buyer_id: null, used: 0, created_at: new Date().toISOString() },
    { id: 5, unique_code: '117', buyer_id: null, used: 0, created_at: new Date().toISOString() },
  ],
  bags: [
  ],
  settings: {
    buyer_actions_after_6pm_enabled: false,
    buyer_actions_after_6pm_buyer_ids: [],
    updated_at: new Date().toISOString(),
  },
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

// ── APF NUMBERS ─────────────────────────────────────────────
app.get('/api/apf-numbers', (req, res) => {
  const rows = [...db.apf_numbers].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  res.json(rows);
});

app.post('/api/apf-numbers', (req, res) => {
  const { number, description } = req.body || {};
  const normalizedNumber = String(number || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedNumber) {
    return res.status(400).json({ error: 'APF number is required' });
  }

  const duplicate = db.apf_numbers.some(a => a.number === normalizedNumber);
  if (duplicate) return res.status(400).json({ error: 'APF number already exists' });

  const apf = {
    id: nextId.apf_numbers++,
    number: normalizedNumber,
    description: normalizedDescription,
    created_at: new Date().toISOString(),
  };

  db.apf_numbers.push(apf);
  res.json(apf);
});

app.put('/api/apf-numbers/:id', (req, res) => {
  const { id } = req.params;
  const apfId = Number(id);
  const { number, description } = req.body || {};

  const apf = db.apf_numbers.find(a => a.id === apfId);
  if (!apf) return res.status(404).json({ error: 'APF number not found' });

  const normalizedNumber = String(number || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedNumber) {
    return res.status(400).json({ error: 'APF number is required' });
  }

  const duplicate = db.apf_numbers.some(a => a.id !== apfId && a.number === normalizedNumber);
  if (duplicate) return res.status(400).json({ error: 'APF number already exists' });

  apf.number = normalizedNumber;
  apf.description = normalizedDescription;
  res.json(apf);
});

app.delete('/api/apf-numbers/:id', (req, res) => {
  const { id } = req.params;
  const apfId = Number(id);
  const index = db.apf_numbers.findIndex(a => a.id === apfId);
  if (index === -1) return res.status(404).json({ error: 'APF number not found' });

  const apf = db.apf_numbers[index];
  const inUse = db.bags.some(b => String(b.apf_number || '').trim() === apf.number);
  if (inUse) return res.status(400).json({ error: 'APF number is in use and cannot be deleted' });

  const deleted = db.apf_numbers.splice(index, 1)[0];
  res.json({ success: true, apf: deleted });
});

// ── TOBACCO TYPES / VARIETIES ─────────────────────────────
app.get('/api/tobacco-types', (req, res) => {
  const rows = [...db.tobacco_types].sort((a, b) => a.type.localeCompare(b.type, undefined, { numeric: true }));
  res.json(rows);
});

app.post('/api/tobacco-types', (req, res) => {
  const { type, description } = req.body || {};
  const normalizedType = String(type || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedType) {
    return res.status(400).json({ error: 'Type is required' });
  }

  const duplicate = db.tobacco_types.some(t => t.type.toLowerCase() === normalizedType.toLowerCase());
  if (duplicate) return res.status(400).json({ error: 'Type already exists' });

  const tobaccoType = {
    id: nextId.tobacco_types++,
    type: normalizedType,
    description: normalizedDescription,
    created_at: new Date().toISOString(),
  };

  db.tobacco_types.push(tobaccoType);
  res.json(tobaccoType);
});

app.put('/api/tobacco-types/:id', (req, res) => {
  const { id } = req.params;
  const typeId = Number(id);
  const { type, description } = req.body || {};

  const tobaccoType = db.tobacco_types.find(t => t.id === typeId);
  if (!tobaccoType) return res.status(404).json({ error: 'Type not found' });

  const normalizedType = String(type || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedType) {
    return res.status(400).json({ error: 'Type is required' });
  }

  const duplicate = db.tobacco_types.some(t => t.id !== typeId && t.type.toLowerCase() === normalizedType.toLowerCase());
  if (duplicate) return res.status(400).json({ error: 'Type already exists' });

  tobaccoType.type = normalizedType;
  tobaccoType.description = normalizedDescription;
  res.json(tobaccoType);
});

app.delete('/api/tobacco-types/:id', (req, res) => {
  const { id } = req.params;
  const typeId = Number(id);
  const index = db.tobacco_types.findIndex(t => t.id === typeId);
  if (index === -1) return res.status(404).json({ error: 'Type not found' });

  const tobaccoType = db.tobacco_types[index];
  const inUse = db.bags.some(b => String(b.type_of_tobacco || '').trim().toLowerCase() === tobaccoType.type.toLowerCase());
  if (inUse) return res.status(400).json({ error: 'Type is in use and cannot be deleted' });

  const deleted = db.tobacco_types.splice(index, 1)[0];
  res.json({ success: true, tobacco_type: deleted });
});

// ── GRADES ──────────────────────────────────────────────────
app.get('/api/grades', (req, res) => {
  const requestedType = resolveGradeType(req.query?.type, null);
  if (req.query?.type && !requestedType) {
    return res.status(400).json({ error: 'Invalid grade type' });
  }

  const rows = [...db.grades]
    .filter(g => !requestedType || g.type === requestedType)
    .sort((a, b) => a.code.localeCompare(b.code));
  res.json(rows);
});

app.post('/api/grades', (req, res) => {
  const { code, description, type } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedDesc = String(description || '').trim();
  const gradeType = resolveGradeType(type);

  if (!normalizedCode) {
    return res.status(400).json({ error: 'code required' });
  }

  if (!gradeType) {
    return res.status(400).json({ error: 'Invalid grade type' });
  }

  const duplicate = db.grades.some(g => g.type === gradeType && g.code === normalizedCode);
  if (duplicate) return res.status(400).json({ error: 'Grade code already exists' });

  const grade = {
    id: nextId.grades++,
    type: gradeType,
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
  const { code, description, type } = req.body || {};

  const grade = db.grades.find(g => g.id === gradeId);
  if (!grade) return res.status(404).json({ error: 'Grade not found' });

  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedDesc = String(description || '').trim();
  const gradeType = resolveGradeType(type, grade.type || DEFAULT_GRADE_TYPE);
  if (!normalizedCode) {
    return res.status(400).json({ error: 'code required' });
  }

  if (!gradeType) {
    return res.status(400).json({ error: 'Invalid grade type' });
  }

  const duplicate = db.grades.some(g => g.id !== gradeId && g.type === gradeType && g.code === normalizedCode);
  if (duplicate) return res.status(400).json({ error: 'Grade code already exists' });

  grade.type = gradeType;
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
  const inUse = grade.type === GRADE_TYPES.BUYER
    ? db.bags.some(b => b.buyer_grade === grade.code)
    : db.bags.some(b => b.tobacco_grade === grade.code);
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
  const normalizedStart = String(startCode || '').trim().toUpperCase();
  const parsedStart = /^\d+$/.test(normalizedStart) ? parseInt(normalizedStart, 10) : NaN;
  const parsedBuyerId = buyerId ? parseInt(buyerId, 10) : null;
  const codes = [];

  if (parsedBuyerId) {
    const buyerExists = db.buyers.some(b => b.id === parsedBuyerId);
    if (!buyerExists) return res.status(400).json({ error: 'Invalid buyerId' });
  }

  const existing = new Set(db.qr_codes.map(q => q.unique_code));

  const trailingDigitsMatch = normalizedStart.match(/^(.*?)(\d+)$/);
  const prefix = trailingDigitsMatch ? trailingDigitsMatch[1] : '';
  const baseDigits = trailingDigitsMatch ? trailingDigitsMatch[2] : '';
  const digitWidth = baseDigits.length;

  const generateDeterministicCode = (index) => {
    if (!normalizedStart) return null;
    if (Number.isFinite(parsedStart)) return String(parsedStart + index);
    if (trailingDigitsMatch) {
      const next = String(parseInt(baseDigits, 10) + index).padStart(digitWidth, '0');
      return `${prefix}${next}`;
    }
    return index === 0 ? normalizedStart : `${normalizedStart}${index}`;
  };

  if (normalizedStart) {
    for (let i = 0; i < n; i++) {
      const candidate = generateDeterministicCode(i);
      if (existing.has(candidate)) {
        return res.status(400).json({ error: `QR code ${candidate} already exists` });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    let generatedCode;

    if (normalizedStart) {
      generatedCode = generateDeterministicCode(i);
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
  const fcvType = String(body.fcv || '').trim();
  const apfNumber = String(body.apf_number || '').trim();
  const lotNumber = String(body.lot_number || '').trim();
  const apfExists = apfNumber ? db.apf_numbers.some(a => a.number === apfNumber) : false;
  if (fcvType === 'FCV' && (!apfNumber || !apfExists)) {
    return res.status(400).json({ error: 'Invalid APF number. Please select from APF master.' });
  }
  if (fcvType === 'FCV' && !lotNumber) {
    return res.status(400).json({ error: 'Lot Number is required for FCV.' });
  }
  const now = new Date().toISOString();
  const newBag = {
    id: nextId.bags++,
    unique_code: body.unique_code || '' + Math.random(),
    buyer_id: body.buyer_id,
    buyer_code: body.buyer_code,
    buyer_name: body.buyer_name,
    fcv: fcvType,
    type_of_tobacco: body.type_of_tobacco,
    apf_number: fcvType === 'FCV' ? apfNumber : '',
    tobacco_grade: body.tobacco_grade,
    purchase_date: body.purchase_date,
    weight: body.weight,
    rate: body.rate,
    bale_value: body.bale_value,
    buyer_grade: body.buyer_grade,
    lot_number: fcvType === 'FCV' ? lotNumber : '',
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
    'type_of_tobacco',
    'apf_number',
    'tobacco_grade',
    'purchase_date',
    'weight',
    'rate',
    'bale_value',
    'buyer_grade',
    'lot_number',
    'date_of_purchase',
    'purchase_location'
  ];

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === 'apf_number') {
        const normalizedApf = String(updates.apf_number || '').trim();
        if (normalizedApf) {
          const apfExists = db.apf_numbers.some(a => a.number === normalizedApf);
          if (!apfExists) return res.status(400).json({ error: 'Invalid APF number. Please select from APF master.' });
        }
        bag[field] = normalizedApf;
        continue;
      }
      if (field === 'lot_number') {
        bag[field] = String(updates.lot_number || '').trim();
        continue;
      }
      bag[field] = updates[field];
    }
  }

  if (String(bag.fcv || '').trim() === 'FCV' && !String(bag.lot_number || '').trim()) {
    return res.status(400).json({ error: 'Lot Number is required for FCV.' });
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

// ── SETTINGS ───────────────────────────────────────────────
app.get('/api/settings/buyer-bag-actions', (req, res) => {
  const enabledBuyerIds = Array.isArray(db.settings?.buyer_actions_after_6pm_buyer_ids)
    ? db.settings.buyer_actions_after_6pm_buyer_ids
    : [];
  res.json({
    enabled_after_6pm: !!db.settings?.buyer_actions_after_6pm_enabled,
    enabled_buyer_ids: enabledBuyerIds,
    updated_at: db.settings?.updated_at || null,
  });
});

app.put('/api/settings/buyer-bag-actions', (req, res) => {
  const body = req.body || {};
  const enabled = !!body.enabled_after_6pm;
  const buyerId = Number(body.buyer_id);

  const currentIds = Array.isArray(db.settings?.buyer_actions_after_6pm_buyer_ids)
    ? [...db.settings.buyer_actions_after_6pm_buyer_ids]
    : [];

  if (Number.isFinite(buyerId) && buyerId > 0) {
    const exists = currentIds.includes(buyerId);
    if (enabled && !exists) currentIds.push(buyerId);
    if (!enabled && exists) {
      const idx = currentIds.indexOf(buyerId);
      currentIds.splice(idx, 1);
    }
  }

  db.settings = {
    ...(db.settings || {}),
    buyer_actions_after_6pm_enabled: enabled,
    buyer_actions_after_6pm_buyer_ids: currentIds,
    updated_at: new Date().toISOString(),
  };
  res.json({
    success: true,
    enabled_after_6pm: db.settings.buyer_actions_after_6pm_enabled,
    enabled_buyer_ids: db.settings.buyer_actions_after_6pm_buyer_ids,
    updated_at: db.settings.updated_at,
  });
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

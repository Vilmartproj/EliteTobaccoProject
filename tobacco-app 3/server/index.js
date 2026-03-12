const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 3001);

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'EliteTobacco';
const DB_CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT || 10);
const DB_AUTO_CREATE = String(process.env.DB_AUTO_CREATE || 'false').toLowerCase() === 'true';
const DB_CLEAN_SETUP = String(process.env.DB_CLEAN_SETUP || 'false').toLowerCase() === 'true';

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

const BUYER_SEED = [
  { code: 'B001', name: 'Ravi Kumar', password: 'B001' },
  { code: 'B002', name: 'Suresh Reddy', password: 'B002' },
  { code: 'B003', name: 'Anitha Devi', password: 'B003' },
];

const APF_SEED = [
  { number: '101', description: 'Default APF 101' },
  { number: '102', description: 'Default APF 102' },
  { number: '103', description: 'Default APF 103' },
  { number: '104', description: 'Default APF 104' },
  { number: '105', description: 'Default APF 105' },
];

const TOBACCO_TYPE_SEED = [
  { type: 'FCV Virginia', description: '' },
  { type: 'Burley', description: '' },
  { type: 'Natu', description: '' },
  { type: 'White Burley', description: '' },
  { type: 'Rustica', description: '' },
  { type: 'Other', description: '' },
];

const QR_SEED = [
  { unique_code: '113', buyer_code: 'B001' },
  { unique_code: '114', buyer_code: 'B001' },
  { unique_code: '115', buyer_code: 'B002' },
  { unique_code: '116', buyer_code: null },
  { unique_code: '117', buyer_code: null },
];

const ALLOWED_TABLES = ['buyers', 'apf_numbers', 'tobacco_types', 'grades', 'qr_codes', 'bags', 'settings'];

let pool;

app.use(cors());
app.use(express.json());

function resolveGradeType(value, fallback = DEFAULT_GRADE_TYPE) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (GRADE_TYPE_VALUES.has(normalized)) return normalized;
  return null;
}

function normalizeBuyerId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function withAsync(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function initDatabase() {
  if (DB_AUTO_CREATE) {
    const bootstrap = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await bootstrap.end();
  }

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: DB_CONNECTION_LIMIT,
    decimalNumbers: true,
  });

  await q(`
    CREATE TABLE IF NOT EXISTS buyers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(100) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS apf_numbers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      number VARCHAR(80) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS tobacco_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(40) NOT NULL,
      code VARCHAR(50) NOT NULL,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_grade_type_code (type, code)
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unique_code VARCHAR(120) NOT NULL UNIQUE,
      buyer_id INT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_qr_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS bags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unique_code VARCHAR(120) NOT NULL,
      buyer_id INT NULL,
      buyer_code VARCHAR(50),
      buyer_name VARCHAR(255),
      fcv VARCHAR(30),
      type_of_tobacco VARCHAR(120),
      apf_number VARCHAR(80),
      tobacco_grade VARCHAR(50),
      purchase_date DATETIME NULL,
      weight DECIMAL(12,3) NULL,
      rate DECIMAL(12,3) NULL,
      bale_value DECIMAL(12,3) NULL,
      buyer_grade VARCHAR(50),
      lot_number VARCHAR(120),
      date_of_purchase DATETIME NULL,
      purchase_location VARCHAR(255),
      moisture VARCHAR(80),
      colour VARCHAR(80),
      sandy_leaves VARCHAR(80),
      total_bales VARCHAR(80),
      saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bags_buyer_id (buyer_id),
      INDEX idx_bags_unique_code (unique_code),
      CONSTRAINT fk_bags_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q('ALTER TABLE bags MODIFY COLUMN buyer_code VARCHAR(50) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN buyer_name VARCHAR(255) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN fcv VARCHAR(30) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN type_of_tobacco VARCHAR(120) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN apf_number VARCHAR(80) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN tobacco_grade VARCHAR(50) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN purchase_date DATETIME NULL');
  await q('ALTER TABLE bags MODIFY COLUMN weight DECIMAL(12,3) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN rate DECIMAL(12,3) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN bale_value DECIMAL(12,3) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN buyer_grade VARCHAR(50) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN lot_number VARCHAR(120) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN date_of_purchase DATETIME NULL');
  await q('ALTER TABLE bags MODIFY COLUMN purchase_location VARCHAR(255) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN moisture VARCHAR(80) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN colour VARCHAR(80) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN sandy_leaves VARCHAR(80) NULL');
  await q('ALTER TABLE bags MODIFY COLUMN total_bales VARCHAR(80) NULL');

  await q(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      buyer_actions_after_6pm_enabled TINYINT(1) NOT NULL DEFAULT 0,
      buyer_actions_after_6pm_buyer_ids JSON NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  if (DB_CLEAN_SETUP) {
    await q('SET FOREIGN_KEY_CHECKS = 0');
    await q('TRUNCATE TABLE bags');
    await q('TRUNCATE TABLE qr_codes');
    await q('TRUNCATE TABLE grades');
    await q('TRUNCATE TABLE apf_numbers');
    await q('TRUNCATE TABLE tobacco_types');
    await q('TRUNCATE TABLE settings');
    await q('TRUNCATE TABLE buyers');
    await q('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🧹 DB_CLEAN_SETUP=true -> existing rows removed from core tables');
  }

  for (const buyer of BUYER_SEED) {
    await q(
      'INSERT IGNORE INTO buyers (code, name, password, created_at) VALUES (?, ?, ?, NOW())',
      [buyer.code, buyer.name, buyer.password]
    );
  }

  for (const apf of APF_SEED) {
    await q(
      'INSERT IGNORE INTO apf_numbers (number, description, created_at) VALUES (?, ?, NOW())',
      [apf.number, apf.description]
    );
  }

  for (const tobaccoType of TOBACCO_TYPE_SEED) {
    await q(
      'INSERT IGNORE INTO tobacco_types (type, description, created_at) VALUES (?, ?, NOW())',
      [tobaccoType.type, tobaccoType.description]
    );
  }

  for (const [code, description] of seedGradeTemplates) {
    await q(
      'INSERT IGNORE INTO grades (type, code, description, created_at) VALUES (?, ?, ?, NOW())',
      [GRADE_TYPES.TOBACCO_BOARD, code, description]
    );
    await q(
      'INSERT IGNORE INTO grades (type, code, description, created_at) VALUES (?, ?, ?, NOW())',
      [GRADE_TYPES.BUYER, code, description]
    );
  }

  const buyers = await q('SELECT id, code FROM buyers');
  const buyerByCode = Object.fromEntries(buyers.map((buyer) => [buyer.code, buyer.id]));

  for (const qr of QR_SEED) {
    await q(
      'INSERT IGNORE INTO qr_codes (unique_code, buyer_id, used, created_at) VALUES (?, ?, 0, NOW())',
      [qr.unique_code, qr.buyer_code ? (buyerByCode[qr.buyer_code] || null) : null]
    );
  }

  await q(
    'INSERT IGNORE INTO settings (id, buyer_actions_after_6pm_enabled, buyer_actions_after_6pm_buyer_ids, updated_at) VALUES (1, 0, JSON_ARRAY(), NOW())'
  );

  console.log(`✅ MySQL connected: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
}

app.post('/api/login', withAsync(async (req, res) => {
  const { code, password, role } = req.body || {};

  if (role === 'admin') {
    if (code === 'admin' && password === 'admin123') {
      return res.json({ success: true, user: { role: 'admin', name: 'Administrator' } });
    }
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const buyerCode = String(code || '').trim().toUpperCase();
  const buyerPassword = String(password || '').trim().toUpperCase();
  const rows = await q(
    'SELECT id, code, name, password, created_at FROM buyers WHERE code = ? AND password = ? LIMIT 1',
    [buyerCode, buyerPassword]
  );

  if (rows.length === 0) return res.status(401).json({ error: 'Invalid buyer code or password' });

  return res.json({ success: true, user: { role: 'buyer', ...rows[0] } });
}));

app.get('/api/buyers', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM buyers ORDER BY id ASC');
  res.json(rows);
}));

app.post('/api/buyers', withAsync(async (req, res) => {
  const { code, name } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedName = String(name || '').trim();

  if (!normalizedCode || !normalizedName) {
    return res.status(400).json({ error: 'code and name required' });
  }

  try {
    const result = await q(
      'INSERT INTO buyers (code, name, password, created_at) VALUES (?, ?, ?, NOW())',
      [normalizedCode, normalizedName, normalizedCode]
    );
    const rows = await q('SELECT * FROM buyers WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Buyer code already exists' });
    throw error;
  }
}));

app.delete('/api/buyers/:id', withAsync(async (req, res) => {
  const buyerId = Number(req.params.id);
  const rows = await q('SELECT * FROM buyers WHERE id = ? LIMIT 1', [buyerId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Buyer not found' });

  const hasBags = await q('SELECT COUNT(*) AS total FROM bags WHERE buyer_id = ?', [buyerId]);
  if (hasBags[0].total > 0) return res.status(400).json({ error: 'Cannot delete buyer with bags' });

  const hasAssignedQrs = await q('SELECT COUNT(*) AS total FROM qr_codes WHERE buyer_id = ?', [buyerId]);
  if (hasAssignedQrs[0].total > 0) return res.status(400).json({ error: 'Cannot delete buyer with assigned QR codes' });

  await q('DELETE FROM buyers WHERE id = ?', [buyerId]);
  res.json({ success: true, buyer: rows[0] });
}));

app.get('/api/apf-numbers', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM apf_numbers ORDER BY CAST(number AS UNSIGNED), number ASC');
  res.json(rows);
}));

app.post('/api/apf-numbers', withAsync(async (req, res) => {
  const { number, description } = req.body || {};
  const normalizedNumber = String(number || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedNumber) return res.status(400).json({ error: 'APF number is required' });

  try {
    const result = await q(
      'INSERT INTO apf_numbers (number, description, created_at) VALUES (?, ?, NOW())',
      [normalizedNumber, normalizedDescription]
    );
    const rows = await q('SELECT * FROM apf_numbers WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'APF number already exists' });
    throw error;
  }
}));

app.put('/api/apf-numbers/:id', withAsync(async (req, res) => {
  const apfId = Number(req.params.id);
  const { number, description } = req.body || {};

  const normalizedNumber = String(number || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedNumber) return res.status(400).json({ error: 'APF number is required' });

  const rows = await q('SELECT * FROM apf_numbers WHERE id = ? LIMIT 1', [apfId]);
  if (rows.length === 0) return res.status(404).json({ error: 'APF number not found' });

  const duplicate = await q('SELECT id FROM apf_numbers WHERE number = ? AND id <> ? LIMIT 1', [normalizedNumber, apfId]);
  if (duplicate.length > 0) return res.status(400).json({ error: 'APF number already exists' });

  await q('UPDATE apf_numbers SET number = ?, description = ? WHERE id = ?', [normalizedNumber, normalizedDescription, apfId]);
  const updated = await q('SELECT * FROM apf_numbers WHERE id = ?', [apfId]);
  res.json(updated[0]);
}));

app.delete('/api/apf-numbers/:id', withAsync(async (req, res) => {
  const apfId = Number(req.params.id);
  const rows = await q('SELECT * FROM apf_numbers WHERE id = ? LIMIT 1', [apfId]);
  if (rows.length === 0) return res.status(404).json({ error: 'APF number not found' });

  const apf = rows[0];
  const inUse = await q('SELECT COUNT(*) AS total FROM bags WHERE TRIM(IFNULL(apf_number, "")) = ?', [String(apf.number || '').trim()]);
  if (inUse[0].total > 0) return res.status(400).json({ error: 'APF number is in use and cannot be deleted' });

  await q('DELETE FROM apf_numbers WHERE id = ?', [apfId]);
  res.json({ success: true, apf });
}));

app.get('/api/tobacco-types', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM tobacco_types ORDER BY type ASC');
  res.json(rows);
}));

app.post('/api/tobacco-types', withAsync(async (req, res) => {
  const { type, description } = req.body || {};
  const normalizedType = String(type || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedType) return res.status(400).json({ error: 'Type is required' });

  try {
    const result = await q(
      'INSERT INTO tobacco_types (type, description, created_at) VALUES (?, ?, NOW())',
      [normalizedType, normalizedDescription]
    );
    const rows = await q('SELECT * FROM tobacco_types WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Type already exists' });
    throw error;
  }
}));

app.put('/api/tobacco-types/:id', withAsync(async (req, res) => {
  const typeId = Number(req.params.id);
  const { type, description } = req.body || {};

  const normalizedType = String(type || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedType) return res.status(400).json({ error: 'Type is required' });

  const rows = await q('SELECT * FROM tobacco_types WHERE id = ? LIMIT 1', [typeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Type not found' });

  const duplicate = await q('SELECT id FROM tobacco_types WHERE LOWER(type) = LOWER(?) AND id <> ? LIMIT 1', [normalizedType, typeId]);
  if (duplicate.length > 0) return res.status(400).json({ error: 'Type already exists' });

  await q('UPDATE tobacco_types SET type = ?, description = ? WHERE id = ?', [normalizedType, normalizedDescription, typeId]);
  const updated = await q('SELECT * FROM tobacco_types WHERE id = ?', [typeId]);
  res.json(updated[0]);
}));

app.delete('/api/tobacco-types/:id', withAsync(async (req, res) => {
  const typeId = Number(req.params.id);
  const rows = await q('SELECT * FROM tobacco_types WHERE id = ? LIMIT 1', [typeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Type not found' });

  const tobaccoType = rows[0];
  const inUse = await q('SELECT COUNT(*) AS total FROM bags WHERE LOWER(TRIM(IFNULL(type_of_tobacco, ""))) = LOWER(?)', [String(tobaccoType.type || '').trim()]);
  if (inUse[0].total > 0) return res.status(400).json({ error: 'Type is in use and cannot be deleted' });

  await q('DELETE FROM tobacco_types WHERE id = ?', [typeId]);
  res.json({ success: true, tobacco_type: tobaccoType });
}));

app.get('/api/grades', withAsync(async (req, res) => {
  const requestedType = resolveGradeType(req.query?.type, null);
  if (req.query?.type && !requestedType) return res.status(400).json({ error: 'Invalid grade type' });

  const rows = requestedType
    ? await q('SELECT * FROM grades WHERE type = ? ORDER BY code ASC', [requestedType])
    : await q('SELECT * FROM grades ORDER BY type ASC, code ASC');

  res.json(rows);
}));

app.post('/api/grades', withAsync(async (req, res) => {
  const { code, description, type } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedDesc = String(description || '').trim();
  const gradeType = resolveGradeType(type);

  if (!normalizedCode) return res.status(400).json({ error: 'code required' });
  if (!gradeType) return res.status(400).json({ error: 'Invalid grade type' });

  try {
    const result = await q(
      'INSERT INTO grades (type, code, description, created_at) VALUES (?, ?, ?, NOW())',
      [gradeType, normalizedCode, normalizedDesc]
    );
    const rows = await q('SELECT * FROM grades WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Grade code already exists' });
    throw error;
  }
}));

app.put('/api/grades/:id', withAsync(async (req, res) => {
  const gradeId = Number(req.params.id);
  const { code, description, type } = req.body || {};

  const rows = await q('SELECT * FROM grades WHERE id = ? LIMIT 1', [gradeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Grade not found' });

  const current = rows[0];
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedDesc = String(description || '').trim();
  const gradeType = resolveGradeType(type, current.type || DEFAULT_GRADE_TYPE);

  if (!normalizedCode) return res.status(400).json({ error: 'code required' });
  if (!gradeType) return res.status(400).json({ error: 'Invalid grade type' });

  const duplicate = await q('SELECT id FROM grades WHERE type = ? AND code = ? AND id <> ? LIMIT 1', [gradeType, normalizedCode, gradeId]);
  if (duplicate.length > 0) return res.status(400).json({ error: 'Grade code already exists' });

  await q('UPDATE grades SET type = ?, code = ?, description = ? WHERE id = ?', [gradeType, normalizedCode, normalizedDesc, gradeId]);
  const updated = await q('SELECT * FROM grades WHERE id = ?', [gradeId]);
  res.json(updated[0]);
}));

app.delete('/api/grades/:id', withAsync(async (req, res) => {
  const gradeId = Number(req.params.id);
  const rows = await q('SELECT * FROM grades WHERE id = ? LIMIT 1', [gradeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Grade not found' });

  const grade = rows[0];
  const inUse = grade.type === GRADE_TYPES.BUYER
    ? await q('SELECT COUNT(*) AS total FROM bags WHERE buyer_grade = ?', [grade.code])
    : await q('SELECT COUNT(*) AS total FROM bags WHERE tobacco_grade = ?', [grade.code]);

  if (inUse[0].total > 0) return res.status(400).json({ error: 'Grade is in use and cannot be deleted' });

  await q('DELETE FROM grades WHERE id = ?', [gradeId]);
  res.json({ success: true, grade });
}));

app.get('/api/qrcodes', withAsync(async (_req, res) => {
  const rows = await q(`
    SELECT q.id, q.unique_code, q.buyer_id, q.used, q.created_at, b.code AS buyer_code, b.name AS buyer_name
    FROM qr_codes q
    LEFT JOIN buyers b ON b.id = q.buyer_id
    ORDER BY q.id ASC
  `);
  res.json(rows);
}));

app.post('/api/qrcodes/generate', withAsync(async (req, res) => {
  const { startCode, count, buyerId } = req.body || {};
  const n = Math.max(1, parseInt(count, 10) || 1);
  const normalizedStart = String(startCode || '').trim().toUpperCase();
  const parsedStart = /^\d+$/.test(normalizedStart) ? parseInt(normalizedStart, 10) : NaN;
  const parsedBuyerId = normalizeBuyerId(buyerId);

  if (parsedBuyerId) {
    const buyerExists = await q('SELECT id FROM buyers WHERE id = ? LIMIT 1', [parsedBuyerId]);
    if (buyerExists.length === 0) return res.status(400).json({ error: 'Invalid buyerId' });
  }

  const existingRows = await q('SELECT unique_code FROM qr_codes');
  const existing = new Set(existingRows.map((row) => row.unique_code));

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
    for (let i = 0; i < n; i += 1) {
      const candidate = generateDeterministicCode(i);
      if (existing.has(candidate)) {
        return res.status(400).json({ error: `QR code ${candidate} already exists` });
      }
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const codes = [];

    for (let i = 0; i < n; i += 1) {
      let generatedCode;
      if (normalizedStart) {
        generatedCode = generateDeterministicCode(i);
      } else {
        do {
          generatedCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        } while (existing.has(generatedCode));
      }

      existing.add(generatedCode);

      const [insertResult] = await conn.query(
        'INSERT INTO qr_codes (unique_code, buyer_id, used, created_at) VALUES (?, ?, 0, NOW())',
        [generatedCode, parsedBuyerId]
      );
      const [row] = await conn.query('SELECT * FROM qr_codes WHERE id = ?', [insertResult.insertId]);
      codes.push(row[0]);
    }

    await conn.commit();
    return res.json({ count: codes.length, codes });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'QR code already exists' });
    throw error;
  } finally {
    conn.release();
  }
}));

app.put('/api/qrcodes/:id/assign', withAsync(async (req, res) => {
  const qrId = Number(req.params.id);
  const parsedBuyerId = normalizeBuyerId(req.body?.buyerId);

  const qr = await q('SELECT * FROM qr_codes WHERE id = ? LIMIT 1', [qrId]);
  if (qr.length === 0) return res.status(404).json({ error: 'QR code not found' });

  if (parsedBuyerId) {
    const buyer = await q('SELECT id FROM buyers WHERE id = ? LIMIT 1', [parsedBuyerId]);
    if (buyer.length === 0) return res.status(400).json({ error: 'Invalid buyerId' });
  }

  await q('UPDATE qr_codes SET buyer_id = ? WHERE id = ?', [parsedBuyerId, qrId]);
  const updated = await q('SELECT * FROM qr_codes WHERE id = ? LIMIT 1', [qrId]);
  res.json(updated[0]);
}));

app.get('/api/qrcodes/validate/:code', withAsync(async (req, res) => {
  const qrRows = await q('SELECT * FROM qr_codes WHERE unique_code = ? LIMIT 1', [req.params.code]);
  if (qrRows.length === 0) return res.json({ valid: false, error: 'QR code not found' });

  const qr = qrRows[0];
  if (qr.used) return res.json({ valid: false, alreadyUsed: true, error: 'QR code already used' });

  res.json({ valid: true, qr });
}));

app.delete('/api/qrcodes/:id', withAsync(async (req, res) => {
  const qrId = Number(req.params.id);
  const qrRows = await q('SELECT * FROM qr_codes WHERE id = ? LIMIT 1', [qrId]);
  if (qrRows.length === 0) return res.status(404).json({ error: 'QR code not found' });

  const qr = qrRows[0];
  if (qr.used) return res.status(400).json({ error: 'Used QR code cannot be deleted' });

  await q('DELETE FROM qr_codes WHERE id = ?', [qrId]);
  res.json({ success: true, qr });
}));

app.get('/api/bags', withAsync(async (req, res) => {
  const buyerId = normalizeBuyerId(req.query.buyer_id);
  const rows = buyerId
    ? await q('SELECT * FROM bags WHERE buyer_id = ? ORDER BY id DESC', [buyerId])
    : await q('SELECT * FROM bags ORDER BY id DESC');

  res.json(rows);
}));

app.post('/api/bags', withAsync(async (req, res) => {
  const body = req.body || {};
  const fcvType = String(body.fcv || '').trim();
  const typeOfTobacco = String(body.type_of_tobacco || '').trim();
  const apfNumber = String(body.apf_number || '').trim();
  const lotNumber = String(body.lot_number || '').trim();
  const purchaseDateValue = normalizeDbDate(body.purchase_date) || normalizeDbDate(body.date_of_purchase) || new Date();
  const dateOfPurchaseValue = normalizeDbDate(body.date_of_purchase) || normalizeDbDate(body.purchase_date) || new Date();

  if (fcvType === 'FCV') {
    if (!apfNumber) return res.status(400).json({ error: 'Invalid APF number. Please select from APF master.' });
    const apfExists = await q('SELECT id FROM apf_numbers WHERE number = ? LIMIT 1', [apfNumber]);
    if (apfExists.length === 0) return res.status(400).json({ error: 'Invalid APF number. Please select from APF master.' });
    if (!lotNumber) return res.status(400).json({ error: 'Lot Number is required for FCV.' });
  }

  const buyerId = normalizeBuyerId(body.buyer_id);

  const result = await q(
    `INSERT INTO bags (
      unique_code, buyer_id, buyer_code, buyer_name, fcv, type_of_tobacco, apf_number, tobacco_grade,
      purchase_date, weight, rate, bale_value, buyer_grade, lot_number, date_of_purchase, purchase_location,
      moisture, colour, sandy_leaves, total_bales, saved_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      String(body.unique_code || String(Math.random())),
      buyerId,
      String(body.buyer_code || '').trim(),
      String(body.buyer_name || '').trim(),
      fcvType || '',
      typeOfTobacco,
      fcvType === 'FCV' ? apfNumber : '',
      String(body.tobacco_grade || '').trim(),
      purchaseDateValue,
      body.weight ?? null,
      body.rate ?? null,
      body.bale_value ?? null,
      String(body.buyer_grade || '').trim(),
      fcvType === 'FCV' ? lotNumber : '',
      dateOfPurchaseValue,
      String(body.purchase_location || '').trim(),
      String(body.moisture || '').trim(),
      String(body.colour || '').trim(),
      String(body.sandy_leaves || '').trim(),
      String(body.total_bales || '').trim(),
    ]
  );

  if (body.unique_code) {
    await q('UPDATE qr_codes SET used = 1 WHERE unique_code = ?', [String(body.unique_code)]);
  }

  const rows = await q('SELECT * FROM bags WHERE id = ?', [result.insertId]);
  res.json({ success: true, bag: rows[0] });
}));

app.put('/api/bags/:id', withAsync(async (req, res) => {
  const bagId = Number(req.params.id);
  const updates = req.body || {};

  const existingRows = await q('SELECT * FROM bags WHERE id = ? LIMIT 1', [bagId]);
  if (existingRows.length === 0) return res.status(404).json({ error: 'Bag not found' });

  const currentBag = existingRows[0];

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
    'purchase_location',
  ];

  const merged = { ...currentBag };
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === 'apf_number') {
        merged.apf_number = String(updates.apf_number || '').trim();
      } else if (field === 'lot_number') {
        merged.lot_number = String(updates.lot_number || '').trim();
      } else {
        merged[field] = updates[field];
      }
    }
  }

  const fcvType = String(merged.fcv || '').trim();
  const purchaseDateValue = normalizeDbDate(merged.purchase_date) || normalizeDbDate(merged.date_of_purchase) || normalizeDbDate(currentBag.purchase_date) || normalizeDbDate(currentBag.date_of_purchase) || new Date();
  const dateOfPurchaseValue = normalizeDbDate(merged.date_of_purchase) || normalizeDbDate(merged.purchase_date) || normalizeDbDate(currentBag.date_of_purchase) || normalizeDbDate(currentBag.purchase_date) || new Date();
  if (fcvType === 'FCV') {
    if (!String(merged.apf_number || '').trim()) {
      return res.status(400).json({ error: 'Invalid APF number. Please select from APF master.' });
    }
    const apfExists = await q('SELECT id FROM apf_numbers WHERE number = ? LIMIT 1', [String(merged.apf_number).trim()]);
    if (apfExists.length === 0) {
      return res.status(400).json({ error: 'Invalid APF number. Please select from APF master.' });
    }
    if (!String(merged.lot_number || '').trim()) {
      return res.status(400).json({ error: 'Lot Number is required for FCV.' });
    }
  }

  await q(
    `UPDATE bags
     SET fcv = ?, type_of_tobacco = ?, apf_number = ?, tobacco_grade = ?, purchase_date = ?,
         weight = ?, rate = ?, bale_value = ?, buyer_grade = ?, lot_number = ?, date_of_purchase = ?,
         purchase_location = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      merged.fcv || null,
      String(merged.type_of_tobacco || '').trim(),
      fcvType === 'FCV' ? String(merged.apf_number || '').trim() : '',
      merged.tobacco_grade || null,
      purchaseDateValue,
      merged.weight ?? null,
      merged.rate ?? null,
      merged.bale_value ?? null,
      merged.buyer_grade || null,
      fcvType === 'FCV' ? String(merged.lot_number || '').trim() : '',
      dateOfPurchaseValue,
      merged.purchase_location || null,
      bagId,
    ]
  );

  const rows = await q('SELECT * FROM bags WHERE id = ?', [bagId]);
  res.json({ success: true, bag: rows[0] });
}));

app.delete('/api/bags/:id', withAsync(async (req, res) => {
  const bagId = Number(req.params.id);
  const rows = await q('SELECT * FROM bags WHERE id = ? LIMIT 1', [bagId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Bag not found' });

  const bag = rows[0];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM bags WHERE id = ?', [bagId]);
    const [qrResult] = await conn.query('UPDATE qr_codes SET used = 0, buyer_id = NULL WHERE unique_code = ?', [bag.unique_code]);

    await conn.commit();
    res.json({ success: true, bag, qrReset: qrResult.affectedRows > 0 });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.get('/api/db/tables', (_req, res) => {
  res.json(ALLOWED_TABLES);
});

app.get('/api/db/table/:name', withAsync(async (req, res) => {
  const tableName = String(req.params.name || '').trim();
  if (!ALLOWED_TABLES.includes(tableName)) return res.status(404).json({ error: 'Table not found' });

  const rows = await q(`SELECT * FROM ${tableName} ORDER BY ${tableName === 'settings' ? 'id' : 'id DESC'} LIMIT 500`);
  const totals = await q(`SELECT COUNT(*) AS total FROM ${tableName}`);

  let cols = [];
  if (rows.length > 0) {
    cols = Object.keys(rows[0]);
  } else {
    const schemaRows = await q(`SHOW COLUMNS FROM ${tableName}`);
    cols = schemaRows.map((col) => col.Field);
  }

  res.json({ rows, cols, total: totals[0].total });
}));

app.get('/api/db/query', withAsync(async (req, res) => {
  const rawSql = String(req.query.sql || '').trim();
  if (!rawSql) return res.status(400).json({ error: 'No SQL provided' });

  const normalized = rawSql.replace(/;\s*$/, '').trim();
  if (!/^select\b/i.test(normalized)) return res.status(400).json({ error: 'Only SELECT statements are allowed' });
  if (normalized.includes(';')) return res.status(400).json({ error: 'Only one SELECT statement is allowed' });

  const sql = /\blimit\b/i.test(normalized) ? normalized : `${normalized} LIMIT 500`;
  const rows = await q(sql);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  res.json({ rows, cols, total: rows.length });
}));

app.get('/api/settings/buyer-bag-actions', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM settings WHERE id = 1 LIMIT 1');
  const setting = rows[0] || {
    buyer_actions_after_6pm_enabled: 0,
    buyer_actions_after_6pm_buyer_ids: [],
    updated_at: null,
  };

  let enabledBuyerIds = [];
  const rawIds = setting.buyer_actions_after_6pm_buyer_ids;
  if (Array.isArray(rawIds)) {
    enabledBuyerIds = rawIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  } else if (typeof rawIds === 'string' && rawIds.trim()) {
    try {
      const parsed = JSON.parse(rawIds);
      if (Array.isArray(parsed)) {
        enabledBuyerIds = parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
      }
    } catch (_error) {
      enabledBuyerIds = [];
    }
  }

  res.json({
    enabled_after_6pm: !!setting.buyer_actions_after_6pm_enabled,
    enabled_buyer_ids: enabledBuyerIds,
    updated_at: setting.updated_at || null,
  });
}));

app.put('/api/settings/buyer-bag-actions', withAsync(async (req, res) => {
  const body = req.body || {};
  const enabled = !!body.enabled_after_6pm;
  const buyerId = Number(body.buyer_id);

  const currentRows = await q('SELECT * FROM settings WHERE id = 1 LIMIT 1');
  let currentIds = [];
  if (currentRows.length > 0) {
    const raw = currentRows[0].buyer_actions_after_6pm_buyer_ids;
    if (Array.isArray(raw)) {
      currentIds = raw.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          currentIds = parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
        }
      } catch (_error) {
        currentIds = [];
      }
    }
  }

  if (Number.isFinite(buyerId) && buyerId > 0) {
    const exists = currentIds.includes(buyerId);
    if (enabled && !exists) currentIds.push(buyerId);
    if (!enabled && exists) {
      currentIds = currentIds.filter((id) => id !== buyerId);
    }
  }

  await q(
    `INSERT INTO settings (id, buyer_actions_after_6pm_enabled, buyer_actions_after_6pm_buyer_ids, updated_at)
     VALUES (1, ?, CAST(? AS JSON), NOW())
     ON DUPLICATE KEY UPDATE
       buyer_actions_after_6pm_enabled = VALUES(buyer_actions_after_6pm_enabled),
       buyer_actions_after_6pm_buyer_ids = VALUES(buyer_actions_after_6pm_buyer_ids),
       updated_at = NOW()`,
    [enabled ? 1 : 0, JSON.stringify(currentIds)]
  );

  const rows = await q('SELECT * FROM settings WHERE id = 1 LIMIT 1');
  const setting = rows[0];

  let enabledBuyerIds = [];
  const rawIds = setting.buyer_actions_after_6pm_buyer_ids;
  if (Array.isArray(rawIds)) {
    enabledBuyerIds = rawIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  } else if (typeof rawIds === 'string' && rawIds.trim()) {
    try {
      const parsed = JSON.parse(rawIds);
      if (Array.isArray(parsed)) {
        enabledBuyerIds = parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
      }
    } catch (_error) {
      enabledBuyerIds = [];
    }
  }

  res.json({
    success: true,
    enabled_after_6pm: !!setting.buyer_actions_after_6pm_enabled,
    enabled_buyer_ids: enabledBuyerIds,
    updated_at: setting.updated_at,
  });
}));

app.get('/api/stats', withAsync(async (_req, res) => {
  const rows = await q(`
    SELECT
      (SELECT COUNT(*) FROM buyers) AS buyers,
      (SELECT COUNT(*) FROM qr_codes) AS qrcodes,
      (SELECT COUNT(*) FROM qr_codes WHERE used = 1) AS qr_used,
      (SELECT COUNT(*) FROM qr_codes WHERE used = 0) AS qr_avail,
      (SELECT COUNT(*) FROM bags) AS bags,
      (SELECT COALESCE(SUM(weight), 0) FROM bags) AS total_weight
  `);

  res.json(rows[0]);
}));

app.use((error, _req, res, _next) => {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({ error: 'Database not initialized properly' });
  }

  if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_DBACCESS_DENIED_ERROR') {
    return res.status(500).json({ error: 'Database access denied. Check DB credentials and grants.' });
  }

  console.error('API error:', error);
  return res.status(500).json({ error: error.message || 'Internal server error' });
});

async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`\n🌿 Elite Tobacco Server running at http://localhost:${PORT}`);
    console.log('   Backend ready for API calls\n');
  });
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

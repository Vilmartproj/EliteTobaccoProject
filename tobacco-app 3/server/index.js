const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { DateTime } = require('luxon');


const app = express();
const PORT = Number(process.env.PORT || 3001);

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'EliteTobacco';
const DB_CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT || 10);
const DB_CONNECT_TIMEOUT_MS = Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000);
const DB_QUERY_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS || 8000);
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

const WAREHOUSE_EMPLOYEE_SEED = [
  { code: 'W001', name: 'Warehouse Staff 1', password: 'W001' },
  { code: 'W002', name: 'Warehouse Staff 2', password: 'W002' },
];

const APF_SEED = [];

const TOBACCO_TYPE_SEED = [
  { type: 'FCV Virginia', description: '' },
  { type: 'Burley', description: '' },
  { type: 'Natu', description: '' },
  { type: 'White Burley', description: '' },
  { type: 'Rustica', description: '' },
  { type: 'Other', description: '' },
];

const PURCHASE_LOCATION_SEED = [
  { location: 'Godown A', description: '' },
  { location: 'Godown B', description: '' },
  { location: 'Godown C', description: '' },
  { location: 'Warehouse 1', description: '' },
  { location: 'Warehouse 2', description: '' },
  { location: 'Warehouse 3', description: '' },
];

const QR_SEED = [
  { unique_code: '113', buyer_code: 'B001' },
  { unique_code: '114', buyer_code: 'B001' },
  { unique_code: '115', buyer_code: 'B002' },
  { unique_code: '116', buyer_code: null },
  { unique_code: '117', buyer_code: null },
];

const ALLOWED_TABLES = ['buyers', 'warehouse_employees', 'apf_numbers', 'tobacco_types', 'purchase_locations', 'grades', 'qr_codes', 'bags', 'settings', 'vehicle_dispatches', 'vehicle_dispatch_items', 'vehicle_dispatch_scan_events'];

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

// Always parse and store dates in Asia/Kolkata (IST) timezone using luxon
// This ensures that all purchase_date and date_of_purchase fields are saved and compared in IST, avoiding UTC/local mismatches
function normalizeDbDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();
  if (!text) return null;

  // Try ISO or YYYY-MM-DD
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00'] = match;
    // Use luxon to create a DateTime in Asia/Kolkata
    const dt = DateTime.fromObject({
      year: Number(y),
      month: Number(m),
      day: Number(d),
      hour: Number(hh),
      minute: Number(mm),
      second: Number(ss),
    }, { zone: 'Asia/Kolkata' });
    if (dt.isValid) return dt.toJSDate();
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const existingFormat = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (existingFormat) {
    const [, d, m, y, hh = '00', mm = '00', ss = '00'] = existingFormat;
    const dt = DateTime.fromObject({
      year: Number(y),
      month: Number(m),
      day: Number(d),
      hour: Number(hh),
      minute: Number(mm),
      second: Number(ss),
    }, { zone: 'Asia/Kolkata' });
    if (dt.isValid) return dt.toJSDate();
  }

  // Try parsing as Date, then convert to IST
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const dt = DateTime.fromJSDate(parsed, { zone: 'Asia/Kolkata' });
    if (dt.isValid) return dt.toJSDate();
  }

  return null;
}

async function q(sql, params = []) {
  const [rows] = await pool.query({ sql, timeout: DB_QUERY_TIMEOUT_MS }, params);
  return rows;
}

async function ensureColumnExists(tableName, columnName, columnDefinitionSql) {
  const rows = await q(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, tableName, columnName]
  );
  if (Number(rows[0]?.total || 0) > 0) return;
  await q(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinitionSql}`);
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
    connectTimeout: DB_CONNECT_TIMEOUT_MS,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  await q(`
    CREATE TABLE IF NOT EXISTS buyers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(100) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS warehouse_employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(100) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
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
    CREATE TABLE IF NOT EXISTS purchase_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      location VARCHAR(160) NOT NULL UNIQUE,
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
    await q('TRUNCATE TABLE purchase_locations');
    await q('TRUNCATE TABLE settings');
    await q('TRUNCATE TABLE buyers');
    await q('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🧹 DB_CLEAN_SETUP=true -> existing rows removed from core tables');
  }

  await q(
    "DELETE FROM apf_numbers WHERE number IN ('101','102','103','104','105') AND description LIKE 'Default APF %'"
  );

  for (const buyer of BUYER_SEED) {
    await q(
      'INSERT IGNORE INTO buyers (code, name, password, created_at) VALUES (?, ?, ?, NOW())',
      [buyer.code, buyer.name, buyer.password]
    );
  }

  for (const warehouseEmployee of WAREHOUSE_EMPLOYEE_SEED) {
    await q(
      'INSERT IGNORE INTO warehouse_employees (code, name, password, created_at) VALUES (?, ?, ?, NOW())',
      [warehouseEmployee.code, warehouseEmployee.name, warehouseEmployee.password]
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

  for (const purchaseLocation of PURCHASE_LOCATION_SEED) {
    await q(
      'INSERT IGNORE INTO purchase_locations (location, description, created_at) VALUES (?, ?, NOW())',
      [purchaseLocation.location, purchaseLocation.description]
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

  await q(`
    CREATE TABLE IF NOT EXISTS vehicle_dispatches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      buyer_id INT NOT NULL,
      warehouse_employee_id INT NULL,
      vehicle_number VARCHAR(80) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'sent_to_admin',
      buyer_note VARCHAR(500) NOT NULL DEFAULT '',
      admin_note VARCHAR(500) NOT NULL DEFAULT '',
      warehouse_note VARCHAR(500) NOT NULL DEFAULT '',
      sent_to_admin_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_to_warehouse_at DATETIME NULL,
      warehouse_confirmed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_vehicle_dispatches_buyer_id (buyer_id),
      INDEX idx_vehicle_dispatches_warehouse_employee_id (warehouse_employee_id),
      INDEX idx_vehicle_dispatches_status (status),
      INDEX idx_vehicle_dispatches_vehicle_number (vehicle_number),
      CONSTRAINT fk_vehicle_dispatches_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE RESTRICT,
      CONSTRAINT fk_vehicle_dispatches_warehouse_employee FOREIGN KEY (warehouse_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS vehicle_dispatch_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispatch_id INT NOT NULL,
      qr_code_id INT NOT NULL,
      unique_code VARCHAR(120) NOT NULL,
      bag_id INT NULL,
      weight DECIMAL(12,3) NULL,
      rate DECIMAL(12,3) NULL,
      bale_value DECIMAL(12,3) NULL,
      warehouse_scan_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      scanned_at DATETIME NULL,
      scanned_by_employee_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_dispatch_qr (dispatch_id, qr_code_id),
      INDEX idx_dispatch_items_dispatch_id (dispatch_id),
      INDEX idx_dispatch_items_qr_code_id (qr_code_id),
      INDEX idx_dispatch_items_unique_code (unique_code),
      INDEX idx_dispatch_items_scan_status (warehouse_scan_status),
      CONSTRAINT fk_dispatch_items_dispatch FOREIGN KEY (dispatch_id) REFERENCES vehicle_dispatches(id) ON DELETE CASCADE,
      CONSTRAINT fk_dispatch_items_qr FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE RESTRICT,
      CONSTRAINT fk_dispatch_items_bag FOREIGN KEY (bag_id) REFERENCES bags(id) ON DELETE SET NULL,
      CONSTRAINT fk_dispatch_items_scanned_by FOREIGN KEY (scanned_by_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS vehicle_dispatch_scan_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispatch_id INT NOT NULL,
      item_id INT NULL,
      warehouse_employee_id INT NOT NULL,
      scanned_code VARCHAR(120) NOT NULL,
      result VARCHAR(20) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_scan_events_dispatch_id (dispatch_id),
      INDEX idx_scan_events_employee_id (warehouse_employee_id),
      INDEX idx_scan_events_result (result),
      CONSTRAINT fk_scan_events_dispatch FOREIGN KEY (dispatch_id) REFERENCES vehicle_dispatches(id) ON DELETE CASCADE,
      CONSTRAINT fk_scan_events_item FOREIGN KEY (item_id) REFERENCES vehicle_dispatch_items(id) ON DELETE SET NULL,
      CONSTRAINT fk_scan_events_employee FOREIGN KEY (warehouse_employee_id) REFERENCES warehouse_employees(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB;
  `);

  await ensureColumnExists('vehicle_dispatches', 'warehouse_employee_id', 'warehouse_employee_id INT NULL');
  await ensureColumnExists('vehicle_dispatches', 'dispatch_number', 'dispatch_number VARCHAR(40) NULL');
  await ensureColumnExists('vehicle_dispatches', 'dispatch_date', 'dispatch_date DATETIME NULL');
  await ensureColumnExists('vehicle_dispatches', 'vehicle_type', 'vehicle_type VARCHAR(120) NULL');
  await ensureColumnExists('vehicle_dispatches', 'destination_location', 'destination_location VARCHAR(255) NULL');
  await ensureColumnExists('vehicle_dispatches', 'way_bill_number', 'way_bill_number VARCHAR(120) NULL');
  await ensureColumnExists('vehicle_dispatches', 'invoice_number', 'invoice_number VARCHAR(120) NULL');
  await ensureColumnExists('buyers', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumnExists('warehouse_employees', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumnExists('bags', 'dispatch_list_added', 'dispatch_list_added TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumnExists('bags', 'dispatch_invoice_number', 'dispatch_invoice_number VARCHAR(120) NULL');
  await ensureColumnExists('bags', 'dispatch_list_buyer_id', 'dispatch_list_buyer_id INT NULL');
  await ensureColumnExists('bags', 'dispatch_list_added_at', 'dispatch_list_added_at DATETIME NULL');
  await ensureColumnExists('vehicle_dispatch_items', 'warehouse_scan_status', "warehouse_scan_status VARCHAR(20) NOT NULL DEFAULT 'pending'");
  await ensureColumnExists('vehicle_dispatch_items', 'scanned_at', 'scanned_at DATETIME NULL');
  await ensureColumnExists('vehicle_dispatch_items', 'scanned_by_employee_id', 'scanned_by_employee_id INT NULL');
  await ensureColumnExists('vehicle_dispatch_items', 'dispatch_invoice_number', 'dispatch_invoice_number VARCHAR(120) NULL');

  await q(
    'INSERT IGNORE INTO settings (id, buyer_actions_after_6pm_enabled, buyer_actions_after_6pm_buyer_ids, updated_at) VALUES (1, 0, JSON_ARRAY(), NOW())'
  );

  await q(`
    CREATE TABLE IF NOT EXISTS admin_logins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL DEFAULT 'Admin',
      password VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // Seed a default admin record if table is empty
  const adminCount = await q('SELECT COUNT(*) AS total FROM admin_logins');
  if (Number(adminCount[0]?.total || 0) === 0) {
    await q(
      'INSERT INTO admin_logins (code, name, password) VALUES (?, ?, ?)',
      ['admin', 'Administrator', 'admin123']
    );
  }

  console.log(`✅ MySQL connected: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
}

app.post('/api/login', withAsync(async (req, res) => {
  const { code, password } = req.body || {};

  const rawCode = String(code || '').trim();
  const rawPassword = String(password || '').trim();
  const loginCode = rawCode.toUpperCase();
  const loginPassword = rawPassword.toUpperCase();

  // Check admin_logins table first (supports multiple admins)
  const adminRows = await q(
    'SELECT id, code, name, password FROM admin_logins WHERE LOWER(code) = LOWER(?) LIMIT 1',
    [rawCode]
  );
  if (adminRows.length > 0) {
    if (adminRows[0].password === rawPassword) {
      return res.json({ success: true, user: { role: 'admin', name: adminRows[0].name, code: adminRows[0].code, id: adminRows[0].id } });
    }
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const buyerRows = await q(
    'SELECT id, code, name, password, is_active, created_at FROM buyers WHERE code = ? AND password = ? LIMIT 1',
    [loginCode, loginPassword]
  );

  if (buyerRows.length > 0) {
    if (Number(buyerRows[0].is_active ?? 1) !== 1) {
      return res.status(403).json({ error: 'Buyer account is inactive. Contact admin.' });
    }
    return res.json({ success: true, user: { role: 'buyer', ...buyerRows[0] } });
  }

  const warehouseRows = await q(
    'SELECT id, code, name, is_active, created_at FROM warehouse_employees WHERE code = ? AND password = ? LIMIT 1',
    [loginCode, loginPassword]
  );
  if (warehouseRows.length > 0) {
    if (Number(warehouseRows[0].is_active ?? 1) !== 1) {
      return res.status(403).json({ error: 'Warehouse account is inactive. Contact admin.' });
    }
    return res.json({ success: true, user: { role: 'warehouse', ...warehouseRows[0] } });
  }

  return res.status(401).json({ error: 'Invalid login code or password' });
}));

// ── Admin Logins CRUD ──
app.get('/api/admin-logins', withAsync(async (_req, res) => {
  const rows = await q('SELECT id, code, name, password, created_at FROM admin_logins ORDER BY id ASC');
  res.json(rows);
}));

app.post('/api/admin-logins', withAsync(async (req, res) => {
  const { code, name, password } = req.body || {};
  const normCode = String(code || '').trim();
  const normName = String(name || '').trim() || 'Admin';
  const normPassword = String(password || '').trim();
  if (!normCode || !normPassword) return res.status(400).json({ error: 'code and password are required' });
  try {
    const result = await q(
      'INSERT INTO admin_logins (code, name, password) VALUES (?, ?, ?)',
      [normCode, normName, normPassword]
    );
    const rows = await q('SELECT id, code, name, password, created_at FROM admin_logins WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Admin code already exists' });
    throw err;
  }
}));

app.put('/api/admin-logins/:id', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const { name, password } = req.body || {};
  const normName = String(name || '').trim();
  const normPassword = String(password || '').trim();
  if (!normName && !normPassword) return res.status(400).json({ error: 'Nothing to update' });
  if (normName) await q('UPDATE admin_logins SET name = ? WHERE id = ?', [normName, id]);
  if (normPassword) await q('UPDATE admin_logins SET password = ? WHERE id = ?', [normPassword, id]);
  const rows = await q('SELECT id, code, name, password, created_at FROM admin_logins WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}));

app.delete('/api/admin-logins/:id', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const total = await q('SELECT COUNT(*) AS total FROM admin_logins');
  if (Number(total[0]?.total || 0) <= 1) return res.status(400).json({ error: 'Cannot delete the last admin account' });
  await q('DELETE FROM admin_logins WHERE id = ?', [id]);
  res.json({ success: true });
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

app.put('/api/buyers/:id', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const { name, password, is_active } = req.body || {};
  const updates = {};
  if (name && String(name).trim()) updates.name = String(name).trim();
  if (password && String(password).trim()) updates.password = String(password).trim();
  if ([true, false, 1, 0, '1', '0'].includes(is_active)) {
    updates.is_active = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  await q(`UPDATE buyers SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);
  const rows = await q('SELECT * FROM buyers WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Buyer not found' });
  res.json(rows[0]);
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

app.get('/api/warehouse-employees', withAsync(async (_req, res) => {
  const rows = await q('SELECT id, code, name, password, is_active, created_at FROM warehouse_employees ORDER BY id ASC');
  res.json(rows);
}));

app.post('/api/warehouse-employees', withAsync(async (req, res) => {
  const { code, name } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedName = String(name || '').trim();

  if (!normalizedCode || !normalizedName) {
    return res.status(400).json({ error: 'code and name required' });
  }

  try {
    const result = await q(
      'INSERT INTO warehouse_employees (code, name, password, created_at) VALUES (?, ?, ?, NOW())',
      [normalizedCode, normalizedName, normalizedCode]
    );
    const rows = await q('SELECT id, code, name, password, is_active, created_at FROM warehouse_employees WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Warehouse employee code already exists' });
    throw error;
  }
}));

app.put('/api/warehouse-employees/:id', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const { name, password, is_active } = req.body || {};
  const updates = {};
  if (name && String(name).trim()) updates.name = String(name).trim();
  if (password && String(password).trim()) updates.password = String(password).trim();
  if ([true, false, 1, 0, '1', '0'].includes(is_active)) {
    updates.is_active = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  await q(`UPDATE warehouse_employees SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);
  const rows = await q('SELECT id, code, name, password, is_active, created_at FROM warehouse_employees WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Warehouse employee not found' });
  res.json(rows[0]);
}));

app.delete('/api/warehouse-employees/:id', withAsync(async (req, res) => {
  const employeeId = Number(req.params.id);
  const rows = await q('SELECT id, code, name FROM warehouse_employees WHERE id = ? LIMIT 1', [employeeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Warehouse employee not found' });

  const assignedDispatches = await q(
    "SELECT COUNT(*) AS total FROM vehicle_dispatches WHERE warehouse_employee_id = ? AND status = 'sent_to_warehouse'",
    [employeeId]
  );
  if (assignedDispatches[0].total > 0) {
    return res.status(400).json({ error: 'Cannot delete warehouse employee with active dispatch assignment' });
  }

  await q('DELETE FROM warehouse_employees WHERE id = ?', [employeeId]);
  res.json({ success: true, employee: rows[0] });
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

app.get('/api/purchase-locations', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM purchase_locations ORDER BY location ASC');
  res.json(rows);
}));

app.post('/api/purchase-locations', withAsync(async (req, res) => {
  const { location, description } = req.body || {};
  const normalizedLocation = String(location || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedLocation) return res.status(400).json({ error: 'Location is required' });

  try {
    const result = await q(
      'INSERT INTO purchase_locations (location, description, created_at) VALUES (?, ?, NOW())',
      [normalizedLocation, normalizedDescription]
    );
    const rows = await q('SELECT * FROM purchase_locations WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Location already exists' });
    throw error;
  }
}));

app.put('/api/purchase-locations/:id', withAsync(async (req, res) => {
  const locationId = Number(req.params.id);
  const { location, description } = req.body || {};

  const normalizedLocation = String(location || '').trim();
  const normalizedDescription = String(description || '').trim();

  if (!normalizedLocation) return res.status(400).json({ error: 'Location is required' });

  const rows = await q('SELECT * FROM purchase_locations WHERE id = ? LIMIT 1', [locationId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Location not found' });

  const duplicate = await q('SELECT id FROM purchase_locations WHERE LOWER(location) = LOWER(?) AND id <> ? LIMIT 1', [normalizedLocation, locationId]);
  if (duplicate.length > 0) return res.status(400).json({ error: 'Location already exists' });

  await q('UPDATE purchase_locations SET location = ?, description = ? WHERE id = ?', [normalizedLocation, normalizedDescription, locationId]);
  const updated = await q('SELECT * FROM purchase_locations WHERE id = ?', [locationId]);
  res.json(updated[0]);
}));

app.delete('/api/purchase-locations/:id', withAsync(async (req, res) => {
  const locationId = Number(req.params.id);
  const rows = await q('SELECT * FROM purchase_locations WHERE id = ? LIMIT 1', [locationId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Location not found' });

  const locationRow = rows[0];
  const inUse = await q('SELECT COUNT(*) AS total FROM bags WHERE LOWER(TRIM(IFNULL(purchase_location, ""))) = LOWER(?)', [String(locationRow.location || '').trim()]);
  if (inUse[0].total > 0) return res.status(400).json({ error: 'Location is in use and cannot be deleted' });

  await q('DELETE FROM purchase_locations WHERE id = ?', [locationId]);
  res.json({ success: true, purchase_location: locationRow });
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

app.put('/api/qrcodes/mark-used', withAsync(async (req, res) => {
  const uniqueCode = String(req.body?.uniqueCode || '').trim();
  const buyerId = req.body?.buyerId ? Number(req.body.buyerId) : null;
  if (!uniqueCode) return res.status(400).json({ error: 'uniqueCode is required' });
  const rows = await q('SELECT id FROM qr_codes WHERE unique_code = ? LIMIT 1', [uniqueCode]);
  if (rows.length === 0) return res.status(404).json({ error: 'QR code not found' });
  await q('UPDATE qr_codes SET used = 1, buyer_id = ? WHERE unique_code = ?', [buyerId, uniqueCode]);
  const updated = await q('SELECT * FROM qr_codes WHERE unique_code = ? LIMIT 1', [uniqueCode]);
  res.json(updated[0]);
}));

app.get('/api/qrcodes/validate/:code', withAsync(async (req, res) => {
  const qrRows = await q('SELECT * FROM qr_codes WHERE unique_code = ? LIMIT 1', [req.params.code]);
  if (qrRows.length === 0) return res.json({ valid: false, error: 'QR code not found' });

  const qr = qrRows[0];
  if (qr.used) return res.json({ valid: false, alreadyUsed: true, error: 'QR code already used' });

  res.json({ valid: true, qr });
}));

app.get('/api/qrcodes/track/:code', withAsync(async (req, res) => {
  const code = String(req.params.code || '').trim();
  if (!code) return res.status(400).json({ error: 'QR code is required' });

  const qrRows = await q(
    `SELECT q.id, q.unique_code, q.buyer_id, q.used, q.created_at, b.code AS buyer_code, b.name AS buyer_name
     FROM qr_codes q
     LEFT JOIN buyers b ON b.id = q.buyer_id
     WHERE q.unique_code = ?
     LIMIT 1`,
    [code]
  );
  if (qrRows.length === 0) return res.status(404).json({ error: 'QR code not found' });

  const qr = qrRows[0];
  const bagRows = await q(
    `SELECT id, unique_code, buyer_id, buyer_code, buyer_name, fcv, apf_number, tobacco_grade, type_of_tobacco,
            purchase_location, purchase_date, weight, rate, bale_value, buyer_grade, lot_number,
            date_of_purchase, saved_at, updated_at, dispatch_invoice_number
     FROM bags
     WHERE unique_code = ?
     ORDER BY id DESC
     LIMIT 1`,
    [code]
  );

  const bag = bagRows.length > 0 ? bagRows[0] : null;

  // Fetch the latest vehicle dispatch linked to this QR code
  const dispatchRows = await q(
    `SELECT vdi.id AS item_id, vdi.dispatch_invoice_number AS invoice_number,
            vdi.warehouse_scan_status AS item_scan_status, vdi.scanned_at,
            vdi.weight AS item_weight, vdi.rate AS item_rate, vdi.bale_value AS item_bale_value,
            vd.id AS dispatch_id, vd.dispatch_number, vd.status AS dispatch_status,
            vd.vehicle_number, vd.buyer_note, vd.admin_note, vd.warehouse_note,
            vd.sent_to_admin_at, vd.sent_to_warehouse_at, vd.warehouse_confirmed_at,
            we.name AS warehouse_employee_name
     FROM vehicle_dispatch_items vdi
     JOIN vehicle_dispatches vd ON vd.id = vdi.dispatch_id
     LEFT JOIN warehouse_employees we ON we.id = vd.warehouse_employee_id
     WHERE vdi.unique_code = ?
     ORDER BY vdi.id DESC
     LIMIT 1`,
    [code]
  );
  const dispatch = dispatchRows.length > 0 ? dispatchRows[0] : null;

  const status = qr.used ? 'USED' : (qr.buyer_id ? 'ASSIGNED' : 'UNASSIGNED');

  res.json({
    code,
    status,
    qr,
    bag,
    dispatch,
    tracked_at: new Date().toISOString(),
  });
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
    ? await q(
      `SELECT bag.*, vd.id AS vehicle_dispatch_id, vd.dispatch_number AS vehicle_dispatch_number, vd.status AS vehicle_dispatch_status
       FROM bags bag
       LEFT JOIN (
         SELECT vdi.bag_id, MAX(vdi.dispatch_id) AS latest_dispatch_id
         FROM vehicle_dispatch_items vdi
         GROUP BY vdi.bag_id
       ) latest ON latest.bag_id = bag.id
       LEFT JOIN vehicle_dispatches vd ON vd.id = latest.latest_dispatch_id
       WHERE bag.buyer_id = ?
       ORDER BY bag.id DESC`,
      [buyerId]
    )
    : await q(
      `SELECT bag.*, vd.id AS vehicle_dispatch_id, vd.dispatch_number AS vehicle_dispatch_number, vd.status AS vehicle_dispatch_status
       FROM bags bag
       LEFT JOIN (
         SELECT vdi.bag_id, MAX(vdi.dispatch_id) AS latest_dispatch_id
         FROM vehicle_dispatch_items vdi
         GROUP BY vdi.bag_id
       ) latest ON latest.bag_id = bag.id
       LEFT JOIN vehicle_dispatches vd ON vd.id = latest.latest_dispatch_id
       ORDER BY bag.id DESC`
    );

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

app.put('/api/bags/:id/add-to-dispatch-list', withAsync(async (req, res) => {
  const bagId = Number(req.params.id);
  if (!Number.isFinite(bagId) || bagId <= 0) return res.status(400).json({ error: 'Invalid bag id' });

  const requestedDispatchListBuyerId = normalizeBuyerId(req.body?.dispatch_list_buyer_id);
  const invoiceNumber = String(req.body?.invoice_number || '').trim();

  const bagRows = await q('SELECT * FROM bags WHERE id = ? LIMIT 1', [bagId]);
  if (bagRows.length === 0) return res.status(404).json({ error: 'Bag not found' });

  const bag = bagRows[0];
  const dispatchListBuyerId = requestedDispatchListBuyerId || normalizeBuyerId(bag.buyer_id);
  if (!dispatchListBuyerId) return res.status(400).json({ error: 'Buyer is missing for this bag' });

  const buyerRows = await q('SELECT id FROM buyers WHERE id = ? LIMIT 1', [dispatchListBuyerId]);
  if (buyerRows.length === 0) return res.status(400).json({ error: 'Invalid buyer selected' });

  const qrRows = await q('SELECT id, used FROM qr_codes WHERE unique_code = ? LIMIT 1', [String(bag.unique_code || '').trim()]);
  if (qrRows.length === 0) return res.status(400).json({ error: 'Linked QR code not found for this bag' });
  if (!qrRows[0].used) return res.status(400).json({ error: 'Only used QR codes can be added to dispatch list' });

  const existingDispatchRows = await q(
    `SELECT vd.id, vd.dispatch_number, vd.status
     FROM vehicle_dispatch_items vdi
     INNER JOIN vehicle_dispatches vd ON vd.id = vdi.dispatch_id
     WHERE vdi.bag_id = ?
     ORDER BY vd.id DESC
     LIMIT 1`,
    [bagId]
  );
  if (existingDispatchRows.length > 0) {
    return res.status(400).json({ error: 'This bag is already moved to vehicle dispatch' });
  }

  await q(
    `UPDATE bags
     SET dispatch_list_added = 1,
         dispatch_invoice_number = ?,
         dispatch_list_buyer_id = ?,
         dispatch_list_added_at = NOW(),
         updated_at = NOW()
     WHERE id = ?`,
    [invoiceNumber || null, dispatchListBuyerId, bagId]
  );

  const updatedRows = await q('SELECT * FROM bags WHERE id = ? LIMIT 1', [bagId]);
  res.json({ success: true, bag: updatedRows[0] });
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

app.get('/api/vehicle-dispatches', withAsync(async (req, res) => {
  const buyerId = normalizeBuyerId(req.query.buyer_id);
  const warehouseEmployeeId = normalizeBuyerId(req.query.warehouse_employee_id);
  const filters = [];
  const params = [];

  if (buyerId) {
    filters.push('vd.buyer_id = ?');
    params.push(buyerId);
  }
  if (warehouseEmployeeId) {
    filters.push('vd.warehouse_employee_id = ?');
    params.push(warehouseEmployeeId);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await q(
    `SELECT vd.*, b.code AS buyer_code, b.name AS buyer_name,
            we.code AS warehouse_employee_code, we.name AS warehouse_employee_name,
            COUNT(vdi.id) AS item_count,
            COALESCE(SUM(vdi.weight), 0) AS total_weight,
            COALESCE(SUM(vdi.bale_value), 0) AS total_bale_value,
            COALESCE(SUM(CASE WHEN vdi.warehouse_scan_status = 'matched' THEN 1 ELSE 0 END), 0) AS matched_count,
            COALESCE(events.unmatched_count, 0) AS unmatched_count
     FROM vehicle_dispatches vd
     INNER JOIN buyers b ON b.id = vd.buyer_id
     LEFT JOIN warehouse_employees we ON we.id = vd.warehouse_employee_id
     LEFT JOIN vehicle_dispatch_items vdi ON vdi.dispatch_id = vd.id
     LEFT JOIN (
       SELECT dispatch_id, COUNT(*) AS unmatched_count
       FROM vehicle_dispatch_scan_events
       WHERE result = 'unmatched'
       GROUP BY dispatch_id
     ) events ON events.dispatch_id = vd.id
     ${whereClause}
     GROUP BY vd.id
     ORDER BY vd.id DESC`,
    params
  );

  res.json(rows);
}));

app.get('/api/vehicle-dispatches/:id', withAsync(async (req, res) => {
  const dispatchId = Number(req.params.id);
  if (!Number.isFinite(dispatchId) || dispatchId <= 0) return res.status(400).json({ error: 'Invalid dispatch id' });

  const rows = await q(
    `SELECT vd.*, b.code AS buyer_code, b.name AS buyer_name,
            we.code AS warehouse_employee_code, we.name AS warehouse_employee_name
     FROM vehicle_dispatches vd
     INNER JOIN buyers b ON b.id = vd.buyer_id
     LEFT JOIN warehouse_employees we ON we.id = vd.warehouse_employee_id
     WHERE vd.id = ?
     LIMIT 1`,
    [dispatchId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Vehicle dispatch not found' });

  const items = await q(
    `SELECT vdi.*, bag.buyer_grade, bag.apf_number, bag.tobacco_grade, bag.purchase_location,
            bag.type_of_tobacco, bag.fcv, bag.date_of_purchase
     FROM vehicle_dispatch_items vdi
     LEFT JOIN bags bag ON bag.id = vdi.bag_id
     WHERE vdi.dispatch_id = ?
     ORDER BY vdi.id ASC`,
    [dispatchId]
  );

  const scanEvents = await q(
    `SELECT e.id, e.scanned_code, e.result, e.created_at, we.code AS warehouse_employee_code, we.name AS warehouse_employee_name
     FROM vehicle_dispatch_scan_events e
     LEFT JOIN warehouse_employees we ON we.id = e.warehouse_employee_id
     WHERE e.dispatch_id = ?
     ORDER BY e.id DESC
     LIMIT 200`,
    [dispatchId]
  );

  res.json({ ...rows[0], items, scan_events: scanEvents });
}));

app.get('/api/vehicle-dispatches/eligible-qrcodes/:buyerId', withAsync(async (req, res) => {
  const buyerId = normalizeBuyerId(req.params.buyerId);
  if (!buyerId) return res.status(400).json({ error: 'Invalid buyer id' });

  const rows = await q(
    `SELECT q.id AS qr_code_id, q.unique_code,
            bag.id AS bag_id, bag.weight, bag.rate, bag.bale_value, bag.buyer_grade,
            bag.tobacco_grade, bag.apf_number, bag.purchase_location, bag.fcv, bag.date_of_purchase,
            bag.dispatch_invoice_number
     FROM qr_codes q
     INNER JOIN bags bag ON bag.unique_code = q.unique_code
     WHERE q.buyer_id = ?
       AND q.used = 1
       AND bag.dispatch_list_added = 1
       AND COALESCE(bag.dispatch_list_buyer_id, q.buyer_id) = ?
       AND NOT EXISTS (
         SELECT 1
         FROM vehicle_dispatch_items vdi
         INNER JOIN vehicle_dispatches vd ON vd.id = vdi.dispatch_id
         WHERE vdi.qr_code_id = q.id
           AND vd.status IN ('sent_to_admin', 'sent_to_warehouse')
       )
     ORDER BY bag.id DESC`,
    [buyerId, buyerId]
  );

  res.json(rows);
}));

app.post('/api/vehicle-dispatches', withAsync(async (req, res) => {
  const body = req.body || {};
  const buyerId = normalizeBuyerId(body.buyer_id);
  const vehicleNumber = String(body.vehicle_number || '').trim().toUpperCase();
  const vehicleType = String(body.vehicle_type || '').trim();
  const destinationLocation = String(body.destination_location || '').trim();
  const wayBillNumber = String(body.way_bill_number || '').trim();
  const invoiceNumber = String(body.invoice_number || '').trim();
  const buyerNote = String(body.buyer_note || '').trim();
  const uniqueCodes = Array.isArray(body.qr_codes) ? body.qr_codes.map((code) => String(code || '').trim()).filter(Boolean) : [];

  if (!buyerId) return res.status(400).json({ error: 'buyer_id is required' });
  if (!vehicleNumber) return res.status(400).json({ error: 'vehicle_number is required' });
  if (!vehicleType) return res.status(400).json({ error: 'vehicle_type is required' });
  if (!destinationLocation) return res.status(400).json({ error: 'destination_location is required' });
  if (!wayBillNumber) return res.status(400).json({ error: 'way_bill_number is required' });
  if (!invoiceNumber) return res.status(400).json({ error: 'invoice_number is required' });
  if (uniqueCodes.length === 0) return res.status(400).json({ error: 'At least one QR code is required' });

  const buyerRows = await q('SELECT id FROM buyers WHERE id = ? LIMIT 1', [buyerId]);
  if (buyerRows.length === 0) return res.status(400).json({ error: 'Invalid buyer_id' });

  const placeholders = uniqueCodes.map(() => '?').join(',');
  const qrRows = await q(
    `SELECT q.id AS qr_code_id, q.unique_code, q.buyer_id, q.used,
            bag.id AS bag_id, bag.weight, bag.rate,
            bag.dispatch_invoice_number,
          bag.dispatch_list_added, bag.dispatch_list_buyer_id,
            COALESCE(bag.bale_value, bag.weight * bag.rate) AS bale_value
     FROM qr_codes q
     LEFT JOIN bags bag ON bag.unique_code = q.unique_code
     WHERE q.unique_code IN (${placeholders})`,
    uniqueCodes
  );

  if (qrRows.length !== uniqueCodes.length) {
    return res.status(400).json({ error: 'One or more QR codes do not exist' });
  }

  for (const row of qrRows) {
    if (Number(row.buyer_id) !== buyerId) {
      return res.status(400).json({ error: `QR code ${row.unique_code} is not assigned to this buyer` });
    }
    if (!row.used) {
      return res.status(400).json({ error: `QR code ${row.unique_code} is not used yet` });
    }
    if (!row.bag_id) {
      return res.status(400).json({ error: `QR code ${row.unique_code} has no linked bag` });
    }
    if (!Number(row.dispatch_list_added)) {
      return res.status(400).json({ error: `QR code ${row.unique_code} is not added to dispatch list` });
    }
    if (normalizeBuyerId(row.dispatch_list_buyer_id) !== buyerId) {
      return res.status(400).json({ error: `QR code ${row.unique_code} is added for another buyer dispatch` });
    }
  }

  const qrIds = qrRows.map((row) => Number(row.qr_code_id));
  const placeholdersForIds = qrIds.map(() => '?').join(',');
  const alreadyUsedInActiveDispatch = await q(
    `SELECT vdi.unique_code
     FROM vehicle_dispatch_items vdi
     INNER JOIN vehicle_dispatches vd ON vd.id = vdi.dispatch_id
     WHERE vdi.qr_code_id IN (${placeholdersForIds})
       AND vd.status IN ('sent_to_admin', 'sent_to_warehouse')`,
    qrIds
  );

  if (alreadyUsedInActiveDispatch.length > 0) {
    return res.status(400).json({ error: `QR code ${alreadyUsedInActiveDispatch[0].unique_code} is already in an active vehicle dispatch` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Find the max numeric part of dispatch_number globally
    const maxDispatchRow = await conn.query(
      `SELECT MAX(CAST(SUBSTRING(dispatch_number, 5) AS UNSIGNED)) AS max_num
       FROM vehicle_dispatches
       WHERE dispatch_number LIKE 'DSP-%'`
    );
    let nextDispatchNum = 1;
    if (maxDispatchRow && maxDispatchRow[0] && maxDispatchRow[0][0] && maxDispatchRow[0][0].max_num) {
      nextDispatchNum = Number(maxDispatchRow[0][0].max_num) + 1;
    }
    const dispatchNumber = `DSP-${String(nextDispatchNum).padStart(5, '0')}`;

    const [insertDispatchResult] = await conn.query(
      `INSERT INTO vehicle_dispatches
       (buyer_id, vehicle_number, vehicle_type, destination_location, way_bill_number, invoice_number, dispatch_date, status, buyer_note, sent_to_admin_at, created_at, updated_at, dispatch_number)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 'sent_to_admin', ?, NOW(), NOW(), NOW(), ?)`,
      [buyerId, vehicleNumber, vehicleType, destinationLocation, wayBillNumber, invoiceNumber, buyerNote, dispatchNumber]
    );

    const dispatchId = insertDispatchResult.insertId;

    for (const row of qrRows) {
      await conn.query(
        `INSERT INTO vehicle_dispatch_items
         (dispatch_id, qr_code_id, unique_code, bag_id, weight, rate, bale_value, dispatch_invoice_number, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          dispatchId,
          row.qr_code_id,
          row.unique_code,
          row.bag_id,
          row.weight ?? null,
          row.rate ?? null,
          row.bale_value ?? null,
          String(row.dispatch_invoice_number || '').trim() || invoiceNumber,
        ]
      );
    }

    const bagIds = qrRows.map((row) => Number(row.bag_id)).filter((id) => Number.isFinite(id) && id > 0);
    if (bagIds.length > 0) {
      const bagIdPlaceholders = bagIds.map(() => '?').join(',');
      await conn.query(
        `UPDATE bags
         SET dispatch_list_added = 0,
             dispatch_invoice_number = NULL,
             dispatch_list_buyer_id = NULL,
             dispatch_list_added_at = NULL,
             updated_at = NOW()
         WHERE id IN (${bagIdPlaceholders})`,
        bagIds
      );
    }

    await conn.commit();

    const dispatchRows = await q(
      `SELECT vd.*, b.code AS buyer_code, b.name AS buyer_name,
              COUNT(vdi.id) AS item_count,
              COALESCE(SUM(vdi.weight), 0) AS total_weight,
              COALESCE(SUM(vdi.bale_value), 0) AS total_bale_value
       FROM vehicle_dispatches vd
       INNER JOIN buyers b ON b.id = vd.buyer_id
       LEFT JOIN vehicle_dispatch_items vdi ON vdi.dispatch_id = vd.id
       WHERE vd.id = ?
       GROUP BY vd.id`,
      [dispatchId]
    );

    res.json({ success: true, dispatch: dispatchRows[0] });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.put('/api/vehicle-dispatches/:id/send-to-warehouse', withAsync(async (req, res) => {
  const dispatchId = Number(req.params.id);
  const adminNote = String(req.body?.admin_note || '').trim();
  const warehouseEmployeeId = normalizeBuyerId(req.body?.warehouse_employee_id);
  if (!Number.isFinite(dispatchId) || dispatchId <= 0) return res.status(400).json({ error: 'Invalid dispatch id' });
  if (!warehouseEmployeeId) return res.status(400).json({ error: 'warehouse_employee_id is required' });

  const warehouseRows = await q('SELECT id FROM warehouse_employees WHERE id = ? LIMIT 1', [warehouseEmployeeId]);
  if (warehouseRows.length === 0) return res.status(400).json({ error: 'Invalid warehouse employee' });

  const rows = await q('SELECT id, status FROM vehicle_dispatches WHERE id = ? LIMIT 1', [dispatchId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Vehicle dispatch not found' });

  if (rows[0].status !== 'sent_to_admin') {
    return res.status(400).json({ error: 'Only dispatches sent to admin can be forwarded to warehouse' });
  }

  await q(
    `UPDATE vehicle_dispatches
     SET status = 'sent_to_warehouse', warehouse_employee_id = ?, admin_note = ?, sent_to_warehouse_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [warehouseEmployeeId, adminNote, dispatchId]
  );

  const updated = await q('SELECT * FROM vehicle_dispatches WHERE id = ? LIMIT 1', [dispatchId]);
  res.json({ success: true, dispatch: updated[0] });
}));

app.put('/api/vehicle-dispatches/:id/warehouse-confirmation', withAsync(async (req, res) => {
  const dispatchId = Number(req.params.id);
  const matchStatus = String(req.body?.match_status || '').trim().toLowerCase();
  const warehouseNote = String(req.body?.warehouse_note || '').trim();
  if (!Number.isFinite(dispatchId) || dispatchId <= 0) return res.status(400).json({ error: 'Invalid dispatch id' });

  if (!['matched', 'not_matched'].includes(matchStatus)) {
    return res.status(400).json({ error: 'match_status must be matched or not_matched' });
  }

  const rows = await q('SELECT id, status FROM vehicle_dispatches WHERE id = ? LIMIT 1', [dispatchId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Vehicle dispatch not found' });

  if (rows[0].status !== 'sent_to_warehouse') {
    return res.status(400).json({ error: 'Only warehouse-pending dispatches can be confirmed' });
  }

  const nextStatus = matchStatus === 'matched' ? 'warehouse_received' : 'unmatched_bags';
  await q(
    `UPDATE vehicle_dispatches
     SET status = ?, warehouse_note = ?, warehouse_confirmed_at = NOW(), updated_at = NOW()
     WHERE id = ?`,

    [nextStatus, warehouseNote, dispatchId]
  );

  const updated = await q('SELECT * FROM vehicle_dispatches WHERE id = ? LIMIT 1', [dispatchId]);
  res.json({ success: true, dispatch: updated[0] });
}));

app.post('/api/vehicle-dispatches/:id/scan', withAsync(async (req, res) => {
  const dispatchId = Number(req.params.id);
  const warehouseEmployeeId = normalizeBuyerId(req.body?.warehouse_employee_id);
  const scannedCode = String(req.body?.qr_code || '').trim();

  if (!Number.isFinite(dispatchId) || dispatchId <= 0) return res.status(400).json({ error: 'Invalid dispatch id' });
  if (!warehouseEmployeeId) return res.status(400).json({ error: 'warehouse_employee_id is required' });
  if (!scannedCode) return res.status(400).json({ error: 'qr_code is required' });

  const dispatchRows = await q(
    'SELECT id, status, warehouse_employee_id FROM vehicle_dispatches WHERE id = ? LIMIT 1',
    [dispatchId]
  );
  if (dispatchRows.length === 0) return res.status(404).json({ error: 'Vehicle dispatch not found' });

  const dispatch = dispatchRows[0];
  if (!['sent_to_warehouse', 'warehouse_received', 'unmatched_bags'].includes(dispatch.status)) {
    return res.status(400).json({ error: 'Dispatch is not in warehouse processing stage' });
  }

  if (Number(dispatch.warehouse_employee_id) !== warehouseEmployeeId) {
    return res.status(403).json({ error: 'Dispatch is not assigned to this warehouse employee' });
  }

  const itemRows = await q(
    'SELECT * FROM vehicle_dispatch_items WHERE dispatch_id = ? AND unique_code = ? LIMIT 1',
    [dispatchId, scannedCode]
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let result = 'unmatched';
    let message = 'Scanned QR not found in this vehicle list';
    let matchedItem = null;

    if (itemRows.length > 0) {
      matchedItem = itemRows[0];
      result = 'matched';
      message = 'QR matched successfully';
      await conn.query(
        `UPDATE vehicle_dispatch_items
         SET warehouse_scan_status = 'matched', scanned_at = NOW(), scanned_by_employee_id = ?
         WHERE id = ?`,
        [warehouseEmployeeId, matchedItem.id]
      );
    }

    await conn.query(
      `INSERT INTO vehicle_dispatch_scan_events
       (dispatch_id, item_id, warehouse_employee_id, scanned_code, result, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [dispatchId, matchedItem ? matchedItem.id : null, warehouseEmployeeId, scannedCode, result]
    );

    const [summaryRows] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM vehicle_dispatch_items WHERE dispatch_id = ?) AS total_items,
         (SELECT COUNT(*) FROM vehicle_dispatch_items WHERE dispatch_id = ? AND warehouse_scan_status = 'matched') AS matched_count,
         (SELECT COUNT(*) FROM vehicle_dispatch_scan_events WHERE dispatch_id = ? AND result = 'unmatched') AS unmatched_count`,
      [dispatchId, dispatchId, dispatchId]
    );
    const summary = summaryRows[0];

    const [unmatchedEventRows] = await conn.query(
      `SELECT scanned_code
       FROM vehicle_dispatch_scan_events
       WHERE dispatch_id = ? AND result = 'unmatched'
       ORDER BY id DESC`,
      [dispatchId]
    );

    const unmatchedCodes = [];
    const unmatchedCodeSet = new Set();
    for (const row of unmatchedEventRows) {
      const code = String(row.scanned_code || '').trim();
      if (!code || unmatchedCodeSet.has(code)) continue;
      unmatchedCodeSet.add(code);
      unmatchedCodes.push(code);
    }

    const warehouseNote = unmatchedCodes.length > 0
      ? `Unmatched QR Codes: ${unmatchedCodes.join(', ')}`
      : '';

    let nextStatus = 'sent_to_warehouse';
    let confirmedAt = null;
    if (Number(summary.total_items) > 0 && Number(summary.matched_count) >= Number(summary.total_items)) {
      nextStatus = Number(summary.unmatched_count) > 0 ? 'unmatched_bags' : 'warehouse_received';
      confirmedAt = new Date();
    }

    await conn.query(
      `UPDATE vehicle_dispatches
       SET status = ?, warehouse_note = ?, warehouse_confirmed_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [nextStatus, warehouseNote, confirmedAt, dispatchId]
    );

    await conn.commit();
    res.json({ success: true, result, message, status: nextStatus, summary, unmatched_codes: unmatchedCodes });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
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

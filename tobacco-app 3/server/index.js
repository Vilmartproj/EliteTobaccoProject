const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

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

// Admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

const ALLOWED_TABLES = ['buyers', 'apf_numbers', 'tobacco_types', 'purchase_locations', 'grades', 'qr_codes', 'bags', 'settings', 'invoices', 'invoice_items', 'dispatch', 'dispatch_items', 'review_tasks'];

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

async function hashPassword(password) {
  if (!password) return null;
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  // For backward compatibility, check if password is plain text
  if (password === hashedPassword) return true;
  // Check if hashed password
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    // If comparison fails, fall back to plain text comparison for backward compatibility
    return password === hashedPassword;
  }
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
      buyer_code VARCHAR(50) NULL,
      buyer_name VARCHAR(255) NULL,
      fcv VARCHAR(40) NULL,
      type_of_tobacco VARCHAR(120) NULL,
      apf_number VARCHAR(80) NULL,
      tobacco_grade VARCHAR(50) NULL,
      purchase_date DATE NULL,
      weight DECIMAL(8,2) NULL,
      rate DECIMAL(10,2) NULL,
      bale_value DECIMAL(10,2) NULL,
      buyer_grade VARCHAR(50) NULL,
      lot_number VARCHAR(80) NULL,
      date_of_purchase DATE NULL,
      purchase_location VARCHAR(160) NULL,
      moisture VARCHAR(80) NULL,
      colour VARCHAR(80) NULL,
      sandy_leaves VARCHAR(80) NULL,
      total_bales VARCHAR(80) NULL,
      saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      status VARCHAR(50) NOT NULL DEFAULT 'available',
      INDEX idx_buyer_id (buyer_id),
      INDEX idx_status (status),
      INDEX idx_unique_code (unique_code),
      CONSTRAINT fk_bags_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  // Add status column if it doesn't exist
  try {
    await q('ALTER TABLE bags ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT \'available\'');
    await q('ALTER TABLE bags ADD INDEX idx_status (status)');
    console.log('✅ Added status column to bags table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Status column already exists in bags table');
    } else {
      console.log('⚠️ Error adding status column:', error.message);
    }
  }

  // Add updated_at column if it doesn't exist
  try {
    await q('ALTER TABLE bags ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✅ Added updated_at column to bags table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ updated_at column already exists in bags table');
    } else {
      console.log('⚠️ Error adding updated_at column:', error.message);
    }
  }

  // Add updated_at column to invoices table if it doesn't exist
  try {
    await q('ALTER TABLE invoices ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✅ Added updated_at column to invoices table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ updated_at column already exists in invoices table');
    } else {
      console.log('⚠️ Error adding updated_at column to invoices:', error.message);
    }
  }

  // Add updated_at column to invoice_items table if it doesn't exist
  try {
    await q('ALTER TABLE invoice_items ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✅ Added updated_at column to invoice_items table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ updated_at column already exists in invoice_items table');
    } else {
      console.log('⚠️ Error adding updated_at column to invoice_items:', error.message);
    }
  }

  // Add updated_at column to dispatch table if it doesn't exist
  try {
    await q('ALTER TABLE dispatch ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✅ Added updated_at column to dispatch table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ updated_at column already exists in dispatch table');
    } else {
      console.log('⚠️ Error adding updated_at column to dispatch:', error.message);
    }
  }

  // Add updated_at column to dispatch_items table if it doesn't exist
  try {
    await q('ALTER TABLE dispatch_items ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✅ Added updated_at column to dispatch_items table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ updated_at column already exists in dispatch_items table');
    } else {
      console.log('⚠️ Error adding updated_at column to dispatch_items:', error.message);
    }
  }

  // Add updated_at column to review_tasks table if it doesn't exist
  try {
    await q('ALTER TABLE review_tasks ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✅ Added updated_at column to review_tasks table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ updated_at column already exists in review_tasks table');
    } else {
      console.log('⚠️ Error adding updated_at column to review_tasks:', error.message);
    }
  }

  // Add performance indexes
  try {
    // Bags table indexes for better query performance
    await q('CREATE INDEX IF NOT EXISTS idx_bags_buyer_id_date ON bags(buyer_id, date_of_purchase)');
    await q('CREATE INDEX IF NOT EXISTS idx_bags_status_date ON bags(status, date_of_purchase)');
    await q('CREATE INDEX IF NOT EXISTS idx_bags_unique_code ON bags(unique_code)');
    await q('CREATE INDEX IF NOT EXISTS idx_bags_buyer_code ON bags(buyer_code)');
    
    // QR codes indexes
    await q('CREATE INDEX IF NOT EXISTS idx_qr_codes_buyer_id ON qr_codes(buyer_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_qr_codes_used ON qr_codes(used)');
    
    // Invoice indexes
    await q('CREATE INDEX IF NOT EXISTS idx_invoices_buyer_code_date ON invoices(buyer_code, invoice_date)');
    await q('CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON invoices(status, created_at)');
    
    // Invoice items indexes
    await q('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)');
    await q('CREATE INDEX IF NOT EXISTS idx_invoice_items_qr_number ON invoice_items(qr_number)');
    
    console.log('✅ Performance indexes created successfully');
  } catch (error) {
    console.log('⚠️ Error creating performance indexes:', error.message);
  }

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

  await q(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      buyer_code VARCHAR(50) NOT NULL,
      total_weight DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      invoice_date DATE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'generated',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_buyer_code (buyer_code),
      INDEX idx_invoice_date (invoice_date),
      INDEX idx_status (status)
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      qr_number VARCHAR(120) NOT NULL,
      buyer_code VARCHAR(50) NOT NULL,
      tobacco_type VARCHAR(120) NOT NULL,
      grade VARCHAR(50) NOT NULL,
      bag_weight DECIMAL(8,2) NOT NULL DEFAULT 0,
      bag_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      INDEX idx_invoice_id (invoice_id),
      INDEX idx_qr_number (qr_number),
      INDEX idx_buyer_code (buyer_code)
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS dispatch (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lorry_number VARCHAR(50) NOT NULL,
      load_bundle_number VARCHAR(50) NOT NULL,
      max_load_capacity DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_weight DECIMAL(10,2) NOT NULL DEFAULT 0,
      dispatch_user_id INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lorry_number (lorry_number),
      INDEX idx_status (status),
      INDEX idx_dispatch_user_id (dispatch_user_id)
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS dispatch_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispatch_lorry_number VARCHAR(50) NOT NULL,
      dispatch_bundle_number VARCHAR(50) NOT NULL,
      qr_number VARCHAR(120) NOT NULL,
      bag_weight DECIMAL(8,2) NOT NULL DEFAULT 0,
      scanned_at DATETIME NOT NULL,
      scan_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dispatch_bundle (dispatch_lorry_number, dispatch_bundle_number),
      INDEX idx_qr_number (qr_number),
      INDEX idx_scanned_at (scanned_at)
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS review_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      load_bundle_id INT NOT NULL,
      load_bundle_number VARCHAR(50) NOT NULL,
      lorry_number VARCHAR(50) NOT NULL,
      total_weight DECIMAL(10,2) NOT NULL DEFAULT 0,
      assigned_to_user_id INT NULL,
      assigned_by_user_id INT NOT NULL,
      updated_by_user_id INT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'not_assigned',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_load_bundle_number (load_bundle_number),
      INDEX idx_assigned_to_user_id (assigned_to_user_id),
      INDEX idx_status (status)
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
    await q('TRUNCATE TABLE invoice_items');
    await q('TRUNCATE TABLE invoices');
    await q('TRUNCATE TABLE dispatch_items');
    await q('TRUNCATE TABLE dispatch');
    await q('TRUNCATE TABLE review_tasks');
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

  await q(
    'INSERT IGNORE INTO settings (id, buyer_actions_after_6pm_enabled, buyer_actions_after_6pm_buyer_ids, updated_at) VALUES (1, 0, JSON_ARRAY(), NOW())'
  );

  console.log(`✅ MySQL connected: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
}

app.post('/api/login', withAsync(async (req, res) => {
  const { code, password, role } = req.body || {};

  if (role === 'admin') {
    if (code === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return res.json({ success: true, user: { id: 1, role: 'admin', name: 'Administrator', code: 'ADMIN' } });
    }
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const buyerCode = String(code || '').trim().toUpperCase();
  const buyerPassword = String(password || '').trim();
  const rows = await q(
    'SELECT id, code, name, password, created_at FROM buyers WHERE code = ? LIMIT 1',
    [buyerCode]
  );

  if (rows.length === 0) return res.status(401).json({ error: 'Invalid buyer code or password' });

  const buyer = rows[0];
  const isValidPassword = await verifyPassword(buyerPassword, buyer.password);
  
  if (!isValidPassword) return res.status(401).json({ error: 'Invalid buyer code or password' });

  return res.json({ success: true, user: { role: 'buyer', ...buyer } });
}));

app.get('/api/buyers', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM buyers ORDER BY id ASC');
  res.json(rows);
}));

app.post('/api/buyers', withAsync(async (req, res) => {
  const { code, name, password } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedName = String(name || '').trim();
  const normalizedPassword = String(password || '').trim() || normalizedCode; // Default to code if no password provided

  if (!normalizedCode || !normalizedName) {
    return res.status(400).json({ error: 'code and name required' });
  }

  try {
    const hashedPassword = await hashPassword(normalizedPassword);
    const result = await q(
      'INSERT INTO buyers (code, name, password, created_at) VALUES (?, ?, ?, NOW())',
      [normalizedCode, normalizedName, hashedPassword]
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get fresh existing codes within transaction to prevent race conditions
    const [existingRows] = await conn.query('SELECT unique_code FROM qr_codes FOR UPDATE');
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
          await conn.rollback();
          return res.status(400).json({ error: `QR code ${candidate} already exists` });
        }
      }
    }

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
            date_of_purchase, saved_at, updated_at
     FROM bags
     WHERE unique_code = ?
     ORDER BY id DESC
     LIMIT 1`,
    [code]
  );

  const bag = bagRows.length > 0 ? bagRows[0] : null;
  const status = qr.used ? 'USED' : (qr.buyer_id ? 'ASSIGNED' : 'UNASSIGNED');

  res.json({
    code,
    status,
    qr,
    bag,
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
    // Verify QR code exists and is not already used
    const qrCheck = await q('SELECT id, used FROM qr_codes WHERE unique_code = ? LIMIT 1', [String(body.unique_code)]);
    if (qrCheck.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid QR code. Please select from available QR codes.' });
    }
    if (qrCheck[0].used) {
      await conn.rollback();
      return res.status(400).json({ error: 'QR code is already used. Please select a different QR code.' });
    }
    
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

app.get('/api/buying-list', withAsync(async (req, res) => {
  const { date, buyer_id } = req.query;
  let query = `
    SELECT 
      b.id,
      b.unique_code as qr_number,
      b.buyer_id,
      b.buyer_code,
      b.buyer_name,
      b.type_of_tobacco as tobacco_type,
      b.tobacco_grade as grade,
      b.weight as bag_weight,
      b.bale_value as bag_price,
      b.purchase_location,
      b.date_of_purchase,
      b.saved_at,
      b.status,
      b.updated_at
    FROM bags b
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    query += ` AND DATE(b.date_of_purchase) = ?`;
    params.push(date);
  }

  if (buyer_id) {
    query += ` AND b.buyer_id = ?`;
    params.push(buyer_id);
  }

  query += ` ORDER BY b.date_of_purchase DESC, b.id DESC`;

  const items = await q(query, params);
  
  // Debug: Log status distribution
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Buying list status distribution:', statusCounts);
  
  res.json({ items });
}));

function validateInvoiceData(data) {
  const errors = [];
  
  // Validate items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Invoice items are required and must be a non-empty array');
  } else {
    // Validate each item
    data.items.forEach((item, index) => {
      if (!item.qr_number || typeof item.qr_number !== 'string') {
        errors.push(`Item ${index + 1}: QR number is required`);
      }
      if (!item.buyer_code || typeof item.buyer_code !== 'string') {
        errors.push(`Item ${index + 1}: Buyer code is required`);
      }
      if (!item.tobacco_type || typeof item.tobacco_type !== 'string') {
        errors.push(`Item ${index + 1}: Tobacco type is required`);
      }
      if (!item.grade || typeof item.grade !== 'string') {
        errors.push(`Item ${index + 1}: Grade is required`);
      }
      const weight = parseFloat(item.bag_weight);
      if (!Number.isFinite(weight) || weight <= 0) {
        errors.push(`Item ${index + 1}: Valid bag weight is required`);
      }
      const price = parseFloat(item.bag_price);
      if (!Number.isFinite(price) || price < 0) {
        errors.push(`Item ${index + 1}: Valid bag price is required`);
      }
    });
  }
  
  // Validate user_id
  const userId = parseInt(data.user_id);
  if (!Number.isFinite(userId) || userId <= 0) {
    errors.push('Valid user ID is required');
  }
  
  // Validate buyer_code
  if (!data.buyer_code || typeof data.buyer_code !== 'string' || data.buyer_code.trim().length === 0) {
    errors.push('Buyer code is required');
  }
  
  // Validate total_weight
  const totalWeight = parseFloat(data.total_weight);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    errors.push('Valid total weight is required');
  }
  
  // Validate total_price
  const totalPrice = parseFloat(data.total_price);
  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    errors.push('Valid total price is required');
  }
  
  // Validate invoice_date
  if (!data.invoice_date) {
    errors.push('Invoice date is required');
  } else {
    const invoiceDate = new Date(data.invoice_date);
    if (Number.isNaN(invoiceDate.getTime())) {
      errors.push('Valid invoice date is required');
    } else if (invoiceDate > new Date()) {
      errors.push('Invoice date cannot be in the future');
    }
  }
  
  return errors;
}

app.post('/api/invoices', withAsync(async (req, res) => {
  console.log('Invoice request received:', req.body);
  
  const { items, user_id, buyer_code, total_weight, total_price, invoice_date } = req.body;
  
  console.log('Extracted data:', { items, user_id, buyer_code, total_weight, total_price, invoice_date });
  
  // Validate input data
  const validationErrors = validateInvoiceData(req.body);
  if (validationErrors.length > 0) {
    console.log('Validation errors:', validationErrors);
    return res.status(400).json({ error: validationErrors.join('; ') });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Create invoice record
    const [invoiceResult] = await conn.query(`
      INSERT INTO invoices (
        user_id, buyer_code, total_weight, total_price, invoice_date, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'generated', NOW())
    `, [user_id, buyer_code, total_weight, total_price, invoice_date]);

    const invoiceId = invoiceResult.insertId;
    console.log('Invoice created with ID:', invoiceId);

    // Create invoice items and update bag statuses
    for (const item of items) {
      console.log('Creating invoice item:', {
        itemData: item,
        qrNumber: item.qr_number
      });
      
      await conn.query(`
        INSERT INTO invoice_items (
          invoice_id, qr_number, buyer_code, tobacco_type, grade, bag_weight, bag_price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        invoiceId,
        item.qr_number,
        item.buyer_code,
        item.tobacco_type,
        item.grade,
        item.bag_weight,
        item.bag_price
      ]);

      // Update bag status to 'invoiced'
      await conn.query(`
        UPDATE bags 
        SET status = 'invoiced', updated_at = NOW()
        WHERE unique_code = ?
      `, [item.qr_number]);
    }

    await conn.commit();
    
    console.log('Invoice saved successfully');
    res.json({ 
      success: true, 
      invoice_id: invoiceId,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.get('/api/invoices', withAsync(async (req, res) => {
  const { buyer_id } = req.query;
  
  let query = `
    SELECT 
      i.id,
      i.user_id,
      i.buyer_code,
      i.total_weight,
      i.total_price,
      i.invoice_date,
      i.status,
      i.created_at,
      COUNT(ii.id) as item_count
    FROM invoices i
    LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    WHERE 1=1
  `;
  const params = [];

  if (buyer_id) {
    query += ` AND i.buyer_code = (SELECT code FROM buyers WHERE id = ?)`;
    params.push(buyer_id);
  }

  query += ` GROUP BY i.id ORDER BY i.created_at DESC`;

  const invoices = await q(query, params);
  res.json({ invoices });
}));

app.get('/api/invoices/:id/items', withAsync(async (req, res) => {
  const invoiceId = Number(req.params.id);
  
  const items = await q(`
    SELECT 
      ii.id,
      ii.invoice_id,
      ii.qr_number,
      ii.buyer_code,
      ii.tobacco_type,
      ii.grade,
      ii.bag_weight,
      ii.bag_price,
      ii.created_at,
      b.status as bag_status
    FROM invoice_items ii
    LEFT JOIN bags b ON ii.qr_number = b.unique_code
    WHERE ii.invoice_id = ?
    ORDER BY ii.id ASC
  `, [invoiceId]);
  
  res.json({ items });
}));

app.put('/api/invoices/:id/items/:itemId/remove', withAsync(async (req, res) => {
  const invoiceId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { user_id } = req.body;
  
  console.log('Invoice item removal request:', {
    invoiceId,
    itemId,
    user_id,
    fullBody: req.body
  });
  
  if (!user_id) {
    console.log('Missing user_id in request');
    return res.status(400).json({ error: 'User ID is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get the invoice item details
    const itemResult = await conn.query(`
      SELECT ii.*, 
             b.unique_code as bag_unique_code
      FROM invoice_items ii
      LEFT JOIN bags b ON b.unique_code = ii.qr_number
      WHERE ii.id = ? AND ii.invoice_id = ?
    `, [itemId, invoiceId]);

    console.log('Invoice item query result:', {
      itemId,
      invoiceId,
      foundItems: itemResult.length,
      itemData: itemResult[0],
      isArray: Array.isArray(itemResult[0]),
      dataType: typeof itemResult[0]
    });

    if (itemResult.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice item not found' });
    }

    const item = itemResult[0];
    
    // Handle if item is an array (shouldn't happen but just in case)
    const itemData = Array.isArray(item) ? item[0] : item;
    
    console.log('Processed item data:', {
      originalItem: item,
      processedItem: itemData,
      qrNumberField: itemData.qr_number,
      bagUniqueCodeField: itemData.bag_unique_code
    });
    
    // Try multiple ways to get the QR number
    let qrNumber = itemData.qr_number || itemData.bag_unique_code;
    
    // If still undefined, try to find by other means
    if (!qrNumber) {
      console.log('QR number not found, trying alternative methods...');
      
      // Try to find by buyer_code, weight, and price combination
      const fallbackResult = await conn.query(`
        SELECT unique_code 
        FROM bags 
        WHERE buyer_code = ? AND weight = ? AND bale_value = ?
        LIMIT 1
      `, [itemData.buyer_code, itemData.bag_weight, itemData.bag_price]);
      
      if (fallbackResult.length > 0) {
        qrNumber = fallbackResult[0].unique_code;
        console.log('Found QR number via fallback method:', qrNumber);
      }
    }

    console.log('Processing bag removal:', {
      qrNumber,
      itemId,
      invoiceId,
      originalQrNumber: itemData.qr_number,
      bagUniqueCode: itemData.bag_unique_code,
      itemData: itemData
    });

    if (!qrNumber) {
      await conn.rollback();
      return res.status(400).json({ error: 'QR number not found for invoice item. Item data: ' + JSON.stringify(itemData) });
    }

    // Remove the invoice item
    await conn.query(`
      DELETE FROM invoice_items 
      WHERE id = ? AND invoice_id = ?
    `, [itemId, invoiceId]);

    // Check if bag exists and get current status before update
    const bagBeforeUpdate = await conn.query(`
      SELECT id, unique_code, status, updated_at
      FROM bags 
      WHERE unique_code = ?
    `, [qrNumber]);

    // Also check for any similar QR codes (might be formatting issues)
    const similarBags = await conn.query(`
      SELECT id, unique_code, status, updated_at
      FROM bags 
      WHERE unique_code LIKE ? OR unique_code = ?
    `, [`%${qrNumber}%`, qrNumber]);

    console.log('Bag search results:', {
      searchingFor: qrNumber,
      exactMatch: bagBeforeUpdate.length,
      similarMatches: similarBags.length,
      exactMatchData: bagBeforeUpdate[0],
      allSimilarData: similarBags
    });

    // Update bag status back to 'available'
    const updateResult = await conn.query(`
      UPDATE bags 
      SET status = 'available', updated_at = NOW()
      WHERE unique_code = ?
    `, [qrNumber]);
    
    console.log(`Updated bag ${qrNumber} status:`, {
      qrNumber,
      affectedRows: updateResult.affectedRows,
      changedRows: updateResult.changedRows
    });

    // Verify the bag status was updated
    const verifyResult = await conn.query(`
      SELECT status, updated_at 
      FROM bags 
      WHERE unique_code = ?
    `, [qrNumber]);
    
    console.log(`Verified bag ${qrNumber} status:`, verifyResult[0]);

    // Update invoice totals
    const [totalsResult] = await conn.query(`
      SELECT 
        COUNT(*) as item_count,
        COALESCE(SUM(bag_weight), 0) as total_weight,
        COALESCE(SUM(bag_price), 0) as total_price
      FROM invoice_items 
      WHERE invoice_id = ?
    `, [invoiceId]);

    const totals = totalsResult[0];

    await conn.query(`
      UPDATE invoices 
      SET total_weight = ?, total_price = ?, updated_at = NOW()
      WHERE id = ?
    `, [totals.total_weight, totals.total_price, invoiceId]);

    await conn.commit();
    
    res.json({ 
      success: true, 
      message: 'Item removed from invoice successfully',
      updated_totals: {
        item_count: totals.item_count,
        total_weight: totals.total_weight,
        total_price: totals.total_price
      }
    });
  } catch (error) {
    console.error('Remove item error:', error);
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.put('/api/bags/:qrNumber/status', withAsync(async (req, res) => {
  const qrNumber = String(req.params.qrNumber);
  const { status, user_id } = req.body;
  
  if (!status || !user_id) {
    return res.status(400).json({ error: 'Status and user ID are required' });
  }

  const validStatuses = ['available', 'admin_review', 'assigned_to_invoice', 'invoiced'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Get current status before update
  const beforeUpdate = await q('SELECT status FROM bags WHERE unique_code = ?', [qrNumber]);
  
  await q(`
    UPDATE bags 
    SET status = ?, updated_at = NOW()
    WHERE unique_code = ?
  `, [status, qrNumber]);

  // Get updated status
  const afterUpdate = await q('SELECT * FROM bags WHERE unique_code = ?', [qrNumber]);

  console.log(`Bag ${qrNumber} status updated:`, {
    before: beforeUpdate[0]?.status,
    after: status,
    updated_by: user_id
  });

  res.json({ 
    success: true, 
    bag: afterUpdate[0] || null,
    previous_status: beforeUpdate[0]?.status
  });
}));

// Debug endpoint to check bag status
app.get('/api/bags/:qrNumber/status', withAsync(async (req, res) => {
  const qrNumber = String(req.params.qrNumber);
  
  const bag = await q(`
    SELECT 
      id, unique_code, buyer_code, status, saved_at, updated_at,
      (SELECT COUNT(*) FROM invoice_items WHERE qr_number = ?) as invoice_count
    FROM bags 
    WHERE unique_code = ?
  `, [qrNumber, qrNumber]);

  if (bag.length === 0) {
    return res.status(404).json({ error: 'Bag not found' });
  }

  res.json({ 
    bag: bag[0],
    invoice_count: bag[0].invoice_count
  });
}));

// Check all bag statuses for debugging
app.get('/api/bags/status-summary', withAsync(async (req, res) => {
  const statusSummary = await q(`
    SELECT 
      status,
      COUNT(*) as count,
      GROUP_CONCAT(unique_code) as qr_codes
    FROM bags 
    GROUP BY status
    ORDER BY count DESC
  `);

  const invoiceItems = await q(`
    SELECT 
      qr_number,
      COUNT(*) as invoice_count
    FROM invoice_items 
    GROUP BY qr_number
  `);

  // Find inconsistencies
  const inconsistencies = await q(`
    SELECT 
      b.unique_code,
      b.status as bag_status,
      COUNT(ii.id) as invoice_item_count
    FROM bags b
    LEFT JOIN invoice_items ii ON b.unique_code = ii.qr_number
    GROUP BY b.unique_code, b.status
    HAVING 
      (b.status = 'invoiced' AND COUNT(ii.id) = 0) OR
      (b.status = 'available' AND COUNT(ii.id) > 0) OR
      (b.status = 'assigned_to_invoice' AND COUNT(ii.id) = 0)
  `);

  res.json({
    status_summary: statusSummary,
    invoice_items: invoiceItems,
    inconsistencies: inconsistencies
  });
}));

// Fix inconsistent bag statuses
app.post('/api/bags/fix-statuses', withAsync(async (req, res) => {
  const { user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // First, normalize all status values to lowercase
    await conn.query(`
      UPDATE bags 
      SET status = LOWER(status)
      WHERE status IN ('Available', 'INVOICED', 'ASSIGNED_TO_INVOICE', 'ADMIN_REVIEW')
    `);

    console.log('Normalized status values to lowercase');

    // Find bags with inconsistent statuses
    const inconsistentBags = await conn.query(`
      SELECT 
        b.unique_code,
        b.status as bag_status,
        COUNT(ii.id) as invoice_item_count
      FROM bags b
      LEFT JOIN invoice_items ii ON b.unique_code = ii.qr_number
      GROUP BY b.unique_code, b.status
      HAVING 
        (b.status = 'invoiced' AND COUNT(ii.id) = 0) OR
        (b.status = 'available' AND COUNT(ii.id) > 0) OR
        (b.status = 'assigned_to_invoice' AND COUNT(ii.id) = 0)
    `);

    console.log('Found inconsistent bag statuses:', inconsistentBags);

    const fixes = [];
    
    for (const bag of inconsistentBags) {
      let newStatus;
      
      if (bag.invoice_item_count > 0) {
        newStatus = 'invoiced';
      } else {
        newStatus = 'available';
      }
      
      await conn.query(`
        UPDATE bags 
        SET status = ?, updated_at = NOW()
        WHERE unique_code = ?
      `, [newStatus, bag.unique_code]);
      
      fixes.push({
        qr_number: bag.unique_code,
        old_status: bag.bag_status,
        new_status: newStatus,
        invoice_items: bag.invoice_item_count
      });
    }

    await conn.commit();
    
    console.log('Fixed bag statuses:', fixes);
    
    res.json({ 
      success: true, 
      fixes_applied: fixes.length,
      details: fixes
    });
  } catch (error) {
    console.error('Error fixing bag statuses:', error);
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));
app.post('/api/dispatch', withAsync(async (req, res) => {
  const { lorry_number, load_bundle_number, max_load_capacity, dispatch_user_id, status } = req.body;
  
  if (!lorry_number || !load_bundle_number || !max_load_capacity || !dispatch_user_id) {
    return res.status(400).json({ error: 'All dispatch fields are required' });
  }

  const result = await q(`
    INSERT INTO dispatch (
      lorry_number, load_bundle_number, max_load_capacity, dispatch_user_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `, [lorry_number, load_bundle_number, max_load_capacity, dispatch_user_id, status || 'in_progress']);

  const rows = await q('SELECT * FROM dispatch WHERE id = ?', [result.insertId]);
  res.json({ success: true, dispatch: rows[0] });
}));

app.put('/api/dispatch/complete', withAsync(async (req, res) => {
  const { lorry_number, load_bundle_number, items, total_weight, completed_at, status } = req.body;
  
  if (!lorry_number || !load_bundle_number || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Dispatch completion data is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Update dispatch status
    await conn.query(`
      UPDATE dispatch 
      SET status = ?, total_weight = ?, completed_at = ?, updated_at = NOW()
      WHERE lorry_number = ? AND load_bundle_number = ?
    `, [status || 'completed', total_weight, completed_at, lorry_number, load_bundle_number]);

    // Create dispatch items
    for (const item of items) {
      await conn.query(`
        INSERT INTO dispatch_items (
          dispatch_lorry_number, dispatch_bundle_number, qr_number, bag_weight, scanned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [lorry_number, load_bundle_number, item.qr_number, item.bag_weight, item.scanned_at]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Dispatch completed successfully' });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.get('/api/dispatch', withAsync(async (req, res) => {
  const rows = await q('SELECT * FROM dispatch ORDER BY created_at DESC');
  res.json(rows);
}));

// Warehouse Module Endpoints
app.get('/api/load-bundles', withAsync(async (req, res) => {
  const rows = await q(`
    SELECT 
      d.lorry_number,
      d.load_bundle_number,
      d.total_weight,
      d.status as review_status,
      COUNT(di.id) as items_count
    FROM dispatch d
    LEFT JOIN dispatch_items di ON d.lorry_number = di.dispatch_lorry_number AND d.load_bundle_number = di.dispatch_bundle_number
    WHERE d.status = 'completed'
    GROUP BY d.lorry_number, d.load_bundle_number, d.total_weight, d.status
    ORDER BY d.created_at DESC
  `);
  res.json(rows);
}));

app.get('/api/warehouse-users', withAsync(async (req, res) => {
  const rows = await q(`
    SELECT id, code, name 
    FROM buyers 
    WHERE code LIKE 'W%' 
    ORDER BY code
  `);
  res.json(rows);
}));

app.get('/api/review-tasks', withAsync(async (req, res) => {
  const rows = await q(`
    SELECT 
      rt.id,
      rt.load_bundle_number,
      rt.lorry_number,
      rt.total_weight,
      rt.status,
      rt.assigned_to_user_id,
      assigned_user.name as assigned_to_name,
      rt.assigned_by_user_id,
      assigned_by_user.name as assigned_by_name,
      rt.created_at,
      COUNT(lb.id) as items_count
    FROM review_tasks rt
    LEFT JOIN buyers assigned_user ON rt.assigned_to_user_id = assigned_user.id
    LEFT JOIN buyers assigned_by_user ON rt.assigned_by_user_id = assigned_by_user.id
    LEFT JOIN load_bundles lb ON rt.load_bundle_number = lb.bundle_number
    GROUP BY rt.id
    ORDER BY rt.created_at DESC
  `);
  res.json(rows);
}));

app.get('/api/review-tasks/user/:userId', withAsync(async (req, res) => {
  const userId = Number(req.params.userId);
  const rows = await q(`
    SELECT 
      rt.id,
      rt.load_bundle_number,
      rt.lorry_number,
      rt.total_weight,
      rt.status,
      rt.assigned_to_user_id,
      assigned_user.name as assigned_to_name,
      rt.assigned_by_user_id,
      assigned_by_user.name as assigned_by_name,
      rt.created_at,
      COUNT(lb.id) as items_count
    FROM review_tasks rt
    LEFT JOIN buyers assigned_user ON rt.assigned_to_user_id = assigned_user.id
    LEFT JOIN buyers assigned_by_user ON rt.assigned_by_user_id = assigned_by_user.id
    LEFT JOIN load_bundles lb ON rt.load_bundle_number = lb.bundle_number
    WHERE rt.assigned_to_user_id = ?
    GROUP BY rt.id
    ORDER BY rt.created_at DESC
  `, [userId]);
  res.json(rows);
}));

app.post('/api/review-tasks', withAsync(async (req, res) => {
  const { load_bundle_id, assigned_to_user_id, assigned_by_user_id, status } = req.body;
  
  if (!load_bundle_id || !assigned_to_user_id || !assigned_by_user_id) {
    return res.status(400).json({ error: 'All task fields are required' });
  }

  const result = await q(`
    INSERT INTO review_tasks (
      load_bundle_id, assigned_to_user_id, assigned_by_user_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW())
  `, [load_bundle_id, assigned_to_user_id, assigned_by_user_id, status || 'assigned']);

  const rows = await q('SELECT * FROM review_tasks WHERE id = ?', [result.insertId]);
  res.json({ success: true, task: rows[0] });
}));

app.put('/api/review-tasks/:taskId/status', withAsync(async (req, res) => {
  const taskId = Number(req.params.taskId);
  const { status, updated_by_user_id } = req.body;
  
  if (!status || !updated_by_user_id) {
    return res.status(400).json({ error: 'Status and user ID are required' });
  }

  await q(`
    UPDATE review_tasks 
    SET status = ?, updated_by_user_id = ?, updated_at = NOW()
    WHERE id = ?
  `, [status, updated_by_user_id, taskId]);

  const rows = await q('SELECT * FROM review_tasks WHERE id = ?', [taskId]);
  res.json({ success: true, task: rows[0] });
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

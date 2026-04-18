// --- IMPORTS AND APP INITIALIZATION ---

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { DateTime } = require('luxon');

const app = express();

app.get('/api/bags/by-code/:unique_code', withAsync(async (req, res) => {
  const rawParam = String(req.params.unique_code || '').trim();
  const uniqueCode = decodeURIComponent(rawParam);
  if (!uniqueCode) return res.status(400).json({ error: 'unique_code required' });
  const rows = await q('SELECT * FROM bags WHERE unique_code = ? LIMIT 1', [uniqueCode]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Bag not found' });
  }
  res.json(rows[0]);
}));

// Delete bag by unique_code (QR code)

app.delete('/api/bags/by-code/:unique_code', withAsync(async (req, res) => {
  // Always decode the unique_code from the URL
  const rawParam = String(req.params.unique_code || '').trim();
  const uniqueCode = decodeURIComponent(rawParam);
  console.log('[DEBUG] /api/bags/by-code/:unique_code', { rawParam, decoded: uniqueCode });
  if (!uniqueCode) return res.status(400).json({ error: 'unique_code required' });
  const rows = await q('SELECT * FROM bags WHERE unique_code = ? LIMIT 1', [uniqueCode]);
  if (rows.length === 0) {
    console.log('[DEBUG] Bag not found for unique_code:', uniqueCode);
    return res.status(404).json({ error: 'Bag not found' });
  }
  const bag = rows[0];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM bags WHERE unique_code = ?', [uniqueCode]);
    await conn.query('UPDATE qr_codes SET used = 0 WHERE unique_code = ?', [uniqueCode]);
    await conn.commit();
    res.json({ success: true, bag });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// Unassign QR code (set to available)

app.put('/api/qrcodes/unassign/:unique_code', withAsync(async (req, res) => {
  const uniqueCode = decodeURIComponent(String(req.params.unique_code || '').trim());
  if (!uniqueCode) return res.status(400).json({ error: 'unique_code required' });
  const qrRows = await q('SELECT * FROM qr_codes WHERE unique_code = ? LIMIT 1', [uniqueCode]);
  if (qrRows.length === 0) return res.status(404).json({ error: 'QR code not found' });
  await q('UPDATE qr_codes SET used = 0 WHERE unique_code = ?', [uniqueCode]);
  res.json({ success: true });
}));
app.use(express.json());
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

const PROCESSING_STAGE_DEFS = [
  { key: 'butting', label: 'Butting' },
  { key: 'stripping', label: 'Stripping' },
  { key: 'kutcha', label: 'Kutcha' },
  { key: 'threshing', label: 'Threshing' },
  { key: 'grading', label: 'Grading' },
  { key: 'packing', label: 'Packing' },
];
const PROCESSING_STAGE_KEYS = new Set(PROCESSING_STAGE_DEFS.map((stage) => stage.key));
const PROCESSING_STAGE_LABEL_BY_KEY = Object.fromEntries(PROCESSING_STAGE_DEFS.map((stage) => [stage.key, stage.label]));
const PROCESSING_ALLOWED_ROLES = new Set(['classification', 'supervisor']);
const PROCESSING_STAGE_PARAM_RULES = {
  butting: ['input_bales', 'input_weight', 'stalk_removal_pct'],
  stripping: ['input_weight', 'leaf_recovery_pct', 'output_weight'],
  kutcha: ['moisture_pct', 'cut_size_mm', 'output_weight'],
  threshing: ['feed_rate_kgph', 'waste_pct', 'output_weight'],
  grading: ['grade_mix', 'uniformity_pct', 'output_weight'],
  packing: ['pack_count', 'pack_weight', 'output_weight'],
};

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

const ALLOWED_TABLES = [
  'buyers',
  'warehouse_employees',
  'apf_numbers',
  'tobacco_types',
  'purchase_locations',
  'grades',
  'qr_codes',
  'bags',
  'settings',
  'vehicle_dispatches',
  'vehicle_dispatch_items',
  'vehicle_dispatch_scan_events',
  'processing_batches',
  'processing_batch_items',
  'processing_batch_stage_logs',
  'processing_export_bags',
];

let pool;

app.use(cors());

// --- DELETED BAGS TABLE AND API ENDPOINTS ---
// 1. Create deleted_bags table if not exists
async function ensureDeletedBagsTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS deleted_bags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      buyer_id INT NOT NULL,
      unique_code VARCHAR(100) NOT NULL,
      bag_data JSON NOT NULL,
      deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (buyer_id),
      INDEX (unique_code)
    ) ENGINE=InnoDB;
  `);
}

// Call this in DB init
const oldInitDatabase = initDatabase;
initDatabase = async function() {
  await oldInitDatabase();
  await ensureDeletedBagsTable();
};

// 2. API: Get deleted bags for a buyer
app.get('/api/deleted-bags', withAsync(async (req, res) => {
  const buyerId = Number(req.query.buyer_id);
  if (!buyerId) return res.status(400).json({ error: 'buyer_id required' });
  // Get deleted_bags as before
  const deletedRows = await q('SELECT * FROM deleted_bags WHERE buyer_id = ? ORDER BY deleted_at DESC', [buyerId]);
  // Also get bags with status 'Delete in-progress' not already in deleted_bags
  const deletedCodes = new Set(deletedRows.map(row => row.unique_code));
  const inProgressRows = await q('SELECT * FROM bags WHERE buyer_id = ? AND status = ?', [buyerId, 'Delete in-progress']);
  // Only add bags not already in deleted_bags
  const extraRows = inProgressRows.filter(row => !deletedCodes.has(row.unique_code)).map(row => {
    let deletedAt = row.updated_at || row.created_at || null;
    if (deletedAt instanceof Date) deletedAt = deletedAt.toISOString();
    if (typeof deletedAt === 'number') deletedAt = new Date(deletedAt).toISOString();
    if (!deletedAt) deletedAt = '';
    return {
      id: null, // not in deleted_bags table
      buyer_id: row.buyer_id,
      unique_code: row.unique_code,
      bag_data: row,
      deleted_at: deletedAt,
      db_id: row.id,
    };
  });
  const allRows = [
    ...deletedRows.map(row => {
      let deletedAt = row.deleted_at;
      if (deletedAt instanceof Date) deletedAt = deletedAt.toISOString();
      if (typeof deletedAt === 'number') deletedAt = new Date(deletedAt).toISOString();
      if (!deletedAt) deletedAt = '';
      return {
        ...row,
        bag_data: typeof row.bag_data === 'string' ? JSON.parse(row.bag_data) : row.bag_data,
        deleted_at: deletedAt,
      };
    }),
    ...extraRows
  ];
  // Sort by deleted_at descending (string compare, ISO format)
  allRows.sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
  res.json(allRows);
}));

// 3. API: Add a deleted bag
app.post('/api/deleted-bags', withAsync(async (req, res) => {
  const { buyer_id, unique_code, bag_data } = req.body || {};
  if (!buyer_id || !unique_code || !bag_data) return res.status(400).json({ error: 'buyer_id, unique_code, bag_data required' });
  await q('INSERT INTO deleted_bags (buyer_id, unique_code, bag_data, deleted_at) VALUES (?, ?, ?, NOW())', [buyer_id, unique_code, JSON.stringify(bag_data)]);
  res.json({ success: true });
}));

// 4. API: Permanently delete a deleted bag
app.delete('/api/deleted-bags/:id', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id required' });
  await q('DELETE FROM deleted_bags WHERE id = ?', [id]);
  res.json({ success: true });
}));

// Set bag status to 'delete in-progress' (called before actual delete)
app.put('/api/bags/:id/set-delete-in-progress', withAsync(async (req, res) => {
  const bagId = Number(req.params.id);
  const rows = await q('SELECT * FROM bags WHERE id = ? LIMIT 1', [bagId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Bag not found' });
  await q('UPDATE bags SET status = ? WHERE id = ?', ['Delete in-progress', bagId]);
  res.json({ success: true });
}));

// 5. API: Restore deleted bags (move back to bags table)
app.post('/api/deleted-bags/restore', withAsync(async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
  const restored = [];
  // Try to restore from deleted_bags first
  if (ids.length > 0) {
    const rows = await q(`SELECT * FROM deleted_bags WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    for (const row of rows) {
      const bag = typeof row.bag_data === 'string' ? JSON.parse(row.bag_data) : row.bag_data;
      // Ensure status is set to 'available' on restore
      bag.status = 'available';
      try {
        await q(`INSERT INTO bags (unique_code, buyer_id, buyer_code, buyer_name, fcv, apf_number, tobacco_grade, type_of_tobacco, purchase_location, weight, rate, bale_value, buyer_grade, lot_number, purchase_date, date_of_purchase, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE status='available'`, [
          bag.unique_code, bag.buyer_id, bag.buyer_code, bag.buyer_name, bag.fcv, bag.apf_number, bag.tobacco_grade, bag.type_of_tobacco, bag.purchase_location, bag.weight, bag.rate, bag.bale_value, bag.buyer_grade, bag.lot_number, bag.purchase_date, bag.date_of_purchase, bag.status
        ]);
        restored.push(row.id);
      } catch (e) { /* skip errors */ }
    }
    if (restored.length > 0) {
      await q(`DELETE FROM deleted_bags WHERE id IN (${restored.map(() => '?').join(',')})`, restored);
    }
  }
  // Also handle restoring bags that are only in bags table (status 'Delete in-progress')
  // These ids will not be found in deleted_bags, so try updating bags table directly
  // Only update if status is 'Delete in-progress'
  if (ids.length > 0) {
    const bagRows = await q(`SELECT * FROM bags WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    for (const bag of bagRows) {
      if (bag.status === 'Delete in-progress') {
        await q('UPDATE bags SET status = ? WHERE id = ?', ['available', bag.id]);
        restored.push(bag.id);
      }
    }
  }
  res.json({ restored });
}));
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

function normalizeVehicleDispatchStatus(status) {
  const value = String(status || '').trim();
  if (value === 'confirmed_match') return 'warehouse_received';
  if (value === 'confirmed_mismatch') return 'unmatched_bags';
  return value;
}

function normalizeVehicleDispatchRow(row) {
  if (!row) return row;
  const normalized = { ...row };
  if (Object.prototype.hasOwnProperty.call(normalized, 'status')) {
    normalized.status = normalizeVehicleDispatchStatus(normalized.status);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'vehicle_dispatch_status')) {
    normalized.vehicle_dispatch_status = normalizeVehicleDispatchStatus(normalized.vehicle_dispatch_status);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'dispatch_status')) {
    normalized.dispatch_status = normalizeVehicleDispatchStatus(normalized.dispatch_status);
  }
  return normalized;
}

function normalizeActorRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (!role) return null;
  if (role === 'classification_user') return 'classification';
  return role;
}

function assertProcessingRoleOrThrow(actorRole) {
  const normalizedRole = normalizeActorRole(actorRole);
  if (!normalizedRole || !PROCESSING_ALLOWED_ROLES.has(normalizedRole)) {
    const error = new Error('Only Classification or Supervisor roles can perform this action');
    error.statusCode = 403;
    throw error;
  }
  return normalizedRole;
}

function buildBatchCode(batchId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `PB-${y}${m}${d}-${String(batchId).padStart(5, '0')}`;
}

function normalizeIsoDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function parseJsonObject(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function roundMetric(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
}

function sanitizeStageMetrics(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value).filter(([key, fieldValue]) => {
    if (!key || typeof key !== 'string') return false;
    if (fieldValue === null || fieldValue === undefined) return false;
    if (typeof fieldValue === 'string' && !fieldValue.trim()) return false;
    return true;
  });
  return Object.fromEntries(entries);
}

function validateStageMetrics(stageKey, stageMetrics) {
  const required = PROCESSING_STAGE_PARAM_RULES[stageKey] || [];
  const missingFields = required.filter((field) => {
    const value = stageMetrics[field];
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && !value.trim()) return true;
    return false;
  });
  return missingFields;
}

function formatCsvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildProcessingReportCsv(report) {
  const lines = [];
  lines.push(['Section', 'Field', 'Value'].map(formatCsvCell).join(','));
  lines.push(['Summary', 'Total Batches', report.summary?.total_batches ?? 0].map(formatCsvCell).join(','));
  lines.push(['Summary', 'Total Input Weight', report.summary?.total_input_weight ?? 0].map(formatCsvCell).join(','));
  lines.push(['Summary', 'Total Input Value', report.summary?.total_input_value ?? 0].map(formatCsvCell).join(','));
  lines.push(['Summary', 'Total Output Quantity', report.summary?.total_output_quantity ?? 0].map(formatCsvCell).join(','));
  lines.push(['Summary', 'Total Output Bags', report.summary?.total_output_bags ?? 0].map(formatCsvCell).join(','));
  lines.push(['Summary', 'Yield Percentage', report.summary?.yield_percentage ?? 0].map(formatCsvCell).join(','));

  lines.push([]);
  lines.push(['Grade Distribution', 'Grade', 'Bag Count', 'Total Quantity'].map(formatCsvCell).join(','));
  for (const row of report.grade_distribution || []) {
    lines.push(['Grade Distribution', row.grade, row.bag_count, row.total_quantity].map(formatCsvCell).join(','));
  }

  lines.push([]);
  lines.push(['Worker Productivity', 'Worker', 'Entries', 'Total Quantity', 'Stages'].map(formatCsvCell).join(','));
  for (const row of report.worker_productivity || []) {
    lines.push([
      'Worker Productivity',
      row.worker_name,
      row.entries,
      row.total_quantity,
      Object.entries(row.stages || {}).map(([k, count]) => `${k}:${count}`).join(' | '),
    ].map(formatCsvCell).join(','));
  }

  lines.push([]);
  lines.push(['Batches', 'Batch Code', 'Status', 'Current Stage', 'Input Weight', 'Output Quantity', 'Yield Percentage'].map(formatCsvCell).join(','));
  for (const row of report.batches || []) {
    lines.push([
      'Batches',
      row.batch_code,
      row.status,
      row.current_stage_key || '',
      row.total_input_weight,
      row.total_output_quantity,
      row.yield_percentage,
    ].map(formatCsvCell).join(','));
  }

  return lines.filter((row) => row.length > 0).join('\n');
}

function buildProcessingReportPrintHtml(report) {
  const rows = report.batches || [];
  const gradeRows = report.grade_distribution || [];
  const workerRows = report.worker_productivity || [];
  const generatedAt = DateTime.now().setZone('Asia/Kolkata').toFormat('dd/MM/yyyy HH:mm:ss');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Processing Report</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; padding: 24px; color: #1f2937; }
    h1 { margin: 0 0 8px; color: #0f4c81; }
    h2 { margin: 20px 0 8px; color: #0f4c81; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 8px; margin-top: 12px; }
    .summary .card { border: 1px solid #d6e7f8; border-radius: 8px; padding: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d6e7f8; padding: 6px 8px; font-size: 12px; text-align: left; }
    th { background: #eef6ff; }
    .muted { color: #6b7280; font-size: 12px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  <h1>Processing Report</h1>
  <div class="muted">Generated at ${generatedAt}</div>

  <div class="summary">
    <div class="card"><div class="muted">Total Batches</div><div>${report.summary?.total_batches ?? 0}</div></div>
    <div class="card"><div class="muted">Input Weight</div><div>${report.summary?.total_input_weight ?? 0}</div></div>
    <div class="card"><div class="muted">Output Quantity</div><div>${report.summary?.total_output_quantity ?? 0}</div></div>
    <div class="card"><div class="muted">Output Bags</div><div>${report.summary?.total_output_bags ?? 0}</div></div>
    <div class="card"><div class="muted">Yield %</div><div>${report.summary?.yield_percentage ?? 0}</div></div>
    <div class="card"><div class="muted">Input Value</div><div>${report.summary?.total_input_value ?? 0}</div></div>
  </div>

  <h2>Batch Summary</h2>
  <table>
    <thead><tr><th>Batch</th><th>Status</th><th>Current Stage</th><th>Input Weight</th><th>Output Quantity</th><th>Yield %</th></tr></thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${row.batch_code}</td><td>${row.status}</td><td>${row.current_stage_key || '-'}</td><td>${row.total_input_weight}</td><td>${row.total_output_quantity}</td><td>${row.yield_percentage}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Grade Distribution</h2>
  <table>
    <thead><tr><th>Grade</th><th>Bags</th><th>Quantity</th></tr></thead>
    <tbody>
      ${gradeRows.map((row) => `<tr><td>${row.grade}</td><td>${row.bag_count}</td><td>${row.total_quantity}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Worker Productivity</h2>
  <table>
    <thead><tr><th>Worker</th><th>Entries</th><th>Total Quantity</th><th>Stages</th></tr></thead>
    <tbody>
      ${workerRows.map((row) => `<tr><td>${row.worker_name}</td><td>${row.entries}</td><td>${row.total_quantity}</td><td>${Object.entries(row.stages || {}).map(([k, c]) => `${k}:${c}`).join(', ') || '-'}</td></tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

async function getProcessingReportData({ batchId = null, date = null } = {}) {
  const filters = [];
  const params = [];

  if (Number.isFinite(batchId) && batchId > 0) {
    filters.push('pb.id = ?');
    params.push(batchId);
  }
  if (date) {
    filters.push('(DATE(pb.created_at) = ? OR DATE(pb.completed_at) = ?)');
    params.push(date, date);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const batchRows = await q(
    `SELECT pb.id, pb.batch_code, pb.status, pb.current_stage_key, pb.created_at, pb.completed_at
     FROM processing_batches pb
     ${whereClause}
     ORDER BY pb.id DESC`,
    params
  );

  if (batchRows.length === 0) {
    return {
      filters: { batch_id: batchId, date },
      summary: {
        total_batches: 0,
        total_input_weight: 0,
        total_input_value: 0,
        total_output_quantity: 0,
        total_output_bags: 0,
        yield_percentage: 0,
      },
      grade_distribution: [],
      worker_productivity: [],
      batches: [],
    };
  }

  const batchIds = batchRows.map((row) => Number(row.id));
  const placeholders = batchIds.map(() => '?').join(',');

  const itemRows = await q(
    `SELECT batch_id,
            COUNT(*) AS item_count,
            COALESCE(SUM(CASE WHEN status = 'active' THEN weight ELSE 0 END), 0) AS total_input_weight,
            COALESCE(SUM(CASE WHEN status = 'active' THEN bale_value ELSE 0 END), 0) AS total_input_value
     FROM processing_batch_items
     WHERE batch_id IN (${placeholders})
     GROUP BY batch_id`,
    batchIds
  );

  const outputRows = await q(
    `SELECT batch_id,
            COUNT(*) AS total_output_bags,
            COALESCE(SUM(quantity), 0) AS total_output_quantity
     FROM processing_export_bags
     WHERE batch_id IN (${placeholders})
     GROUP BY batch_id`,
    batchIds
  );

  const gradeRows = await q(
    `SELECT batch_id, grade,
            COUNT(*) AS bag_count,
            COALESCE(SUM(quantity), 0) AS total_quantity
     FROM processing_export_bags
     WHERE batch_id IN (${placeholders})
     GROUP BY batch_id, grade
     ORDER BY grade ASC`,
    batchIds
  );

  const workerRows = await q(
    `SELECT batch_id, stage_key, total_quantity, worker_names_json
     FROM processing_batch_stage_logs
     WHERE batch_id IN (${placeholders})
       AND action = 'finished'
     ORDER BY logged_at ASC, id ASC`,
    batchIds
  );

  const itemByBatchId = Object.fromEntries(itemRows.map((row) => [Number(row.batch_id), row]));
  const outputByBatchId = Object.fromEntries(outputRows.map((row) => [Number(row.batch_id), row]));

  const gradeDistributionByBatch = {};
  const totalGradeDistribution = {};
  for (const row of gradeRows) {
    const currentBatchId = Number(row.batch_id);
    if (!gradeDistributionByBatch[currentBatchId]) gradeDistributionByBatch[currentBatchId] = [];
    const entry = {
      grade: row.grade,
      bag_count: Number(row.bag_count || 0),
      total_quantity: roundMetric(row.total_quantity),
    };
    gradeDistributionByBatch[currentBatchId].push(entry);

    if (!totalGradeDistribution[row.grade]) {
      totalGradeDistribution[row.grade] = { grade: row.grade, bag_count: 0, total_quantity: 0 };
    }
    totalGradeDistribution[row.grade].bag_count += entry.bag_count;
    totalGradeDistribution[row.grade].total_quantity += entry.total_quantity;
  }

  const workerTotals = {};
  const workerByBatchId = {};
  for (const row of workerRows) {
    const currentBatchId = Number(row.batch_id);
    const workerNames = parseJsonArray(row.worker_names_json);
    const totalQuantity = roundMetric(row.total_quantity);

    if (!workerByBatchId[currentBatchId]) workerByBatchId[currentBatchId] = {};

    for (const workerName of workerNames) {
      if (!workerTotals[workerName]) {
        workerTotals[workerName] = { worker_name: workerName, entries: 0, total_quantity: 0, batch_ids: new Set(), stages: {} };
      }
      if (!workerByBatchId[currentBatchId][workerName]) {
        workerByBatchId[currentBatchId][workerName] = { worker_name: workerName, entries: 0, total_quantity: 0, stages: {} };
      }

      workerTotals[workerName].entries += 1;
      workerTotals[workerName].total_quantity += totalQuantity;
      workerTotals[workerName].batch_ids.add(currentBatchId);
      workerTotals[workerName].stages[row.stage_key] = (workerTotals[workerName].stages[row.stage_key] || 0) + 1;

      workerByBatchId[currentBatchId][workerName].entries += 1;
      workerByBatchId[currentBatchId][workerName].total_quantity += totalQuantity;
      workerByBatchId[currentBatchId][workerName].stages[row.stage_key] = (workerByBatchId[currentBatchId][workerName].stages[row.stage_key] || 0) + 1;
    }
  }

  const reportBatches = batchRows.map((row) => {
    const currentBatchId = Number(row.id);
    const itemStats = itemByBatchId[currentBatchId] || { item_count: 0, total_input_weight: 0, total_input_value: 0 };
    const outputStats = outputByBatchId[currentBatchId] || { total_output_bags: 0, total_output_quantity: 0 };
    const inputWeight = roundMetric(itemStats.total_input_weight);
    const outputQuantity = roundMetric(outputStats.total_output_quantity);
    return {
      ...row,
      item_count: Number(itemStats.item_count || 0),
      total_input_weight: inputWeight,
      total_input_value: roundMetric(itemStats.total_input_value),
      total_output_bags: Number(outputStats.total_output_bags || 0),
      total_output_quantity: outputQuantity,
      yield_percentage: inputWeight > 0 ? roundMetric((outputQuantity / inputWeight) * 100) : 0,
      grade_distribution: gradeDistributionByBatch[currentBatchId] || [],
      worker_productivity: Object.values(workerByBatchId[currentBatchId] || {})
        .map((entry) => ({
          worker_name: entry.worker_name,
          entries: entry.entries,
          total_quantity: roundMetric(entry.total_quantity),
          stages: entry.stages,
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity || b.entries - a.entries || a.worker_name.localeCompare(b.worker_name)),
    };
  });

  const totalInputWeight = roundMetric(reportBatches.reduce((sum, row) => sum + Number(row.total_input_weight || 0), 0));
  const totalInputValue = roundMetric(reportBatches.reduce((sum, row) => sum + Number(row.total_input_value || 0), 0));
  const totalOutputQuantity = roundMetric(reportBatches.reduce((sum, row) => sum + Number(row.total_output_quantity || 0), 0));
  const totalOutputBags = reportBatches.reduce((sum, row) => sum + Number(row.total_output_bags || 0), 0);

  return {
    filters: { batch_id: batchId, date },
    summary: {
      total_batches: reportBatches.length,
      total_input_weight: totalInputWeight,
      total_input_value: totalInputValue,
      total_output_quantity: totalOutputQuantity,
      total_output_bags: totalOutputBags,
      yield_percentage: totalInputWeight > 0 ? roundMetric((totalOutputQuantity / totalInputWeight) * 100) : 0,
    },
    grade_distribution: Object.values(totalGradeDistribution)
      .map((entry) => ({ ...entry, total_quantity: roundMetric(entry.total_quantity) }))
      .sort((a, b) => b.total_quantity - a.total_quantity || a.grade.localeCompare(b.grade)),
    worker_productivity: Object.values(workerTotals)
      .map((entry) => ({
        worker_name: entry.worker_name,
        entries: entry.entries,
        total_quantity: roundMetric(entry.total_quantity),
        batch_count: entry.batch_ids.size,
        stages: entry.stages,
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity || b.entries - a.entries || a.worker_name.localeCompare(b.worker_name)),
    batches: reportBatches,
  };
}

async function getProcessingBatchById(batchId) {
  const rows = await q(
    `SELECT pb.*, we.code AS created_by_code, we.name AS created_by_name,
            COUNT(pbi.id) AS item_count,
            COALESCE(SUM(CASE WHEN pbi.status = 'active' THEN pbi.weight ELSE 0 END), 0) AS total_weight,
            COALESCE(SUM(CASE WHEN pbi.status = 'active' THEN pbi.bale_value ELSE 0 END), 0) AS total_bale_value
     FROM processing_batches pb
     LEFT JOIN warehouse_employees we ON we.id = pb.created_by_employee_id
     LEFT JOIN processing_batch_items pbi ON pbi.batch_id = pb.id
     WHERE pb.id = ?
     GROUP BY pb.id
     LIMIT 1`,
    [batchId]
  );
  if (rows.length === 0) return null;

  const batch = rows[0];
  const items = await q(
    `SELECT pbi.*, bag.buyer_id, bag.buyer_code, bag.buyer_name, bag.buyer_grade, bag.tobacco_grade,
            bag.apf_number, bag.purchase_location
     FROM processing_batch_items pbi
     LEFT JOIN bags bag ON bag.id = pbi.bag_id
     WHERE pbi.batch_id = ?
     ORDER BY pbi.id ASC`,
    [batchId]
  );

  const stageLogs = await q(
    `SELECT psl.*,
            we.code AS logged_by_code,
            we.name AS logged_by_name
     FROM processing_batch_stage_logs psl
     LEFT JOIN warehouse_employees we ON we.id = psl.logged_by_employee_id
     WHERE psl.batch_id = ?
     ORDER BY psl.id ASC`,
    [batchId]
  );

  const exportBags = await q(
    `SELECT peb.*,
            we.code AS created_by_code,
            we.name AS created_by_name
     FROM processing_export_bags peb
     LEFT JOIN warehouse_employees we ON we.id = peb.created_by_employee_id
     WHERE peb.batch_id = ?
     ORDER BY peb.id DESC`,
    [batchId]
  );

  const stageSessions = await q(
    `SELECT pss.*, we.code AS operator_code, we.name AS operator_name
     FROM processing_stage_sessions pss
     LEFT JOIN warehouse_employees we ON we.id = pss.operator_employee_id
     WHERE pss.batch_id = ?
     ORDER BY pss.id ASC`,
    [batchId]
  );

  return {
    ...batch,
    stages: PROCESSING_STAGE_DEFS,
    items,
    stage_logs: stageLogs.map((row) => ({
      ...row,
      worker_names: parseJsonArray(row.worker_names_json),
      output_details: parseJsonObject(row.output_details_json),
    })),
    stage_sessions: stageSessions.map((row) => ({
      ...row,
      stage_metrics: parseJsonObject(row.stage_metrics_json) || {},
    })),
    export_bags: exportBags,
  };
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
      role ENUM('warehouse','classification','supervisor') NOT NULL DEFAULT 'warehouse',
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
    CREATE TABLE IF NOT EXISTS classification_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  await q(`
    CREATE TABLE IF NOT EXISTS registration_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      address VARCHAR(255),
      phone VARCHAR(30),
      role ENUM('buyer','warehouse','classification','supervisor','admin') NOT NULL,
      status ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      reviewed_by INT NULL,
      review_note VARCHAR(500)
    ) ENGINE=InnoDB;
  `);

  await q("ALTER TABLE registration_requests MODIFY COLUMN role ENUM('buyer','warehouse','classification','supervisor','admin') NOT NULL");

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

  await q(`
    CREATE TABLE IF NOT EXISTS processing_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_code VARCHAR(40) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      current_stage_key VARCHAR(40) NULL,
      created_by_employee_id INT NULL,
      created_by_role VARCHAR(40) NOT NULL,
      completed_at DATETIME NULL,
      paused_at DATETIME NULL,
      resumed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_processing_batches_status (status),
      INDEX idx_processing_batches_stage (current_stage_key),
      CONSTRAINT fk_processing_batches_created_by FOREIGN KEY (created_by_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS processing_batch_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      bag_id INT NOT NULL,
      qr_code_id INT NULL,
      unique_code VARCHAR(120) NOT NULL,
      weight DECIMAL(12,3) NULL,
      bale_value DECIMAL(12,3) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_processing_batch_items_batch_code (batch_id, unique_code),
      INDEX idx_processing_batch_items_code (unique_code),
      INDEX idx_processing_batch_items_status (status),
      CONSTRAINT fk_processing_batch_items_batch FOREIGN KEY (batch_id) REFERENCES processing_batches(id) ON DELETE CASCADE,
      CONSTRAINT fk_processing_batch_items_bag FOREIGN KEY (bag_id) REFERENCES bags(id) ON DELETE RESTRICT,
      CONSTRAINT fk_processing_batch_items_qr FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS processing_batch_stage_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      stage_key VARCHAR(40) NOT NULL,
      stage_label VARCHAR(80) NOT NULL,
      action VARCHAR(20) NOT NULL,
      total_quantity DECIMAL(12,3) NULL,
      output_bag_count INT NULL,
      output_grade VARCHAR(80) NULL,
      worker_names_json JSON NULL,
      output_details_json JSON NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      logged_by_employee_id INT NULL,
      logged_by_role VARCHAR(40) NOT NULL,
      logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_processing_stage_logs_batch (batch_id),
      INDEX idx_processing_stage_logs_stage (stage_key),
      INDEX idx_processing_stage_logs_action (action),
      INDEX idx_processing_stage_logs_date (logged_at),
      CONSTRAINT fk_processing_stage_logs_batch FOREIGN KEY (batch_id) REFERENCES processing_batches(id) ON DELETE CASCADE,
      CONSTRAINT fk_processing_stage_logs_employee FOREIGN KEY (logged_by_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS processing_export_bags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      export_unique_code VARCHAR(120) NOT NULL UNIQUE,
      grade VARCHAR(80) NOT NULL,
      quantity DECIMAL(12,3) NOT NULL,
      created_by_employee_id INT NULL,
      created_by_role VARCHAR(40) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_processing_export_bags_batch (batch_id),
      INDEX idx_processing_export_bags_grade (grade),
      CONSTRAINT fk_processing_export_bags_batch FOREIGN KEY (batch_id) REFERENCES processing_batches(id) ON DELETE CASCADE,
      CONSTRAINT fk_processing_export_bags_employee FOREIGN KEY (created_by_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS processing_stage_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      stage_key VARCHAR(40) NOT NULL,
      stage_label VARCHAR(80) NOT NULL,
      operator_employee_id INT NULL,
      operator_role VARCHAR(40) NOT NULL,
      machine_id VARCHAR(120) NULL,
      input_bales INT NULL,
      input_weight DECIMAL(12,3) NULL,
      output_weight DECIMAL(12,3) NULL,
      waste_weight DECIMAL(12,3) NULL,
      efficiency_pct DECIMAL(7,3) NULL,
      stage_metrics_json JSON NULL,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME NULL,
      duration_minutes INT NULL,
      remarks VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_processing_stage_sessions_batch (batch_id),
      INDEX idx_processing_stage_sessions_stage (stage_key),
      INDEX idx_processing_stage_sessions_operator (operator_employee_id),
      INDEX idx_processing_stage_sessions_started (started_at),
      CONSTRAINT fk_processing_stage_sessions_batch FOREIGN KEY (batch_id) REFERENCES processing_batches(id) ON DELETE CASCADE,
      CONSTRAINT fk_processing_stage_sessions_employee FOREIGN KEY (operator_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS classification_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bag_id INT NOT NULL,
      unique_code VARCHAR(120) NOT NULL,
      grade VARCHAR(80) NOT NULL,
      rate DECIMAL(12,3) NULL,
      tobacco_type VARCHAR(120) NOT NULL,
      classification_date DATE NOT NULL,
      classified_by_employee_id INT NULL,
      classified_by_role VARCHAR(40) NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_classification_entries_bag (bag_id),
      INDEX idx_classification_entries_code (unique_code),
      INDEX idx_classification_entries_date (classification_date),
      CONSTRAINT fk_classification_entries_bag FOREIGN KEY (bag_id) REFERENCES bags(id) ON DELETE RESTRICT,
      CONSTRAINT fk_classification_entries_employee FOREIGN KEY (classified_by_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS el_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS processing_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      classification_entry_id INT NOT NULL,
      unique_code VARCHAR(120) NOT NULL,
      process_type ENUM('butting','stripping','grading','kutcha') NOT NULL,
      bales INT NOT NULL DEFAULT 0,
      weight DECIMAL(12,3) NOT NULL DEFAULT 0,
      el_grade VARCHAR(50) NOT NULL,
      generated_qr_code TEXT NULL,
      created_by_employee_id INT NULL,
      created_by_role VARCHAR(40) NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_processing_entries_classification (classification_entry_id),
      INDEX idx_processing_entries_code (unique_code),
      INDEX idx_processing_entries_type (process_type),
      CONSTRAINT fk_processing_entries_classification FOREIGN KEY (classification_entry_id) REFERENCES classification_entries(id) ON DELETE RESTRICT,
      CONSTRAINT fk_processing_entries_employee FOREIGN KEY (created_by_employee_id) REFERENCES warehouse_employees(id) ON DELETE SET NULL
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
  await ensureColumnExists('warehouse_employees', 'role', "role ENUM('warehouse','classification','supervisor') NOT NULL DEFAULT 'warehouse'");
  await ensureColumnExists('warehouse_employees', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumnExists('bags', 'status', 'status VARCHAR(40) NULL DEFAULT NULL');
  await ensureColumnExists('bags', 'dispatch_list_added', 'dispatch_list_added TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumnExists('bags', 'dispatch_invoice_number', 'dispatch_invoice_number VARCHAR(120) NULL');
  await ensureColumnExists('bags', 'dispatch_list_buyer_id', 'dispatch_list_buyer_id INT NULL');
  await ensureColumnExists('bags', 'dispatch_list_added_at', 'dispatch_list_added_at DATETIME NULL');
  await ensureColumnExists('processing_batches', 'paused_at', 'paused_at DATETIME NULL');
  await ensureColumnExists('processing_batches', 'resumed_at', 'resumed_at DATETIME NULL');
  await ensureColumnExists('processing_batch_stage_logs', 'output_bag_count', 'output_bag_count INT NULL');
  await ensureColumnExists('processing_batch_stage_logs', 'output_grade', 'output_grade VARCHAR(80) NULL');
  await ensureColumnExists('processing_batch_stage_logs', 'output_details_json', 'output_details_json JSON NULL');
  await ensureColumnExists('processing_stage_sessions', 'stage_metrics_json', 'stage_metrics_json JSON NULL');
  await q(
    `UPDATE processing_batches
     SET current_stage_key = ?, updated_at = NOW()
     WHERE status <> 'completed'
       AND (current_stage_key IS NULL OR current_stage_key NOT IN (${PROCESSING_STAGE_DEFS.map(() => '?').join(',')}))`,
    [PROCESSING_STAGE_DEFS[0].key, ...PROCESSING_STAGE_DEFS.map((stage) => stage.key)]
  );
  await ensureColumnExists('vehicle_dispatch_items', 'warehouse_scan_status', "warehouse_scan_status VARCHAR(20) NOT NULL DEFAULT 'pending'");
  await ensureColumnExists('vehicle_dispatch_items', 'scanned_at', 'scanned_at DATETIME NULL');
  await ensureColumnExists('vehicle_dispatch_items', 'scanned_by_employee_id', 'scanned_by_employee_id INT NULL');
  await ensureColumnExists('vehicle_dispatch_items', 'dispatch_invoice_number', 'dispatch_invoice_number VARCHAR(120) NULL');
  await q("UPDATE vehicle_dispatches SET status = 'warehouse_received' WHERE status = 'confirmed_match'");
  await q("UPDATE vehicle_dispatches SET status = 'unmatched_bags' WHERE status = 'confirmed_mismatch'");

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
    'SELECT id, code, name, role, is_active, created_at FROM warehouse_employees WHERE code = ? AND password = ? LIMIT 1',
    [loginCode, loginPassword]
  );
  if (warehouseRows.length > 0) {
    if (Number(warehouseRows[0].is_active ?? 1) !== 1) {
      return res.status(403).json({ error: 'Warehouse account is inactive. Contact admin.' });
    }
    return res.json({
      success: true,
      user: {
        ...warehouseRows[0],
        role: normalizeActorRole(warehouseRows[0].role) || 'warehouse',
      },
    });
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

// ── User Registration Endpoint (admin can add buyers) ──
// User registration request (pending approval)
app.post('/api/register-user', withAsync(async (req, res) => {
  const { username, name, password, email, phone, role, address } = req.body || {};
  const normUsername = String(username || '').trim();
  const normName = String(name || '').trim();
  const normPassword = String(password || '').trim();
  const normEmail = email ? String(email).trim() : null;
  const normPhone = phone ? String(phone).trim() : null;
  const normRole = String(role || '').trim().toLowerCase();
  const normAddress = address ? String(address).trim() : null;
  if (!normUsername || !normName || !normPassword || !normRole) {
    return res.status(400).json({ error: 'username, name, password, and role are required' });
  }
  if (!['buyer', 'warehouse', 'classification', 'admin', 'supervisor'].includes(normRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const result = await q(
      'INSERT INTO registration_requests (username, name, password, email, phone, address, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'pending\', NOW())',
      [normUsername, normName, normPassword, normEmail, normPhone, normAddress, normRole]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}));

// Admin: List all registration requests (pending, approved, denied)
app.get('/api/registration-requests', withAsync(async (req, res) => {
  const rows = await q('SELECT * FROM registration_requests ORDER BY created_at DESC');
  res.json(rows);
}));

// Admin: Approve a registration request
app.post('/api/registration-requests/:id/approve', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const reviewerId = req.body.reviewerId || null;
  const reviewNote = req.body.reviewNote || null;
  // Get the request
  const [request] = await q('SELECT * FROM registration_requests WHERE id = ?', [id]);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });
  // Insert into correct table
  let insertSql, insertParams;
  if (request.role === 'buyer') {
    insertSql = 'INSERT INTO buyers (code, name, password, created_at) VALUES (?, ?, ?, NOW())';
    insertParams = [request.username, request.name, request.password];
  } else if (request.role === 'warehouse' || request.role === 'classification' || request.role === 'supervisor') {
    insertSql = 'INSERT INTO warehouse_employees (code, name, password, role, created_at) VALUES (?, ?, ?, ?, NOW())';
    insertParams = [request.username, request.name, request.password, request.role];
  } else if (request.role === 'admin') {
    insertSql = 'INSERT INTO admin_logins (code, name, password, created_at) VALUES (?, ?, ?, NOW())';
    insertParams = [request.username, request.name, request.password];
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    await q(insertSql, insertParams);
    await q('UPDATE registration_requests SET status = \'approved\', reviewed_at = NOW(), reviewed_by = ?, review_note = ? WHERE id = ?', [reviewerId, reviewNote, id]);
    res.json({ success: true });
    // TODO: Send notification (email, SMS, WhatsApp)
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'User already exists in target table' });
    }
    res.status(500).json({ error: err.message });
  }
}));

// Admin: Deny a registration request
app.post('/api/registration-requests/:id/deny', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const reviewerId = req.body.reviewerId || null;
  const reviewNote = req.body.reviewNote || null;
  const [request] = await q('SELECT * FROM registration_requests WHERE id = ?', [id]);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });
  await q('UPDATE registration_requests SET status = \'denied\', reviewed_at = NOW(), reviewed_by = ?, review_note = ? WHERE id = ?', [reviewerId, reviewNote, id]);
  res.json({ success: true });
  // TODO: Send notification (email, SMS, WhatsApp)
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
  const rows = await q('SELECT id, code, name, password, role, is_active, created_at FROM warehouse_employees ORDER BY id ASC');
  res.json(rows);
}));

app.post('/api/warehouse-employees', withAsync(async (req, res) => {
  const { code, name, role } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedName = String(name || '').trim();
  const normalizedRole = normalizeActorRole(role) || 'warehouse';

  if (!normalizedCode || !normalizedName) {
    return res.status(400).json({ error: 'code and name required' });
  }
  if (!['warehouse', 'classification', 'supervisor'].includes(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid warehouse employee role' });
  }

  try {
    const result = await q(
      'INSERT INTO warehouse_employees (code, name, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [normalizedCode, normalizedName, normalizedCode, normalizedRole]
    );
    const rows = await q('SELECT id, code, name, password, role, is_active, created_at FROM warehouse_employees WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Warehouse employee code already exists' });
    throw error;
  }
}));

app.put('/api/warehouse-employees/:id', withAsync(async (req, res) => {
  const id = Number(req.params.id);
  const { name, password, is_active, role } = req.body || {};
  const updates = {};
  if (name && String(name).trim()) updates.name = String(name).trim();
  if (password && String(password).trim()) updates.password = String(password).trim();
  if (role !== undefined && role !== null && String(role).trim()) {
    const normalizedRole = normalizeActorRole(role);
    if (!['warehouse', 'classification', 'supervisor'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid warehouse employee role' });
    }
    updates.role = normalizedRole;
  }
  if ([true, false, 1, 0, '1', '0'].includes(is_active)) {
    updates.is_active = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  await q(`UPDATE warehouse_employees SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);
  const rows = await q('SELECT id, code, name, password, role, is_active, created_at FROM warehouse_employees WHERE id = ?', [id]);
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

// ── CLASSIFICATION GRADES CRUD ──
app.get('/api/classification-grades', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM classification_grades ORDER BY code ASC');
  res.json(rows);
}));

app.post('/api/classification-grades', withAsync(async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const description = String(req.body?.description || '').trim();
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const result = await q('INSERT INTO classification_grades (code, description, created_at) VALUES (?, ?, NOW())', [code, description]);
    const rows = await q('SELECT * FROM classification_grades WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Classification grade code already exists' });
    throw error;
  }
}));

app.put('/api/classification-grades/:id', withAsync(async (req, res) => {
  const gradeId = Number(req.params.id);
  const code = String(req.body?.code || '').trim().toUpperCase();
  const description = String(req.body?.description || '').trim();
  if (!code) return res.status(400).json({ error: 'code required' });
  const rows = await q('SELECT * FROM classification_grades WHERE id = ? LIMIT 1', [gradeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Classification grade not found' });
  const duplicate = await q('SELECT id FROM classification_grades WHERE code = ? AND id <> ? LIMIT 1', [code, gradeId]);
  if (duplicate.length > 0) return res.status(400).json({ error: 'Classification grade code already exists' });
  await q('UPDATE classification_grades SET code = ?, description = ? WHERE id = ?', [code, description, gradeId]);
  const updated = await q('SELECT * FROM classification_grades WHERE id = ?', [gradeId]);
  res.json(updated[0]);
}));

app.delete('/api/classification-grades/:id', withAsync(async (req, res) => {
  const gradeId = Number(req.params.id);
  const rows = await q('SELECT * FROM classification_grades WHERE id = ? LIMIT 1', [gradeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Classification grade not found' });
  const grade = rows[0];
  const inUse = await q('SELECT COUNT(*) AS total FROM classification_entries WHERE grade = ?', [grade.code]);
  if (inUse[0].total > 0) return res.status(400).json({ error: 'Classification grade is in use and cannot be deleted' });
  await q('DELETE FROM classification_grades WHERE id = ?', [gradeId]);
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
    dispatch: normalizeVehicleDispatchRow(dispatch),
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
      `SELECT bag.*, COALESCE(latest_item.dispatch_invoice_number, bag.dispatch_invoice_number) AS effective_dispatch_invoice_number,
              vd.id AS vehicle_dispatch_id, vd.dispatch_number AS vehicle_dispatch_number, vd.status AS vehicle_dispatch_status
       FROM bags bag
       LEFT JOIN (
         SELECT vdi.bag_id, vdi.unique_code, MAX(vdi.id) AS latest_item_id, MAX(vdi.dispatch_id) AS latest_dispatch_id
         FROM vehicle_dispatch_items vdi
         GROUP BY vdi.bag_id, vdi.unique_code
       ) latest ON latest.bag_id = bag.id AND latest.unique_code = bag.unique_code
       LEFT JOIN vehicle_dispatch_items latest_item ON latest_item.id = latest.latest_item_id
       LEFT JOIN vehicle_dispatches vd ON vd.id = latest.latest_dispatch_id
       WHERE bag.buyer_id = ?
       ORDER BY bag.id DESC`,
      [buyerId]
    )
    : await q(
      `SELECT bag.*, COALESCE(latest_item.dispatch_invoice_number, bag.dispatch_invoice_number) AS effective_dispatch_invoice_number,
              vd.id AS vehicle_dispatch_id, vd.dispatch_number AS vehicle_dispatch_number, vd.status AS vehicle_dispatch_status
       FROM bags bag
       LEFT JOIN (
         SELECT vdi.bag_id, vdi.unique_code, MAX(vdi.id) AS latest_item_id, MAX(vdi.dispatch_id) AS latest_dispatch_id
         FROM vehicle_dispatch_items vdi
         GROUP BY vdi.bag_id, vdi.unique_code
       ) latest ON latest.bag_id = bag.id AND latest.unique_code = bag.unique_code
       LEFT JOIN vehicle_dispatch_items latest_item ON latest_item.id = latest.latest_item_id
       LEFT JOIN vehicle_dispatches vd ON vd.id = latest.latest_dispatch_id
       ORDER BY bag.id DESC`
    );

  res.json(rows.map((row) => normalizeVehicleDispatchRow({
    ...row,
    dispatch_invoice_number: row.effective_dispatch_invoice_number ?? row.dispatch_invoice_number,
  })));
}));

app.post('/api/bags', withAsync(async (req, res) => {
    // Debug log for incoming bag creation
    console.log('DEBUG /api/bags POST body:', JSON.stringify(req.body, null, 2));
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
  }
  // Enforce lot_number is required for both FCV and NON-FCV
  if (!lotNumber) return res.status(400).json({ error: 'Lot Number is required.' });

  const buyerId = normalizeBuyerId(body.buyer_id);

  const insertValues = [
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
    lotNumber, // Always save lot number for both FCV and NON-FCV
    dateOfPurchaseValue,
    String(body.purchase_location || '').trim(),
    String(body.moisture || '').trim(),
    String(body.colour || '').trim(),
    String(body.sandy_leaves || '').trim(),
    String(body.total_bales || '').trim(),
  ];
  console.log('DEBUG: SQL insert values for bags:', JSON.stringify(insertValues, null, 2));
  const result = await q(
    `INSERT INTO bags (
      unique_code, buyer_id, buyer_code, buyer_name, fcv, type_of_tobacco, apf_number, tobacco_grade,
      purchase_date, weight, rate, bale_value, buyer_grade, lot_number, date_of_purchase, purchase_location,
      moisture, colour, sandy_leaves, total_bales, saved_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    insertValues
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
    'status', // allow status to be updated
  ];

  const merged = { ...currentBag };
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === 'apf_number') {
        merged.apf_number = String(updates.apf_number || '').trim();
      } else if (field === 'lot_number') {
        merged.lot_number = String(updates.lot_number || '').trim();
      } else if (field === 'status') {
        merged.status = String(updates.status || '').trim();
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
         purchase_location = ?, status = ?, updated_at = NOW()
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
      String(merged.lot_number || '').trim(), // Always save lot number
      dateOfPurchaseValue,
      merged.purchase_location || null,
      merged.status || currentBag.status,
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
    const [qrResult] = await conn.query('UPDATE qr_codes SET used = 0 WHERE unique_code = ?', [bag.unique_code]);

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
            GROUP_CONCAT(vdi.unique_code ORDER BY vdi.id ASC SEPARATOR ', ') AS qr_codes,
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

  res.json(rows.map(normalizeVehicleDispatchRow));
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

  res.json({ ...normalizeVehicleDispatchRow(rows[0]), items, scan_events: scanEvents });
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

app.get('/api/processing/stages', (_req, res) => {
  res.json(PROCESSING_STAGE_DEFS);
});

app.get('/api/processing/batches', withAsync(async (req, res) => {
  const onDate = normalizeIsoDate(req.query.date);
  const stageKey = String(req.query.stage_key || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim().toLowerCase();

  const filters = [];
  const params = [];
  if (onDate) {
    filters.push('DATE(pb.created_at) = ?');
    params.push(onDate);
  }
  if (stageKey) {
    filters.push('pb.current_stage_key = ?');
    params.push(stageKey);
  }
  if (status) {
    filters.push('pb.status = ?');
    params.push(status);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await q(
    `SELECT pb.*, we.code AS created_by_code, we.name AS created_by_name,
            COUNT(pbi.id) AS item_count,
            COALESCE(SUM(CASE WHEN pbi.status = 'active' THEN pbi.weight ELSE 0 END), 0) AS total_weight,
            COALESCE(SUM(CASE WHEN pbi.status = 'active' THEN pbi.bale_value ELSE 0 END), 0) AS total_bale_value,
            MAX(psl.logged_at) AS last_stage_log_at
     FROM processing_batches pb
     LEFT JOIN warehouse_employees we ON we.id = pb.created_by_employee_id
     LEFT JOIN processing_batch_items pbi ON pbi.batch_id = pb.id
     LEFT JOIN processing_batch_stage_logs psl ON psl.batch_id = pb.id
     ${whereClause}
     GROUP BY pb.id
     ORDER BY pb.id DESC`,
    params
  );
  res.json(rows);
}));

app.get('/api/processing/batches/:id', withAsync(async (req, res) => {
  const batchId = Number(req.params.id);
  if (!Number.isFinite(batchId) || batchId <= 0) return res.status(400).json({ error: 'Invalid batch id' });
  const batch = await getProcessingBatchById(batchId);
  if (!batch) return res.status(404).json({ error: 'Processing batch not found' });
  res.json(batch);
}));

app.post('/api/processing/batches', withAsync(async (req, res) => {
  const body = req.body || {};
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const actorId = normalizeBuyerId(body.actor_id);
  const codes = Array.isArray(body.qr_codes)
    ? [...new Set(body.qr_codes.map((value) => String(value || '').trim()).filter(Boolean))]
    : [];

  if (codes.length === 0) return res.status(400).json({ error: 'At least one QR code is required' });

  const placeholders = codes.map(() => '?').join(',');
  const bagRows = await q(
    `SELECT bag.id AS bag_id, bag.unique_code, bag.weight,
            COALESCE(bag.bale_value, bag.weight * bag.rate, 0) AS bale_value,
            qr.id AS qr_code_id,
            (
              SELECT vd.status
              FROM vehicle_dispatch_items vdi
              INNER JOIN vehicle_dispatches vd ON vd.id = vdi.dispatch_id
              WHERE vdi.bag_id = bag.id
              ORDER BY vdi.id DESC
              LIMIT 1
            ) AS latest_dispatch_status
     FROM bags bag
     LEFT JOIN qr_codes qr ON qr.unique_code = bag.unique_code
     WHERE bag.unique_code IN (${placeholders})`,
    codes
  );

  if (bagRows.length !== codes.length) {
    return res.status(400).json({ error: 'One or more QR codes do not exist as warehouse bags' });
  }

  for (const row of bagRows) {
    if (!['warehouse_received', 'unmatched_bags'].includes(String(row.latest_dispatch_status || ''))) {
      return res.status(400).json({ error: `QR code ${row.unique_code} is not warehouse-ready for processing` });
    }
  }

  const existingRows = await q(
    `SELECT pbi.unique_code
     FROM processing_batch_items pbi
     INNER JOIN processing_batches pb ON pb.id = pbi.batch_id
     WHERE pbi.unique_code IN (${placeholders})
       AND pb.status IN ('open', 'in_progress', 'paused')
       AND pbi.status = 'active'
     LIMIT 1`,
    codes
  );

  if (existingRows.length > 0) {
    return res.status(400).json({ error: `QR code ${existingRows[0].unique_code} is already in an active processing batch` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const tempCode = `TMP-${Date.now()}`;
    const [batchInsert] = await conn.query(
      `INSERT INTO processing_batches
       (batch_code, status, current_stage_key, created_by_employee_id, created_by_role, created_at, updated_at)
       VALUES (?, 'open', ?, ?, ?, NOW(), NOW())`,
      [tempCode, PROCESSING_STAGE_DEFS[0].key, actorId, actorRole]
    );

    const batchId = Number(batchInsert.insertId);
    const finalCode = buildBatchCode(batchId);
    await conn.query('UPDATE processing_batches SET batch_code = ? WHERE id = ?', [finalCode, batchId]);

    for (const row of bagRows) {
      await conn.query(
        `INSERT INTO processing_batch_items
         (batch_id, bag_id, qr_code_id, unique_code, weight, bale_value, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [batchId, row.bag_id, row.qr_code_id || null, row.unique_code, row.weight ?? null, row.bale_value ?? null]
      );
    }

    await conn.commit();
    const batch = await getProcessingBatchById(batchId);
    res.json({ success: true, batch });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.post('/api/processing/batches/:id/items', withAsync(async (req, res) => {
  const batchId = Number(req.params.id);
  if (!Number.isFinite(batchId) || batchId <= 0) return res.status(400).json({ error: 'Invalid batch id' });

  const body = req.body || {};
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const _actorId = normalizeBuyerId(body.actor_id);
  const codes = Array.isArray(body.qr_codes)
    ? [...new Set(body.qr_codes.map((value) => String(value || '').trim()).filter(Boolean))]
    : [];
  if (codes.length === 0) return res.status(400).json({ error: 'At least one QR code is required' });

  const batchRows = await q('SELECT * FROM processing_batches WHERE id = ? LIMIT 1', [batchId]);
  if (batchRows.length === 0) return res.status(404).json({ error: 'Processing batch not found' });
  if (batchRows[0].status === 'completed') return res.status(400).json({ error: 'Completed batch cannot be modified' });
  if (batchRows[0].status === 'paused') return res.status(400).json({ error: 'Paused batch cannot be modified until it is resumed' });

  const placeholders = codes.map(() => '?').join(',');
  const bagRows = await q(
    `SELECT bag.id AS bag_id, bag.unique_code, bag.weight,
            COALESCE(bag.bale_value, bag.weight * bag.rate, 0) AS bale_value,
            qr.id AS qr_code_id
     FROM bags bag
     LEFT JOIN qr_codes qr ON qr.unique_code = bag.unique_code
     WHERE bag.unique_code IN (${placeholders})`,
    codes
  );
  if (bagRows.length !== codes.length) {
    return res.status(400).json({ error: 'One or more QR codes do not exist as warehouse bags' });
  }

  const activeExisting = await q(
    `SELECT pbi.unique_code
     FROM processing_batch_items pbi
     INNER JOIN processing_batches pb ON pb.id = pbi.batch_id
     WHERE pbi.unique_code IN (${placeholders})
       AND pbi.status = 'active'
       AND pb.status IN ('open', 'in_progress', 'paused')
       AND pb.id <> ?
     LIMIT 1`,
    [...codes, batchId]
  );
  if (activeExisting.length > 0) {
    return res.status(400).json({ error: `QR code ${activeExisting[0].unique_code} is already in another active batch` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of bagRows) {
      await conn.query(
        `INSERT INTO processing_batch_items
         (batch_id, bag_id, qr_code_id, unique_code, weight, bale_value, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
         ON DUPLICATE KEY UPDATE status = 'active'`,
        [batchId, row.bag_id, row.qr_code_id || null, row.unique_code, row.weight ?? null, row.bale_value ?? null]
      );
    }
    await conn.query(
      `INSERT INTO processing_batch_stage_logs
       (batch_id, stage_key, stage_label, action, total_quantity, worker_names_json, note, logged_by_employee_id, logged_by_role, logged_at)
       VALUES (?, ?, ?, 'note', NULL, NULL, ?, ?, ?, NOW())`,
      [batchId, batchRows[0].current_stage_key || PROCESSING_STAGE_DEFS[0].key, PROCESSING_STAGE_LABEL_BY_KEY[batchRows[0].current_stage_key || PROCESSING_STAGE_DEFS[0].key], `Added ${codes.length} item(s) to batch`, _actorId, actorRole]
    );
    await conn.commit();
    const batch = await getProcessingBatchById(batchId);
    res.json({ success: true, batch });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.delete('/api/processing/batches/:id/items/:itemId', withAsync(async (req, res) => {
  const batchId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const actorRole = assertProcessingRoleOrThrow(req.query.actor_role);
  const actorId = normalizeBuyerId(req.query.actor_id);

  if (!Number.isFinite(batchId) || batchId <= 0) return res.status(400).json({ error: 'Invalid batch id' });
  if (!Number.isFinite(itemId) || itemId <= 0) return res.status(400).json({ error: 'Invalid item id' });

  const batchRows = await q('SELECT * FROM processing_batches WHERE id = ? LIMIT 1', [batchId]);
  if (batchRows.length === 0) return res.status(404).json({ error: 'Processing batch not found' });
  if (batchRows[0].status === 'completed') return res.status(400).json({ error: 'Completed batch items cannot be removed' });
  if (batchRows[0].status === 'paused') return res.status(400).json({ error: 'Paused batch items cannot be removed until the batch is resumed' });

  const itemRows = await q('SELECT * FROM processing_batch_items WHERE id = ? AND batch_id = ? LIMIT 1', [itemId, batchId]);
  if (itemRows.length === 0) return res.status(404).json({ error: 'Batch item not found' });

  await q("UPDATE processing_batch_items SET status = 'removed' WHERE id = ?", [itemId]);
  await q(
    `INSERT INTO processing_batch_stage_logs
     (batch_id, stage_key, stage_label, action, total_quantity, worker_names_json, note, logged_by_employee_id, logged_by_role, logged_at)
     VALUES (?, ?, ?, 'note', NULL, NULL, ?, ?, ?, NOW())`,
    [
      batchId,
      batchRows[0].current_stage_key || PROCESSING_STAGE_DEFS[0].key,
      PROCESSING_STAGE_LABEL_BY_KEY[batchRows[0].current_stage_key || PROCESSING_STAGE_DEFS[0].key],
      `Removed item ${itemRows[0].unique_code} from batch`,
      actorId,
      actorRole,
    ]
  );

  const batch = await getProcessingBatchById(batchId);
  res.json({ success: true, batch });
}));

app.put('/api/processing/batches/:id/stages/:stageKey', withAsync(async (req, res) => {
  const batchId = Number(req.params.id);
  const stageKey = String(req.params.stageKey || '').trim().toLowerCase();
  const body = req.body || {};
  const action = String(body.action || '').trim().toLowerCase();
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const actorId = normalizeBuyerId(body.actor_id);

  if (!Number.isFinite(batchId) || batchId <= 0) return res.status(400).json({ error: 'Invalid batch id' });
  if (!PROCESSING_STAGE_KEYS.has(stageKey)) return res.status(400).json({ error: 'Invalid stage key' });
  if (!['start', 'finish'].includes(action)) return res.status(400).json({ error: 'action must be start or finish' });

  const batchRows = await q('SELECT * FROM processing_batches WHERE id = ? LIMIT 1', [batchId]);
  if (batchRows.length === 0) return res.status(404).json({ error: 'Processing batch not found' });
  const batch = batchRows[0];

  if (batch.status === 'completed') return res.status(400).json({ error: 'Batch is already completed' });
  if (batch.status === 'paused') return res.status(400).json({ error: 'Batch is paused. Resume the batch before processing the current stage' });
  if (batch.current_stage_key !== stageKey) {
    return res.status(400).json({ error: `Current batch stage is ${batch.current_stage_key || 'not set'}` });
  }

  const stageIndex = PROCESSING_STAGE_DEFS.findIndex((stage) => stage.key === stageKey);
  const latestStarted = await q(
    `SELECT id FROM processing_batch_stage_logs
     WHERE batch_id = ? AND stage_key = ? AND action = 'started'
     ORDER BY id DESC
     LIMIT 1`,
    [batchId, stageKey]
  );
  const latestFinished = await q(
    `SELECT id FROM processing_batch_stage_logs
     WHERE batch_id = ? AND stage_key = ? AND action = 'finished'
     ORDER BY id DESC
     LIMIT 1`,
    [batchId, stageKey]
  );

  if (action === 'start' && latestStarted.length > 0 && (latestFinished.length === 0 || Number(latestStarted[0].id) > Number(latestFinished[0].id))) {
    return res.status(400).json({ error: 'Stage is already started and not finished yet' });
  }
  if (action === 'finish' && (latestStarted.length === 0 || (latestFinished.length > 0 && Number(latestFinished[0].id) > Number(latestStarted[0].id)))) {
    return res.status(400).json({ error: 'Stage must be started before finish' });
  }

  const workerNames = Array.isArray(body.worker_names)
    ? body.worker_names.map((value) => String(value || '').trim()).filter(Boolean)
    : String(body.worker_names || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const quantityRaw = body.total_quantity;
  const totalQuantity = quantityRaw === undefined || quantityRaw === null || quantityRaw === '' ? null : Number(quantityRaw);
  if (action === 'finish' && (!Number.isFinite(totalQuantity) || totalQuantity <= 0)) {
    return res.status(400).json({ error: 'total_quantity is required for finish action' });
  }

  const note = String(body.note || '').trim();
  const stageLabel = PROCESSING_STAGE_LABEL_BY_KEY[stageKey] || stageKey;
  const outputBagCountRaw = body.output_bag_count;
  const outputBagCount = outputBagCountRaw === undefined || outputBagCountRaw === null || outputBagCountRaw === ''
    ? null
    : Number(outputBagCountRaw);
  if (outputBagCount !== null && (!Number.isInteger(outputBagCount) || outputBagCount < 0)) {
    return res.status(400).json({ error: 'output_bag_count must be a non-negative whole number' });
  }

  const outputGrade = String(body.output_grade || '').trim();
  const machineId = String(body.machine_id || '').trim();
  const stageMetrics = sanitizeStageMetrics(body.stage_metrics);
  const inputBalesRaw = body.input_bales;
  const inputBales = inputBalesRaw === undefined || inputBalesRaw === null || inputBalesRaw === '' ? null : Number(inputBalesRaw);
  const inputWeightRaw = body.input_weight;
  const inputWeight = inputWeightRaw === undefined || inputWeightRaw === null || inputWeightRaw === '' ? null : Number(inputWeightRaw);
  const outputWeightRaw = body.output_weight;
  const outputWeight = outputWeightRaw === undefined || outputWeightRaw === null || outputWeightRaw === '' ? null : Number(outputWeightRaw);
  const wasteWeightRaw = body.waste_weight;
  const wasteWeight = wasteWeightRaw === undefined || wasteWeightRaw === null || wasteWeightRaw === '' ? null : Number(wasteWeightRaw);
  const efficiencyPctRaw = body.efficiency_pct;
  const efficiencyPct = efficiencyPctRaw === undefined || efficiencyPctRaw === null || efficiencyPctRaw === '' ? null : Number(efficiencyPctRaw);
  const durationMinutesRaw = body.duration_minutes;
  const durationMinutes = durationMinutesRaw === undefined || durationMinutesRaw === null || durationMinutesRaw === '' ? null : Number(durationMinutesRaw);

  if (inputBales !== null && (!Number.isInteger(inputBales) || inputBales < 0)) {
    return res.status(400).json({ error: 'input_bales must be a non-negative whole number' });
  }
  for (const [fieldName, fieldValue] of [
    ['input_weight', inputWeight],
    ['output_weight', outputWeight],
    ['waste_weight', wasteWeight],
    ['efficiency_pct', efficiencyPct],
  ]) {
    if (fieldValue !== null && (!Number.isFinite(fieldValue) || fieldValue < 0)) {
      return res.status(400).json({ error: `${fieldName} must be a non-negative number` });
    }
  }
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 0)) {
    return res.status(400).json({ error: 'duration_minutes must be a non-negative whole number' });
  }

  if (action === 'finish') {
    const missingMetricFields = validateStageMetrics(stageKey, stageMetrics);
    if (missingMetricFields.length > 0) {
      return res.status(400).json({ error: `Missing stage parameters: ${missingMetricFields.join(', ')}` });
    }
  }

  let outputDetails = null;
  if (body.output_details && typeof body.output_details === 'object' && !Array.isArray(body.output_details)) {
    outputDetails = body.output_details;
  } else {
    const detailText = String(body.output_details || '').trim();
    if (detailText) outputDetails = { summary: detailText };
  }

  if (action === 'finish') {
    if (outputBagCount !== null) outputDetails = { ...(outputDetails || {}), bag_count: outputBagCount };
    if (outputGrade) outputDetails = { ...(outputDetails || {}), grade: outputGrade };
    if (machineId) outputDetails = { ...(outputDetails || {}), machine_id: machineId };
    if (Object.keys(stageMetrics).length > 0) outputDetails = { ...(outputDetails || {}), stage_metrics: stageMetrics };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO processing_batch_stage_logs
       (batch_id, stage_key, stage_label, action, total_quantity, output_bag_count, output_grade, worker_names_json, output_details_json, note, logged_by_employee_id, logged_by_role, logged_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        batchId,
        stageKey,
        stageLabel,
        action === 'start' ? 'started' : 'finished',
        totalQuantity,
        outputBagCount,
        outputGrade || null,
        workerNames.length > 0 ? JSON.stringify(workerNames) : null,
        outputDetails ? JSON.stringify(outputDetails) : null,
        note,
        actorId,
        actorRole,
      ]
    );

    if (action === 'start') {
      await conn.query(
        `INSERT INTO processing_stage_sessions
         (batch_id, stage_key, stage_label, operator_employee_id, operator_role, machine_id, input_bales, input_weight, output_weight, waste_weight, efficiency_pct, stage_metrics_json, started_at, remarks, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
        [
          batchId,
          stageKey,
          stageLabel,
          actorId,
          actorRole,
          machineId || null,
          inputBales,
          inputWeight,
          outputWeight,
          wasteWeight,
          efficiencyPct,
          Object.keys(stageMetrics).length > 0 ? JSON.stringify(stageMetrics) : null,
          note,
        ]
      );

      await conn.query(
        `UPDATE processing_batches
         SET status = 'in_progress', paused_at = NULL, resumed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [batchId]
      );
    } else {
      const openSessions = await conn.query(
        `SELECT id, started_at
         FROM processing_stage_sessions
         WHERE batch_id = ? AND stage_key = ? AND ended_at IS NULL
         ORDER BY id DESC
         LIMIT 1`,
        [batchId, stageKey]
      );
      const openSessionRows = openSessions[0] || [];
      if (openSessionRows.length > 0) {
        const openSession = openSessionRows[0];
        const startedAt = DateTime.fromJSDate(new Date(openSession.started_at));
        const now = DateTime.now();
        const computedDuration = Math.max(0, Math.round(now.diff(startedAt, 'minutes').minutes));
        await conn.query(
          `UPDATE processing_stage_sessions
           SET ended_at = NOW(),
               duration_minutes = ?,
               machine_id = COALESCE(?, machine_id),
               input_bales = COALESCE(?, input_bales),
               input_weight = COALESCE(?, input_weight),
               output_weight = COALESCE(?, output_weight),
               waste_weight = COALESCE(?, waste_weight),
               efficiency_pct = COALESCE(?, efficiency_pct),
               stage_metrics_json = COALESCE(?, stage_metrics_json),
               remarks = CASE WHEN ? <> '' THEN ? ELSE remarks END,
               updated_at = NOW()
           WHERE id = ?`,
          [
            durationMinutes !== null ? durationMinutes : computedDuration,
            machineId || null,
            inputBales,
            inputWeight,
            outputWeight,
            wasteWeight,
            efficiencyPct,
            Object.keys(stageMetrics).length > 0 ? JSON.stringify(stageMetrics) : null,
            note,
            note,
            openSession.id,
          ]
        );
      }

      const isLastStage = stageIndex >= PROCESSING_STAGE_DEFS.length - 1;
      if (isLastStage) {
        await conn.query(
          `UPDATE processing_batches
           SET status = 'completed', current_stage_key = NULL, completed_at = NOW(), paused_at = NULL, updated_at = NOW()
           WHERE id = ?`,
          [batchId]
        );
      } else {
        const nextStageKey = PROCESSING_STAGE_DEFS[stageIndex + 1].key;
        await conn.query(
          `UPDATE processing_batches
           SET status = 'in_progress', current_stage_key = ?, paused_at = NULL, updated_at = NOW()
           WHERE id = ?`,
          [nextStageKey, batchId]
        );
      }
    }

    await conn.commit();
    const updatedBatch = await getProcessingBatchById(batchId);
    res.json({ success: true, batch: updatedBatch });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.put('/api/processing/batches/:id/status', withAsync(async (req, res) => {
  const batchId = Number(req.params.id);
  const body = req.body || {};
  const action = String(body.action || '').trim().toLowerCase();
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const actorId = normalizeBuyerId(body.actor_id);
  const note = String(body.note || '').trim();

  if (!Number.isFinite(batchId) || batchId <= 0) return res.status(400).json({ error: 'Invalid batch id' });
  if (!['pause', 'resume'].includes(action)) return res.status(400).json({ error: 'action must be pause or resume' });

  const batchRows = await q('SELECT * FROM processing_batches WHERE id = ? LIMIT 1', [batchId]);
  if (batchRows.length === 0) return res.status(404).json({ error: 'Processing batch not found' });

  const batch = batchRows[0];
  const stageKey = batch.current_stage_key || PROCESSING_STAGE_DEFS[0].key;
  const stageLabel = PROCESSING_STAGE_LABEL_BY_KEY[stageKey] || stageKey;

  if (action === 'pause') {
    if (batch.status === 'completed') return res.status(400).json({ error: 'Completed batch cannot be paused' });
    if (batch.status === 'paused') return res.status(400).json({ error: 'Batch is already paused' });
    if (batch.status !== 'in_progress') return res.status(400).json({ error: 'Batch must be in progress before it can be paused' });
  }

  if (action === 'resume') {
    if (batch.status !== 'paused') return res.status(400).json({ error: 'Only paused batches can be resumed' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO processing_batch_stage_logs
       (batch_id, stage_key, stage_label, action, total_quantity, output_bag_count, output_grade, worker_names_json, output_details_json, note, logged_by_employee_id, logged_by_role, logged_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NOW())`,
      [batchId, stageKey, stageLabel, action === 'pause' ? 'paused' : 'resumed', note, actorId, actorRole]
    );

    if (action === 'pause') {
      await conn.query(
        `UPDATE processing_batches
         SET status = 'paused', paused_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [batchId]
      );
    } else {
      await conn.query(
        `UPDATE processing_batches
         SET status = 'in_progress', resumed_at = NOW(), paused_at = NULL, updated_at = NOW()
         WHERE id = ?`,
        [batchId]
      );
    }

    await conn.commit();
    const updatedBatch = await getProcessingBatchById(batchId);
    res.json({ success: true, batch: updatedBatch });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.get('/api/processing/daily-progress', withAsync(async (req, res) => {
  const dateValue = normalizeIsoDate(req.query.date) || DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

  const stageRows = await q(
    `SELECT stage_key, stage_label,
            COUNT(DISTINCT batch_id) AS total_batches,
            COALESCE(SUM(total_quantity), 0) AS total_quantity
     FROM processing_batch_stage_logs
     WHERE action = 'finished'
       AND DATE(logged_at) = ?
     GROUP BY stage_key, stage_label`,
    [dateValue]
  );

  const workerRows = await q(
    `SELECT stage_key, worker_names_json, total_quantity
     FROM processing_batch_stage_logs
     WHERE action = 'finished'
       AND DATE(logged_at) = ?`,
    [dateValue]
  );

  const workerSummary = {};
  for (const row of workerRows) {
    const stageKey = String(row.stage_key || '').trim();
    if (!workerSummary[stageKey]) workerSummary[stageKey] = {};
    const workerNames = row.worker_names_json ? JSON.parse(row.worker_names_json) : [];
    const qty = Number(row.total_quantity || 0);
    for (const workerName of workerNames) {
      if (!workerSummary[stageKey][workerName]) {
        workerSummary[stageKey][workerName] = { entries: 0, quantity: 0 };
      }
      workerSummary[stageKey][workerName].entries += 1;
      workerSummary[stageKey][workerName].quantity += qty;
    }
  }

  const orderedStageRows = stageRows.sort((a, b) => {
    const ai = PROCESSING_STAGE_DEFS.findIndex((stage) => stage.key === a.stage_key);
    const bi = PROCESSING_STAGE_DEFS.findIndex((stage) => stage.key === b.stage_key);
    return ai - bi;
  });

  res.json({
    date: dateValue,
    stages: orderedStageRows.map((stageRow) => ({
      ...stageRow,
      workers: Object.entries(workerSummary[stageRow.stage_key] || {}).map(([worker_name, stats]) => ({ worker_name, ...stats })),
    })),
  });
}));

app.get('/api/processing/reports', withAsync(async (req, res) => {
  const batchId = Number(req.query.batch_id);
  const dateValue = normalizeIsoDate(req.query.date);
  const report = await getProcessingReportData({
    batchId: Number.isFinite(batchId) && batchId > 0 ? batchId : null,
    date: dateValue,
  });
  res.json(report);
}));

app.get('/api/processing/reports/export', withAsync(async (req, res) => {
  const batchId = Number(req.query.batch_id);
  const dateValue = normalizeIsoDate(req.query.date);
  const format = String(req.query.format || 'csv').trim().toLowerCase();
  const report = await getProcessingReportData({
    batchId: Number.isFinite(batchId) && batchId > 0 ? batchId : null,
    date: dateValue,
  });

  const stamp = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyyMMdd-HHmmss');
  if (format === 'csv') {
    const csv = buildProcessingReportCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="processing-report-${stamp}.csv"`);
    res.send(csv);
    return;
  }

  if (format === 'pdf') {
    const html = buildProcessingReportPrintHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  res.status(400).json({ error: 'format must be csv or pdf' });
}));

app.get('/api/processing/alerts/missing-stages', withAsync(async (req, res) => {
  const statusFilter = String(req.query.status || '').trim().toLowerCase();
  const allowedStatuses = new Set(['open', 'in_progress', 'paused', 'completed']);
  const useStatusFilter = statusFilter && allowedStatuses.has(statusFilter);

  const batches = await q(
    `SELECT id, batch_code, status, current_stage_key, created_at, completed_at
     FROM processing_batches
     ${useStatusFilter ? 'WHERE status = ?' : ''}
     ORDER BY id DESC`,
    useStatusFilter ? [statusFilter] : []
  );

  if (batches.length === 0) {
    res.json({ generated_at: new Date().toISOString(), alerts: [] });
    return;
  }

  const batchIds = batches.map((row) => Number(row.id));
  const stageRows = await q(
    `SELECT batch_id, stage_key
     FROM processing_batch_stage_logs
     WHERE action = 'finished' AND batch_id IN (${batchIds.map(() => '?').join(',')})
     GROUP BY batch_id, stage_key`,
    batchIds
  );

  const finishedByBatch = {};
  for (const row of stageRows) {
    const id = Number(row.batch_id);
    if (!finishedByBatch[id]) finishedByBatch[id] = new Set();
    finishedByBatch[id].add(String(row.stage_key || '').trim().toLowerCase());
  }

  const alerts = [];
  for (const batch of batches) {
    const finishedSet = finishedByBatch[Number(batch.id)] || new Set();
    const missingStages = PROCESSING_STAGE_DEFS
      .filter((stage) => !finishedSet.has(stage.key))
      .map((stage) => stage.label);

    if (missingStages.length === 0) continue;

    let severity = 'medium';
    if (batch.status === 'completed') severity = 'high';
    if (batch.status === 'open') severity = 'low';

    alerts.push({
      batch_id: batch.id,
      batch_code: batch.batch_code,
      status: batch.status,
      current_stage_key: batch.current_stage_key,
      severity,
      missing_stages: missingStages,
      created_at: batch.created_at,
      completed_at: batch.completed_at,
    });
  }

  res.json({ generated_at: new Date().toISOString(), alerts });
}));

app.get('/api/processing/traceability', withAsync(async (req, res) => {
  const batchId = Number(req.query.batch_id);
  const qrCode = String(req.query.qr_code || '').trim();

  const filters = [];
  const params = [];
  if (Number.isFinite(batchId) && batchId > 0) {
    filters.push('pb.id = ?');
    params.push(batchId);
  }
  if (qrCode) {
    filters.push('EXISTS (SELECT 1 FROM processing_batch_items pbi WHERE pbi.batch_id = pb.id AND pbi.unique_code = ?)');
    params.push(qrCode);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const batches = await q(
    `SELECT pb.id, pb.batch_code, pb.status, pb.current_stage_key, pb.created_at, pb.completed_at
     FROM processing_batches pb
     ${whereClause}
     ORDER BY pb.id DESC
     LIMIT 50`,
    params
  );

  const responseBatches = [];
  for (const batch of batches) {
    const id = Number(batch.id);
    const items = await q(
      `SELECT pbi.id, pbi.unique_code, pbi.status, pbi.weight, pbi.bale_value
       FROM processing_batch_items pbi
       WHERE pbi.batch_id = ?
       ORDER BY pbi.id ASC`,
      [id]
    );
    const stageLogs = await q(
      `SELECT id, stage_key, stage_label, action, total_quantity, output_bag_count, output_grade, worker_names_json, output_details_json, note, logged_at
       FROM processing_batch_stage_logs
       WHERE batch_id = ?
       ORDER BY id ASC`,
      [id]
    );
    const sessions = await q(
      `SELECT id, stage_key, stage_label, machine_id, input_bales, input_weight, output_weight, waste_weight, efficiency_pct, stage_metrics_json, started_at, ended_at, duration_minutes, remarks
       FROM processing_stage_sessions
       WHERE batch_id = ?
       ORDER BY id ASC`,
      [id]
    );
    const exportBags = await q(
      `SELECT id, export_unique_code, grade, quantity, created_at
       FROM processing_export_bags
       WHERE batch_id = ?
       ORDER BY id ASC`,
      [id]
    );

    responseBatches.push({
      ...batch,
      items,
      stage_logs: stageLogs.map((row) => ({
        ...row,
        worker_names: parseJsonArray(row.worker_names_json),
        output_details: parseJsonObject(row.output_details_json),
      })),
      stage_sessions: sessions.map((row) => ({ ...row, stage_metrics: parseJsonObject(row.stage_metrics_json) || {} })),
      export_bags: exportBags,
    });
  }

  res.json({
    filters: {
      batch_id: Number.isFinite(batchId) && batchId > 0 ? batchId : null,
      qr_code: qrCode || null,
    },
    batches: responseBatches,
  });
}));

app.post('/api/processing/batches/:id/export-bags', withAsync(async (req, res) => {
  const batchId = Number(req.params.id);
  if (!Number.isFinite(batchId) || batchId <= 0) return res.status(400).json({ error: 'Invalid batch id' });

  const body = req.body || {};
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const actorId = normalizeBuyerId(body.actor_id);
  const inputBags = Array.isArray(body.bags) ? body.bags : [];
  if (inputBags.length === 0) return res.status(400).json({ error: 'At least one export bag is required' });

  const batchRows = await q('SELECT * FROM processing_batches WHERE id = ? LIMIT 1', [batchId]);
  if (batchRows.length === 0) return res.status(404).json({ error: 'Processing batch not found' });
  if (batchRows[0].status !== 'completed') return res.status(400).json({ error: 'Export bags can be created only after all stages are completed' });

  const validatedBags = [];
  for (let index = 0; index < inputBags.length; index += 1) {
    const row = inputBags[index] || {};
    const grade = String(row.grade || '').trim();
    const quantity = Number(row.quantity);
    const exportCode = String(row.export_unique_code || '').trim();
    if (!grade) return res.status(400).json({ error: `grade is required for export bag #${index + 1}` });
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: `quantity must be positive for export bag #${index + 1}` });
    validatedBags.push({ grade, quantity, export_unique_code: exportCode });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const createdIds = [];
    for (let index = 0; index < validatedBags.length; index += 1) {
      const bag = validatedBags[index];
      const generatedCode = bag.export_unique_code || `EXP-${batchId}-${Date.now()}-${index + 1}`;

      await conn.query(
        `INSERT INTO qr_codes (unique_code, buyer_id, used, created_at)
         VALUES (?, NULL, 1, NOW())
         ON DUPLICATE KEY UPDATE unique_code = unique_code`,
        [generatedCode]
      );

      const [insertRow] = await conn.query(
        `INSERT INTO processing_export_bags
         (batch_id, export_unique_code, grade, quantity, created_by_employee_id, created_by_role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [batchId, generatedCode, bag.grade, bag.quantity, actorId, actorRole]
      );
      createdIds.push(Number(insertRow.insertId));
    }

    await conn.commit();
    const created = await q(
      `SELECT peb.*
       FROM processing_export_bags peb
       WHERE peb.id IN (${createdIds.map(() => '?').join(',')})
       ORDER BY peb.id DESC`,
      createdIds
    );
    const batch = await getProcessingBatchById(batchId);
    res.json({ success: true, export_bags: created, batch });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// ─── Classification Entries ─────────────────────────────────────────────────

app.get('/api/classification-entries', withAsync(async (req, res) => {
  const employeeId = normalizeBuyerId(req.query.employee_id);
  const dateFilter = normalizeIsoDate(req.query.date);
  const filters = [];
  const params = [];
  if (employeeId) { filters.push('ce.classified_by_employee_id = ?'); params.push(employeeId); }
  if (dateFilter) { filters.push('ce.classification_date = ?'); params.push(dateFilter); }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await q(
    `SELECT ce.*, b.buyer_code, b.buyer_name, b.weight AS bag_weight, b.fcv
     FROM classification_entries ce
     LEFT JOIN bags b ON b.id = ce.bag_id
     ${whereClause}
     ORDER BY ce.created_at DESC`,
    params
  );
  res.json(rows);
}));

app.post('/api/classification-entries', withAsync(async (req, res) => {
  const body = req.body || {};
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const actorId = normalizeBuyerId(body.actor_id);
  const uniqueCode = String(body.unique_code || '').trim();
  const grade = String(body.grade || '').trim();
  const tobaccoType = String(body.tobacco_type || '').trim();
  const classificationDate = normalizeIsoDate(body.classification_date);
  const rate = body.rate != null && body.rate !== '' ? Number(body.rate) : null;
  const note = String(body.note || '').trim();

  if (!uniqueCode) return res.status(400).json({ error: 'QR code is required' });
  if (!grade) return res.status(400).json({ error: 'Grade is required' });
  if (!tobaccoType) return res.status(400).json({ error: 'Tobacco type is required' });
  if (!classificationDate) return res.status(400).json({ error: 'Classification date is required' });

  // Look up the bag
  const bagRows = await q('SELECT id, unique_code FROM bags WHERE unique_code = ? LIMIT 1', [uniqueCode]);
  if (bagRows.length === 0) return res.status(404).json({ error: `No bag found with code ${uniqueCode}` });
  const bagId = bagRows[0].id;

  // Verify the QR code has been matched at warehouse level
  const warehouseMatched = await q(
    `SELECT vdi.id FROM vehicle_dispatch_items vdi
     WHERE vdi.unique_code = ? AND vdi.warehouse_scan_status = 'matched'
     LIMIT 1`,
    [uniqueCode]
  );
  if (warehouseMatched.length === 0) {
    return res.status(400).json({ error: `QR code ${uniqueCode} has not been matched at warehouse yet` });
  }

  // Check for duplicate classification entry
  const existing = await q('SELECT id FROM classification_entries WHERE bag_id = ? LIMIT 1', [bagId]);
  if (existing.length > 0) return res.status(409).json({ error: `Bag ${uniqueCode} has already been classified` });

  const result = await q(
    `INSERT INTO classification_entries (bag_id, unique_code, grade, rate, tobacco_type, classification_date, classified_by_employee_id, classified_by_role, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [bagId, uniqueCode, grade, rate, tobaccoType, classificationDate, actorId, actorRole, note]
  );
  const insertedId = result.insertId;
  const [entry] = await q('SELECT * FROM classification_entries WHERE id = ?', [insertedId]);
  res.json(entry);
}));

app.put('/api/classification-entries/:id', withAsync(async (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid entry id' });

  const body = req.body || {};
  assertProcessingRoleOrThrow(body.actor_role);
  const grade = String(body.grade || '').trim();
  const tobaccoType = String(body.tobacco_type || '').trim();
  const classificationDate = normalizeIsoDate(body.classification_date);
  const rate = body.rate != null && body.rate !== '' ? Number(body.rate) : null;
  const note = String(body.note || '').trim();

  if (!grade) return res.status(400).json({ error: 'Grade is required' });
  if (!tobaccoType) return res.status(400).json({ error: 'Tobacco type is required' });
  if (!classificationDate) return res.status(400).json({ error: 'Classification date is required' });

  await q(
    `UPDATE classification_entries SET grade = ?, rate = ?, tobacco_type = ?, classification_date = ?, note = ? WHERE id = ?`,
    [grade, rate, tobaccoType, classificationDate, note, entryId]
  );
  const [updated] = await q('SELECT * FROM classification_entries WHERE id = ?', [entryId]);
  if (!updated) return res.status(404).json({ error: 'Classification entry not found' });
  res.json(updated);
}));

app.delete('/api/classification-entries/:id', withAsync(async (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid entry id' });

  const actorRole = assertProcessingRoleOrThrow(req.query.actor_role || req.body?.actor_role);
  const [entry] = await q('SELECT * FROM classification_entries WHERE id = ?', [entryId]);
  if (!entry) return res.status(404).json({ error: 'Classification entry not found' });

  await q('DELETE FROM classification_entries WHERE id = ?', [entryId]);
  res.json({ success: true, deleted_id: entryId, unique_code: entry.unique_code });
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

// ── EL Grades CRUD ──
app.get('/api/el-grades', withAsync(async (_req, res) => {
  const rows = await q('SELECT * FROM el_grades ORDER BY code ASC');
  res.json(rows);
}));

app.post('/api/el-grades', withAsync(async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const description = String(req.body?.description || '').trim();
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const result = await q('INSERT INTO el_grades (code, description, created_at) VALUES (?, ?, NOW())', [code, description]);
    const rows = await q('SELECT * FROM el_grades WHERE id = ?', [result.insertId]);
    return res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'EL grade code already exists' });
    throw error;
  }
}));

app.put('/api/el-grades/:id', withAsync(async (req, res) => {
  const gradeId = Number(req.params.id);
  const code = String(req.body?.code || '').trim().toUpperCase();
  const description = String(req.body?.description || '').trim();
  if (!code) return res.status(400).json({ error: 'code required' });
  const rows = await q('SELECT * FROM el_grades WHERE id = ? LIMIT 1', [gradeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'EL grade not found' });
  const duplicate = await q('SELECT id FROM el_grades WHERE code = ? AND id <> ? LIMIT 1', [code, gradeId]);
  if (duplicate.length > 0) return res.status(400).json({ error: 'EL grade code already exists' });
  await q('UPDATE el_grades SET code = ?, description = ? WHERE id = ?', [code, description, gradeId]);
  const updated = await q('SELECT * FROM el_grades WHERE id = ?', [gradeId]);
  res.json(updated[0]);
}));

app.delete('/api/el-grades/:id', withAsync(async (req, res) => {
  const gradeId = Number(req.params.id);
  const rows = await q('SELECT * FROM el_grades WHERE id = ? LIMIT 1', [gradeId]);
  if (rows.length === 0) return res.status(404).json({ error: 'EL grade not found' });
  const grade = rows[0];
  const inUse = await q('SELECT COUNT(*) AS total FROM processing_entries WHERE el_grade = ?', [grade.code]);
  if (inUse[0].total > 0) return res.status(400).json({ error: 'EL grade is in use and cannot be deleted' });
  await q('DELETE FROM el_grades WHERE id = ?', [gradeId]);
  res.json({ success: true, grade });
}));

// ── Processing Entries CRUD ──
app.get('/api/processing-entries', withAsync(async (req, res) => {
  const employeeId = normalizeBuyerId(req.query.employee_id);
  const classificationEntryId = normalizeBuyerId(req.query.classification_entry_id);
  const processType = String(req.query.process_type || '').trim().toLowerCase();
  const filters = [];
  const params = [];
  if (employeeId) { filters.push('pe.created_by_employee_id = ?'); params.push(employeeId); }
  if (classificationEntryId) { filters.push('pe.classification_entry_id = ?'); params.push(classificationEntryId); }
  if (processType) { filters.push('pe.process_type = ?'); params.push(processType); }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await q(
    `SELECT pe.*, ce.grade AS classification_grade, ce.tobacco_type, b.fcv, b.buyer_code, b.buyer_name, b.weight AS bag_weight
     FROM processing_entries pe
     LEFT JOIN classification_entries ce ON ce.id = pe.classification_entry_id
     LEFT JOIN bags b ON b.unique_code = pe.unique_code
     ${whereClause}
     ORDER BY pe.created_at DESC`,
    params
  );
  res.json(rows);
}));

app.post('/api/processing-entries', withAsync(async (req, res) => {
  const body = req.body || {};
  const actorRole = assertProcessingRoleOrThrow(body.actor_role);
  const actorId = normalizeBuyerId(body.actor_id);
  const classificationEntryId = Number(body.classification_entry_id);
  const processType = String(body.process_type || '').trim().toLowerCase();
  const bales = Number(body.bales) || 0;
  const weight = Number(body.weight) || 0;
  const elGrade = String(body.el_grade || '').trim().toUpperCase();
  const generateQr = !!body.generate_qr;
  const note = String(body.note || '').trim();

  if (!Number.isFinite(classificationEntryId) || classificationEntryId <= 0) return res.status(400).json({ error: 'Classification entry is required' });
  if (!['butting', 'stripping', 'grading', 'kutcha'].includes(processType)) return res.status(400).json({ error: 'Invalid process type' });
  if (bales <= 0) return res.status(400).json({ error: 'Bales must be greater than 0' });
  if (weight <= 0) return res.status(400).json({ error: 'Weight must be greater than 0' });
  if (!elGrade) return res.status(400).json({ error: 'EL grade is required' });

  // Verify classification entry exists
  const ceRows = await q('SELECT * FROM classification_entries WHERE id = ? LIMIT 1', [classificationEntryId]);
  if (ceRows.length === 0) return res.status(404).json({ error: 'Classification entry not found' });
  const ce = ceRows[0];

  // Verify EL grade exists
  const elGradeRows = await q('SELECT id FROM el_grades WHERE code = ? LIMIT 1', [elGrade]);
  if (elGradeRows.length === 0) return res.status(400).json({ error: `EL grade ${elGrade} does not exist` });

  let generatedQrCodes = null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Optionally generate one QR code per bale
    if (generateQr && bales > 0) {
      const prefix = `PE-${processType.toUpperCase().slice(0, 3)}-`;
      const codes = [];
      for (let i = 0; i < bales; i++) {
        let candidate;
        let attempts = 0;
        do {
          candidate = `${prefix}${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          const [existing] = await conn.query('SELECT id FROM qr_codes WHERE unique_code = ? LIMIT 1', [candidate]);
          if (existing.length === 0) break;
          attempts += 1;
        } while (attempts < 20);
        await conn.query('INSERT INTO qr_codes (unique_code, buyer_id, used, created_at) VALUES (?, NULL, 0, NOW())', [candidate]);
        codes.push(candidate);
      }
      generatedQrCodes = JSON.stringify(codes);
    }

    const [insertResult] = await conn.query(
      `INSERT INTO processing_entries
       (classification_entry_id, unique_code, process_type, bales, weight, el_grade, generated_qr_code, created_by_employee_id, created_by_role, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [classificationEntryId, ce.unique_code, processType, bales, weight, elGrade, generatedQrCodes, actorId, actorRole, note]
    );

    await conn.commit();

    const [entry] = await conn.query('SELECT * FROM processing_entries WHERE id = ?', [insertResult.insertId]);
    res.json(entry[0]);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.delete('/api/processing-entries/:id', withAsync(async (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid entry id' });
  assertProcessingRoleOrThrow(req.query.actor_role || req.body?.actor_role);
  const [entry] = await q('SELECT * FROM processing_entries WHERE id = ?', [entryId]);
  if (!entry) return res.status(404).json({ error: 'Processing entry not found' });
  await q('DELETE FROM processing_entries WHERE id = ?', [entryId]);
  res.json({ success: true, deleted_id: entryId });
}));

app.use((error, _req, res, _next) => {
  if (error.statusCode && Number.isFinite(Number(error.statusCode))) {
    return res.status(Number(error.statusCode)).json({ error: error.message || 'Request failed' });
  }

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

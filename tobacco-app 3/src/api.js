
// src/api.js  –  all backend calls in one place

const BASE = import.meta.env.VITE_API_BASE || '/api';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000);

async function req(method, path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
  if (body) {
    opts.body = JSON.stringify(body);
    if (method === 'POST' || method === 'PUT') {
      console.log('[API DEBUG] POST/PUT', path, 'payload:', body);
    }
  }
  try {
    const res = await fetch(BASE + path, opts);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      if (isJson && data?.error) throw new Error(data.error);
      if (typeof data === 'string' && data.trim()) {
        const cleaned = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(cleaned || `Request failed (${res.status})`);
      }
      throw new Error(`Request failed (${res.status})`);
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please check server/database connection.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
    setBagDeleteInProgress: (id) => req('PUT', `/bags/${id}/set-delete-in-progress`),
  login:            (body)         => req('POST', '/login', body),
  getAdminLogins:   ()             => req('GET',  '/admin-logins'),
  createAdminLogin: (body)         => req('POST', '/admin-logins', body),
  updateAdminLogin: (id, body)     => req('PUT',  `/admin-logins/${id}`, body),
  deleteAdminLogin: (id)           => req('DELETE', `/admin-logins/${id}`),
  getBuyers:        ()             => req('GET',  '/buyers'),
  addBuyer:         (body)         => req('POST', '/buyers', body),
  updateBuyer:      (id, body)     => req('PUT',  `/buyers/${id}`, body),
  setBuyerActive:   (id, isActive) => req('PUT',  `/buyers/${id}`, { is_active: isActive ? 1 : 0 }),
  deleteBuyer:      (id)           => req('DELETE', `/buyers/${id}`),
  getWarehouseEmployees: ()        => req('GET', '/warehouse-employees'),
  addWarehouseEmployee: (body)     => req('POST', '/warehouse-employees', body),
  updateWarehouseEmployee: (id, body) => req('PUT', `/warehouse-employees/${id}`, body),
  setWarehouseEmployeeActive: (id, isActive) => req('PUT', `/warehouse-employees/${id}`, { is_active: isActive ? 1 : 0 }),
  deleteWarehouseEmployee: (id)    => req('DELETE', `/warehouse-employees/${id}`),
  getApfNumbers:    ()             => req('GET',  '/apf-numbers'),
  addApfNumber:     (body)         => req('POST', '/apf-numbers', body),
  updateApfNumber:  (id, body)     => req('PUT',  `/apf-numbers/${id}`, body),
  deleteApfNumber:  (id)           => req('DELETE', `/apf-numbers/${id}`),
  getTobaccoTypes:  ()             => req('GET',  '/tobacco-types'),
  addTobaccoType:   (body)         => req('POST', '/tobacco-types', body),
  updateTobaccoType:(id, body)     => req('PUT',  `/tobacco-types/${id}`, body),
  deleteTobaccoType:(id)           => req('DELETE', `/tobacco-types/${id}`),
  getPurchaseLocations:  ()            => req('GET',  '/purchase-locations'),
  addPurchaseLocation:   (body)        => req('POST', '/purchase-locations', body),
  updatePurchaseLocation:(id, body)    => req('PUT',  `/purchase-locations/${id}`, body),
  deletePurchaseLocation:(id)          => req('DELETE', `/purchase-locations/${id}`),
  getGrades:        (type)         => req('GET',  `/grades${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  addGrade:         (body)         => req('POST', '/grades', body),
  updateGrade:      (id, body)     => req('PUT',  `/grades/${id}`, body),
  deleteGrade:      (id)           => req('DELETE', `/grades/${id}`),
  getClassificationGrades:    ()             => req('GET',  '/classification-grades'),
  addClassificationGrade:     (body)         => req('POST', '/classification-grades', body),
  updateClassificationGrade:  (id, body)     => req('PUT',  `/classification-grades/${id}`, body),
  deleteClassificationGrade:  (id)           => req('DELETE', `/classification-grades/${id}`),
  // EL Grades
  getElGrades:               ()             => req('GET',  '/el-grades'),
  addElGrade:                (body)         => req('POST', '/el-grades', body),
  updateElGrade:             (id, body)     => req('PUT',  `/el-grades/${id}`, body),
  deleteElGrade:             (id)           => req('DELETE', `/el-grades/${id}`),
  // Processing Entries
  getProcessingEntries: (query = {}) => {
    const params = new URLSearchParams();
    if (query.employee_id) params.set('employee_id', String(query.employee_id));
    if (query.classification_entry_id) params.set('classification_entry_id', String(query.classification_entry_id));
    if (query.process_type) params.set('process_type', String(query.process_type));
    const q = params.toString();
    return req('GET', `/processing-entries${q ? `?${q}` : ''}`);
  },
  saveProcessingEntry:  (body) => req('POST', '/processing-entries', body),
  deleteProcessingEntry: (id, query = {}) => {
    const params = new URLSearchParams();
    if (query.actor_role) params.set('actor_role', String(query.actor_role));
    const q = params.toString();
    return req('DELETE', `/processing-entries/${id}${q ? `?${q}` : ''}`);
  },
  getQRCodes:       ()             => req('GET',  '/qrcodes'),
  generateQR:       (body)         => req('POST', '/qrcodes/generate', body),
  assignQR:         (id, buyerId)  => req('PUT',  `/qrcodes/${id}/assign`, { buyerId }),
  deleteQRCode:     (id)           => req('DELETE', `/qrcodes/${id}`),
  markQRCodeUsed:   (uniqueCode, buyerId) => req('PUT', '/qrcodes/mark-used', { uniqueCode, buyerId }),
  validateCode:     (code)         => req('GET',  `/qrcodes/validate/${encodeURIComponent(code)}`),
  trackQRCode:      (code)         => req('GET',  `/qrcodes/track/${encodeURIComponent(code)}`),
  getVehicleDispatches: (buyerId, warehouseEmployeeId) => {
    const params = new URLSearchParams();
    if (buyerId) params.set('buyer_id', String(buyerId));
    if (warehouseEmployeeId) params.set('warehouse_employee_id', String(warehouseEmployeeId));
    const query = params.toString();
    return req('GET', `/vehicle-dispatches${query ? `?${query}` : ''}`);
  },
  getVehicleDispatchById:(id)       => req('GET', `/vehicle-dispatches/${id}`),
  getEligibleVehicleQRCodes: (buyerId) => req('GET', `/vehicle-dispatches/eligible-qrcodes/${buyerId}`),
  createVehicleDispatch: (body)     => req('POST', '/vehicle-dispatches', body),
  sendVehicleDispatchToWarehouse: (id, body) => req('PUT', `/vehicle-dispatches/${id}/send-to-warehouse`, body),
  confirmVehicleDispatch: (id, body) => req('PUT', `/vehicle-dispatches/${id}/warehouse-confirmation`, body),
  scanVehicleDispatchQRCode: (id, body) => req('POST', `/vehicle-dispatches/${id}/scan`, body),
  getProcessingStages: () => req('GET', '/processing/stages'),
  getProcessingBatches: (query = {}) => {
    const params = new URLSearchParams();
    if (query.date) params.set('date', String(query.date));
    if (query.stage_key) params.set('stage_key', String(query.stage_key));
    if (query.status) params.set('status', String(query.status));
    const q = params.toString();
    return req('GET', `/processing/batches${q ? `?${q}` : ''}`);
  },
  getProcessingBatchById: (id) => req('GET', `/processing/batches/${id}`),
  createProcessingBatch: (body) => req('POST', '/processing/batches', body),
  addProcessingBatchItems: (id, body) => req('POST', `/processing/batches/${id}/items`, body),
  removeProcessingBatchItem: (batchId, itemId, query = {}) => {
    const params = new URLSearchParams();
    if (query.actor_role) params.set('actor_role', String(query.actor_role));
    if (query.actor_id) params.set('actor_id', String(query.actor_id));
    const q = params.toString();
    return req('DELETE', `/processing/batches/${batchId}/items/${itemId}${q ? `?${q}` : ''}`);
  },
  updateProcessingStage: (batchId, stageKey, body) => req('PUT', `/processing/batches/${batchId}/stages/${encodeURIComponent(stageKey)}`, body),
  getDailyProcessingProgress: (date) => req('GET', `/processing/daily-progress${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  createProcessingExportBags: (batchId, body) => req('POST', `/processing/batches/${batchId}/export-bags`, body),
  // Classification entries
  getClassificationEntries: (query = {}) => {
    const params = new URLSearchParams();
    if (query.employee_id) params.set('employee_id', String(query.employee_id));
    if (query.date) params.set('date', String(query.date));
    const q = params.toString();
    return req('GET', `/classification-entries${q ? `?${q}` : ''}`);
  },
  saveClassificationEntry: (body) => req('POST', '/classification-entries', body),
  updateClassificationEntry: (id, body) => req('PUT', `/classification-entries/${id}`, body),
  deleteClassificationEntry: (id, query = {}) => {
    const params = new URLSearchParams();
    if (query.actor_role) params.set('actor_role', String(query.actor_role));
    const q = params.toString();
    return req('DELETE', `/classification-entries/${id}${q ? `?${q}` : ''}`);
  },
  getBags:          (buyerId)      => req('GET',  `/bags${buyerId ? `?buyer_id=${buyerId}` : ''}`),
  saveBag:          (body)         => req('POST', '/bags', body),
  updateBag:        (id, body)     => req('PUT',  `/bags/${id}`, body),
  addBagToDispatchList:(id, body)  => req('PUT',  `/bags/${id}/add-to-dispatch-list`, body),
  deleteBag:        (id)           => req('DELETE', `/bags/${id}`),
  // Delete bag by unique_code (QR code)
  deleteBagByCode:  (uniqueCode)   => req('DELETE', `/bags/by-code/${encodeURIComponent(uniqueCode)}`),
  // Unassign QR code (set to available)
  unassignQRCode:   (uniqueCode)   => req('PUT', `/qrcodes/unassign/${encodeURIComponent(uniqueCode)}`),
  getBuyerBagActionSetting: ()     => req('GET',  '/settings/buyer-bag-actions'),
  updateBuyerBagActionSetting: (body) => req('PUT', '/settings/buyer-bag-actions', body),
  getStats:         ()             => req('GET',  '/stats'),
  // DB viewer
  getDbTables:      ()             => req('GET',  '/db/tables'),
  getDbTable:       (name)         => req('GET',  `/db/table/${name}`),
  runDbQuery:       (sql)          => req('GET',  `/db/query?sql=${encodeURIComponent(sql)}`),
  registerUser: (body) => req('POST', '/register-user', body),
  // Registration requests (admin review)
  getRegistrationRequests: () => req('GET', '/registration-requests'),
  approveRegistrationRequest: (id, body) => req('POST', `/registration-requests/${id}/approve`, body),
  denyRegistrationRequest: (id, body) => req('POST', `/registration-requests/${id}/deny`, body),
  // Deleted Purchase History
  getDeletedBags: (buyerId) => req('GET', `/deleted-bags?buyer_id=${buyerId}`),
  addDeletedBag: (body) => req('POST', '/deleted-bags', body),
  deleteDeletedBag: (id) => req('DELETE', `/deleted-bags/${id}`),
  restoreDeletedBags: (ids) => req('POST', '/deleted-bags/restore', { ids }),
};

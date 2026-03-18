// src/api.js  –  all backend calls in one place

const BASE = import.meta.env.VITE_API_BASE || '/api';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000);

async function req(method, path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const opts = { method, headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
  if (body) opts.body = JSON.stringify(body);
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
  login:            (body)         => req('POST', '/login', body),
  getAdminLogins:   ()             => req('GET',  '/admin-logins'),
  createAdminLogin: (body)         => req('POST', '/admin-logins', body),
  updateAdminLogin: (id, body)     => req('PUT',  `/admin-logins/${id}`, body),
  deleteAdminLogin: (id)           => req('DELETE', `/admin-logins/${id}`),
  getBuyers:        ()             => req('GET',  '/buyers'),
  addBuyer:         (body)         => req('POST', '/buyers', body),
  updateBuyer:      (id, body)     => req('PUT',  `/buyers/${id}`, body),
  deleteBuyer:      (id)           => req('DELETE', `/buyers/${id}`),
  getWarehouseEmployees: ()        => req('GET', '/warehouse-employees'),
  addWarehouseEmployee: (body)     => req('POST', '/warehouse-employees', body),
  updateWarehouseEmployee: (id, body) => req('PUT', `/warehouse-employees/${id}`, body),
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
  getBags:          (buyerId)      => req('GET',  `/bags${buyerId ? `?buyer_id=${buyerId}` : ''}`),
  saveBag:          (body)         => req('POST', '/bags', body),
  updateBag:        (id, body)     => req('PUT',  `/bags/${id}`, body),
  addBagToDispatchList:(id, body)  => req('PUT',  `/bags/${id}/add-to-dispatch-list`, body),
  deleteBag:        (id)           => req('DELETE', `/bags/${id}`),
  getBuyerBagActionSetting: ()     => req('GET',  '/settings/buyer-bag-actions'),
  updateBuyerBagActionSetting: (body) => req('PUT', '/settings/buyer-bag-actions', body),
  getStats:         ()             => req('GET',  '/stats'),
  // DB viewer
  getDbTables:      ()             => req('GET',  '/db/tables'),
  getDbTable:       (name)         => req('GET',  `/db/table/${name}`),
  runDbQuery:       (sql)          => req('GET',  `/db/query?sql=${encodeURIComponent(sql)}`),
};

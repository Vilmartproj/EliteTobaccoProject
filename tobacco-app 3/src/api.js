// src/api.js  –  all backend calls in one place

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(BASE + path, opts);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      // Handle different error scenarios consistently
      if (isJson && data?.error) {
        throw new Error(data.error);
      }
      if (typeof data === 'string' && data.trim()) {
        const cleaned = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(cleaned || `Request failed (${res.status})`);
      }
      // Handle HTTP error status codes with meaningful messages
      switch (res.status) {
        case 400:
          throw new Error('Bad request - Please check your input data');
        case 401:
          throw new Error('Unauthorized - Please check your credentials');
        case 403:
          throw new Error('Forbidden - You do not have permission to perform this action');
        case 404:
          throw new Error('Not found - The requested resource does not exist');
        case 409:
          throw new Error('Conflict - The resource already exists or is in use');
        case 422:
          throw new Error('Unprocessable entity - The data format is invalid');
        case 500:
          throw new Error('Server error - Please try again later');
        default:
          throw new Error(`Request failed (${res.status})`);
      }
    }

    return data;
  } catch (error) {
    // Re-throw known errors, wrap unknown errors
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error - Please check your connection');
  }
}

export const api = {
  login:            (body)         => req('POST', '/login', body),
  getBuyers:        ()             => req('GET',  '/buyers'),
  addBuyer:         (body)         => req('POST', '/buyers', body),
  deleteBuyer:      (id)           => req('DELETE', `/buyers/${id}`),
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
  validateCode:     (code)         => req('GET',  `/qrcodes/validate/${encodeURIComponent(code)}`),
  trackQRCode:      (code)         => req('GET',  `/qrcodes/track/${encodeURIComponent(code)}`),
  getBags:          (buyerId)      => req('GET',  `/bags${buyerId ? `?buyer_id=${buyerId}` : ''}`),
  saveBag:          (body)         => req('POST', '/bags', body),
  updateBag:        (id, body)     => req('PUT',  `/bags/${id}`, body),
  deleteBag:        (id)           => req('DELETE', `/bags/${id}`),
  getBuyerBagActionSetting: ()     => req('GET',  '/settings/buyer-bag-actions'),
  updateBuyerBagActionSetting: (body) => req('PUT', '/settings/buyer-bag-actions', body),
  getStats:         ()             => req('GET',  '/stats'),
  // DB viewer
  getDbTables:      ()             => req('GET',  '/db/tables'),
  getDbTable:       (name)         => req('GET',  `/db/table/${name}`),
  runDbQuery:       (sql)          => req('GET',  `/db/query?sql=${encodeURIComponent(sql)}`),
  
  // Buying List and Invoice
  getBuyingList:    (queryString)         => req('GET',  `/buying-list${queryString ? `?${queryString}` : ''}`),
  generateInvoice:  (body)         => req('POST', '/invoices', body),
  getInvoices:      (buyerId)      => req('GET',  `/invoices${buyerId ? `?buyer_id=${buyerId}` : ''}`),
  getInvoiceItems:  (invoiceId)    => req('GET',  `/invoices/${invoiceId}/items`),
  removeInvoiceItem: (invoiceId, itemId, body) => req('PUT', `/invoices/${invoiceId}/items/${itemId}/remove`, body),
  updateBagStatus:  (qrNumber, body) => req('PUT', `/bags/${qrNumber}/status`, body),
  
  // Dispatch Module
  createDispatch:   (body)         => req('POST', '/dispatch', body),
  completeDispatch: (body)         => req('PUT', '/dispatch/complete', body),
  getDispatches:    ()             => req('GET',  '/dispatch'),
  
  // Warehouse Module
  getLoadBundles:   ()             => req('GET',  '/load-bundles'),
  getWarehouseUsers:()             => req('GET',  '/warehouse-users'),
  getReviewTasks:   ()             => req('GET',  '/review-tasks'),
  getUserReviewTasks:(userId)       => req('GET',  `/review-tasks/user/${userId}`),
  assignReviewTask: (body)         => req('POST', '/review-tasks', body),
  updateReviewTaskStatus:(taskId, body) => req('PUT', `/review-tasks/${taskId}/status`, body),
};

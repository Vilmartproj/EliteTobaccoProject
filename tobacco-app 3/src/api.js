// src/api.js  –  all backend calls in one place

const BASE = '/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
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
}

export const api = {
  login:            (body)         => req('POST', '/login', body),
  getBuyers:        ()             => req('GET',  '/buyers'),
  addBuyer:         (body)         => req('POST', '/buyers', body),
  deleteBuyer:      (id)           => req('DELETE', `/buyers/${id}`),
  getGrades:        (type)         => req('GET',  `/grades${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  addGrade:         (body)         => req('POST', '/grades', body),
  updateGrade:      (id, body)     => req('PUT',  `/grades/${id}`, body),
  deleteGrade:      (id)           => req('DELETE', `/grades/${id}`),
  getQRCodes:       ()             => req('GET',  '/qrcodes'),
  generateQR:       (body)         => req('POST', '/qrcodes/generate', body),
  assignQR:         (id, buyerId)  => req('PUT',  `/qrcodes/${id}/assign`, { buyerId }),
  deleteQRCode:     (id)           => req('DELETE', `/qrcodes/${id}`),
  validateCode:     (code)         => req('GET',  `/qrcodes/validate/${code}`),
  getBags:          (buyerId)      => req('GET',  `/bags${buyerId ? `?buyer_id=${buyerId}` : ''}`),
  saveBag:          (body)         => req('POST', '/bags', body),
  updateBag:        (id, body)     => req('PUT',  `/bags/${id}`, body),
  deleteBag:        (id)           => req('DELETE', `/bags/${id}`),
  getStats:         ()             => req('GET',  '/stats'),
  // DB viewer
  getDbTables:      ()             => req('GET',  '/db/tables'),
  getDbTable:       (name)         => req('GET',  `/db/table/${name}`),
  runDbQuery:       (sql)          => req('GET',  `/db/query?sql=${encodeURIComponent(sql)}`),
};

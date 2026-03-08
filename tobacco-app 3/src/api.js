// src/api.js  –  all backend calls in one place

const BASE = '/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login:            (body)         => req('POST', '/login', body),
  getBuyers:        ()             => req('GET',  '/buyers'),
  addBuyer:         (body)         => req('POST', '/buyers', body),
  getQRCodes:       ()             => req('GET',  '/qrcodes'),
  generateQR:       (body)         => req('POST', '/qrcodes/generate', body),
  assignQR:         (id, buyerId)  => req('PUT',  `/qrcodes/${id}/assign`, { buyerId }),
  validateCode:     (code)         => req('GET',  `/qrcodes/validate/${code}`),
  getBags:          (buyerId)      => req('GET',  `/bags${buyerId ? `?buyer_id=${buyerId}` : ''}`),
  saveBag:          (body)         => req('POST', '/bags', body),
  getStats:         ()             => req('GET',  '/stats'),
  // DB viewer
  getDbTables:      ()             => req('GET',  '/db/tables'),
  getDbTable:       (name)         => req('GET',  `/db/table/${name}`),
  runDbQuery:       (sql)          => req('GET',  `/db/query?sql=${encodeURIComponent(sql)}`),
};

// src/utils/generateInvoice.js
// Generates a print-ready invoice in a new window based on filtered bag data.

import { formatDateTime } from './dateFormat';

function formatINR(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function invoiceNumber() {
  return `INV-${Date.now()}`;
}

/**
 * @param {Array}  bags          - The filtered bag rows to invoice
 * @param {object} opts
 * @param {string} opts.buyerName     - Selected buyer name (or empty for all)
 * @param {string} opts.buyerCode     - Selected buyer code (or empty)
 * @param {string} opts.dateFrom      - ISO date string yyyy-mm-dd (or empty)
 * @param {string} opts.dateTo        - ISO date string yyyy-mm-dd (or empty)
 * @param {function} opts.getBagDate  - (bag) => display date string
 * @param {string} opts.vehicleNumber - Vehicle number for transport invoice (optional)
 * @param {string} opts.customTitle   - Override invoice title (optional)
 */
export function generateInvoice(bags, { buyerName, buyerCode, dateFrom, dateTo, getBagDate, vehicleNumber, customTitle } = {}) {
  if (!bags || bags.length === 0) {
    alert('No data to generate invoice. Please adjust your filters.');
    return;
  }

  const totalBags = bags.length;
  const totalWeight = bags.reduce((s, b) => s + (Number.isFinite(Number(b.weight)) ? Number(b.weight) : 0), 0);
  const totalValue = bags.reduce((s, b) => {
    const bv = Number.isFinite(Number(b.bale_value)) ? Number(b.bale_value)
      : (Number.isFinite(Number(b.weight)) && Number.isFinite(Number(b.rate)) ? Number(b.weight) * Number(b.rate) : 0);
    return s + bv;
  }, 0);

  const formatDateDisplay = (isoDate) => {
    if (!isoDate) return '';
    const [yyyy, mm, dd] = isoDate.split('-');
    return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : isoDate;
  };

  const invoiceRows = bags.map((b) => {
    const baleValue = Number.isFinite(Number(b.bale_value))
      ? Number(b.bale_value)
      : (Number.isFinite(Number(b.weight)) && Number.isFinite(Number(b.rate))
        ? Number(b.weight) * Number(b.rate) : null);
    return `
      <tr>
        <td>${b.buyer_code || '—'}</td>
        <td>${b.buyer_name || '—'}</td>
        <td class="mono">${b.unique_code || '—'}</td>
        <td>${b.apf_number || '—'}</td>
        <td>${b.tobacco_grade || '—'}</td>
        <td>${b.type_of_tobacco || '—'}</td>
        <td>${b.purchase_location || '—'}</td>
        <td>${getBagDate ? getBagDate(b) : (b.purchase_date || '—')}</td>
        <td>${b.buyer_grade || '—'}</td>
        <td class="num">${b.weight != null ? `${b.weight} kg` : '—'}</td>
        <td class="num">${b.rate != null ? b.rate : '—'}</td>
        <td class="num">${baleValue != null ? formatINR(baleValue) : '—'}</td>
        <td>${b.fcv || '—'}</td>
      </tr>`;
  }).join('');

  const periodLine = (dateFrom || dateTo)
    ? `Period: ${dateFrom ? formatDateDisplay(dateFrom) : '—'} to ${dateTo ? formatDateDisplay(dateTo) : '—'}`
    : 'Period: All dates';

  const billTo = (buyerCode || buyerName)
    ? `${buyerCode ? buyerCode + ' — ' : ''}${buyerName || ''}`
    : 'All Buyers';

  const invoiceTitle = String(customTitle || 'Invoice');

  const invNo = invoiceNumber();
  const invDate = today();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${invoiceTitle} ${invNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 28px 32px; }

    /* ─── Header ─── */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d62839; padding-bottom: 14px; margin-bottom: 18px; }
    .company-name { font-size: 24px; font-weight: 900; color: #d62839; letter-spacing: 1px; }
    .company-sub  { font-size: 11px; color: #555; margin-top: 4px; }
    .inv-meta     { text-align: right; }
    .inv-title    { font-size: 20px; font-weight: 800; color: #1a1a1a; text-transform: uppercase; letter-spacing: 2px; }
    .inv-detail   { font-size: 11px; color: #444; margin-top: 6px; line-height: 1.7; }
    .inv-detail b { color: #1a1a1a; }

    /* ─── Bill + Period ─── */
    .inv-info     { display: flex; gap: 30px; margin-bottom: 18px; flex-wrap: wrap; }
    .inv-box      { background: #fff7f8; border: 1px solid #ffd0d6; border-radius: 8px; padding: 10px 16px; min-width: 200px; flex: 1; }
    .inv-box-title{ font-size: 10px; font-weight: 800; text-transform: uppercase; color: #d62839; letter-spacing: 0.8px; margin-bottom: 4px; }
    .inv-box-value{ font-size: 13px; font-weight: 700; color: #1a1a1a; }

    /* ─── Summary badges ─── */
    .summary      { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
    .badge        { background: #fff1f3; border: 1px solid #ffd0d6; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 800; color: #d62839; white-space: nowrap; }
    .badge span   { color: #1a1a1a; }

    /* ─── Table ─── */
    table         { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px; }
    thead th      { background: #d62839; color: #fff; font-weight: 800; padding: 8px 7px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.4px; border: 1px solid #c81c30; }
    tbody tr:nth-child(even) { background: #fff7f8; }
    tbody tr:hover { background: #ffe8ec; }
    tbody td      { padding: 6px 7px; border: 1px solid #ffe2e7; vertical-align: middle; }
    .mono         { font-family: 'Consolas', monospace; font-weight: 700; }
    .num          { text-align: right; font-weight: 700; }
    tfoot td      { background: #fff1f3; font-weight: 800; border: 1px solid #ffd0d6; padding: 8px 7px; }
    tfoot .num    { color: #d62839; font-size: 13px; }

    /* ─── Footer ─── */
    .inv-footer   { border-top: 1px solid #ffd0d6; padding-top: 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; }
    .generated    { font-size: 10px; color: #888; }
    .signature    { text-align: right; }
    .sig-line     { width: 200px; border-top: 1px solid #888; margin-top: 36px; margin-left: auto; font-size: 10px; color: #666; text-align: center; padding-top: 4px; }

    /* ─── Print button (not printed) ─── */
    .print-btn { position: fixed; top: 16px; right: 16px; background: #d62839; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 8px rgba(214,40,57,0.3); z-index: 999; }
    @media print {
      .print-btn { display: none; }
      body { padding: 8mm 10mm; }
      table { font-size: 10px; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>

  <div class="inv-header">
    <div>
      <div class="company-name">🌿 Elite Tobacco</div>
      <div class="company-sub">Tobacco Purchase Management System</div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">${invoiceTitle}</div>
      <div class="inv-detail">
        <b>Invoice #:</b> ${invNo}<br/>
        <b>Date:</b> ${invDate}
      </div>
    </div>
  </div>

  <div class="inv-info">
    <div class="inv-box">
      <div class="inv-box-title">Bill To</div>
      <div class="inv-box-value">${billTo}</div>
    </div>
    <div class="inv-box">
      <div class="inv-box-title">Period</div>
      <div class="inv-box-value">${periodLine}</div>
    </div>
    <div class="inv-box">
      <div class="inv-box-title">Invoice Date</div>
      <div class="inv-box-value">${invDate}</div>
    </div>
    ${vehicleNumber ? `<div class="inv-box"><div class="inv-box-title">Vehicle Number</div><div class="inv-box-value">${vehicleNumber}</div></div>` : ''}
  </div>

  <div class="summary">
    <div class="badge">Total Bags: <span>${totalBags}</span></div>
    <div class="badge">Total Weight: <span>${totalWeight.toFixed(2)} kg</span></div>
    <div class="badge">Total Purchase Value: <span>${formatINR(totalValue)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Buyer</th>
        <th>Name</th>
        <th>Code</th>
        <th>APF</th>
        <th>TB Grade</th>
        <th>Type</th>
        <th>Location</th>
        <th>Purchase Date</th>
        <th>Buyer Grade</th>
        <th>Weight</th>
        <th>Rate</th>
        <th>Bale Value</th>
        <th>FCV</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="9" style="text-align:right; font-weight:800;">TOTAL</td>
        <td class="num">${totalWeight.toFixed(2)} kg</td>
        <td></td>
        <td class="num">${formatINR(totalValue)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="inv-footer">
    <div class="generated">
      Generated: ${formatDateTime(new Date())}<br/>
      Total Records: ${totalBags}
    </div>
    <div class="signature">
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=850');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site to generate invoices.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

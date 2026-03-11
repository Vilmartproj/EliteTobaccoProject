// src/utils/printQR.js
import { formatDateTime } from './dateFormat';

export function printQRCodes(qrList, buyerMap) {
  const items = qrList.map((q) => {
    const canvas = document.querySelector(`canvas[data-qrcode="${q.unique_code}"]`);
    const img    = canvas ? canvas.toDataURL('image/png') : '';
    const buyer  = q.buyer_id ? buyerMap[q.buyer_id] : null;
    return { code: q.unique_code, img, buyerCode: buyer?.code || '', buyerName: buyer?.name || 'Unassigned', used: q.used };
  });

  const win = window.open('', '_blank', 'width=950,height=750');
  if (!win) { alert('Please allow pop-ups to print QR codes'); return; }

  win.document.write(`<!DOCTYPE html><html><head>
    <title>QR Codes – Elite Tobacco</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body  { font-family: Arial, sans-serif; background:#fff; margin:0; }
      h2    { text-align:center; color:#c0392b; font-size:18px; margin-bottom:2px; }
      .sub  { text-align:center; color:#888; font-size:11px; margin-bottom:18px; }
      .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
      .card { border:1.5px solid #e0c0bc; border-radius:8px; padding:10px; text-align:center; page-break-inside:avoid; }
      .card img  { width:110px; height:110px; display:block; margin:0 auto; }
      .code { font-weight:bold; font-size:15px; color:#c0392b; margin-top:6px; }
      .buyer{ font-size:10px; color:#555; margin-top:2px; }
      .used { opacity:0.4; }
      .avail{ color:#2e7d32; font-weight:bold; }
      .usedlbl{ color:#c0392b; font-weight:bold; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style>
  </head><body>
    <h2>🌿 Elite Tobacco – QR Codes</h2>
      <p class="sub">Printed: ${formatDateTime(new Date())} &nbsp;·&nbsp; Total: ${items.length}</p>
    <div class="grid">
      ${items.map(it => `
        <div class="card ${it.used ? 'used' : ''}">
          ${it.img
            ? `<img src="${it.img}" />`
            : `<div style="width:110px;height:110px;border:1px solid #ccc;line-height:110px;margin:auto;color:#aaa;font-size:11px;">No preview</div>`}
          <div class="code">${it.code}</div>
          <div class="buyer">${it.buyerCode ? `${it.buyerCode} – ${it.buyerName}` : 'Unassigned'}</div>
          <div class="${it.used ? 'usedlbl' : 'avail'}">${it.used ? '● Used' : '● Available'}</div>
        </div>`).join('')}
    </div>
    <script>window.onload = () => window.print();<\/script>
  </body></html>`);
  win.document.close();
}

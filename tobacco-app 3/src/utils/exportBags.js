import { formatDateTime } from './dateFormat';

const columns = [
  { key: 'buyer_code', label: 'Buyer' },
  { key: 'buyer_name', label: 'Name' },
  { key: 'unique_code', label: 'Code' },
  { key: 'apf_number', label: 'APF' },
  { key: 'tobacco_grade', label: 'Grade' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'date_of_purchase', label: 'Date' },
  { key: 'purchase_location', label: 'Location' },
  { key: 'fcv', label: 'FCV' },
];

const pdfColumns = [
  { key: 'buyer_code', label: 'Buyer' },
  { key: 'buyer_name', label: 'Name' },
  { key: 'unique_code', label: 'Code' },
  { key: 'apf_number', label: 'APF' },
  { key: 'tobacco_grade', label: 'TB Grade' },
  { key: 'type_of_tobacco', label: 'Type' },
  { key: 'purchase_location', label: 'Location' },
  { key: 'purchase_date', label: 'Purchase Date' },
  { key: 'buyer_grade', label: 'Buyer Grade' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'rate', label: 'Rate' },
  { key: 'bale_value', label: 'Bale Value' },
  { key: 'date_of_purchase', label: 'Date & Time' },
  { key: 'fcv', label: 'FCV' },
];

const mapRows = (rows = []) => rows.map((row) => ({
  buyer_code: row.buyer_code || '',
  buyer_name: row.buyer_name || '',
  unique_code: row.unique_code || '',
  apf_number: row.apf_number || '',
  tobacco_grade: row.tobacco_grade || '',
  type_of_tobacco: row.type_of_tobacco || '',
  purchase_location: row.purchase_location || '',
  purchase_date: row.purchase_date || '',
  buyer_grade: row.buyer_grade || '',
  weight: row.weight ?? '',
  rate: row.rate ?? '',
  bale_value: row.bale_value ?? '',
  date_of_purchase: formatDateTime(row.date_of_purchase),
  fcv: row.fcv || '',
}));

export function exportBagsXLS(rows, filename = 'all_bags.xls') {
  if (!rows?.length) return;
  const normalized = mapRows(rows);
  const headers = columns.map((column) => column.label).join('\t');
  const body = normalized
    .map((row) => columns.map((column) => row[column.key]).join('\t'))
    .join('\n');

  const content = `${headers}\n${body}`;
  const blob = new Blob([`\uFEFF${content}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportBagsPDF(rows, title = 'All Bags Report') {
  if (!rows?.length) return;
  const normalized = mapRows(rows);

  const printableRows = normalized.map((row) => `
    <tr>
      ${pdfColumns.map((column) => `<td>${row[column.key]}</td>`).join('')}
    </tr>
  `).join('');

  const totalWeight = normalized.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
          h2 { margin: 0 0 4px 0; }
          .meta { margin-bottom: 14px; color: #555; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <div class="meta">Generated: ${formatDateTime(new Date())} | Bags: ${normalized.length} | Total Weight: ${totalWeight.toFixed(2)} kg</div>
        <table>
          <thead>
            <tr>${pdfColumns.map((column) => `<th>${column.label}</th>`).join('')}</tr>
          </thead>
          <tbody>${printableRows}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function shareBagsWhatsApp(rows) {
  if (!rows?.length) return;
  const normalized = mapRows(rows);
  const totalWeight = normalized.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  const sample = normalized.slice(0, 20);

  const lines = [
    'Elite Tobacco - All Bags Summary',
    `Generated: ${formatDateTime(new Date())}`,
    `Total Bags: ${normalized.length}`,
    `Total Weight: ${totalWeight.toFixed(2)} kg`,
    '',
    ...sample.map((row, index) => `${index + 1}. ${row.buyer_code} | ${row.unique_code} | ${row.weight}kg | ${row.date_of_purchase}`),
  ];

  if (normalized.length > sample.length) {
    lines.push(`...and ${normalized.length - sample.length} more bags`);
  }

  const url = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank');
}

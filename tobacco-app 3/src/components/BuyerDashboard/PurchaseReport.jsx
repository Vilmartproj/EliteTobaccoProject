import { useState } from 'react';

const compareBy = (aValue, bValue, direction) => {
  const order = direction === 'asc' ? 1 : -1;
  const aNum = Number(aValue);
  const bNum = Number(bValue);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return (aNum - bNum) * order;
  const aDate = Date.parse(aValue);
  const bDate = Date.parse(bValue);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return (aDate - bDate) * order;
  return String(aValue ?? '').localeCompare(String(bValue ?? ''), undefined, { numeric: true }) * order;
};

const toggleSort = (sortState, setSortState, key) => {
  if (sortState.key === key) {
    setSortState({ key, direction: sortState.direction === 'asc' ? 'desc' : 'asc' });
    return;
  }
  setSortState({ key, direction: 'asc' });
};

const getRowDateForRange = (row) => {
  const raw = row.purchase_date || row.date_of_purchase;
  if (!raw) return null;
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

export default function PurchaseReport({ bags, S, buyerTitleColor, formatPurchaseDateDash }) {
  const [reportSort, setReportSort] = useState({ key: 'purchase_date', direction: 'desc' });
  const [selectedReportDateFrom, setSelectedReportDateFrom] = useState('');
  const [selectedReportDateTo, setSelectedReportDateTo] = useState('');

  const SortableTh = ({ label, sortKey, sortState, onSort }) => (
    <th
      style={{ ...S.th, cursor: 'pointer', userSelect: 'none', fontWeight: 700 }}
      onClick={() => onSort(sortKey)}
      title="Click to sort"
    >
      {label}{sortState.key === sortKey ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const dateFromStr = selectedReportDateFrom ? String(selectedReportDateFrom).slice(0, 10) : null;
  const dateToStr = selectedReportDateTo ? String(selectedReportDateTo).slice(0, 10) : null;

  const filteredReportRows = bags.filter((row) => {
    if (!selectedReportDateFrom && !selectedReportDateTo) return true;
    const rowDate = getRowDateForRange(row);
    if (!rowDate) return false;
    if (dateFromStr && rowDate < dateFromStr) return false;
    if (dateToStr && rowDate > dateToStr) return false;
    return true;
  });

  const totalBaleValue = filteredReportRows.reduce(
    (sum, row) => sum + (Number.isFinite(Number(row.bale_value))
      ? Number(row.bale_value)
      : (Number(row.weight) * Number(row.rate) || 0)),
    0
  );
  const totalWeight = filteredReportRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);

  const sortedReportRows = [...filteredReportRows].sort((a, b) =>
    compareBy(a?.[reportSort.key], b?.[reportSort.key], reportSort.direction)
  );

  return (
    <div style={S.card}>
      {/* Header: date filters + totals */}
      <div style={{
        background: '#f0f7ff',
        border: '1.5px solid #b7d9f8',
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* Left: title + date pickers */}
        <div>
          <div style={{ ...S.subheading, color: buyerTitleColor, marginBottom: 14 }}>
            Purchase Report ({sortedReportRows.length})
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={S.label}>From Date</label>
              <input
                style={{ ...S.input, marginBottom: 0, fontWeight: 400 }}
                type="date"
                value={selectedReportDateFrom}
                onChange={(e) => setSelectedReportDateFrom(e.target.value)}
              />
              {!!selectedReportDateFrom && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#5b6f86' }}>
                  Selected: {formatPurchaseDateDash(selectedReportDateFrom)}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={S.label}>To Date</label>
              <input
                style={{ ...S.input, marginBottom: 0, fontWeight: 400 }}
                type="date"
                value={selectedReportDateTo}
                onChange={(e) => setSelectedReportDateTo(e.target.value)}
              />
              {!!selectedReportDateTo && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#5b6f86' }}>
                  Selected: {formatPurchaseDateDash(selectedReportDateTo)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-start', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', textAlign: 'right' }}>
            <div style={{ ...S.label, marginBottom: 4 }}>TOTAL PURCHASE VALUE</div>
            <span style={{ ...S.badge('green'), fontSize: 15, fontWeight: 800, padding: '8px 14px', display: 'inline-block' }}>
              ₹ {totalBaleValue.toFixed(2)}
            </span>
          </div>
          <div style={{ width: '100%', textAlign: 'right' }}>
            <div style={{ ...S.label, marginBottom: 4 }}>TOTAL WEIGHT</div>
            <span style={{ ...S.badge(), fontSize: 15, fontWeight: 800, padding: '8px 14px', display: 'inline-block' }}>
              {totalWeight.toFixed(2)} kg
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {sortedReportRows.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>
          No purchases available for selected date.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <SortableTh label="Code" sortKey="unique_code" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="Purchase Date" sortKey="purchase_date" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="Dispatch" sortKey="vehicle_dispatch_number" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="Invoice" sortKey="dispatch_invoice_number" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="Weight" sortKey="weight" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="Rate" sortKey="rate" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="Bale Value" sortKey="bale_value" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                <SortableTh label="FCV" sortKey="fcv" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Build invoice number range to show gaps as placeholder rows
                const invoiceNumbers = sortedReportRows
                  .map(row => Number(row.dispatch_invoice_number))
                  .filter(n => Number.isFinite(n));
                const minInvoice = Math.min(...invoiceNumbers);
                const maxInvoice = Math.max(...invoiceNumbers);

                // If no numeric invoice numbers, render rows directly
                if (!Number.isFinite(minInvoice) || !Number.isFinite(maxInvoice)) {
                  return sortedReportRows.map((row, i) => (
                    <tr key={row.id || i} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                      <td style={S.td}><b>{row.unique_code}</b></td>
                      <td style={S.td}>{formatPurchaseDateDash(row.purchase_date || row.date_of_purchase)}</td>
                      <td style={S.td}>{row.vehicle_dispatch_number || '—'}</td>
                      <td style={S.td}>{row.dispatch_invoice_number || '—'}</td>
                      <td style={S.td}>{Number.isFinite(Number(row.weight)) ? Number(row.weight).toFixed(2) + ' kg' : '—'}</td>
                      <td style={S.td}>{Number.isFinite(Number(row.rate)) ? Number(row.rate).toFixed(2) : '—'}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#166534' }}>{Number.isFinite(Number(row.bale_value)) ? Number(row.bale_value).toFixed(2) : '—'}</td>
                      <td style={S.td}><span style={S.badge(row.fcv === 'FCV' ? 'green' : 'red')}>{row.fcv}</span></td>
                    </tr>
                  ));
                }

                // Build invoice → rows map
                const invoiceMap = {};
                sortedReportRows.forEach(row => {
                  const inv = Number(row.dispatch_invoice_number);
                  if (Number.isFinite(inv)) {
                    if (!invoiceMap[inv]) invoiceMap[inv] = [];
                    invoiceMap[inv].push(row);
                  }
                });

                // Render every invoice in range, filling gaps with placeholders
                const rows = [];
                for (let inv = minInvoice; inv <= maxInvoice; inv++) {
                  if (invoiceMap[inv]) {
                    invoiceMap[inv].forEach((row) => {
                      rows.push(
                        <tr key={row.id || `inv-${inv}`} style={{ background: rows.length % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}><b>{row.unique_code}</b></td>
                          <td style={S.td}>{formatPurchaseDateDash(row.purchase_date || row.date_of_purchase)}</td>
                          <td style={S.td}>{row.vehicle_dispatch_number || '—'}</td>
                          <td style={S.td}>{row.dispatch_invoice_number || '—'}</td>
                          <td style={S.td}>{Number.isFinite(Number(row.weight)) ? Number(row.weight).toFixed(2) + ' kg' : '—'}</td>
                          <td style={S.td}>{Number.isFinite(Number(row.rate)) ? Number(row.rate).toFixed(2) : '—'}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: '#166534' }}>{Number.isFinite(Number(row.bale_value)) ? Number(row.bale_value).toFixed(2) : '—'}</td>
                          <td style={S.td}><span style={S.badge(row.fcv === 'FCV' ? 'green' : 'red')}>{row.fcv}</span></td>
                        </tr>
                      );
                    });
                  } else {
                    // Gap: show placeholder row for missing invoice number
                    rows.push(
                      <tr key={`missing-invoice-${inv}`} style={{ background: rows.length % 2 === 0 ? '#fffafa' : '#fff', opacity: 0.5 }}>
                        <td style={S.td}>—</td>
                        <td style={S.td}>—</td>
                        <td style={S.td}>—</td>
                        <td style={S.td}>{inv}</td>
                        <td style={S.td}>—</td>
                        <td style={S.td}>—</td>
                        <td style={S.td}>—</td>
                        <td style={S.td}>—</td>
                      </tr>
                    );
                  }
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

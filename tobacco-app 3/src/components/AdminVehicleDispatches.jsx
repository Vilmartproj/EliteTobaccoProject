import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import { formatDateTime } from '../utils/dateFormat';
import { generateInvoice } from '../utils/generateInvoice';

// ── Admin Vehicle Dispatches: teal → blue gradient (matching admin dashboard) ──
const adminGradient = 'linear-gradient(135deg, #20c997 0%, #2780e3 100%)';
const S = {
  ..._S,
  card: {
    ..._S.card,
    background: '#ffffff',
    border: '1px solid #b7d9f8',
    boxShadow: '0 4px 16px rgba(39,128,227,0.16)',
  },
  subheading: {
    ..._S.subheading,
    color: '#2780e3',
  },
  label: {
    ..._S.label,
    color: '#2780e3',
  },
  input: {
    ..._S.input,
    background: '#ffffff',
    border: '1.5px solid #1f67b9',
    color: '#1b3555',
  },
  btnPrimary: {
    ..._S.btnPrimary,
    background: adminGradient,
    color: '#ffffff',
    border: '1px solid #1f67b9',
  },
  btnSecondary: {
    ..._S.btnSecondary,
    background: adminGradient,
    color: '#ffffff',
    border: '1px solid #1f67b9',
  },
  th: {
    ..._S.th,
    background: '#2780e3',
    color: '#ffffff',
    border: '1px solid #1f67b9',
  },
  td: {
    ..._S.td,
    border: '1px solid #d9ebfb',
    color: '#1b3555',
  },
};

function formatInr(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status) {
  if (status === 'sent_to_admin') return S.badge('red');
  if (status === 'sent_to_warehouse') return S.badge();
  if (status === 'warehouse_received') return S.badge('green');
  if (status === 'unmatched_bags') return S.badge('red');
  return S.badge();
function statusLabel(status) {
  if (status === 'sent_to_admin') return 'Sent to Admin';
  if (status === 'sent_to_warehouse') return 'Sent to Warehouse';
  if (status === 'warehouse_received') return 'Warehouse Received';
  if (status === 'unmatched_bags') return 'Unmatched Bales';
  return status;
}

}

function statusLabel(status) {
  if (status === 'sent_to_admin') return 'Sent to Admin';
  if (status === 'sent_to_warehouse') return 'Sent to Warehouse';
  if (status === 'warehouse_received') return 'Warehouse Received';
  if (status === 'unmatched_bags') return 'Unmatched Bags';
  return status;
}

function buyerColorTheme(buyerId) {
  const palettes = [
    { rowBg: '#fff8e6', cellBg: '#fff1cc', border: '#f59e0b', text: '#7c2d12' },
    { rowBg: '#eefbf2', cellBg: '#dbf5e4', border: '#16a34a', text: '#14532d' },
    { rowBg: '#eef6ff', cellBg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
    { rowBg: '#fff0f6', cellBg: '#ffe1ef', border: '#db2777', text: '#831843' },
    { rowBg: '#f6f5ff', cellBg: '#ecebff', border: '#7c3aed', text: '#4c1d95' },
    { rowBg: '#ecfeff', cellBg: '#cffafe', border: '#0891b2', text: '#164e63' },
  ];
  const normalized = Number(buyerId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return { rowBg: '#fff', cellBg: '#fff', border: '#d1d5db', text: '#1f2937' };
  }
  return palettes[(normalized - 1) % palettes.length];
}

export default function AdminVehicleDispatches() {
  const [dispatches, setDispatches] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [buyerFilter, setBuyerFilter] = useState('');
  const [warehouseEmployees, setWarehouseEmployees] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsById, setDetailsById] = useState({});
  const [warehouseNotes, setWarehouseNotes] = useState({});
  const [assignedEmployeeByDispatch, setAssignedEmployeeByDispatch] = useState({});
  const [qrTooltip, setQrTooltip] = useState({ visible: false, dispatchId: null, rect: null });

  const load = async (selectedBuyerId = buyerFilter) => {
    const parsedBuyerId = selectedBuyerId ? Number(selectedBuyerId) : null;
    const [rows, employees, buyerRows] = await Promise.all([
      api.getVehicleDispatches(parsedBuyerId),
      api.getWarehouseEmployees(),
      api.getBuyers(),
    ]);
    setDispatches(rows);
    setWarehouseEmployees(employees);
    setBuyers(buyerRows);

    const defaults = {};
    rows.forEach((row) => {
      if (row.warehouse_employee_id) defaults[row.id] = String(row.warehouse_employee_id);
    });
    setAssignedEmployeeByDispatch((prev) => ({ ...defaults, ...prev }));
  };

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  useEffect(() => {
    load(buyerFilter).catch((e) => setMsg(e.message));
  }, [buyerFilter]);

  const groupedCounts = useMemo(() => {
    const map = { sent_to_admin: 0, sent_to_warehouse: 0, warehouse_received: 0, unmatched_bags: 0 };
    dispatches.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(map, row.status)) map[row.status] += 1;
    });
    return map;
  }, [dispatches]);

  const ensureDetails = async (dispatchId) => {
    if (detailsById[dispatchId]) return detailsById[dispatchId];
    const full = await api.getVehicleDispatchById(dispatchId);
    setDetailsById((prev) => ({ ...prev, [dispatchId]: full }));
    return full;
  };

  const sendToWarehouse = async (dispatchId) => {
    const employeeId = Number(assignedEmployeeByDispatch[dispatchId] || 0);
    if (!employeeId) {
      setMsg('Select warehouse employee before sending');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      await api.sendVehicleDispatchToWarehouse(dispatchId, {
        warehouse_employee_id: employeeId,
        admin_note: String(warehouseNotes[`admin-${dispatchId}`] || '').trim(),
      });
      setMsg('✅ Dispatch sent to warehouse');
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateVehicleInvoice = async (dispatchRow) => {
    try {
      const detail = await ensureDetails(dispatchRow.id);
      const bags = (detail.items || []).map((item) => ({
        buyer_code: dispatchRow.buyer_code,
        buyer_name: dispatchRow.buyer_name,
        unique_code: item.unique_code,
        apf_number: item.apf_number || '',
        tobacco_grade: item.tobacco_grade || '',
        type_of_tobacco: item.type_of_tobacco || '',
        purchase_location: item.purchase_location || '',
        purchase_date: item.date_of_purchase || '',
        buyer_grade: item.buyer_grade || '',
        weight: item.weight,
        rate: item.rate,
        bale_value: item.bale_value,
        fcv: item.fcv || '',
      }));

      generateInvoice(bags, {
        buyerName: dispatchRow.buyer_name,
        buyerCode: dispatchRow.buyer_code,
        vehicleNumber: dispatchRow.vehicle_number,
        customTitle: `Vehicle Invoice - ${dispatchRow.dispatch_number || dispatchRow.vehicle_number}`,
      });
    } catch (e) {
      setMsg(e.message);
    }
  };

  const setNote = (key, value) => {
    setWarehouseNotes((prev) => ({ ...prev, [key]: value }));
  };

  const handleQrHover = async (e, dispatchId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setQrTooltip({ visible: true, dispatchId, rect });
    try { await ensureDetails(dispatchId); } catch (_) {}
  };

  const handleQrLeave = () => setQrTooltip((prev) => ({ ...prev, visible: false }));

  return (
    <div style={S.card}>
      <div style={S.subheading}>Vehicle QR Dispatch Workflow</div>
      {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={S.badge('red')}>To Admin: {groupedCounts.sent_to_admin}</span>
        <span style={S.badge()}>To Warehouse: {groupedCounts.sent_to_warehouse}</span>
        <span style={S.badge('green')}>Warehouse Received: {groupedCounts.warehouse_received}</span>
        <span style={S.badge('red')}>Unmatched Bales: {groupedCounts.unmatched_bags}</span>
      </div>

      <div style={{ marginBottom: 12, maxWidth: 320 }}>
        <label style={S.label}>Buyer Filter</label>
        <select
          style={{ ...S.input, marginBottom: 0 }}
          value={buyerFilter}
          onChange={(e) => setBuyerFilter(e.target.value)}
        >
          <option value="">All Buyers</option>
          {buyers.map((buyer) => (
            <option key={buyer.id} value={String(buyer.id)}>{buyer.code} - {buyer.name}</option>
          ))}
        </select>
      </div>

      {dispatches.length === 0 ? (
        <div style={{ color: '#777' }}>No vehicle dispatch requests yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>Dispatch No</th>
                <th style={S.th}>Dispatch Date</th>
                <th style={S.th}>Buyer</th>
                <th style={S.th}>Vehicle</th>
                <th style={S.th}>Vehicle Type</th>
                <th style={S.th}>Destination</th>
                <th style={S.th}>Way Bill</th>
                <th style={S.th}>Invoice</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>QR Count</th>
                <th style={S.th}>Weight</th>
                <th style={S.th}>Bale Value</th>
                <th style={S.th}>Buyer Note</th>
                <th style={S.th}>Warehouse Employee</th>
                <th style={S.th}>Admin/Warehouse Note</th>
                <th style={S.th}>Scan Summary</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((row) => {
                const theme = buyerColorTheme(row.buyer_id);
                const isSelectedBuyer = buyerFilter && Number(buyerFilter) === Number(row.buyer_id);
                return (
                <tr key={row.id} style={{ background: isSelectedBuyer ? theme.rowBg : undefined }}>
                  <td style={S.td}>{row.id}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{row.dispatch_number || `DSP-${String(row.id).padStart(5, '0')}`}</td>
                  <td style={S.td}>{formatDateTime(row.dispatch_date || row.created_at)}</td>
                  <td style={{ ...S.td, background: isSelectedBuyer ? theme.cellBg : undefined, color: isSelectedBuyer ? theme.text : undefined, borderLeft: isSelectedBuyer ? `4px solid ${theme.border}` : undefined, fontWeight: 700 }}>
                    {row.buyer_code} - {row.buyer_name}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{row.vehicle_number}</td>
                  <td style={S.td}>{row.vehicle_type || '—'}</td>
                  <td style={S.td}>{row.destination_location || '—'}</td>
                  <td style={S.td}>{row.way_bill_number || '—'}</td>
                  <td style={S.td}>{row.invoice_number || '—'}</td>
                  <td style={S.td}><span style={statusBadge(row.status)}>{statusLabel(row.status)}</span></td>
                  <td
                    style={{ ...S.td, cursor: 'pointer', textDecoration: 'underline dotted' }}
                    onMouseEnter={(e) => handleQrHover(e, row.id)}
                    onMouseLeave={handleQrLeave}
                  >
                    {row.item_count}
                  </td>
                  <td style={S.td}>{Number(row.total_weight || 0).toFixed(2)} kg</td>
                  <td style={S.td}>₹{formatInr(row.total_bale_value)}</td>
                  <td style={S.td}>{row.buyer_note || '—'}</td>
                  <td style={S.td}>
                    {row.status === 'sent_to_admin' ? (
                      <select
                        style={{ ...S.input, marginBottom: 0, minWidth: 190, background: isSelectedBuyer ? theme.cellBg : undefined, borderColor: isSelectedBuyer ? theme.border : undefined, color: isSelectedBuyer ? theme.text : undefined }}
                        value={assignedEmployeeByDispatch[row.id] || ''}
                        onChange={(e) => setAssignedEmployeeByDispatch((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      >
                        <option value="">Select employee</option>
                        {warehouseEmployees.map((employee) => (
                          <option key={employee.id} value={String(employee.id)}>{employee.code} - {employee.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{row.warehouse_employee_code ? `${row.warehouse_employee_code} - ${row.warehouse_employee_name}` : '—'}</span>
                    )}
                  </td>
                  <td style={S.td}>
                    {row.status === 'sent_to_admin' && (
                      <input
                        style={{ ...S.input, marginBottom: 0, minWidth: 180, background: isSelectedBuyer ? theme.cellBg : undefined, borderColor: isSelectedBuyer ? theme.border : undefined, color: isSelectedBuyer ? theme.text : undefined }}
                        placeholder="Admin note before sending"
                        value={warehouseNotes[`admin-${row.id}`] || ''}
                        onChange={(e) => setNote(`admin-${row.id}`, e.target.value)}
                      />
                    )}
                    {(row.status !== 'sent_to_admin') && (row.admin_note || row.warehouse_note || '—')}
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 12 }}>
                      Matched: <b>{Number(row.matched_count || 0)}</b> / {Number(row.item_count || 0)}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Unmatched: <b>{Number(row.unmatched_count || 0)}</b>
                    </div>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {row.status === 'sent_to_admin' && (
                        <button
                          style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: loading ? 0.6 : 1, background: '#ffb366', color: '#7a3800', border: '1px solid #e07800' }}
                          onClick={() => sendToWarehouse(row.id)}
                          disabled={loading}
                        >
                          Send To Warehouse
                        </button>
                      )}
                      {row.status === 'sent_to_warehouse' && (
                        <button
                          style={{ flex: 'none', padding: '6px 10px', fontSize: 12, background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'default', fontWeight: 600 }}
                          disabled
                        >
                          Sent To Warehouse
                        </button>
                      )}
                      <button
                        style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                        onClick={() => generateVehicleInvoice(row)}
                      >
                        Invoice
                      </button>
                    </div>
                    <div style={{ color: '#666', fontSize: 11, marginTop: 6 }}>
                      Updated: {formatDateTime(row.updated_at)}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      {qrTooltip.visible && qrTooltip.rect && (() => {
        const items = detailsById[qrTooltip.dispatchId]?.items;
        return (
          <div style={{
            position: 'fixed',
            top: Math.min(qrTooltip.rect.bottom + 4, window.innerHeight - 300),
            left: Math.min(qrTooltip.rect.left, window.innerWidth - 260),
            background: '#fff',
            border: '1.5px solid #b7d9f8',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 6px 20px rgba(39,128,227,0.22)',
            zIndex: 9999,
            minWidth: 220,
            maxWidth: 260,
            maxHeight: 280,
            overflowY: 'auto',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#2780e3', marginBottom: 6, borderBottom: '1px solid #dbeafe', paddingBottom: 4 }}>
              QR Codes ({items ? items.length : '…'})
            </div>
            {!items && <div style={{ fontSize: 12, color: '#888' }}>Loading…</div>}
            {items && items.map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: '#1b3555', padding: '3px 0', borderBottom: '1px solid #f0f6ff', fontWeight: 700 }}>
                {item.unique_code}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

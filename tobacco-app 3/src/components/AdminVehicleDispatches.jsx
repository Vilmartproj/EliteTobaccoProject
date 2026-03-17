import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { S } from '../styles';
import { formatDateTime } from '../utils/dateFormat';
import { generateInvoice } from '../utils/generateInvoice';

function formatInr(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status) {
  if (status === 'sent_to_admin') return S.badge('red');
  if (status === 'sent_to_warehouse') return S.badge();
  if (status === 'confirmed_match') return S.badge('green');
  if (status === 'confirmed_mismatch') return S.badge('red');
  return S.badge();
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
    const map = { sent_to_admin: 0, sent_to_warehouse: 0, confirmed_match: 0, confirmed_mismatch: 0 };
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

  return (
    <div style={S.card}>
      <div style={S.subheading}>Vehicle QR Dispatch Workflow</div>
      {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={S.badge('red')}>To Admin: {groupedCounts.sent_to_admin}</span>
        <span style={S.badge()}>To Warehouse: {groupedCounts.sent_to_warehouse}</span>
        <span style={S.badge('green')}>Matched: {groupedCounts.confirmed_match}</span>
        <span style={S.badge('red')}>Not Matched: {groupedCounts.confirmed_mismatch}</span>
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
              {dispatches.map((row) => (
                <tr key={row.id}>
                  <td style={S.td}>{row.id}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{row.dispatch_number || `DSP-${String(row.id).padStart(5, '0')}`}</td>
                  <td style={S.td}>{formatDateTime(row.dispatch_date || row.created_at)}</td>
                  <td style={S.td}>{row.buyer_code} - {row.buyer_name}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{row.vehicle_number}</td>
                  <td style={S.td}>{row.vehicle_type || '—'}</td>
                  <td style={S.td}>{row.destination_location || '—'}</td>
                  <td style={S.td}>{row.way_bill_number || '—'}</td>
                  <td style={S.td}>{row.invoice_number || '—'}</td>
                  <td style={S.td}><span style={statusBadge(row.status)}>{row.status}</span></td>
                  <td style={S.td}>{row.item_count}</td>
                  <td style={S.td}>{Number(row.total_weight || 0).toFixed(2)} kg</td>
                  <td style={S.td}>₹{formatInr(row.total_bale_value)}</td>
                  <td style={S.td}>{row.buyer_note || '—'}</td>
                  <td style={S.td}>
                    {row.status === 'sent_to_admin' ? (
                      <select
                        style={{ ...S.input, marginBottom: 0, minWidth: 190 }}
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
                        style={{ ...S.input, marginBottom: 0, minWidth: 180 }}
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
                          style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: loading ? 0.6 : 1 }}
                          onClick={() => sendToWarehouse(row.id)}
                          disabled={loading}
                        >
                          Send To Warehouse
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

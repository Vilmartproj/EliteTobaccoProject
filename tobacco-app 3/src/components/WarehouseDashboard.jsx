import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import BrandLogo from './BrandLogo';
import { formatDateTime } from '../utils/dateFormat';

// ── Warehouse colour theme: teal → blue gradient (matching buyer dashboard) ──
const warehouseGradient = 'linear-gradient(135deg, #20c997 0%, #2780e3 100%)';
const S = {
  ..._S,
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: '#144b8b',
  },
  topBar: {
    ..._S.topBar,
    background: 'rgba(255,255,255,0.92)',
    borderBottom: '3px solid #2780e3',
    boxShadow: '0 4px 14px rgba(39,128,227,0.22)',
  },
  topBarTitle: { fontSize: 14, fontWeight: 800, color: '#2780e3', letterSpacing: 1 },
  buyerBadge:  { background: warehouseGradient, border: '1px solid #1f67b9', borderRadius: 8, padding: '3px 10px', fontWeight: 800, color: '#ffffff', fontSize: 11 },
  bagsBadge:   { background: warehouseGradient, color: '#ffffff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 },
  card:        { background: '#ffffff', borderRadius: 12, border: '1px solid #b7d9f8', padding: '16px', marginBottom: 16, boxShadow: '0 4px 16px rgba(39,128,227,0.16)' },
  heading:     { fontSize: 16, fontWeight: 800, color: '#2780e3', marginBottom: 14, letterSpacing: 0.5 },
  subheading:  { fontSize: 13, fontWeight: 800, color: '#2780e3', marginBottom: 10 },
  label:       { fontSize: 11, fontWeight: 800, color: '#2780e3', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { width: '100%', padding: '7px 10px', border: '1.5px solid #1f67b9', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1b3555', background: '#ffffff', boxSizing: 'border-box', outline: 'none' },
  toggleGroup: { display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #2780e3', marginBottom: 6 },
  toggleBtn: (active, disabled) => ({
    flex: 1, padding: '8px', border: 'none',
    background: disabled ? '#8ab8ef' : active ? warehouseGradient : '#2780e3',
    color: '#fff',
    fontWeight: 800, fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 1, transition: 'all 0.2s',
    pointerEvents: disabled ? 'none' : 'auto',
  }),
  btnPrimary:  { background: warehouseGradient, color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', flex: 1, transition: 'background 0.2s' },
  btnSecondary:{ background: warehouseGradient, color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', flex: 1 },
  btnIcon:     { background: warehouseGradient, border: '1px solid #1f67b9', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 800 },
  th:          { background: '#2780e3', color: '#ffffff', fontWeight: 800, padding: '7px 9px', border: '1px solid #1f67b9', textAlign: 'left', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td:          { padding: '6px 9px', border: '1px solid #d9ebfb', color: '#1b3555', verticalAlign: 'middle', fontWeight: 700, whiteSpace: 'nowrap' },
  tab: (active) => ({
    padding: '6px 12px',
    border: '2px solid #1f67b9',
    borderRadius: 8,
    background: active ? warehouseGradient : '#2780e3',
    color: '#fff',
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
    letterSpacing: 0.2, whiteSpace: 'nowrap',
    transition: 'all 0.18s',
  }),
  qrCard: { background: '#fff', border: '1.5px solid #b7d9f8', borderRadius: 10, padding: 14, textAlign: 'center', boxShadow: '0 4px 10px rgba(39,128,227,0.16)' },
};
// ─────────────────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (status === 'sent_to_warehouse') return S.badge();
  if (status === 'warehouse_received') return S.badge('green');
  if (status === 'unmatched_bags') return S.badge('red');
  return S.badge();
}

function statusLabel(status) {
  if (status === 'sent_to_admin') return 'Sent to Admin';
  if (status === 'sent_to_warehouse') return 'Sent to Warehouse';
  if (status === 'warehouse_received') return 'Warehouse Received';
  if (status === 'unmatched_bags') return 'Unmatched Bags';
  return status;
}

function formatInr(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemRowStyle(scanStatus) {
  if (scanStatus === 'matched') {
    return { background: '#e7f8ec' };
  }
  return undefined;
}

export default function WarehouseDashboard({ user, onLogout }) {
  const [dispatches, setDispatches] = useState([]);
  const [activeDispatchId, setActiveDispatchId] = useState(null);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const loadDispatches = async () => {
    const data = await api.getVehicleDispatches(null, user.id);
    setDispatches(data);
    if (!activeDispatchId && data.length > 0) {
      setActiveDispatchId(data[0].id);
    }
    if (activeDispatchId && !data.find((row) => row.id === activeDispatchId) && data.length > 0) {
      setActiveDispatchId(data[0].id);
    }
  };

  const loadActive = async (dispatchId) => {
    if (!dispatchId) {
      setActiveDispatch(null);
      return;
    }
    const detail = await api.getVehicleDispatchById(dispatchId);
    setActiveDispatch(detail);
  };

  useEffect(() => {
    loadDispatches().catch((e) => setMsg(e.message));
  }, [user.id]);

  useEffect(() => {
    loadActive(activeDispatchId).catch((e) => setMsg(e.message));
  }, [activeDispatchId]);

  const activeSummary = useMemo(() => {
    if (!activeDispatch) return null;
    const total = Array.isArray(activeDispatch.items) ? activeDispatch.items.length : 0;
    const matched = (activeDispatch.items || []).filter((item) => item.warehouse_scan_status === 'matched').length;
    const unmatchedEvents = Array.isArray(activeDispatch.scan_events)
      ? activeDispatch.scan_events.filter((event) => event.result === 'unmatched').length
      : 0;
    return { total, matched, unmatchedEvents };
  }, [activeDispatch]);

  const unmatchedScanEvents = useMemo(
    () => (activeDispatch?.scan_events || []).filter((event) => event.result === 'unmatched'),
    [activeDispatch]
  );

  const submitScan = async (codeInput) => {
    const code = String((codeInput ?? scanCode) || '').replace(/[\r\n\t]/g, '').trim();
    if (!activeDispatchId) {
      setMsg('Select a vehicle dispatch first');
      return;
    }
    if (!code) {
      setMsg('Scan or enter QR code');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      const result = await api.scanVehicleDispatchQRCode(activeDispatchId, {
        warehouse_employee_id: user.id,
        qr_code: code,
      });
      setMsg(result.result === 'matched' ? '✅ QR matched and updated' : '⚠ QR not in this list (marked unmatched)');
      setScanCode('');
      await loadDispatches();
      await loadActive(activeDispatchId);
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.app}>
      <div style={S.topBar}>
        <BrandLogo
          size={38}
          title="Elite Leaf Tobacco Company - Warehouse"
          titleStyle={S.topBarTitle}
        />
        <div style={S.buyerInfo}>
          <span style={S.buyerBadge}>👷 {user.name} ({user.code})</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={{ ...S.page, maxWidth: 1195 }}>
        <div style={S.card}>
          <div style={S.subheading}>Assigned Vehicle Dispatches ({dispatches.length})</div>
          {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}
          {dispatches.length === 0 ? (
            <div style={{ color: '#777' }}>No dispatches assigned yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Select</th>
                    <th style={S.th}>Dispatch</th>
                    <th style={S.th}>Vehicle</th>
                    <th style={S.th}>Buyer</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Bags</th>
                    <th style={S.th}>Weight</th>
                    <th style={S.th}>Bale Value</th>
                    <th style={S.th}>Matched</th>
                    <th style={S.th}>Unmatched</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((row) => (
                    <tr key={row.id} style={{ background: row.id === activeDispatchId ? '#fff3f3' : undefined }}>
                      <td style={S.td}>
                        <button style={{ ...S.btnSecondary, flex: 'none', padding: '4px 8px', fontSize: 12 }} onClick={() => setActiveDispatchId(row.id)}>
                          Open
                        </button>
                      </td>
                      <td style={S.td}>#{row.id}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{row.vehicle_number}</td>
                      <td style={S.td}>{row.buyer_code} - {row.buyer_name}</td>
                      <td style={S.td}><span style={statusBadge(row.status)}>{statusLabel(row.status)}</span></td>
                      <td style={S.td}>{row.item_count}</td>
                      <td style={S.td}>{Number(row.total_weight || 0).toFixed(2)} kg</td>
                      <td style={S.td}>₹{formatInr(row.total_bale_value)}</td>
                      <td style={S.td}>{row.matched_count || 0}</td>
                      <td style={S.td}>{row.unmatched_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeDispatch && (
          <div style={S.card}>
            <div style={S.subheading}>Scan QR Codes - Vehicle {activeDispatch.vehicle_number}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={S.badge()}>Buyer: {activeDispatch.buyer_code} - {activeDispatch.buyer_name}</span>
              <span style={S.badge('green')}>Matched: {activeSummary?.matched || 0}/{activeSummary?.total || 0}</span>
              <span style={S.badge('red')}>Unmatched Scans: {activeSummary?.unmatchedEvents || 0}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 10, alignItems: 'end', marginBottom: 12 }}>
              <div>
                <label style={S.label}>Scan QR Code</label>
                <input
                  ref={inputRef}
                  style={S.input}
                  value={scanCode}
                  placeholder="Scan QR or type code manually"
                  onChange={(e) => {
                    const value = e.target.value;
                    // Scanner input may include trailing control chars
                    if (/[\r\n\t]$/.test(value)) {
                      const normalized = value.replace(/[\r\n\t]/g, '').trim();
                      setScanCode(normalized);
                      if (normalized && !loading) submitScan(normalized);
                      return;
                    }
                    setScanCode(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const normalized = String(e.currentTarget.value || '').replace(/[\r\n\t]/g, '').trim();
                      if (normalized && !loading) submitScan(normalized);
                    }
                  }}
                />
              </div>
              <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 16px', opacity: loading ? 0.65 : 1 }} disabled={loading} onClick={() => submitScan()}>
                {loading ? 'Updating...' : 'Scan QR'}
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ ...S.label, marginBottom: 8 }}>Unmatched QR Codes</div>
              {unmatchedScanEvents.length === 0 ? (
                <div style={{ color: '#777' }}>No unmatched QR codes scanned.</div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {unmatchedScanEvents.map((event) => (
                    <span key={event.id} style={{ ...S.badge('red'), padding: '6px 10px' }}>
                      {event.scanned_code}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>QR Code</th>
                    <th style={S.th}>Weight</th>
                    <th style={S.th}>Rate</th>
                    <th style={S.th}>Bale Value</th>
                    <th style={S.th}>Scan Status</th>
                    <th style={S.th}>Scanned At</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeDispatch.items || []).map((item) => (
                    <tr key={item.id} style={itemRowStyle(item.warehouse_scan_status)}>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700 }}>{item.unique_code}</td>
                      <td style={S.td}>{item.weight ?? '—'}</td>
                      <td style={S.td}>{item.rate ?? '—'}</td>
                      <td style={S.td}>₹{formatInr(item.bale_value)}</td>
                      <td style={S.td}><span style={item.warehouse_scan_status === 'matched' ? S.badge('green') : S.badge()}>{item.warehouse_scan_status}</span></td>
                      <td style={S.td}>{item.scanned_at ? formatDateTime(item.scanned_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

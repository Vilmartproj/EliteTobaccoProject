import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { S } from '../styles';
import { formatDateTime } from '../utils/dateFormat';

function statusBadge(status) {
  if (status === 'sent_to_admin') return S.badge('red');
  if (status === 'sent_to_warehouse') return S.badge();
  if (status === 'confirmed_match') return S.badge('green');
  if (status === 'confirmed_mismatch') return S.badge('red');
  return S.badge();
}

function formatInr(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BuyerVehicleDispatch({ buyer }) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [wayBillNumber, setWayBillNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [eligibleRows, setEligibleRows] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [matchedCodes, setMatchedCodes] = useState([]);

  const loadData = async () => {
    const [eligible, allDispatches] = await Promise.all([
      api.getEligibleVehicleQRCodes(buyer.id),
      api.getVehicleDispatches(buyer.id),
    ]);
    setEligibleRows(eligible);
    setDispatches(allDispatches);
  };

  useEffect(() => {
    loadData().catch((e) => setMsg(e.message));
  }, [buyer.id]);

  useEffect(() => {
    const eligibleCodeSet = new Set(eligibleRows.map((row) => String(row.unique_code || '').trim().toUpperCase()));
    setMatchedCodes((prev) => prev.filter((code) => eligibleCodeSet.has(String(code).toUpperCase())));
  }, [eligibleRows]);

  const nextDispatchNumber = useMemo(() => {
    const maxId = dispatches.reduce((maxValue, row) => Math.max(maxValue, Number(row.id || 0)), 0);
    return `DSP-${String(maxId + 1).padStart(5, '0')}`;
  }, [dispatches]);

  const dispatchDate = useMemo(() => formatDateTime(new Date()), []);

  const scanAndMatchQRCode = async (inputCode) => {
    const scanned = String((inputCode ?? scanCode) || '').trim();
    if (!scanned) {
      setMsg('Enter or scan a QR code');
      return;
    }

    const match = eligibleRows.find((row) => String(row.unique_code || '').trim().toUpperCase() === scanned.toUpperCase());
    if (!match) {
      setMsg('Scanned QR code is not in this vehicle dispatch list');
      return;
    }

    setScanLoading(true);
    try {
      setMatchedCodes((prev) => {
        if (prev.includes(match.unique_code)) return prev;
        return [...prev, match.unique_code];
      });
      setMsg(`✅ ${match.unique_code} matched`);
      setScanCode('');
    } finally {
      setScanLoading(false);
    }
  };

  const removeMatchedCode = (code) => {
    setMatchedCodes((prev) => prev.filter((item) => item !== code));
  };

  const createDispatch = async () => {
    if (!vehicleNumber.trim()) {
      setMsg('Vehicle number is required');
      return;
    }
    if (!vehicleType.trim()) {
      setMsg('Vehicle type is required');
      return;
    }
    if (!destinationLocation.trim()) {
      setMsg('Destination location is required');
      return;
    }
    if (!wayBillNumber.trim()) {
      setMsg('Way bill number is required');
      return;
    }
    if (!invoiceNumber.trim()) {
      setMsg('Invoice number is required');
      return;
    }
    if (eligibleRows.length === 0) {
      setMsg('Scan QR codes in My Purchases to move purchases here first');
      return;
    }
    if (matchedCodes.length === 0) {
      setMsg('Scan and match at least one QR code from the dispatch list');
      return;
    }

    const matchedRowSet = new Set(matchedCodes.map((code) => String(code).trim().toUpperCase()));
    const matchedRows = eligibleRows.filter((row) => matchedRowSet.has(String(row.unique_code || '').trim().toUpperCase()));
    if (matchedRows.length === 0) {
      setMsg('No matched QR rows found to send');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      await api.createVehicleDispatch({
        buyer_id: buyer.id,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim(),
        destination_location: destinationLocation.trim(),
        way_bill_number: wayBillNumber.trim(),
        invoice_number: invoiceNumber.trim(),
        buyer_note: buyerNote.trim(),
        qr_codes: matchedRows.map((row) => row.unique_code),
      });
      setVehicleNumber('');
      setVehicleType('');
      setDestinationLocation('');
      setWayBillNumber('');
      setInvoiceNumber('');
      setBuyerNote('');
      setMatchedCodes([]);
      setMsg('✅ Matched QR rows sent to admin successfully');
      await loadData();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.subheading}>Vehicle Dispatch Details</div>
        {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Dispatch Number</label>
            <input style={S.input} value={nextDispatchNumber} readOnly />
          </div>
          <div>
            <label style={S.label}>Dispatch Date</label>
            <input style={S.input} value={dispatchDate} readOnly />
          </div>
          <div>
            <label style={S.label}>Vehicle Number</label>
            <input
              style={S.input}
              placeholder="e.g. AP39AB1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Vehicle Type</label>
            <input
              style={S.input}
              placeholder="e.g. Lorry / Truck"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Destination Location</label>
            <input
              style={S.input}
              placeholder="Destination location"
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Way Bill Number</label>
            <input
              style={S.input}
              placeholder="Way bill number"
              value={wayBillNumber}
              onChange={(e) => setWayBillNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Invoice Number</label>
            <input
              style={S.input}
              placeholder="Invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Buyer Note (Optional)</label>
            <input
              style={S.input}
              placeholder="Any instruction for admin"
              value={buyerNote}
              onChange={(e) => setBuyerNote(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input
            style={{ ...S.input, minWidth: 260, marginBottom: 0 }}
            placeholder="Scan QR code to match with list"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && scanAndMatchQRCode()}
          />
          <button
            style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', opacity: scanLoading ? 0.65 : 1 }}
            disabled={scanLoading}
            onClick={() => scanAndMatchQRCode()}
          >
            {scanLoading ? 'Scanning...' : 'Scan QR'}
          </button>
          <span style={{ ...S.badge('green'), fontSize: 13 }}>Matched: {matchedCodes.length}</span>
        </div>

        {matchedCodes.length > 0 && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #c7ead6', background: '#f0fdf4' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Matched QR codes</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {matchedCodes.map((code) => (
                <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 999, background: '#ecfeff', border: '1px solid #a5f3fc', fontSize: 12, fontWeight: 700 }}>
                  {code}
                  <button
                    style={{ ...S.btnSecondary, flex: 'none', padding: '2px 8px', fontSize: 11 }}
                    onClick={() => removeMatchedCode(code)}
                  >
                    Delete
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', opacity: loading ? 0.65 : 1 }}
            disabled={loading}
            onClick={createDispatch}
          >
            {loading ? 'Sending...' : `Send To Admin (${matchedCodes.length})`}
          </button>
        </div>

        {eligibleRows.length === 0 ? (
          <div style={{ color: '#777' }}>No purchases moved yet. Scan QR codes in My Purchases to move them here.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>QR Code</th>
                  <th style={S.th}>Weight</th>
                  <th style={S.th}>Rate</th>
                  <th style={S.th}>Bale Value</th>
                  <th style={S.th}>Buyer Grade</th>
                </tr>
              </thead>
              <tbody>
                {eligibleRows.map((row) => (
                  <tr key={row.unique_code} style={{ background: matchedCodes.includes(row.unique_code) ? '#dcfce7' : undefined }}>
                    <td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace' }}>{row.unique_code}</td>
                    <td style={S.td}>{row.weight ?? '—'}</td>
                    <td style={S.td}>{row.rate ?? '—'}</td>
                    <td style={S.td}>{formatInr(row.bale_value)}</td>
                    <td style={S.td}>{row.buyer_grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.subheading}>My Vehicle Dispatch History ({dispatches.length})</div>
        {dispatches.length === 0 ? (
          <div style={{ color: '#777' }}>No dispatches yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Dispatch No</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Vehicle</th>
                  <th style={S.th}>Vehicle Type</th>
                  <th style={S.th}>Destination</th>
                  <th style={S.th}>Way Bill</th>
                  <th style={S.th}>Invoice</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>QR Count</th>
                  <th style={S.th}>Total Weight</th>
                  <th style={S.th}>Total Bale Value</th>
                  <th style={S.th}>Warehouse Note</th>
                  <th style={S.th}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((row) => (
                  <tr key={row.id}>
                    <td style={S.td}>{row.id}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.dispatch_number || `DSP-${String(row.id).padStart(5, '0')}`}</td>
                    <td style={S.td}>{formatDateTime(row.dispatch_date || row.created_at)}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.vehicle_number}</td>
                    <td style={S.td}>{row.vehicle_type || '—'}</td>
                    <td style={S.td}>{row.destination_location || '—'}</td>
                    <td style={S.td}>{row.way_bill_number || '—'}</td>
                    <td style={S.td}>{row.invoice_number || '—'}</td>
                    <td style={S.td}><span style={statusBadge(row.status)}>{row.status}</span></td>
                    <td style={S.td}>{row.item_count}</td>
                    <td style={S.td}>{Number(row.total_weight || 0).toFixed(2)} kg</td>
                    <td style={S.td}>₹{formatInr(row.total_bale_value)}</td>
                    <td style={S.td}>{row.warehouse_note || '—'}</td>
                    <td style={S.td}>{formatDateTime(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import { formatDateTime } from '../utils/dateFormat';

// Sorting logic for dispatch history
// (moved after imports)

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
    background: '#2780e3',
    color: '#ffffff',
    border: '1px solid #1f67b9',
  },
  btnSecondary: {
    ..._S.btnSecondary,
    background: '#2780e3',
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

function statusBadge(status) {
  if (status === 'sent_to_admin') return S.badge('red');
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

export default function BuyerVehicleDispatch({ buyer }) {
    // Sorting logic for dispatch history
    const [dispatchSort, setDispatchSort] = useState({ key: 'id', direction: 'desc' });
    const toggleSort = (sortState, setSortState, key) => {
      if (sortState.key === key) {
        setSortState({ key, direction: sortState.direction === 'asc' ? 'desc' : 'asc' });
        return;
      }
      setSortState({ key, direction: 'asc' });
    };
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
    const SortableTh = ({ label, sortKey, sortState, onSort, minWidth }) => (
      <th
        style={{ ...S.th, cursor: 'pointer', userSelect: 'none', fontWeight: 700, ...(minWidth ? { minWidth } : {}) }}
        onClick={() => onSort(sortKey)}
        title="Click to sort"
      >
        {label}{sortState.key === sortKey ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    );
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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Fetch all dispatches globally for correct nextDispatchNumber
  const loadData = async () => {
    const [eligible, allDispatches] = await Promise.all([
      api.getEligibleVehicleQRCodes(buyer.id),
      api.getVehicleDispatches(), // No buyerId: fetch all
    ]);
    setEligibleRows(eligible);
    // Filter dispatches to only those for this buyer
    const buyerDispatches = allDispatches.filter(d => String(d.buyer_id) === String(buyer.id));
    setDispatches(buyerDispatches);
  };

  useEffect(() => {
    loadData().catch((e) => setMsg(e.message));
  }, [buyer.id]);

  useEffect(() => {
    const eligibleCodeSet = new Set(eligibleRows.map((row) => String(row.unique_code || '').trim().toUpperCase()));
    setMatchedCodes((prev) => prev.filter((code) => eligibleCodeSet.has(String(code).toUpperCase())));
  }, [eligibleRows]);



  const nextDispatchNumber = useMemo(() => {
    // Find max numeric value from dispatch_number like DSP-00001
    const maxNum = dispatches.reduce((maxValue, row) => {
      const num = String(row.dispatch_number || '').match(/^DSP-(\d{5})$/);
      const val = num ? Number(num[1]) : 0;
      return Math.max(maxValue, val);
    }, 0);
    return `DSP-${String(maxNum + 1).padStart(5, '0')}`;
  }, [dispatches]);

  const dispatchDate = useMemo(() => formatDateTime(new Date()), []);
  const relatedInvoiceNumbers = useMemo(() => {
    const matchedCodeSet = new Set(matchedCodes.map((code) => String(code || '').trim().toUpperCase()));
    const unique = Array.from(
      new Set(
        eligibleRows
          .filter((row) => matchedCodeSet.has(String(row.unique_code || '').trim().toUpperCase()))
          .map((row) => String(row.dispatch_invoice_number || '').trim())
          .filter(Boolean)
      )
    );
    return unique;
  }, [eligibleRows, matchedCodes]);

  useEffect(() => {
    setInvoiceNumber(relatedInvoiceNumbers.join(', '));
  }, [relatedInvoiceNumbers]);

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

  const missingFieldStyle = {
    background: '#fffee0',
    color: '#1b3555',
  };

  const isMissingField = (field) => {
    if (!submitAttempted) return false;
    if (field === 'matchedCodes') return matchedCodes.length === 0;
    return !String(field).trim();
  };

  const inputWithMissing = (baseStyle, missing) => {
    return missing ? { ...baseStyle, ...missingFieldStyle } : baseStyle;
  };

  const createDispatch = async () => {
    setSubmitAttempted(true);
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
      setSubmitAttempted(false);
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input
            style={{ ...inputWithMissing(S.input, isMissingField('matchedCodes')), minWidth: 260, marginBottom: 0 }}
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

        <div style={{ marginBottom: 12, padding: 10, borderRadius: inputWithMissing({}, isMissingField('matchedCodes')).background ? 8 : 8, border: isMissingField('matchedCodes') ? '1.5px solid #d4af37' : matchedCodes.length > 0 ? '1px solid #c7ead6' : '1px solid #e0e0e0', background: isMissingField('matchedCodes') ? '#fffee0' : matchedCodes.length > 0 ? '#f0fdf4' : '#fafafa' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: isMissingField('matchedCodes') ? '#d97706' : '#16a34a' }}>Matched QR codes {matchedCodes.length === 0 && isMissingField('matchedCodes') && '(Required)'}</div>
          {matchedCodes.length > 0 && (

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
          )}
          {matchedCodes.length === 0 && (!isMissingField('matchedCodes') || submitAttempted) && !isMissingField('matchedCodes') && (
            <div style={{ color: '#999', fontSize: 12 }}>Scan QR codes using the scanner above</div>
          )}
        </div>

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
              style={inputWithMissing(S.input, isMissingField(vehicleNumber))}
              placeholder="e.g. AP39AB1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Vehicle Type</label>
            <input
              style={inputWithMissing(S.input, isMissingField(vehicleType))}
              placeholder="e.g. Lorry / Truck"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Destination Location</label>
            <input
              style={inputWithMissing(S.input, isMissingField(destinationLocation))}
              placeholder="Destination location"
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Way Bill Number</label>
            <input
              style={inputWithMissing(S.input, isMissingField(wayBillNumber))}
              placeholder="Way bill number"
              value={wayBillNumber}
              onChange={(e) => setWayBillNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Invoice Number</label>
            <input
              style={inputWithMissing(S.input, isMissingField(invoiceNumber))}
              placeholder="Invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            {relatedInvoiceNumbers.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#1f67b9', fontWeight: 700 }}>
                Matched QR invoices: {relatedInvoiceNumbers.join(', ')}
              </div>
            )}
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
                  <th style={S.th}>Invoice Number</th>
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
                    <td style={S.td}>{row.dispatch_invoice_number || '—'}</td>
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
                  <SortableTh label="ID" sortKey="id" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Dispatch No" sortKey="dispatch_number" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Date" sortKey="dispatch_date" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Vehicle" sortKey="vehicle_number" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Vehicle Type" sortKey="vehicle_type" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Destination" sortKey="destination_location" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Way Bill" sortKey="way_bill_number" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Invoice" sortKey="invoice_number" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Status" sortKey="status" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="QR Count" sortKey="item_count" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Total Weight" sortKey="total_weight" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Total Bale Value" sortKey="total_bale_value" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Warehouse Note" sortKey="warehouse_note" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                  <SortableTh label="Updated" sortKey="updated_at" sortState={dispatchSort} onSort={(key) => toggleSort(dispatchSort, setDispatchSort, key)} />
                </tr>
              </thead>
              <tbody>
                {[...dispatches].sort((a, b) => compareBy(a[dispatchSort.key], b[dispatchSort.key], dispatchSort.direction)).map((row) => {
                  const isSentToWarehouse = row.status === 'sent_to_warehouse';
                  return (
                  <tr
                    key={row.id}
                    style={{
                      background: isSentToWarehouse ? '#e0f2fe' : undefined,
                      borderLeft: isSentToWarehouse ? '4px solid #0284c7' : undefined,
                    }}
                  >
                    <td style={S.td}>{row.id}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.dispatch_number || `DSP-${String(row.id).padStart(5, '0')}`}</td>
                    <td style={S.td}>{formatDateTime(row.dispatch_date || row.created_at)}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.vehicle_number}</td>
                    <td style={S.td}>{row.vehicle_type || '—'}</td>
                    <td style={S.td}>{row.destination_location || '—'}</td>
                    <td style={S.td}>{row.way_bill_number || '—'}</td>
                    <td style={S.td}>{row.invoice_number || '—'}</td>
                    <td style={S.td}><span style={statusBadge(row.status)}>{statusLabel(row.status)}</span></td>
                    <td style={S.td}>{row.item_count}</td>
                    <td style={S.td}>{Number(row.total_weight || 0).toFixed(2)} kg</td>
                    <td style={S.td}>₹{formatInr(row.total_bale_value)}</td>
                    <td style={S.td}>{row.warehouse_note || '—'}</td>
                    <td style={S.td}>{formatDateTime(row.updated_at)}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

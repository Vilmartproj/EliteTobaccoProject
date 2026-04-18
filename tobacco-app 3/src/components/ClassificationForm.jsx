import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import QRCameraScanner from './QRCameraScanner';
import { formatDateTime } from '../utils/dateFormat';

const CLASSIFICATION_ALLOWED_ROLES = new Set(['classification', 'supervisor']);

const cardStyle = {
  ..._S.card,
  border: '1px solid #b7d9f8',
  boxShadow: '0 4px 16px rgba(39,128,227,0.16)',
};

const labelStyle = { fontSize: 11, fontWeight: 800, color: '#2780e3', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle = { width: '100%', padding: '7px 10px', border: '1.5px solid #1f67b9', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1b3555', background: '#ffffff', boxSizing: 'border-box', outline: 'none' };
const btnPrimary = { background: 'linear-gradient(135deg, #20c997 0%, #2780e3 100%)', color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' };
const thStyle = { background: '#2780e3', color: '#ffffff', fontWeight: 800, padding: '7px 9px', border: '1px solid #1f67b9', textAlign: 'left', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, whiteSpace: 'nowrap' };
const tdStyle = { padding: '6px 9px', border: '1px solid #d9ebfb', color: '#1b3555', verticalAlign: 'middle', fontWeight: 700, whiteSpace: 'nowrap' };

export default function ClassificationForm({ user }) {
  const role = String(user?.role || '').toLowerCase();
  const canClassify = CLASSIFICATION_ALLOWED_ROLES.has(role);

  const [entries, setEntries] = useState([]);
  const [grades, setGrades] = useState([]);
  const [tobaccoTypes, setTobaccoTypes] = useState([]);

  // Form state
  const [scanCode, setScanCode] = useState('');
  const [codeStatus, setCodeStatus] = useState(null); // null | 'checking' | 'ok' | 'error' | 'already_classified'
  const [codeMsg, setCodeMsg] = useState('');
  const [bagInfo, setBagInfo] = useState(null);
  const [grade, setGrade] = useState('');
  const [rate, setRate] = useState('');
  const [tobaccoType, setTobaccoType] = useState('');
  const [classificationDate, setClassificationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  // Pending list — bags added before bulk save
  const [pendingBags, setPendingBags] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));

  const inputRef = useRef(null);
  const checkTimeoutRef = useRef(null);

  const loadData = async () => {
    const [entryRows, gradeRows, typeRows] = await Promise.all([
      api.getClassificationEntries({ employee_id: user.id, date: dateFilter || undefined }),
      api.getClassificationGrades(),
      api.getTobaccoTypes(),
    ]);
    setEntries(entryRows || []);
    setGrades(gradeRows || []);
    setTobaccoTypes(typeRows || []);
  };

  useEffect(() => { if (canClassify) loadData(); }, [canClassify, dateFilter]);

  const resetForm = () => {
    setScanCode('');
    setCodeStatus(null);
    setCodeMsg('');
    setBagInfo(null);
    setNote('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const resetAll = () => {
    resetForm();
    setGrade('');
    setRate('');
    setTobaccoType('');
    setClassificationDate(new Date().toISOString().slice(0, 10));
    setPendingBags([]);
  };

  const checkCode = async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      setCodeStatus(null);
      setCodeMsg('');
      setBagInfo(null);
      return;
    }
    // Prevent duplicates in the list
    if (pendingBags.some((b) => b.unique_code.toUpperCase() === trimmed.toUpperCase())) {
      setCodeStatus('error');
      setCodeMsg('Already in list');
      setBagInfo(null);
      setScanCode('');
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    setCodeStatus('checking');
    setCodeMsg('');
    try {
      // Track QR code — works for used codes too (classification needs used+matched codes)
      const trackResult = await api.trackQRCode(trimmed);
      if (!trackResult || !trackResult.qr) {
        setCodeStatus('error');
        setCodeMsg('QR code not found');
        setBagInfo(null);
        return;
      }

      // Check if warehouse-matched
      const dispatch = trackResult.dispatch;
      const isWarehouseMatched = dispatch && dispatch.item_scan_status === 'matched';
      if (!isWarehouseMatched) {
        setCodeStatus('error');
        setCodeMsg('QR code has not been matched at warehouse yet');
        setBagInfo(null);
        return;
      }

      // Check if already classified
      const existingEntries = await api.getClassificationEntries({});
      const alreadyClassified = (existingEntries || []).find(
        (e) => String(e.unique_code).trim().toUpperCase() === trimmed.toUpperCase()
      );
      if (alreadyClassified) {
        setCodeStatus('already_classified');
        setCodeMsg(`Already classified (Grade: ${alreadyClassified.grade})`);
        setBagInfo(null);
        return;
      }

      // Auto-add to list
      const qr = trackResult.qr;
      const bag = trackResult.bag;
      setPendingBags((prev) => [...prev, { unique_code: trimmed, buyer_code: qr.buyer_code || bag?.buyer_code || '', buyer_name: qr.buyer_name || bag?.buyer_name || '' }]);
      setCodeStatus(null);
      setCodeMsg('');
      setBagInfo(null);
      setScanCode('');
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      setCodeStatus('error');
      setCodeMsg(e.message);
      setBagInfo(null);
    }
  };

  const handleCodeChange = (value) => {
    setScanCode(value);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(() => checkCode(value), 400);
  };

  const handleScanDetected = (value) => {
    const trimmed = String(value || '').replace(/[\r\n\t]/g, '').trim();
    setScanCode(trimmed);
    checkCode(trimmed);
  };

  const handleRemoveFromPending = (code) => {
    setPendingBags((prev) => prev.filter((b) => b.unique_code !== code));
  };

  const handleSaveAll = async () => {
    if (pendingBags.length === 0) { setMessage('Add at least one QR code to the list'); return; }
    if (!grade) { setMessage('Select a grade'); return; }
    if (!tobaccoType) { setMessage('Select tobacco type'); return; }
    if (!classificationDate) { setMessage('Select classification date'); return; }

    setBusy(true);
    setMessage('');
    let successCount = 0;
    const errors = [];
    for (const bag of pendingBags) {
      try {
        await api.saveClassificationEntry({
          unique_code: bag.unique_code,
          grade,
          rate: rate !== '' ? Number(rate) : null,
          tobacco_type: tobaccoType,
          classification_date: classificationDate,
          note,
          actor_role: role,
          actor_id: user.id,
        });
        successCount++;
      } catch (e) {
        errors.push(`${bag.unique_code}: ${e.message}`);
      }
    }
    if (errors.length > 0) {
      setMessage(`✅ ${successCount} saved. Errors: ${errors.join('; ')}`);
    } else {
      setMessage(`✅ ${successCount} classification(s) saved successfully`);
    }
    setPendingBags([]);
    resetForm();
    await loadData();
    setBusy(false);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete classification for ${entry.unique_code}?`)) return;
    try {
      await api.deleteClassificationEntry(entry.id, { actor_role: role });
      setMessage(`✅ Classification for ${entry.unique_code} deleted`);
      await loadData();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({
      grade: entry.grade || '',
      rate: entry.rate ?? '',
      tobacco_type: entry.tobacco_type || '',
      classification_date: entry.classification_date ? entry.classification_date.slice(0, 10) : '',
      note: entry.note || '',
    });
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.grade) { setMessage('Grade is required'); return; }
    if (!editForm.tobacco_type) { setMessage('Tobacco type is required'); return; }
    if (!editForm.classification_date) { setMessage('Date is required'); return; }
    setBusy(true);
    try {
      await api.updateClassificationEntry(editingId, {
        ...editForm,
        rate: editForm.rate !== '' ? Number(editForm.rate) : null,
        actor_role: role,
      });
      setMessage('✅ Classification updated');
      setEditingId(null);
      setEditForm(null);
      await loadData();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [entries]
  );

  if (!canClassify) return null;

  const codeBorderColor =
    codeStatus === 'ok' ? '#20c997' :
    codeStatus === 'error' || codeStatus === 'already_classified' ? '#e74c3c' :
    codeStatus === 'checking' ? '#f39c12' : '#1f67b9';

  return (
    <div>
      {/* ── Classification Entry Form ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#2780e3', marginBottom: 14, letterSpacing: 0.5 }}>
          🔬 Classification Entry
        </div>

        {message && (
          <div style={message.startsWith('✅') ? _S.success : _S.error}>{message}</div>
        )}

        {/* QR Scan */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Scan QR Code</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
            <input
              ref={inputRef}
              style={{ ...inputStyle, borderColor: codeBorderColor }}
              value={scanCode}
              placeholder="Scan QR or type code manually"
              onChange={(e) => {
                const val = e.target.value;
                if (/[\r\n\t]$/.test(val)) {
                  const normalized = val.replace(/[\r\n\t]/g, '').trim();
                  handleScanDetected(normalized);
                  return;
                }
                handleCodeChange(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const normalized = String(e.currentTarget.value || '').replace(/[\r\n\t]/g, '').trim();
                  if (normalized) checkCode(normalized);
                }
              }}
            />
            <QRCameraScanner buttonLabel="📷 Scan" onDetected={handleScanDetected} />
          </div>
          {codeMsg && (
            <div style={{ fontSize: 12, marginTop: 4, color: codeStatus === 'ok' ? '#20c997' : '#e74c3c', fontWeight: 700 }}>
              {codeMsg}
            </div>
          )}
        </div>

        {/* Scanned QR codes list */}
        {pendingBags.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Scanned QR Codes ({pendingBags.length})</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {pendingBags.map((bag) => (
                <span
                  key={bag.unique_code}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e8f4fd', border: '1px solid #b7d9f8', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#1b3555' }}
                >
                  {bag.unique_code}
                  <button
                    onClick={() => handleRemoveFromPending(bag.unique_code)}
                    style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontWeight: 900, fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                    title="Remove"
                  >✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Grade, Rate, Type, Date fields in a grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Grade *</label>
            <select
              style={inputStyle}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">— Select Grade —</option>
              {grades.map((g) => (
                <option key={g.id} value={g.code}>{g.code}{g.description ? ` - ${g.description}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Rate</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              min="0"
              value={rate}
              placeholder="Enter rate"
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Tobacco Type *</label>
            <select
              style={inputStyle}
              value={tobaccoType}
              onChange={(e) => setTobaccoType(e.target.value)}
            >
              <option value="">— Select Type —</option>
              {tobaccoTypes.map((t) => (
                <option key={t.id} value={t.type}>{t.type}{t.description ? ` - ${t.description}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Date of Classification *</label>
            <input
              style={inputStyle}
              type="date"
              value={classificationDate}
              onChange={(e) => setClassificationDate(e.target.value)}
            />
          </div>
        </div>

        {/* Note (optional) */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Note (optional)</label>
          <input
            style={inputStyle}
            value={note}
            placeholder="Optional note"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Save All / Clear buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            style={{ ...btnPrimary, opacity: busy || pendingBags.length === 0 ? 0.5 : 1, padding: '10px 24px' }}
            disabled={busy || pendingBags.length === 0}
            onClick={handleSaveAll}
          >
            {busy ? 'Saving...' : `💾 Save Classification (${pendingBags.length})`}
          </button>
          <button
            style={{ ...btnPrimary, background: '#6c757d', border: '1px solid #5a6268' }}
            onClick={resetAll}
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Classification Entries Table ──────────────────────────────── */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#2780e3' }}>
            📋 Classification Entries ({sortedEntries.length})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Date Filter</label>
            <input
              style={{ ...inputStyle, width: 160 }}
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                style={{ ...btnPrimary, background: '#6c757d', border: '1px solid #5a6268', padding: '6px 12px', fontSize: 11 }}
                onClick={() => setDateFilter('')}
              >
                All Dates
              </button>
            )}
          </div>
        </div>

        {sortedEntries.length === 0 ? (
          <div style={{ color: '#777', fontSize: 13 }}>No classification entries found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={_S.table}>
              <thead>
                <tr>
                  <th style={thStyle}>QR Code</th>
                  <th style={thStyle}>Grade</th>
                  <th style={thStyle}>Rate</th>
                  <th style={thStyle}>Tobacco Type</th>
                  <th style={thStyle}>Classification Date</th>
                  <th style={thStyle}>Note</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr key={entry.id}>
                    {editingId === entry.id ? (
                      <>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{entry.unique_code}</td>
                        <td style={tdStyle}>
                          <select style={{ ...inputStyle, width: 100 }} value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}>
                            <option value="">—</option>
                            {grades.map((g) => <option key={g.id} value={g.code}>{g.code}</option>)}
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <input style={{ ...inputStyle, width: 80 }} type="number" step="0.01" value={editForm.rate} onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })} />
                        </td>
                        <td style={tdStyle}>
                          <select style={{ ...inputStyle, width: 120 }} value={editForm.tobacco_type} onChange={(e) => setEditForm({ ...editForm, tobacco_type: e.target.value })}>
                            <option value="">—</option>
                            {tobaccoTypes.map((t) => <option key={t.id} value={t.type}>{t.type}</option>)}
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <input style={{ ...inputStyle, width: 130 }} type="date" value={editForm.classification_date} onChange={(e) => setEditForm({ ...editForm, classification_date: e.target.value })} />
                        </td>
                        <td style={tdStyle}>
                          <input style={{ ...inputStyle, width: 120 }} value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
                        </td>
                        <td style={tdStyle}>{formatDateTime(entry.created_at)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }} onClick={handleSaveEdit} disabled={busy}>Save</button>
                            <button style={{ ...btnPrimary, background: '#6c757d', border: '1px solid #5a6268', padding: '4px 10px', fontSize: 11 }} onClick={handleCancelEdit}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{entry.unique_code}</td>
                        <td style={tdStyle}>{entry.grade}</td>
                        <td style={tdStyle}>{entry.rate != null ? Number(entry.rate).toFixed(2) : '—'}</td>
                        <td style={tdStyle}>{entry.tobacco_type}</td>
                        <td style={tdStyle}>{entry.classification_date ? entry.classification_date.slice(0, 10) : '—'}</td>
                        <td style={tdStyle}>{entry.note || '—'}</td>
                        <td style={tdStyle}>{formatDateTime(entry.created_at)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }} onClick={() => handleEdit(entry)}>Edit</button>
                            <button style={{ ...btnPrimary, background: '#c62828', border: '1px solid #b71c1c', padding: '4px 10px', fontSize: 11 }} onClick={() => handleDelete(entry)}>Del</button>
                          </div>
                        </td>
                      </>
                    )}
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { formatDateTime } from '../utils/dateFormat';

const PROCESS_TYPES = [
  { key: 'butting', label: '🪓 Butting', color: '#e65100' },
  { key: 'stripping', label: '🔪 Stripping', color: '#1565c0' },
  { key: 'grading', label: '📊 Grading', color: '#2e7d32' },
  { key: 'kutcha', label: '🏗️ Kutcha', color: '#6a1b9a' },
];

export default function ProcessingForm({ user, S }) {
  // Classification entries for selection
  const [classificationEntries, setClassificationEntries] = useState([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [activeProcessType, setActiveProcessType] = useState('');

  // EL Grades
  const [elGrades, setElGrades] = useState([]);

  // Form fields
  const [bales, setBales] = useState('');
  const [weight, setWeight] = useState('');
  const [elGrade, setElGrade] = useState('');
  const [generateQr, setGenerateQr] = useState(false);
  const [note, setNote] = useState('');

  // Processing entries table
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const loadClassificationEntries = async () => {
    try {
      const rows = await api.getClassificationEntries({ employee_id: user.id });
      setClassificationEntries(rows);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const loadElGrades = async () => {
    try {
      const rows = await api.getElGrades();
      setElGrades(rows);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const loadEntries = async () => {
    try {
      const rows = await api.getProcessingEntries({ employee_id: user.id });
      setEntries(rows);
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => {
    loadClassificationEntries();
    loadElGrades();
    loadEntries();
  }, [user.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedEntries = useMemo(
    () => classificationEntries.filter((ce) => selectedEntryIds.includes(ce.id)),
    [classificationEntries, selectedEntryIds]
  );

  const toggleEntrySelection = (id) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllEntries = () => {
    if (selectedEntryIds.length === classificationEntries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(classificationEntries.map((ce) => ce.id));
    }
  };

  const resetForm = () => {
    setBales('');
    setWeight('');
    setElGrade('');
    setGenerateQr(false);
    setNote('');
  };

  const handleSave = async () => {
    if (selectedEntryIds.length === 0) { setMsg('Select at least one classification entry'); return; }
    if (!activeProcessType) { setMsg('Select a process type (Butting, Stripping, Grading, or Kutcha)'); return; }
    if (!bales || Number(bales) <= 0) { setMsg('Enter valid number of bales'); return; }
    if (!weight || Number(weight) <= 0) { setMsg('Enter valid weight'); return; }
    if (!elGrade) { setMsg('Select an EL grade'); return; }

    setSaving(true);
    setMsg('');
    try {
      const normalizedRole = String(user?.role || '').toLowerCase();
      // Save a single processing entry using the first selected classification entry
      const result = await api.saveProcessingEntry({
        classification_entry_id: selectedEntryIds[0],
        process_type: activeProcessType,
        bales: Number(bales),
        weight: Number(weight),
        el_grade: elGrade,
        generate_qr: generateQr,
        note,
        actor_role: normalizedRole,
        actor_id: user.id,
      });
      const qrCodes = parseQrCodes(result.generated_qr_code);
      const qrSuffix = qrCodes.length > 0 ? ` | ${qrCodes.length} QR codes generated` : '';
      setMsg(`✅ ${activeProcessType.charAt(0).toUpperCase() + activeProcessType.slice(1)} entry saved — ${bales} bale(s)${qrSuffix}`);
      resetForm();
      await loadEntries();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this ${entry.process_type} entry?`)) return;
    try {
      const normalizedRole = String(user?.role || '').toLowerCase();
      await api.deleteProcessingEntry(entry.id, { actor_role: normalizedRole });
      setMsg(`✅ Entry deleted`);
      await loadEntries();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const parseQrCodes = (value) => {
    if (!value) return [];
    try { const arr = JSON.parse(value); return Array.isArray(arr) ? arr : [value]; }
    catch { return [value]; }
  };

  const handlePrintQr = (qrCodes) => {
    if (!qrCodes || qrCodes.length === 0) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow pop-ups to print QR codes'); return; }
    const cards = qrCodes.map((code) => `
      <div class="card">
        <canvas id="qr-${code}"></canvas>
        <div class="code">${code}</div>
      </div>
    `).join('');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Processing QR Codes</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; background: #fff; margin: 20px; }
        h2 { text-align: center; color: #c0392b; font-size: 18px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
        .card { border: 1.5px solid #e0c0bc; border-radius: 8px; padding: 10px; text-align: center; page-break-inside: avoid; }
        .card canvas { display: block; margin: 0 auto; }
        .code { font-weight: bold; font-size: 13px; color: #c0392b; margin-top: 6px; word-break: break-all; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>
      <h2>Elite Leaf Tobacco — Processing QR Codes</h2>
      <div class="grid">${cards}</div>
      <script>
        const codes = ${JSON.stringify(qrCodes)};
        codes.forEach(function(code) {
          var canvas = document.getElementById('qr-' + code);
          if (canvas) QRCode.toCanvas(canvas, code, { width: 120, margin: 1 });
        });
        setTimeout(function() { window.print(); }, 600);
      <\/script>
    </body></html>`);
    win.document.close();
  };

  const sortedElGrades = [...elGrades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  // Filter entries by selected process type for display
  const filteredEntries = activeProcessType
    ? entries.filter((e) => e.process_type === activeProcessType)
    : entries;

  const processTypeConfig = PROCESS_TYPES.find((p) => p.key === activeProcessType);

  return (
    <div>
      {/* Classification Entry Selector — Dropdown Multi-select */}
      <div style={S.card}>
        <div style={S.subheading}>Select Classification Entries</div>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            style={{
              ...S.input,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 38,
              flexWrap: 'wrap',
              gap: 4,
              paddingRight: 30,
            }}
            onClick={() => setDropdownOpen((v) => !v)}
          >
            {selectedEntryIds.length === 0 ? (
              <span style={{ color: '#999' }}>-- Select classification entries --</span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 13 }}>
                {selectedEntryIds.length} selected
              </span>
            )}
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>
              {dropdownOpen ? '▲' : '▼'}
            </span>
          </div>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1px solid #ccc', borderRadius: 8,
              maxHeight: 250, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}>
              <div
                style={{ padding: '6px 10px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1565c0' }}
                onClick={selectAllEntries}
              >
                {selectedEntryIds.length === classificationEntries.length ? '☑ Deselect All' : '☐ Select All'}
              </div>
              {classificationEntries.length === 0 && (
                <div style={{ color: '#999', fontSize: 13, padding: 10 }}>No classification entries found.</div>
              )}
              {classificationEntries.map((ce) => {
                const isSelected = selectedEntryIds.includes(ce.id);
                return (
                  <label
                    key={ce.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', cursor: 'pointer',
                      background: isSelected ? '#e3f2fd' : 'transparent',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEntrySelection(ce.id)}
                      style={{ accentColor: '#1565c0' }}
                    />
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ce.unique_code}</span>
                    <span>— {ce.grade}</span>
                    <span>— {ce.tobacco_type}</span>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: ce.fcv === 'FCV' ? '#c8e6c9' : ce.fcv === 'NON-FCV' ? '#ffcdd2' : '#eee',
                      color: ce.fcv === 'FCV' ? '#2e7d32' : ce.fcv === 'NON-FCV' ? '#c62828' : '#666',
                    }}>
                      {ce.fcv || 'N/A'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {selectedEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {selectedEntries.map((ce) => (
              <span
                key={ce.id}
                style={{
                  ...S.badge(ce.fcv === 'FCV' ? 'green' : 'red'),
                  cursor: 'pointer',
                  fontSize: 11,
                }}
                title="Click to deselect"
                onClick={() => toggleEntrySelection(ce.id)}
              >
                {ce.unique_code} ✕
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Process Type Buttons */}
      <div style={S.card}>
        <div style={S.subheading}>Select Process Type</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PROCESS_TYPES.map((pt) => (
            <button
              key={pt.key}
              style={{
                padding: '10px 20px',
                border: activeProcessType === pt.key ? `3px solid ${pt.color}` : '2px solid #ccc',
                borderRadius: 10,
                background: activeProcessType === pt.key ? pt.color : '#fff',
                color: activeProcessType === pt.key ? '#fff' : pt.color,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: 0.3,
              }}
              onClick={() => setActiveProcessType(pt.key)}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Form — shown only when classification entries and process type are selected */}
      {selectedEntries.length > 0 && activeProcessType && (
        <div style={S.card}>
          <div style={{ ...S.subheading, color: processTypeConfig?.color || S.subheading?.color }}>
            {processTypeConfig?.label} Entry — {selectedEntries.length} classification{selectedEntries.length > 1 ? 's' : ''} selected
          </div>
          {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={S.label}>Bales *</label>
              <input
                style={S.input}
                type="number"
                min="1"
                value={bales}
                onChange={(e) => setBales(e.target.value)}
                placeholder="Number of bales"
              />
            </div>
            <div>
              <label style={S.label}>Weight (kg) *</label>
              <input
                style={S.input}
                type="number"
                min="0.001"
                step="0.001"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Weight in kg"
              />
            </div>
            <div>
              <label style={S.label}>EL Grade *</label>
              <select style={S.input} value={elGrade} onChange={(e) => setElGrade(e.target.value)}>
                <option value="">-- Select EL Grade --</option>
                {sortedElGrades.map((g) => (
                  <option key={g.id} value={g.code}>
                    {g.code}{g.description ? ` - ${g.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Note</label>
              <input
                style={S.input}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <input type="checkbox" checked={generateQr} onChange={(e) => setGenerateQr(e.target.checked)} />
              Generate New QR Code (1 per bale)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ ...S.btnPrimary, flex: 'none', padding: '10px 24px', opacity: saving ? 0.6 : 1, background: processTypeConfig?.color || undefined }}
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : `💾 Save ${processTypeConfig?.label || ''}`}
            </button>
            <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 24px' }} onClick={resetForm}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div style={S.card}>
        <div style={S.subheading}>
          Processing Entries {activeProcessType ? `— ${processTypeConfig?.label}` : '— All Types'} ({filteredEntries.length})
        </div>
        {!activeProcessType && msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

        {filteredEntries.length === 0 ? (
          <div style={{ color: '#999', fontSize: 13 }}>No processing entries yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Generated QR Codes</th>
                  <th style={S.th}>Bales</th>
                  <th style={S.th}>Weight</th>
                  <th style={S.th}>EL Grade</th>
                  <th style={S.th}>Notes</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const qrCodes = parseQrCodes(entry.generated_qr_code);
                  return (
                    <tr key={entry.id}>
                      <td style={{ ...S.td, fontFamily: 'monospace', maxWidth: 260 }}>
                        {qrCodes.length > 0 ? (
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                              {qrCodes.map((code) => (
                                <span key={code} style={{ fontSize: 11, background: '#e3f2fd', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  {code}
                                </span>
                              ))}
                            </div>
                            <button
                              style={{ ...S.btnSecondary, padding: '3px 10px', fontSize: 11 }}
                              onClick={() => handlePrintQr(qrCodes)}
                              title="Print QR codes"
                            >
                              🖨️ Print ({qrCodes.length})
                            </button>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={S.td}>{entry.bales}</td>
                      <td style={S.td}>{Number(entry.weight).toFixed(3)} kg</td>
                      <td style={{ ...S.td, fontWeight: 800 }}>{entry.el_grade}</td>
                      <td style={S.td}>{entry.note || '—'}</td>
                      <td style={S.td}>
                        <button style={{ ...S.btnIcon, color: '#c62828' }} onClick={() => handleDelete(entry)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/BuyerDashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import BuyingForm from './BuyingForm';
import QRCode from './QRCode';
import { printQRCodes } from '../utils/printQR';
import { exportCSV } from '../utils/exportCSV';
import { exportBagsPDF, exportBagsXLS, shareBagsWhatsApp } from '../utils/exportBags';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

export default function BuyerDashboard({ user, onLogout }) {
  const [view, setView]     = useState('form');
  const [bags, setBags]     = useState([]);
  const [qrCodes, setQR]    = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoad]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMsg, setEditMsg] = useState('');

  const loadBags = async () => {
    setLoad(true);
    try { setBags(await api.getBags(user.id)); } finally { setLoad(false); }
  };
  const loadQR = async () => {
    const all = await api.getQRCodes();
    setQR(all.filter(q => q.buyer_id === user.id));
  };
  const loadGrades = async () => {
    setGrades(await api.getGrades());
  };

  useEffect(() => { loadBags(); loadQR(); loadGrades(); }, []);

  const switchView = (v) => {
    setView(v);
    setEditMsg('');
    if (v !== 'bags') {
      setEditingId(null);
      setEditForm(null);
    }
    if (v === 'bags') loadBags();
    if (v === 'qr')   loadQR();
    if (v === 'grades') loadGrades();
  };

  const formatUpdatedAt = (value) => formatDateTime(value);

  const startEdit = (bag) => {
    setEditMsg('');
    setEditingId(bag.id);
    setEditForm({
      fcv: bag.fcv || '',
      apf_number: bag.apf_number || '',
      tobacco_grade: bag.tobacco_grade || '',
      weight: bag.weight ?? '',
      buyer_grade: bag.buyer_grade || '',
      date_of_purchase: toInputDateTime(bag.date_of_purchase) || nowInputDateTime(),
      purchase_location: bag.purchase_location || '',
    });
  };

  const sortedGrades = [...grades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const gradeCodes = sortedGrades.map(g => g.code);

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.apf_number || !editForm.tobacco_grade || !editForm.weight || !editForm.buyer_grade) {
      setEditMsg('Please fill required fields before saving');
      return;
    }
    try {
      await api.updateBag(editingId, {
        ...editForm,
        weight: parseFloat(editForm.weight),
        date_of_purchase: fromInputDateTime(editForm.date_of_purchase),
      });
      setEditMsg('✅ Bag updated successfully');
      setEditingId(null);
      setEditForm(null);
      await loadBags();
    } catch (e) {
      setEditMsg(e.message);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditMsg('');
  };

  const exportBtn = {
    flex: 'none',
    padding: '8px 14px',
    fontSize: 13,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 2px 8px rgba(230,57,70,0.14)',
  };

  const exportBtnXls = {
    ...S.btnPrimary,
    ...exportBtn,
    background: '#1f7a3d',
  };

  const exportBtnPdf = {
    ...S.btnPrimary,
    ...exportBtn,
    background: '#c62828',
  };

  const exportBtnWhatsApp = {
    ...S.btnPrimary,
    ...exportBtn,
    background: '#25D366',
    color: '#083b1f',
    fontWeight: 800,
  };

  const exportBtnCsv = {
    ...S.btnSecondary,
    ...exportBtn,
    boxShadow: '0 2px 8px rgba(214,40,57,0.1)',
  };

  return (
    <div style={S.app}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topBarTitle}>🌿 Elite Tobacco</div>
        <div style={S.buyerInfo}>
          <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
          <span style={S.bagsBadge}>🛍️ {bags.length} Bags</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={S.page}>
        <div style={S.tabs}>
          <button style={S.tab(view === 'form')} onClick={() => switchView('form')}>📝 New Bag Entry</button>
          <button style={S.tab(view === 'bags')} onClick={() => switchView('bags')}>📦 My Bags ({bags.length})</button>
          <button style={S.tab(view === 'qr')}   onClick={() => switchView('qr')}>🔲 My QR Codes ({qrCodes.length})</button>
          <button style={S.tab(view === 'grades')} onClick={() => switchView('grades')}>🏷️ Grade Info ({grades.length})</button>
        </div>

        {view === 'form' && (
          <BuyingForm buyer={user} grades={grades} onSaveExit={() => switchView('bags')} />
        )}

        {view === 'bags' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>All Bags ({bags.length})</div>
              {bags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    style={exportBtnXls}
                    onClick={() => exportBagsXLS(bags, `${user.name}_bags_${new Date().toISOString().split('T')[0]}.xls`)}
                  >
                    ⬇ Export XLS
                  </button>
                  <button
                    style={exportBtnPdf}
                    onClick={() => exportBagsPDF(bags, `${user.name} Bags Report - ${new Date().toISOString().split('T')[0]}`)}
                  >
                    📄 Export PDF
                  </button>
                  <button
                    style={exportBtnWhatsApp}
                    onClick={() => shareBagsWhatsApp(bags)}
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    style={exportBtnCsv}
                    onClick={() => exportCSV(bags, `${user.name}_bags_${new Date().toISOString().split('T')[0]}.csv`)}
                  >
                    ⬇ CSV
                  </button>
                </div>
              )}
            </div>
            {editMsg && <div style={editMsg.startsWith('✅') ? S.success : S.error}>{editMsg}</div>}
            {loading ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Loading…</p>
            : bags.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No bags saved yet.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Code','APF','TB Grade','Weight','B.Grade','Date','Location','FCV','Updated','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {bags.map((b, i) => (
                      editingId === b.id ? (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}><b>{b.unique_code}</b></td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 100 }} value={editForm?.apf_number ?? ''} onChange={e => setEditForm(f => ({ ...f, apf_number: e.target.value }))} /></td>
                          <td style={S.td}>
                            <select style={{ ...S.input, minWidth: 110 }} value={editForm?.tobacco_grade ?? ''} onChange={e => setEditForm(f => ({ ...f, tobacco_grade: e.target.value }))}>
                              <option value="">Select</option>
                              {gradeCodes.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 90 }} type="number" value={editForm?.weight ?? ''} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} /></td>
                          <td style={S.td}>
                            <select style={{ ...S.input, minWidth: 110 }} value={editForm?.buyer_grade ?? ''} onChange={e => setEditForm(f => ({ ...f, buyer_grade: e.target.value }))}>
                              <option value="">Select</option>
                              {gradeCodes.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </td>
                          <td style={S.td}>
                            <input style={{ ...S.input, minWidth: 180 }} type="datetime-local" value={editForm?.date_of_purchase ?? nowInputDateTime()} onChange={e => setEditForm(f => ({ ...f, date_of_purchase: e.target.value }))} />
                            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>IST: {fromInputDateTime(editForm?.date_of_purchase)}</div>
                          </td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 120 }} value={editForm?.purchase_location ?? ''} onChange={e => setEditForm(f => ({ ...f, purchase_location: e.target.value }))} /></td>
                          <td style={S.td}>
                            <select style={{ ...S.input, minWidth: 95 }} value={editForm?.fcv ?? ''} onChange={e => setEditForm(f => ({ ...f, fcv: e.target.value }))}>
                              <option value="">Select</option>
                              <option value="FCV">FCV</option>
                              <option value="NON-FCV">NON-FCV</option>
                            </select>
                          </td>
                          <td style={S.td}>{formatUpdatedAt(b.updated_at)}</td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={saveEdit}>Save</button>
                              <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}><b>{b.unique_code}</b></td>
                          <td style={S.td}>{b.apf_number}</td>
                          <td style={S.td}>{b.tobacco_grade}</td>
                          <td style={S.td}>{b.weight} kg</td>
                          <td style={S.td}>{b.buyer_grade}</td>
                          <td style={S.td}>{formatDateTime(b.date_of_purchase)}</td>
                          <td style={S.td}>{b.purchase_location}</td>
                          <td style={S.td}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
                          <td style={S.td}>{formatUpdatedAt(b.updated_at)}</td>
                          <td style={S.td}>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => startEdit(b)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'qr' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>Your QR Codes ({qrCodes.length})</div>
              {qrCodes.length > 0 && (
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '8px 18px', fontSize: 13 }}
                  onClick={() => printQRCodes(qrCodes, { [user.id]: user })}>
                  🖨️ Print QR Codes
                </button>
              )}
            </div>
            {qrCodes.length === 0
              ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No QR codes assigned yet. Contact admin.</p>
              : (
                <div style={S.qrGrid}>
                  {qrCodes.map(q => (
                    <div key={q.id} style={{ ...S.qrCard, opacity: q.used ? 0.5 : 1 }}>
                      <QRCode value={q.unique_code} size={110} />
                      <div style={{ marginTop: 8, fontWeight: 'bold', fontSize: 14 }}>{q.unique_code}</div>
                      <span style={S.badge(q.used ? 'red' : 'green')}>{q.used ? 'Used' : 'Available'}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {view === 'grades' && (
          <div style={S.card}>
            <div style={S.subheading}>Tobacco Board Grades ({grades.length})</div>
            {grades.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>No grade data available.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>{['Grade Code','Description'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sortedGrades.map((g, i) => (
                      <tr key={g.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                        <td style={S.td}><b>{g.code}</b></td>
                        <td style={S.td}>{g.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

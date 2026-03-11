// src/components/BuyerDashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import BuyingForm from './BuyingForm';
import QRCode from './QRCode';
import SearchableSelect from './SearchableSelect';
import ApiStatusBadge from './ApiStatusBadge';
import { printQRCodes } from '../utils/printQR';
import { exportBagsPDF } from '../utils/exportBags';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

export default function BuyerDashboard({ user, onLogout }) {
  const [view, setView]     = useState('form');
  const [bags, setBags]     = useState([]);
  const [qrCodes, setQR]    = useState([]);
  const [tobaccoBoardGrades, setTobaccoBoardGrades] = useState([]);
  const [buyerGrades, setBuyerGrades] = useState([]);
  const [apfNumbers, setApfNumbers] = useState([]);
  const [loading, setLoad]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMsg, setEditMsg] = useState('');
  const [enabledBuyerActionIds, setEnabledBuyerActionIds] = useState([]);
  const [now, setNow] = useState(new Date());

  const loadBags = async () => {
    setLoad(true);
    try { setBags(await api.getBags(user.id)); } finally { setLoad(false); }
  };
  const loadQR = async () => {
    const all = await api.getQRCodes();
    setQR(all.filter(q => q.buyer_id === user.id));
  };
  const loadGrades = async () => {
    const [tbGrades, byGrades] = await Promise.all([
      api.getGrades('tobacco_board'),
      api.getGrades('buyer'),
    ]);
    setTobaccoBoardGrades(tbGrades);
    setBuyerGrades(byGrades);
  };

  const loadApfNumbers = async () => {
    setApfNumbers(await api.getApfNumbers());
  };

  const loadBuyerBagActionSetting = async () => {
    try {
      const res = await api.getBuyerBagActionSetting();
      const ids = Array.isArray(res?.enabled_buyer_ids) ? res.enabled_buyer_ids : [];
      setEnabledBuyerActionIds(ids.map(Number));
    } catch {
      setEnabledBuyerActionIds([]);
    }
  };

  useEffect(() => { loadBags(); loadQR(); loadGrades(); loadApfNumbers(); loadBuyerBagActionSetting(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const switchView = (v) => {
    setView(v);
    setEditMsg('');
    if (v !== 'bags') {
      setEditingId(null);
      setEditForm(null);
    }
    if (v === 'bags') loadBags();
    if (v === 'qr')   loadQR();
    if (v === 'tb-grades' || v === 'buyer-grades') loadGrades();
    if (v === 'form' || v === 'bags') loadApfNumbers();
    if (v === 'bags') loadBuyerBagActionSetting();
  };

  const isAfter6pm = now.getHours() >= 18;
  const canManageBagActions = !isAfter6pm || enabledBuyerActionIds.includes(Number(user.id));

  useEffect(() => {
    if (!canManageBagActions && editingId !== null) {
      setEditingId(null);
      setEditForm(null);
      setEditMsg('Action access is disabled after 6 PM. Contact admin to enable it.');
    }
  }, [canManageBagActions, editingId]);

  const formatUpdatedAt = (value) => formatDateTime(value);
  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const reportRows = bags.map((bag) => {
    const weightValue = toNumber(bag.weight);
    const rateValue = toNumber(bag.rate);
    const baleValue = Number.isFinite(Number(bag.bale_value))
      ? Number(bag.bale_value)
      : Number((weightValue * rateValue).toFixed(2));
    return {
      ...bag,
      weightValue,
      rateValue,
      baleValue,
    };
  });

  const totalBaleValue = reportRows.reduce((sum, row) => sum + row.baleValue, 0);
  const totalWeight = reportRows.reduce((sum, row) => sum + row.weightValue, 0);

  const startEdit = (bag) => {
    setEditMsg('');
    setEditingId(bag.id);
    const rateValue = bag.rate ?? '';
    const weightValue = bag.weight ?? '';
    const computedBaleValue = Number.isFinite(Number(weightValue)) && Number.isFinite(Number(rateValue))
      ? Number((Number(weightValue) * Number(rateValue)).toFixed(2))
      : (bag.bale_value ?? '');
    setEditForm({
      fcv: bag.fcv || '',
      apf_number: bag.apf_number || '',
      tobacco_grade: bag.tobacco_grade || '',
      weight: weightValue,
      rate: rateValue,
      bale_value: computedBaleValue,
      buyer_grade: bag.buyer_grade || '',
      date_of_purchase: toInputDateTime(bag.date_of_purchase) || nowInputDateTime(),
    });
  };

  const sortedTobaccoBoardGrades = [...tobaccoBoardGrades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const sortedBuyerGrades = [...buyerGrades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const tobaccoBoardGradeCodes = sortedTobaccoBoardGrades.map(g => g.code);
  const buyerGradeCodes = sortedBuyerGrades.map(g => g.code);
  const tobaccoBoardGradeOptions = tobaccoBoardGradeCodes.map(g => ({ value: g, label: g }));
  const buyerGradeOptions = buyerGradeCodes.map(g => ({ value: g, label: g }));
  const apfNumberOptions = [...apfNumbers]
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }))
    .map(a => ({
      value: String(a.number),
      label: a.description ? `${a.number} - ${a.description}` : String(a.number),
      keywords: `${a.number} ${a.description || ''}`,
    }));

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.apf_number || !editForm.tobacco_grade || !editForm.weight || !editForm.buyer_grade) {
      setEditMsg('Please fill required fields before saving');
      return;
    }
    try {
      const numericWeight = parseFloat(editForm.weight);
      const numericRate = parseFloat(editForm.rate);
      const baleValue = Number.isFinite(numericWeight) && Number.isFinite(numericRate)
        ? Number((numericWeight * numericRate).toFixed(2))
        : (editForm.bale_value ?? null);
      await api.updateBag(editingId, {
        ...editForm,
        weight: numericWeight,
        rate: Number.isFinite(numericRate) ? numericRate : null,
        bale_value: baleValue,
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

  const exportBtnPdf = {
    ...S.btnPrimary,
    ...exportBtn,
    background: '#c62828',
  };

  return (
    <div style={S.app}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topBarTitle}>🌿 Elite Tobacco</div>
        <div style={S.buyerInfo}>
          <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
          <ApiStatusBadge />
          <span style={S.bagsBadge}>🛍️ {bags.length} Bags</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={S.page}>
        <div style={S.tabs}>
          <button style={S.tab(view === 'form')} onClick={() => switchView('form')}>📝 New Bag Entry</button>
          <button style={S.tab(view === 'bags')} onClick={() => switchView('bags')}>📦 My Bags ({bags.length})</button>
          <button style={S.tab(view === 'bale-report')} onClick={() => switchView('bale-report')}>📊 Bale Value Report</button>
          <button style={S.tab(view === 'qr')}   onClick={() => switchView('qr')}>🔲 My QR Codes ({qrCodes.length})</button>
          <button style={S.tab(view === 'tb-grades')} onClick={() => switchView('tb-grades')}>🏷️ TB Grades ({tobaccoBoardGrades.length})</button>
          <button style={S.tab(view === 'buyer-grades')} onClick={() => switchView('buyer-grades')}>🏷️ Buyer Grades ({buyerGrades.length})</button>
        </div>

        {view === 'form' && (
          <BuyingForm
            buyer={user}
            grades={{ tobaccoBoard: tobaccoBoardGrades, buyer: buyerGrades }}
            apfNumbers={apfNumbers}
            onSaveExit={() => switchView('bags')}
          />
        )}

        {view === 'bags' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>All Bags ({bags.length})</div>
              {bags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    style={exportBtnPdf}
                    onClick={() => exportBagsPDF(bags, `${user.name} Bags Report - ${new Date().toISOString().split('T')[0]}`)}
                  >
                    📄 Export PDF
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
                    {[
                      'Code','APF','TB Grade','Weight','Rate','Bale Value','B.Grade','Date','FCV','Updated',
                      ...(canManageBagActions ? ['Action'] : []),
                    ].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {bags.map((b, i) => (
                      editingId === b.id ? (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}><b>{b.unique_code}</b></td>
                          <td style={S.td}>
                            <SearchableSelect
                              options={apfNumberOptions}
                              value={editForm?.apf_number ?? ''}
                              onChange={(val) => setEditForm(f => ({ ...f, apf_number: val }))}
                              inputStyle={{ ...S.input, minWidth: 100 }}
                              placeholder="Search"
                            />
                          </td>
                          <td style={S.td}>
                            <SearchableSelect
                              options={tobaccoBoardGradeOptions}
                              value={editForm?.tobacco_grade ?? ''}
                              onChange={(val) => setEditForm(f => ({ ...f, tobacco_grade: val }))}
                              inputStyle={{ ...S.input, minWidth: 110 }}
                              placeholder="Search"
                            />
                          </td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 90 }} type="number" value={editForm?.weight ?? ''} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} /></td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 90 }} type="number" step="0.01" value={editForm?.rate ?? ''} onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))} /></td>
                          <td style={S.td}>
                            {Number.isFinite(Number(editForm?.weight)) && Number.isFinite(Number(editForm?.rate))
                              ? Number((Number(editForm.weight) * Number(editForm.rate)).toFixed(2))
                              : (editForm?.bale_value ?? '—')}
                          </td>
                          <td style={S.td}>
                            <SearchableSelect
                              options={buyerGradeOptions}
                              value={editForm?.buyer_grade ?? ''}
                              onChange={(val) => setEditForm(f => ({ ...f, buyer_grade: val }))}
                              inputStyle={{ ...S.input, minWidth: 110 }}
                              placeholder="Search"
                            />
                          </td>
                          <td style={S.td}>
                            <input style={{ ...S.input, minWidth: 180 }} type="datetime-local" value={editForm?.date_of_purchase ?? nowInputDateTime()} onChange={e => setEditForm(f => ({ ...f, date_of_purchase: e.target.value }))} />
                            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>IST: {fromInputDateTime(editForm?.date_of_purchase)}</div>
                          </td>
                          <td style={S.td}>
                            <select style={{ ...S.input, minWidth: 95 }} value={editForm?.fcv ?? ''} onChange={e => setEditForm(f => ({ ...f, fcv: e.target.value }))}>
                              <option value="">Select</option>
                              <option value="FCV">FCV</option>
                              <option value="NON-FCV">NON-FCV</option>
                            </select>
                          </td>
                          <td style={S.td}>{formatUpdatedAt(b.updated_at)}</td>
                          {canManageBagActions && (
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={saveEdit}>Save</button>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ) : (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}><b>{b.unique_code}</b></td>
                          <td style={S.td}>{b.apf_number}</td>
                          <td style={S.td}>{b.tobacco_grade}</td>
                          <td style={S.td}>{b.weight} kg</td>
                          <td style={S.td}>{b.rate ?? '—'}</td>
                          <td style={S.td}>{b.bale_value ?? '—'}</td>
                          <td style={S.td}>{b.buyer_grade}</td>
                          <td style={S.td}>{formatDateTime(b.date_of_purchase)}</td>
                          <td style={S.td}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
                          <td style={S.td}>{formatUpdatedAt(b.updated_at)}</td>
                          {canManageBagActions && (
                            <td style={S.td}>
                              <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => startEdit(b)}>
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
                {!canManageBagActions && (
                  <div style={{ marginTop: 10, color: '#9c640c', fontSize: 12 }}>
                    Action access is hidden automatically after 6:00 PM. Contact admin to enable it again.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'bale-report' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={S.subheading}>Bale Value Report ({reportRows.length})</div>
              <span style={S.badge('green')}>Total Bale Value: {totalBaleValue.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={S.badge()}>Total Weight: {totalWeight.toFixed(2)} kg</span>
              <span style={S.badge('green')}>Average Rate: {reportRows.length ? (reportRows.reduce((sum, row) => sum + row.rateValue, 0) / reportRows.length).toFixed(2) : '0.00'}</span>
            </div>
            {reportRows.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>No bags available for bale value report.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>{['Code', 'Date', 'Weight', 'Rate', 'Bale Value', 'FCV'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {reportRows.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                        <td style={S.td}><b>{row.unique_code}</b></td>
                        <td style={S.td}>{formatDateTime(row.date_of_purchase)}</td>
                        <td style={S.td}>{row.weightValue.toFixed(2)} kg</td>
                        <td style={S.td}>{row.rateValue.toFixed(2)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#166534' }}>{row.baleValue.toFixed(2)}</td>
                        <td style={S.td}><span style={S.badge(row.fcv === 'FCV' ? 'green' : 'red')}>{row.fcv}</span></td>
                      </tr>
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

        {view === 'tb-grades' && (
          <div style={S.card}>
            <div style={S.subheading}>Tobacco Board Grades ({tobaccoBoardGrades.length})</div>
            {tobaccoBoardGrades.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>No Tobacco Board grades available.</p>
            : (
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={S.table}>
                  <thead><tr>{['Grade Code','Description'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sortedTobaccoBoardGrades.map((g, i) => (
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

        {view === 'buyer-grades' && (
          <div style={S.card}>
            <div style={S.subheading}>Buyer Grades ({buyerGrades.length})</div>
            {buyerGrades.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>No Buyer grades available.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>{['Grade Code','Description'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sortedBuyerGrades.map((g, i) => (
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

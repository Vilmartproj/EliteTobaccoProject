// src/components/BuyerDashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import BuyingForm from './BuyingForm';
import QRCode from './QRCode';
import SearchableSelect from './SearchableSelect';
import { printQRCodes } from '../utils/printQR';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

export default function BuyerDashboard({ user, onLogout }) {
  const buyerTitleColor = 'rgb(14,14,156)';
  const buyerNavColor = 'rgb(30,30,203)';
  const buyerBgColor = 'rgb(226,244,237)';
  const buyerButtonTextColor = 'rgb(30,30,203)';
  const [view, setView]     = useState('form');
  const [bags, setBags]     = useState([]);
  const [qrCodes, setQR]    = useState([]);
  const [tobaccoBoardGrades, setTobaccoBoardGrades] = useState([]);
  const [buyerGrades, setBuyerGrades] = useState([]);
  const [tobaccoTypes, setTobaccoTypes] = useState([]);
  const [purchaseLocations, setPurchaseLocations] = useState([]);
  const [apfNumbers, setApfNumbers] = useState([]);
  const [loading, setLoad]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMsg, setEditMsg] = useState('');
  const [enabledBuyerActionIds, setEnabledBuyerActionIds] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const [bagsSort, setBagsSort] = useState({ key: 'updated_at', direction: 'desc' });
  const [reportSort, setReportSort] = useState({ key: 'date_of_purchase', direction: 'desc' });
  const [selectedReportDate, setSelectedReportDate] = useState('');

  const inputDateToDisplayDate = (value) => {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  };

  const normalizeReportDateLabel = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const slash = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slash) return text;

    const dash = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dash) {
      const [, dd, mm, yyyy] = dash;
      return `${dd}/${mm}/${yyyy}`;
    }

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      const [, yyyy, mm, dd] = ymd;
      return `${dd}/${mm}/${yyyy}`;
    }

    return '';
  };

  const formatPurchaseDateDash = (value) => {
    const slash = normalizeReportDateLabel(value);
    if (slash) {
      const [dd, mm, yyyy] = slash.split('/');
      if (dd && mm && yyyy) return `${dd}-${mm}-${yyyy}`;
    }

    const inputDate = toInputDateTime(value).split('T')[0] || '';
    if (inputDate) {
      const slashFromDate = inputDateToDisplayDate(inputDate);
      const [dd, mm, yyyy] = slashFromDate.split('/');
      if (dd && mm && yyyy) return `${dd}-${mm}-${yyyy}`;
    }

    return '—';
  };

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

  const loadTobaccoTypes = async () => {
    setTobaccoTypes(await api.getTobaccoTypes());
  };

  const loadPurchaseLocations = async () => {
    setPurchaseLocations(await api.getPurchaseLocations());
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

  useEffect(() => { loadBags(); loadQR(); loadGrades(); loadApfNumbers(); loadTobaccoTypes(); loadPurchaseLocations(); loadBuyerBagActionSetting(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
    if (v === 'form' || v === 'bags') { loadApfNumbers(); loadTobaccoTypes(); loadPurchaseLocations(); }
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

  const getReportDateLabel = (row) => {
    const purchaseDateLabel = normalizeReportDateLabel(row.purchase_date);
    if (purchaseDateLabel) return purchaseDateLabel;

    const inputDate = toInputDateTime(row.date_of_purchase).split('T')[0] || '';
    const dateOfPurchaseLabel = inputDateToDisplayDate(inputDate);
    return dateOfPurchaseLabel || '—';
  };

  const selectedReportDateLabel = inputDateToDisplayDate(selectedReportDate);
  const filteredReportRows = selectedReportDate
    ? reportRows.filter((row) => getReportDateLabel(row) === selectedReportDateLabel)
    : reportRows;

  const totalBaleValue = filteredReportRows.reduce((sum, row) => sum + row.baleValue, 0);
  const totalWeight = filteredReportRows.reduce((sum, row) => sum + row.weightValue, 0);
  const sortedBags = [...bags].sort((a, b) => compareBy(a?.[bagsSort.key], b?.[bagsSort.key], bagsSort.direction));
  const sortedReportRows = [...filteredReportRows].sort((a, b) => compareBy(a?.[reportSort.key], b?.[reportSort.key], reportSort.direction));

  const SortableTh = ({ label, sortKey, sortState, onSort, minWidth }) => (
    <th
      style={{ ...S.th, cursor: 'pointer', userSelect: 'none', fontWeight: 700, ...(minWidth ? { minWidth } : {}) }}
      onClick={() => onSort(sortKey)}
      title="Click to sort"
    >
      {label}{sortState.key === sortKey ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

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
      type_of_tobacco: bag.type_of_tobacco || '',
      purchase_location: bag.purchase_location || '',
      purchase_date: bag.purchase_date || '',
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
    const isFCV = editForm.fcv === 'FCV';
    const isNonFCV = editForm.fcv === 'NON-FCV';
    if (!editForm.weight || !editForm.buyer_grade) {
      setEditMsg('Weight and Buyer Grade are required');
      return;
    }
    if (isFCV && (!editForm.apf_number || !editForm.tobacco_grade)) {
      setEditMsg('For FCV, APF Number and Tobacco Grade are required');
      return;
    }
    if (isNonFCV && (!editForm.type_of_tobacco || !editForm.purchase_location)) {
      setEditMsg('For NON-FCV, Type of Tobacco and Location are required');
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

  return (
    <div style={{ ...S.app, background: buyerBgColor }}>
      {/* Top bar */}
      <div style={S.topBar}>
        {isMobileView ? (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <div style={{ ...S.topBarTitle, color: buyerTitleColor }}>🌿 Elite Tobacco</div>
              <button style={{ ...S.btnIcon, color: buyerButtonTextColor }} onClick={onLogout}>Logout</button>
            </div>
            <div style={{ ...S.buyerInfo, justifyContent: 'flex-start', width: '100%' }}>
              <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
              <span style={S.bagsBadge}>🛍️ {bags.length} Bags</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ ...S.topBarTitle, color: buyerTitleColor }}>🌿 Elite Tobacco</div>
            <div style={S.buyerInfo}>
              <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
              <span style={S.bagsBadge}>🛍️ {bags.length} Bags</span>
              <button style={{ ...S.btnIcon, color: buyerButtonTextColor }} onClick={onLogout}>Logout</button>
            </div>
          </>
        )}
      </div>

      <div style={S.page}>
        <div style={{ ...S.tabs, justifyContent: 'center' }}>
          <button style={{ ...S.tab(view === 'form'), background: view === 'form' ? buyerNavColor : '#fff', color: view === 'form' ? '#fff' : buyerNavColor, border: `2px solid ${buyerNavColor}`, fontSize: 16, fontWeight: 800, flex: '1 1 220px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('form')}>📝 New Purchase Entry</button>
          <button style={{ ...S.tab(view === 'bags'), background: view === 'bags' ? buyerNavColor : '#fff', color: view === 'bags' ? '#fff' : buyerNavColor, border: `2px solid ${buyerNavColor}`, fontSize: 16, fontWeight: 800, flex: '1 1 220px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('bags')}>📦 My Purchases <span style={{ fontSize: '124%', fontWeight: 900, marginLeft: 5, color: view === 'bags' ? '#ffe082' : '#c62828' }}>{bags.length}</span></button>
          <button style={{ ...S.tab(view === 'bale-report'), background: view === 'bale-report' ? buyerNavColor : '#fff', color: view === 'bale-report' ? '#fff' : buyerNavColor, border: `2px solid ${buyerNavColor}`, fontSize: 16, fontWeight: 800, flex: '1 1 220px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('bale-report')}>📊 Purchase Value Report</button>
          <button style={{ ...S.tab(view === 'qr'), background: view === 'qr' ? buyerNavColor : '#fff', color: view === 'qr' ? '#fff' : buyerNavColor, border: `2px solid ${buyerNavColor}`, fontSize: 16, fontWeight: 800, flex: '1 1 220px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('qr')}>🔲 My QR Codes ({qrCodes.length})</button>
        </div>

        {view === 'form' && (
          <BuyingForm
            buyer={user}
            grades={{ tobaccoBoard: tobaccoBoardGrades, buyer: buyerGrades }}
            apfNumbers={apfNumbers}
            tobaccoTypes={tobaccoTypes}
            purchaseLocations={purchaseLocations}
            assignedQRCodes={qrCodes}
            onSaveExit={() => switchView('bags')}
          />
        )}

        {view === 'bags' && (
          <div style={{ ...S.card, background: 'rgb(255,208,214)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ ...S.subheading, color: buyerTitleColor }}>All Bags ({bags.length})</div>
            </div>
            {editMsg && <div style={editMsg.startsWith('✅') ? S.success : S.error}>{editMsg}</div>}
            {loading ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Loading…</p>
            : bags.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No bags saved yet.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    <SortableTh label="Code" sortKey="unique_code" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="APF" sortKey="apf_number" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="TB Grade" sortKey="tobacco_grade" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Type" sortKey="type_of_tobacco" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Location" sortKey="purchase_location" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Purchase Date" sortKey="purchase_date" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={170} />
                    <SortableTh label="Weight" sortKey="weight" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Rate" sortKey="rate" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Bale Value" sortKey="bale_value" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="B.Grade" sortKey="buyer_grade" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Date" sortKey="date_of_purchase" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={220} />
                    <SortableTh label="FCV" sortKey="fcv" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Updated" sortKey="updated_at" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={200} />
                    {canManageBagActions && <th style={S.th}>Action</th>}
                  </tr></thead>
                  <tbody>
                    {sortedBags.map((b, i) => (
                      editingId === b.id ? (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={{ ...S.td, fontWeight: 400 }}>{b.unique_code}</td>
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
                          <td style={S.td}><input style={{ ...S.input, minWidth: 120 }} value={editForm?.type_of_tobacco ?? ''} onChange={e => setEditForm(f => ({ ...f, type_of_tobacco: e.target.value }))} /></td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 120 }} value={editForm?.purchase_location ?? ''} onChange={e => setEditForm(f => ({ ...f, purchase_location: e.target.value }))} /></td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 110 }} value={editForm?.purchase_date ?? ''} onChange={e => setEditForm(f => ({ ...f, purchase_date: e.target.value }))} /></td>
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
                          <td style={{ ...S.td, fontWeight: 400 }}>{formatUpdatedAt(b.updated_at)}</td>
                          {canManageBagActions && (
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ ...S.btnPrimary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={saveEdit}>Save</button>
                                <button style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ) : (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.unique_code}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.apf_number}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.tobacco_grade}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.type_of_tobacco || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.purchase_location || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatPurchaseDateDash(b.purchase_date || b.date_of_purchase)}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.weight} kg</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.rate ?? '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{Number.isFinite(Number(b.bale_value)) ? `₹${Number(b.bale_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.buyer_grade}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatDateTime(b.date_of_purchase)}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatUpdatedAt(b.updated_at)}</td>
                          {canManageBagActions && (
                            <td style={S.td}>
                              <button style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => startEdit(b)}>
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
          <div style={{ ...S.card, background: 'rgb(255,208,214)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ ...S.subheading, color: buyerTitleColor }}>Purchase Value Report ({sortedReportRows.length})</div>
              <span style={{ ...S.badge('green'), fontSize: 15, fontWeight: 800, padding: '8px 14px' }}>Total Purchase Value: {totalBaleValue.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <label style={S.label}>Filter by Date</label>
                <input
                  style={{ ...S.input, minWidth: 220, marginBottom: 0, fontWeight: 400 }}
                  type="date"
                  value={selectedReportDate}
                  onChange={(e) => setSelectedReportDate(e.target.value)}
                />
              </div>
              <span style={{ ...S.badge(), fontSize: 15, fontWeight: 700, padding: '8px 14px' }}>Total Weight: {totalWeight.toFixed(2)} kg</span>
            </div>
            {sortedReportRows.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>No purchases available for selected date.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    <SortableTh label="Code" sortKey="unique_code" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Date" sortKey="date_of_purchase" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Weight" sortKey="weightValue" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Rate" sortKey="rateValue" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Bale Value" sortKey="baleValue" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="FCV" sortKey="fcv" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                  </tr></thead>
                  <tbody>
                    {sortedReportRows.map((row, i) => (
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
          <div style={{ ...S.card, background: 'rgb(255,208,214)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ ...S.subheading, color: buyerTitleColor }}>Your QR Codes ({qrCodes.length})</div>
              {qrCodes.length > 0 && (
                <button style={{ ...S.btnPrimary, color: buyerButtonTextColor, flex: 'none', padding: '8px 18px', fontSize: 13 }}
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

      </div>
    </div>
  );
}

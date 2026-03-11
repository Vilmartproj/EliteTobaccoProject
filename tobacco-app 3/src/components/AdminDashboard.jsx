// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import QRCode from './QRCode';
import DatabaseViewer from './DatabaseViewer';
import SearchableSelect from './SearchableSelect';
import ApiStatusBadge from './ApiStatusBadge';
import { printQRCodes } from '../utils/printQR';
import { exportCSV } from '../utils/exportCSV';
import { exportBagsPDF, exportBagsXLS, shareBagsWhatsApp } from '../utils/exportBags';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab]         = useState('overview');
  const [stats, setStats]     = useState({});
  const [buyers, setBuyers]   = useState([]);
  const [apfNumbers, setApfNumbers] = useState([]);
  const [tobaccoBoardGrades, setTobaccoBoardGrades] = useState([]);
  const [buyerGrades, setBuyerGrades] = useState([]);
  const [qrCodes, setQR]      = useState([]);
  const [bags, setBags]       = useState([]);

  // Generate QR state
  const [genStart, setGenStart]   = useState('200');
  const [genCount, setGenCount]   = useState(5);
  const [genBuyerId, setGenBuyer] = useState('');
  const [qrBuyerFilter, setQrBuyerFilter] = useState('');
  const [genMsg, setGenMsg]       = useState('');

  // Add buyer state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [buyerMsg, setBuyerMsg] = useState('');
  const [qrMsg, setQrMsg] = useState('');
  const [bagsMsg, setBagsMsg] = useState('');
  const [enabledBuyerActionIds, setEnabledBuyerActionIds] = useState([]);
  const [selectedBuyerActionId, setSelectedBuyerActionId] = useState('');
  const [editingBagId, setEditingBagId] = useState(null);
  const [editBagForm, setEditBagForm] = useState(null);
  const [tbGradeCode, setTbGradeCode] = useState('');
  const [tbGradeDescription, setTbGradeDescription] = useState('');
  const [tbGradeEditingId, setTbGradeEditingId] = useState(null);
  const [tbGradeMsg, setTbGradeMsg] = useState('');
  const [buyerGradeCode, setBuyerGradeCode] = useState('');
  const [buyerGradeDescription, setBuyerGradeDescription] = useState('');
  const [buyerGradeEditingId, setBuyerGradeEditingId] = useState(null);
  const [buyerGradeMsg, setBuyerGradeMsg] = useState('');
  const [apfNumberCode, setApfNumberCode] = useState('');
  const [apfNumberDescription, setApfNumberDescription] = useState('');
  const [apfNumberEditingId, setApfNumberEditingId] = useState(null);
  const [apfNumberMsg, setApfNumberMsg] = useState('');

  const refresh = async () => {
    const [s, b, apf, tbGrades, byGrades, q, bg, buyerActionSetting] = await Promise.all([
      api.getStats(),
      api.getBuyers(),
      api.getApfNumbers(),
      api.getGrades('tobacco_board'),
      api.getGrades('buyer'),
      api.getQRCodes(),
      api.getBags(),
      api.getBuyerBagActionSetting(),
    ]);
    setStats(s);
    setBuyers(b);
    setApfNumbers(apf);
    setTobaccoBoardGrades(tbGrades);
    setBuyerGrades(byGrades);
    setQR(q);
    setBags(bg);
    setEnabledBuyerActionIds(Array.isArray(buyerActionSetting?.enabled_buyer_ids)
      ? buyerActionSetting.enabled_buyer_ids.map(Number)
      : []);
  };

  useEffect(() => { refresh(); }, []);

  const handleGenerateQR = async () => {
    if (!genStart || !genCount) { setGenMsg('Fill all fields'); return; }
    try {
      const res = await api.generateQR({ startCode: genStart, count: parseInt(genCount), buyerId: genBuyerId ? parseInt(genBuyerId) : null });
      const generatedCount = Array.isArray(res) ? res.length : (res?.count ?? res?.codes?.length ?? 0);
      setGenMsg(`✅ Generated ${generatedCount} QR codes`);
      await refresh();
    } catch (e) { setGenMsg(e.message); }
  };

  const handleAddBuyer = async () => {
    if (!newCode || !newName) { setBuyerMsg('Fill all fields'); return; }
    try {
      await api.addBuyer({ code: newCode, name: newName });
      setBuyerMsg(`✅ Buyer ${newCode.toUpperCase()} added. Password = ${newCode.toUpperCase()}`);
      setNewCode(''); setNewName('');
      refresh();
    } catch (e) { setBuyerMsg(e.message); }
  };

  const handleDeleteBuyer = async (buyer) => {
    if (!window.confirm(`Delete buyer ${buyer.code} (${buyer.name})?`)) return;
    try {
      await api.deleteBuyer(buyer.id);
      setBuyerMsg(`✅ Buyer ${buyer.code} deleted`);
      await refresh();
    } catch (e) {
      setBuyerMsg(e.message);
    }
  };

  const handleDeleteQRCode = async (qr) => {
    if (!window.confirm(`Delete QR code ${qr.unique_code}?`)) return;
    try {
      await api.deleteQRCode(qr.id);
      setQrMsg(`✅ QR code ${qr.unique_code} deleted`);
      await refresh();
    } catch (e) {
      setQrMsg(e.message);
    }
  };

  const canDeleteQRCode = (qr) => {
    const usedValue = qr?.used;
    const isUsed = usedValue === true || usedValue === 1 || usedValue === '1';
    return !isUsed;
  };

  const handleDeleteBag = async (bag) => {
    if (!window.confirm(`Delete bag ${bag.unique_code}? QR will become available/unassigned.`)) return;
    try {
      await api.deleteBag(bag.id);
      setBagsMsg(`✅ Bag ${bag.unique_code} deleted and QR reset to available`);
      if (editingBagId === bag.id) {
        setEditingBagId(null);
        setEditBagForm(null);
      }
      await refresh();
    } catch (e) {
      setBagsMsg(e.message);
    }
  };

  const handleEditBag = (bag) => {
    setBagsMsg('');
    setEditingBagId(bag.id);
    const rateValue = bag.rate ?? '';
    const weightValue = bag.weight ?? '';
    const computedBaleValue = Number.isFinite(Number(weightValue)) && Number.isFinite(Number(rateValue))
      ? Number((Number(weightValue) * Number(rateValue)).toFixed(2))
      : (bag.bale_value ?? '');
    setEditBagForm({
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

  const handleCancelEditBag = () => {
    setEditingBagId(null);
    setEditBagForm(null);
    setBagsMsg('');
  };

  const handleSaveBag = async () => {
    if (!editingBagId || !editBagForm) return;
    const isFCV = editBagForm.fcv === 'FCV';
    const isNonFCV = editBagForm.fcv === 'NON-FCV';
    if (!editBagForm.weight || !editBagForm.buyer_grade) {
      setBagsMsg('Weight and Buyer Grade are required');
      return;
    }
    if (isFCV && (!editBagForm.apf_number || !editBagForm.tobacco_grade || !editBagForm.purchase_date)) {
      setBagsMsg('For FCV, APF Number, Tobacco Grade, and Purchase Date are required');
      return;
    }
    if (isNonFCV && (!editBagForm.type_of_tobacco || !editBagForm.purchase_location)) {
      setBagsMsg('For NON-FCV, Type of Tobacco and Location are required');
      return;
    }
    try {
      const numericWeight = parseFloat(editBagForm.weight);
      const numericRate = parseFloat(editBagForm.rate);
      const baleValue = Number.isFinite(numericWeight) && Number.isFinite(numericRate)
        ? Number((numericWeight * numericRate).toFixed(2))
        : (editBagForm.bale_value ?? null);
      await api.updateBag(editingBagId, {
        ...editBagForm,
        weight: numericWeight,
        rate: Number.isFinite(numericRate) ? numericRate : null,
        bale_value: baleValue,
        date_of_purchase: fromInputDateTime(editBagForm.date_of_purchase),
      });
      setBagsMsg('✅ Bag updated successfully');
      setEditingBagId(null);
      setEditBagForm(null);
      await refresh();
    } catch (e) {
      setBagsMsg(e.message);
    }
  };

  const handleToggleBuyerActionAfter6pm = async () => {
    const selectedId = Number(selectedBuyerActionId);
    if (!Number.isFinite(selectedId) || selectedId <= 0) {
      setBagsMsg('Please select a buyer first');
      return;
    }
    const nextValue = !enabledBuyerActionIds.includes(selectedId);
    try {
      const res = await api.updateBuyerBagActionSetting({ enabled_after_6pm: nextValue, buyer_id: selectedId });
      const ids = Array.isArray(res?.enabled_buyer_ids) ? res.enabled_buyer_ids.map(Number) : [];
      setEnabledBuyerActionIds(ids);
      const buyer = buyers.find(b => b.id === selectedId);
      const buyerLabel = buyer ? `${buyer.code} - ${buyer.name}` : `Buyer ${selectedId}`;
      setBagsMsg(nextValue
        ? `✅ Buyer action enabled after 6 PM for ${buyerLabel}`
        : `✅ Buyer action disabled after 6 PM for ${buyerLabel}`);
    } catch (e) {
      setBagsMsg(e.message);
    }
  };

  const resetTobaccoBoardGradeForm = () => {
    setTbGradeCode('');
    setTbGradeDescription('');
    setTbGradeEditingId(null);
  };

  const resetBuyerGradeForm = () => {
    setBuyerGradeCode('');
    setBuyerGradeDescription('');
    setBuyerGradeEditingId(null);
  };

  const handleSaveTobaccoBoardGrade = async () => {
    if (!tbGradeCode.trim()) {
      setTbGradeMsg('Grade code is required');
      return;
    }
    try {
      if (tbGradeEditingId) {
        await api.updateGrade(tbGradeEditingId, { code: tbGradeCode, description: tbGradeDescription, type: 'tobacco_board' });
        setTbGradeMsg(`✅ Grade ${tbGradeCode.toUpperCase()} updated`);
      } else {
        await api.addGrade({ code: tbGradeCode, description: tbGradeDescription, type: 'tobacco_board' });
        setTbGradeMsg(`✅ Grade ${tbGradeCode.toUpperCase()} added`);
      }
      resetTobaccoBoardGradeForm();
      await refresh();
    } catch (e) {
      setTbGradeMsg(e.message);
    }
  };

  const handleSaveBuyerGrade = async () => {
    if (!buyerGradeCode.trim()) {
      setBuyerGradeMsg('Grade code is required');
      return;
    }
    try {
      if (buyerGradeEditingId) {
        await api.updateGrade(buyerGradeEditingId, { code: buyerGradeCode, description: buyerGradeDescription, type: 'buyer' });
        setBuyerGradeMsg(`✅ Grade ${buyerGradeCode.toUpperCase()} updated`);
      } else {
        await api.addGrade({ code: buyerGradeCode, description: buyerGradeDescription, type: 'buyer' });
        setBuyerGradeMsg(`✅ Grade ${buyerGradeCode.toUpperCase()} added`);
      }
      resetBuyerGradeForm();
      await refresh();
    } catch (e) {
      setBuyerGradeMsg(e.message);
    }
  };

  const handleEditTobaccoBoardGrade = (grade) => {
    setTbGradeEditingId(grade.id);
    setTbGradeCode(grade.code);
    setTbGradeDescription(grade.description);
    setTbGradeMsg('');
  };

  const handleEditBuyerGrade = (grade) => {
    setBuyerGradeEditingId(grade.id);
    setBuyerGradeCode(grade.code);
    setBuyerGradeDescription(grade.description);
    setBuyerGradeMsg('');
  };

  const handleDeleteTobaccoBoardGrade = async (grade) => {
    if (!window.confirm(`Delete grade ${grade.code}?`)) return;
    try {
      await api.deleteGrade(grade.id);
      setTbGradeMsg(`✅ Grade ${grade.code} deleted`);
      if (tbGradeEditingId === grade.id) resetTobaccoBoardGradeForm();
      await refresh();
    } catch (e) {
      setTbGradeMsg(e.message);
    }
  };

  const handleDeleteBuyerGrade = async (grade) => {
    if (!window.confirm(`Delete grade ${grade.code}?`)) return;
    try {
      await api.deleteGrade(grade.id);
      setBuyerGradeMsg(`✅ Grade ${grade.code} deleted`);
      if (buyerGradeEditingId === grade.id) resetBuyerGradeForm();
      await refresh();
    } catch (e) {
      setBuyerGradeMsg(e.message);
    }
  };

  const resetApfNumberForm = () => {
    setApfNumberCode('');
    setApfNumberDescription('');
    setApfNumberEditingId(null);
  };

  const handleSaveApfNumber = async () => {
    if (!apfNumberCode.trim()) {
      setApfNumberMsg('APF number is required');
      return;
    }
    try {
      if (apfNumberEditingId) {
        await api.updateApfNumber(apfNumberEditingId, { number: apfNumberCode.trim(), description: apfNumberDescription.trim() });
        setApfNumberMsg(`✅ APF number ${apfNumberCode.trim()} updated`);
      } else {
        await api.addApfNumber({ number: apfNumberCode.trim(), description: apfNumberDescription.trim() });
        setApfNumberMsg(`✅ APF number ${apfNumberCode.trim()} added`);
      }
      resetApfNumberForm();
      await refresh();
    } catch (e) {
      setApfNumberMsg(e.message);
    }
  };

  const handleEditApfNumber = (apf) => {
    setApfNumberEditingId(apf.id);
    setApfNumberCode(apf.number);
    setApfNumberDescription(apf.description || '');
    setApfNumberMsg('');
  };

  const handleDeleteApfNumber = async (apf) => {
    if (!window.confirm(`Delete APF number ${apf.number}?`)) return;
    try {
      await api.deleteApfNumber(apf.id);
      setApfNumberMsg(`✅ APF number ${apf.number} deleted`);
      if (apfNumberEditingId === apf.id) resetApfNumberForm();
      await refresh();
    } catch (e) {
      setApfNumberMsg(e.message);
    }
  };

  const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));
  const sortedApfNumbers = [...apfNumbers].sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  const sortedTobaccoBoardGrades = [...tobaccoBoardGrades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const sortedBuyerGrades = [...buyerGrades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const tobaccoBoardGradeCodes = sortedTobaccoBoardGrades.map(g => g.code);
  const apfNumberOptions = sortedApfNumbers.map(a => ({
    value: String(a.number),
    label: a.description ? `${a.number} - ${a.description}` : String(a.number),
    keywords: `${a.number} ${a.description || ''}`,
  }));
  const tobaccoBoardGradeOptions = tobaccoBoardGradeCodes.map(g => ({ value: g, label: g }));
  const filteredQrCodes = qrBuyerFilter === ''
    ? qrCodes
    : qrBuyerFilter === '__unassigned__'
      ? qrCodes.filter(q => !q.buyer_id)
      : qrCodes.filter(q => String(q.buyer_id || '') === qrBuyerFilter);
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

  const StatCard = ({ icon, label, value }) => (
    <div style={{ ...S.card, textAlign: 'center', marginBottom: 0, padding: 20 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 'bold', color: '#c0392b', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.topBar}>
        <div style={S.topBarTitle}>🌿 Elite Tobacco — Admin</div>
        <div style={S.buyerInfo}>
          <span style={S.buyerBadge}>🔐 Administrator</span>
          <ApiStatusBadge />
          <span style={S.bagsBadge}>📦 {stats.bags || 0} Bags</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={S.page}>
        <div style={S.tabs}>
          {[['overview','📊 Overview'],['buyers','👥 Buyers'],['apf-maintenance','🔢 APF Maintenance'],['tb-grades','🏷️ TB Grades'],['buyer-grades','🏷️ Buyer Grades'],['qrcodes','🔲 QR Codes'],['generate','⚡ Generate QR'],['bags','📦 Total Purchase'],['database','🗄️ Database']].map(([id, label]) => (
            <button key={id} style={S.tab(tab === id)} onClick={() => { setTab(id); refresh(); }}>{label}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
              <StatCard icon="👥" label="Total Buyers"    value={stats.buyers     || 0} />
              <StatCard icon="🔲" label="Total QR Codes"  value={stats.qrcodes    || 0} />
              <StatCard icon="✅" label="QR Used"          value={stats.qr_used    || 0} />
              <StatCard icon="🟢" label="QR Available"     value={stats.qr_avail   || 0} />
              <StatCard icon="📦" label="Total Bags"       value={stats.bags       || 0} />
              <StatCard icon="⚖️" label="Total Weight"     value={`${(stats.total_weight || 0).toFixed(1)} kg`} />
            </div>
            <div style={S.card}>
              <div style={S.subheading}>Buyer Summary</div>
              <table style={S.table}>
                <thead><tr>{['Code','Name','QR Assigned','QR Used','Bags'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {buyers.map(b => {
                    const bqr   = qrCodes.filter(q => q.buyer_id === b.id);
                    const bbags = bags.filter(bg => bg.buyer_id === b.id);
                    return (
                      <tr key={b.id}>
                        <td style={S.td}><b>{b.code}</b></td>
                        <td style={S.td}>{b.name}</td>
                        <td style={S.td}>{bqr.length}</td>
                        <td style={S.td}>{bqr.filter(q => q.used).length}</td>
                        <td style={S.td}><span style={S.badge('green')}>{bbags.length}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BUYERS ── */}
        {tab === 'buyers' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Add New Buyer</div>
              {buyerMsg && <div style={buyerMsg.startsWith('✅') ? S.success : S.error}>{buyerMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div><label style={S.label}>Buyer Code</label><input style={S.input} placeholder="e.g. B004" value={newCode} onChange={e => setNewCode(e.target.value)} /></div>
                <div><label style={S.label}>Buyer Name</label><input style={S.input} placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 20px' }} onClick={handleAddBuyer}>Add</button>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.subheading}>All Buyers ({buyers.length})</div>
              <table style={S.table}>
                <thead><tr>{['Code','Name','Password','QR Assigned','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {buyers.map(b => (
                    <tr key={b.id}>
                      <td style={S.td}><b>{b.code}</b></td>
                      <td style={S.td}>{b.name}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace', color: '#c0392b' }}>{b.password}</td>
                      <td style={S.td}>{qrCodes.filter(q => q.buyer_id === b.id).length}</td>
                      <td style={S.td}>
                        <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteBuyer(b)}>
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── APF MAINTENANCE ── */}
        {tab === 'apf-maintenance' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>APF Number Maintenance</div>
              {apfNumberMsg && <div style={apfNumberMsg.startsWith('✅') ? S.success : S.error}>{apfNumberMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>APF Number</label>
                  <input style={S.input} placeholder="e.g. 121" value={apfNumberCode} onChange={e => setApfNumberCode(e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Description (Optional)</label>
                  <input style={S.input} placeholder="Optional description" value={apfNumberDescription} onChange={e => setApfNumberDescription(e.target.value)} />
                </div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 16px' }} onClick={handleSaveApfNumber}>
                  {apfNumberEditingId ? 'Update' : 'Add'}
                </button>
                {apfNumberEditingId && (
                  <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 16px' }} onClick={resetApfNumberForm}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>All APF Numbers ({apfNumbers.length})</div>
              <table style={S.table}>
                <thead><tr>{['APF Number','Description','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sortedApfNumbers.map(a => (
                    <tr key={a.id}>
                      <td style={S.td}><b>{a.number}</b></td>
                      <td style={S.td}>{a.description || '—'}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditApfNumber(a)}>
                            ✏️ Edit
                          </button>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteApfNumber(a)}>
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GRADE MAINTENANCE ── */}
        {tab === 'tb-grades' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Tobacco Board Grade Maintenance</div>
              {tbGradeMsg && <div style={tbGradeMsg.startsWith('✅') ? S.success : S.error}>{tbGradeMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>Grade Code</label>
                  <input style={S.input} placeholder="e.g. H1" value={tbGradeCode} onChange={e => setTbGradeCode(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label style={S.label}>Description</label>
                  <input style={S.input} placeholder="e.g. High Grade 1" value={tbGradeDescription} onChange={e => setTbGradeDescription(e.target.value)} />
                </div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 16px' }} onClick={handleSaveTobaccoBoardGrade}>
                  {tbGradeEditingId ? 'Update' : 'Add'}
                </button>
                {tbGradeEditingId && (
                  <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 16px' }} onClick={resetTobaccoBoardGradeForm}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>All Tobacco Board Grades ({tobaccoBoardGrades.length})</div>
              <table style={S.table}>
                <thead><tr>{['Grade Code','Description','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sortedTobaccoBoardGrades.map(g => (
                    <tr key={g.id}>
                      <td style={S.td}><b>{g.code}</b></td>
                      <td style={S.td}>{g.description}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditTobaccoBoardGrade(g)}>
                            ✏️ Edit
                          </button>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteTobaccoBoardGrade(g)}>
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BUYER GRADE MAINTENANCE ── */}
        {tab === 'buyer-grades' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Buyer Grade Maintenance</div>
              {buyerGradeMsg && <div style={buyerGradeMsg.startsWith('✅') ? S.success : S.error}>{buyerGradeMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>Grade Code</label>
                  <input style={S.input} placeholder="e.g. A1" value={buyerGradeCode} onChange={e => setBuyerGradeCode(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label style={S.label}>Description</label>
                  <input style={S.input} placeholder="e.g. Buyer Premium A1" value={buyerGradeDescription} onChange={e => setBuyerGradeDescription(e.target.value)} />
                </div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 16px' }} onClick={handleSaveBuyerGrade}>
                  {buyerGradeEditingId ? 'Update' : 'Add'}
                </button>
                {buyerGradeEditingId && (
                  <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 16px' }} onClick={resetBuyerGradeForm}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>All Buyer Grades ({buyerGrades.length})</div>
              <table style={S.table}>
                <thead><tr>{['Grade Code','Description','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sortedBuyerGrades.map(g => (
                    <tr key={g.id}>
                      <td style={S.td}><b>{g.code}</b></td>
                      <td style={S.td}>{g.description}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditBuyerGrade(g)}>
                            ✏️ Edit
                          </button>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteBuyerGrade(g)}>
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── QR CODES ── */}
        {tab === 'qrcodes' && (
          <div style={S.card}>
            {qrMsg && <div style={qrMsg.startsWith('✅') ? S.success : S.error}>{qrMsg}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>All QR Codes ({filteredQrCodes.length})</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={S.badge('green')}>Available: {filteredQrCodes.filter(q => !q.used).length}</span>
                <span style={S.badge('red')}>Used: {filteredQrCodes.filter(q => q.used).length}</span>
                {filteredQrCodes.length > 0 && (
                  <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', fontSize: 12 }}
                    onClick={() => printQRCodes(filteredQrCodes, buyerMap)}>
                    🖨️ Print All
                  </button>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 14, maxWidth: 320 }}>
              <label style={S.label}>Filter by Buyer Name</label>
              <select style={S.input} value={qrBuyerFilter} onChange={e => setQrBuyerFilter(e.target.value)}>
                <option value="">All Buyers</option>
                <option value="__unassigned__">Unassigned</option>
                {buyers.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead><tr>{['Code','QR','Assigned To','Buyer Name','Status','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredQrCodes.map(q => (
                    <tr key={q.id}>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 'bold' }}>{q.unique_code}</td>
                      <td style={S.td}><QRCode value={q.unique_code} size={52} /></td>
                      <td style={S.td}>{q.buyer_code ? <span style={S.badge('green')}>{q.buyer_code}</span> : <span style={S.badge()}>Unassigned</span>}</td>
                      <td style={S.td}>{q.buyer_name || '—'}</td>
                      <td style={S.td}><span style={S.badge(q.used ? 'red' : 'green')}>{q.used ? 'Used' : 'Available'}</span></td>
                      <td style={S.td}>
                        <button
                          style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: canDeleteQRCode(q) ? 1 : 0.45 }}
                          onClick={() => handleDeleteQRCode(q)}
                          disabled={!canDeleteQRCode(q)}
                          title={canDeleteQRCode(q) ? 'Delete this QR code' : 'Used QR codes cannot be deleted'}
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GENERATE QR ── */}
        {tab === 'generate' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Generate QR Codes</div>
              {genMsg && <div style={genMsg.startsWith('✅') ? S.success : S.error}>{genMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div><label style={S.label}>Starting Code</label><input style={S.input} type="number" value={genStart} onChange={e => setGenStart(e.target.value)} /></div>
                <div><label style={S.label}>Count</label><input style={S.input} type="number" min="1" max="100" value={genCount} onChange={e => setGenCount(e.target.value)} /></div>
                <div>
                  <label style={S.label}>Assign to Buyer</label>
                  <select style={S.input} value={genBuyerId} onChange={e => setGenBuyer(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {buyers.map(b => (
                      <option key={b.id} value={String(b.id)}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button style={{ ...S.btnPrimary, flex: 'none' }} onClick={handleGenerateQR}>⚡ Generate {genCount} QR Codes</button>
            </div>

            {qrCodes.length > 0 && (
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={S.subheading}>QR Preview</div>
                  <button style={{ ...S.btnPrimary, flex: 'none', padding: '7px 16px', fontSize: 13 }}
                    onClick={() => {
                      const filtered = genBuyerId ? qrCodes.filter(q => q.buyer_id === parseInt(genBuyerId)) : qrCodes;
                      printQRCodes(filtered, buyerMap);
                    }}>
                    🖨️ Print QR Codes
                  </button>
                </div>
                <div style={S.qrGrid}>
                  {(genBuyerId ? qrCodes.filter(q => q.buyer_id === parseInt(genBuyerId)) : qrCodes).map(q => (
                    <div key={q.id} style={{ ...S.qrCard, opacity: q.used ? 0.4 : 1 }}>
                      <QRCode value={q.unique_code} size={100} />
                      <div style={{ marginTop: 6, fontWeight: 'bold', fontSize: 13 }}>{q.unique_code}</div>
                      {q.buyer_code && <div style={{ fontSize: 10, color: '#888' }}>{q.buyer_code}</div>}
                      <span style={S.badge(q.used ? 'red' : 'green')}>{q.used ? 'Used' : 'Available'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TOTAL PURCHASE ── */}
        {tab === 'bags' && (
          <div style={S.card}>
            {bagsMsg && <div style={bagsMsg.startsWith('✅') ? S.success : S.error}>{bagsMsg}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>Total Purchase ({bags.length})</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  style={{ ...S.input, minWidth: 220, marginBottom: 0 }}
                  value={selectedBuyerActionId}
                  onChange={e => setSelectedBuyerActionId(e.target.value)}
                >
                  <option value="">Select Buyer</option>
                  {buyers.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.code} - {b.name}</option>
                  ))}
                </select>
                <button
                  style={{ ...S.btnSecondary, flex: 'none', padding: '8px 14px', fontSize: 12 }}
                  onClick={handleToggleBuyerActionAfter6pm}
                >
                  {enabledBuyerActionIds.includes(Number(selectedBuyerActionId))
                    ? 'Disable Selected Buyer After 6 PM'
                    : 'Enable Selected Buyer After 6 PM'}
                </button>
                {bags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    style={exportBtnXls}
                    onClick={() => exportBagsXLS(bags, `all_bags_${new Date().toISOString().split('T')[0]}.xls`)}
                  >
                    ⬇ Export XLS
                  </button>
                  <button
                    style={exportBtnPdf}
                    onClick={() => exportBagsPDF(bags, `Total Purchase Report - ${new Date().toISOString().split('T')[0]}`)}
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
                    onClick={() => exportCSV(bags, `all_bags_${new Date().toISOString().split('T')[0]}.csv`)}
                  >
                    ⬇ CSV
                  </button>
                </div>
                )}
              </div>
            </div>
            {enabledBuyerActionIds.length > 0 && (
              <div style={{ marginBottom: 12, fontSize: 12, color: '#2e7d32' }}>
                Enabled buyers after 6 PM: {buyers.filter(b => enabledBuyerActionIds.includes(Number(b.id))).map(b => b.name).join(', ')}
              </div>
            )}
            {bags.length === 0
              ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No bags yet.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead><tr>{['Buyer','Name','Code','APF','TB Grade','Type','Location','Purchase Date','Buyer Grade','Weight','Rate','Bale Value','Date & Time','FCV','Updated','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {bags.map((b, i) => (
                        editingBagId === b.id ? (
                          <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                            <td style={S.td}><b>{b.buyer_code}</b></td>
                            <td style={S.td}>{b.buyer_name}</td>
                            <td style={S.td}>{b.unique_code}</td>
                            <td style={S.td}>
                              <SearchableSelect
                                options={apfNumberOptions}
                                value={editBagForm?.apf_number ?? ''}
                                onChange={(val) => setEditBagForm(f => ({ ...f, apf_number: val }))}
                                inputStyle={{ ...S.input, minWidth: 100 }}
                                placeholder="Search APF"
                              />
                            </td>
                            <td style={S.td}>
                              <SearchableSelect
                                options={tobaccoBoardGradeOptions}
                                value={editBagForm?.tobacco_grade ?? ''}
                                onChange={(val) => setEditBagForm(f => ({ ...f, tobacco_grade: val }))}
                                inputStyle={{ ...S.input, minWidth: 110 }}
                                placeholder="Search"
                              />
                            </td>
                            <td style={S.td}><input style={{ ...S.input, minWidth: 120 }} value={editBagForm?.type_of_tobacco ?? ''} onChange={e => setEditBagForm(f => ({ ...f, type_of_tobacco: e.target.value }))} /></td>
                            <td style={S.td}><input style={{ ...S.input, minWidth: 120 }} value={editBagForm?.purchase_location ?? ''} onChange={e => setEditBagForm(f => ({ ...f, purchase_location: e.target.value }))} /></td>
                            <td style={S.td}><input style={{ ...S.input, minWidth: 110 }} value={editBagForm?.purchase_date ?? ''} onChange={e => setEditBagForm(f => ({ ...f, purchase_date: e.target.value }))} /></td>
                            <td style={S.td}><input style={{ ...S.input, minWidth: 110 }} value={editBagForm?.buyer_grade ?? ''} onChange={e => setEditBagForm(f => ({ ...f, buyer_grade: e.target.value }))} /></td>
                            <td style={S.td}><input style={{ ...S.input, minWidth: 90 }} type="number" value={editBagForm?.weight ?? ''} onChange={e => setEditBagForm(f => ({ ...f, weight: e.target.value }))} /></td>
                            <td style={S.td}><input style={{ ...S.input, minWidth: 90 }} type="number" step="0.01" value={editBagForm?.rate ?? ''} onChange={e => setEditBagForm(f => ({ ...f, rate: e.target.value }))} /></td>
                            <td style={S.td}>
                              {Number.isFinite(Number(editBagForm?.weight)) && Number.isFinite(Number(editBagForm?.rate))
                                ? Number((Number(editBagForm.weight) * Number(editBagForm.rate)).toFixed(2))
                                : (editBagForm?.bale_value ?? '—')}
                            </td>
                            <td style={S.td}>
                              <input style={{ ...S.input, minWidth: 180 }} type="datetime-local" value={editBagForm?.date_of_purchase ?? nowInputDateTime()} onChange={e => setEditBagForm(f => ({ ...f, date_of_purchase: e.target.value }))} />
                            </td>
                            <td style={S.td}>
                              <select style={{ ...S.input, minWidth: 95 }} value={editBagForm?.fcv ?? ''} onChange={e => setEditBagForm(f => ({ ...f, fcv: e.target.value }))}>
                                <option value="">Select</option>
                                <option value="FCV">FCV</option>
                                <option value="NON-FCV">NON-FCV</option>
                              </select>
                            </td>
                            <td style={S.td}>{formatDateTime(b.updated_at)}</td>
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={handleSaveBag} title="Save bag">💾</button>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={handleCancelEditBag} title="Cancel edit">✖</button>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteBag(b)} title="Delete bag">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                            <td style={S.td}><b>{b.buyer_code}</b></td>
                            <td style={S.td}>{b.buyer_name}</td>
                            <td style={S.td}>{b.unique_code}</td>
                            <td style={S.td}>{b.apf_number}</td>
                            <td style={S.td}>{b.tobacco_grade}</td>
                            <td style={S.td}>{b.type_of_tobacco || '—'}</td>
                            <td style={S.td}>{b.purchase_location || '—'}</td>
                            <td style={S.td}>{b.purchase_date || '—'}</td>
                            <td style={S.td}>{b.buyer_grade || '—'}</td>
                            <td style={S.td}>{b.weight} kg</td>
                            <td style={S.td}>{b.rate ?? '—'}</td>
                            <td style={S.td}>{b.bale_value ?? '—'}</td>
                            <td style={S.td}>{formatDateTime(b.date_of_purchase)}</td>
                            <td style={S.td}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
                            <td style={S.td}>{formatDateTime(b.updated_at)}</td>
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditBag(b)} title="Edit bag">✏️</button>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteBag(b)} title="Delete bag">🗑</button>
                              </div>
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

        {/* ── DATABASE VIEWER ── */}
        {tab === 'database' && <DatabaseViewer />}
      </div>
    </div>
  );
}

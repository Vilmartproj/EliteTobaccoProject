// src/components/AdminDashboard.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import QRCode from './QRCode';

// ── Admin colour theme: teal → blue gradient (matching buyer dashboard) ──────
const adminGradient = 'linear-gradient(135deg, #20c997 0%, #2780e3 100%)';
const S = {
  ..._S,
  app: {
    minHeight: '100vh',
    background: '#ffffff',
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
  buyerBadge:  { background: adminGradient, border: '1px solid #1f67b9', borderRadius: 8, padding: '3px 10px', fontWeight: 800, color: '#ffffff', fontSize: 11 },
  bagsBadge:   { background: adminGradient, color: '#ffffff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 },
  card:        { background: '#ffffff', borderRadius: 12, border: '1px solid #b7d9f8', padding: '16px', marginBottom: 16, boxShadow: '0 4px 16px rgba(39,128,227,0.16)' },
  heading:     { fontSize: 16, fontWeight: 800, color: '#2780e3', marginBottom: 14, letterSpacing: 0.5 },
  subheading:  { fontSize: 13, fontWeight: 800, color: '#2780e3', marginBottom: 10 },
  label:       { fontSize: 11, fontWeight: 800, color: '#2780e3', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { width: '100%', padding: '7px 10px', border: '1.5px solid #1f67b9', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1b3555', background: '#ffffff', boxSizing: 'border-box', outline: 'none' },
  toggleGroup: { display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #2780e3', marginBottom: 6 },
  toggleBtn: (active, disabled) => ({
    flex: 1, padding: '8px', border: 'none',
    background: disabled ? '#8ab8ef' : active ? adminGradient : '#2780e3',
    color: '#fff',
    fontWeight: 800, fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 1, transition: 'all 0.2s',
    pointerEvents: disabled ? 'none' : 'auto',
  }),
  btnPrimary:  { background: adminGradient, color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', flex: 1, transition: 'background 0.2s' },
  btnSecondary:{ background: adminGradient, color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', flex: 1 },
  btnIcon:     { background: adminGradient, border: '1px solid #1f67b9', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 800 },
  th:          { background: '#2780e3', color: '#ffffff', fontWeight: 800, padding: '7px 9px', border: '1px solid #1f67b9', textAlign: 'left', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td:          { padding: '6px 9px', border: '1px solid #d9ebfb', color: '#1b3555', verticalAlign: 'middle', fontWeight: 700, whiteSpace: 'nowrap' },
  tab: (active) => ({
    padding: '6px 12px',
    border: '2px solid #1f67b9',
    borderRadius: 8,
    background: active ? adminGradient : '#2780e3',
    color: '#fff',
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
    letterSpacing: 0.2, whiteSpace: 'nowrap',
    transition: 'all 0.18s',
  }),
  qrCard: { background: '#fff', border: '1.5px solid #b7d9f8', borderRadius: 10, padding: 14, textAlign: 'center', boxShadow: '0 4px 10px rgba(39,128,227,0.16)' },
};
// ────────────────────────────────────────────────────────────────────────────
import DatabaseViewer from './DatabaseViewer';
import SearchableSelect from './SearchableSelect';
import ApiStatusBadge from './ApiStatusBadge';
import AdminVehicleDispatches from './AdminVehicleDispatches';
import BrandLogo from './BrandLogo';
import { printQRCodes } from '../utils/printQR';
import { exportCSV } from '../utils/exportCSV';
import { exportBagsPDF } from '../utils/exportBags';
import { generateInvoice } from '../utils/generateInvoice';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab]         = useState('overview');
  const [stats, setStats]     = useState({});
  const [buyers, setBuyers]   = useState([]);
  const [warehouseEmployees, setWarehouseEmployees] = useState([]);
  const [apfNumbers, setApfNumbers] = useState([]);
  const [tobaccoTypes, setTobaccoTypes] = useState([]);
  const [purchaseLocations, setPurchaseLocations] = useState([]);
  const [tobaccoBoardGrades, setTobaccoBoardGrades] = useState([]);
  const [buyerGrades, setBuyerGrades] = useState([]);
  const [qrCodes, setQR]      = useState([]);
  const [bags, setBags]       = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [analyticsBuyerFilter, setAnalyticsBuyerFilter] = useState('');
  const [analyticsDispatchSort, setAnalyticsDispatchSort] = useState({ key: 'updated_at', direction: 'desc' });

  // Generate QR state
  const [genStart, setGenStart]   = useState('200');
  const [genCount, setGenCount]   = useState(5);
  const [genBuyerId, setGenBuyer] = useState('');
  const [qrBuyerFilter, setQrBuyerFilter] = useState('');
  const [genMsg, setGenMsg]       = useState('');

  // Add buyer state
  const [newLoginType, setNewLoginType] = useState('buyer');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [buyerMsg, setBuyerMsg] = useState('');
  const [qrMsg, setQrMsg] = useState('');
  const [bagsMsg, setBagsMsg] = useState('');
  const [enabledBuyerActionIds, setEnabledBuyerActionIds] = useState([]);
  const [selectedBuyerActionId, setSelectedBuyerActionId] = useState('');
  const [selectedBaleStartDate, setSelectedBaleStartDate] = useState('');
  const [selectedBaleEndDate, setSelectedBaleEndDate] = useState('');
  const [bagsColumnFilters, setBagsColumnFilters] = useState({
    buyer_name: '',
    unique_code: '',
    apf_number: '',
    tobacco_grade: '',
    type_of_tobacco: '',
    purchase_location: '',
  });
  const [qrSort, setQrSort] = useState({ key: 'unique_code', direction: 'asc' });
  const [qrTrackCode, setQrTrackCode] = useState('');
  const [qrTrackLoading, setQrTrackLoading] = useState(false);
  const [qrTrackResult, setQrTrackResult] = useState(null);
  const [qrTrackMsg, setQrTrackMsg] = useState('');
  const [bagsSort, setBagsSort] = useState({ key: 'updated_at', direction: 'desc' });
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
  const [tobaccoTypeCode, setTobaccoTypeCode] = useState('');
  const [tobaccoTypeDescription, setTobaccoTypeDescription] = useState('');
  const [tobaccoTypeEditingId, setTobaccoTypeEditingId] = useState(null);
  const [tobaccoTypeMsg, setTobaccoTypeMsg] = useState('');
  const [purchaseLocationCode, setPurchaseLocationCode] = useState('');
  const [purchaseLocationDescription, setPurchaseLocationDescription] = useState('');
  const [purchaseLocationEditingId, setPurchaseLocationEditingId] = useState(null);
  const [purchaseLocationMsg, setPurchaseLocationMsg] = useState('');

  // Admin logins state
  const [adminLogins, setAdminLogins] = useState([]);
  const qrTrackMsgRef = useRef(null);
  const [newAdminCode, setNewAdminCode] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminLoginMsg, setAdminLoginMsg] = useState('');
  const [editingAdminLoginId, setEditingAdminLoginId] = useState(null);
  const [editAdminLoginForm, setEditAdminLoginForm] = useState(null);
  const [editingBuyerId, setEditingBuyerId] = useState(null);
  const [editBuyerForm, setEditBuyerForm] = useState(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);
  const [editWarehouseForm, setEditWarehouseForm] = useState(null);

  const tbGradeCodeInputRef = useRef(null);
  const buyerGradeCodeInputRef = useRef(null);
  const apfCodeInputRef = useRef(null);
  const tobaccoTypeCodeInputRef = useRef(null);
  const purchaseLocationCodeInputRef = useRef(null);

  const refresh = async () => {
    const [s, b, w, apf, tobaccoTypeRows, purchaseLocationRows, tbGrades, byGrades, q, bg, buyerActionSetting, al, vehicleDispatchRows] = await Promise.all([
      api.getStats(),
      api.getBuyers(),
      api.getWarehouseEmployees(),
      api.getApfNumbers(),
      api.getTobaccoTypes(),
      api.getPurchaseLocations(),
      api.getGrades('tobacco_board'),
      api.getGrades('buyer'),
      api.getQRCodes(),
      api.getBags(),
      api.getBuyerBagActionSetting(),
      api.getAdminLogins(),
      api.getVehicleDispatches(),
    ]);
    setStats(s);
    setBuyers(b);
    setWarehouseEmployees(w);
    setApfNumbers(apf);
    setTobaccoTypes(tobaccoTypeRows);
    setPurchaseLocations(purchaseLocationRows);
    setTobaccoBoardGrades(tbGrades);
    setBuyerGrades(byGrades);
    setQR(q);
    setBags(bg);
    setDispatches(vehicleDispatchRows);
    setEnabledBuyerActionIds(Array.isArray(buyerActionSetting?.enabled_buyer_ids)
      ? buyerActionSetting.enabled_buyer_ids.map(Number)
      : []);
    setAdminLogins(al);
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
      if (newLoginType === 'warehouse') {
        await api.addWarehouseEmployee({ code: newCode, name: newName });
        setBuyerMsg(`✅ Warehouse login ${newCode.toUpperCase()} added. Password = ${newCode.toUpperCase()}`);
      } else {
        await api.addBuyer({ code: newCode, name: newName });
        setBuyerMsg(`✅ Buyer ${newCode.toUpperCase()} added. Password = ${newCode.toUpperCase()}`);
      }
      setNewCode(''); setNewName('');
      refresh();
    } catch (e) { setBuyerMsg(e.message); }
  };

  const handleDeleteWarehouseEmployee = async (employee) => {
    if (!window.confirm(`Delete warehouse login ${employee.code} (${employee.name})?`)) return;
    try {
      await api.deleteWarehouseEmployee(employee.id);
      setBuyerMsg(`✅ Warehouse login ${employee.code} deleted`);
      await refresh();
    } catch (e) {
      setBuyerMsg(e.message);
    }
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

  const handleSetBuyerActive = async (buyer, isActive) => {
    try {
      await api.setBuyerActive(buyer.id, isActive);
      setBuyerMsg(`✅ Buyer ${buyer.code} marked as ${isActive ? 'active' : 'inactive'}`);
      await refresh();
    } catch (e) {
      setBuyerMsg(e.message);
    }
  };

  const handleSetWarehouseActive = async (employee, isActive) => {
    try {
      await api.setWarehouseEmployeeActive(employee.id, isActive);
      setBuyerMsg(`✅ Warehouse login ${employee.code} marked as ${isActive ? 'active' : 'inactive'}`);
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

  const handleTrackQRCode = async () => {
    const code = String(qrTrackCode || '').trim();
    if (!code) {
      setQrTrackMsg('Enter QR code to track');
      setQrTrackResult(null);
      return;
    }
    setQrTrackLoading(true);
    setQrTrackMsg('');
    try {
      const result = await api.trackQRCode(code);
      setQrTrackResult(result);
      setQrTrackMsg('✅ Tracking details loaded');
    } catch (e) {
      setQrTrackResult(null);
      setQrTrackMsg(e.message);
    } finally {
      setQrTrackLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'qr-tracking') return;
    if (!qrTrackMsg || qrTrackMsg.startsWith('✅')) return;
    if (!qrTrackMsgRef.current) return;
    qrTrackMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [tab, qrTrackMsg]);

  const canDeleteQRCode = (qr) => {
    const usedValue = qr?.used;
    const isUsed = usedValue === true || usedValue === 1 || usedValue === '1';
    return !isUsed;
  };

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

  const formatCurrencyINR = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCompactCurrencyINR = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(2)}K`;
    return `₹${num.toFixed(2)}`;
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
    setTimeout(() => tbGradeCodeInputRef.current?.focus(), 0);
  };

  const resetBuyerGradeForm = () => {
    setBuyerGradeCode('');
    setBuyerGradeDescription('');
    setBuyerGradeEditingId(null);
    setTimeout(() => buyerGradeCodeInputRef.current?.focus(), 0);
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
    setTimeout(() => apfCodeInputRef.current?.focus(), 0);
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

  const resetTobaccoTypeForm = () => {
    setTobaccoTypeCode('');
    setTobaccoTypeDescription('');
    setTobaccoTypeEditingId(null);
    setTimeout(() => tobaccoTypeCodeInputRef.current?.focus(), 0);
  };

  const handleSaveTobaccoType = async () => {
    if (!tobaccoTypeCode.trim()) {
      setTobaccoTypeMsg('Type is required');
      return;
    }
    try {
      if (tobaccoTypeEditingId) {
        await api.updateTobaccoType(tobaccoTypeEditingId, { type: tobaccoTypeCode.trim(), description: tobaccoTypeDescription.trim() });
        setTobaccoTypeMsg(`✅ Type ${tobaccoTypeCode.trim()} updated`);
      } else {
        await api.addTobaccoType({ type: tobaccoTypeCode.trim(), description: tobaccoTypeDescription.trim() });
        setTobaccoTypeMsg(`✅ Type ${tobaccoTypeCode.trim()} added`);
      }
      resetTobaccoTypeForm();
      await refresh();
    } catch (e) {
      setTobaccoTypeMsg(e.message);
    }
  };

  const handleEditTobaccoType = (row) => {
    setTobaccoTypeEditingId(row.id);
    setTobaccoTypeCode(row.type || '');
    setTobaccoTypeDescription(row.description || '');
    setTobaccoTypeMsg('');
  };

  const handleDeleteTobaccoType = async (row) => {
    if (!window.confirm(`Delete type ${row.type}?`)) return;
    try {
      await api.deleteTobaccoType(row.id);
      setTobaccoTypeMsg(`✅ Type ${row.type} deleted`);
      if (tobaccoTypeEditingId === row.id) resetTobaccoTypeForm();
      await refresh();
    } catch (e) {
      setTobaccoTypeMsg(e.message);
    }
  };

  const resetPurchaseLocationForm = () => {
    setPurchaseLocationCode('');
    setPurchaseLocationDescription('');
    setPurchaseLocationEditingId(null);
    setTimeout(() => purchaseLocationCodeInputRef.current?.focus(), 0);
  };

  const handleSavePurchaseLocation = async () => {
    if (!purchaseLocationCode.trim()) {
      setPurchaseLocationMsg('Location is required');
      return;
    }
    try {
      if (purchaseLocationEditingId) {
        await api.updatePurchaseLocation(purchaseLocationEditingId, { location: purchaseLocationCode.trim(), description: purchaseLocationDescription.trim() });
        setPurchaseLocationMsg(`✅ Location ${purchaseLocationCode.trim()} updated`);
      } else {
        await api.addPurchaseLocation({ location: purchaseLocationCode.trim(), description: purchaseLocationDescription.trim() });
        setPurchaseLocationMsg(`✅ Location ${purchaseLocationCode.trim()} added`);
      }
      resetPurchaseLocationForm();
      await refresh();
    } catch (e) {
      setPurchaseLocationMsg(e.message);
    }
  };

  const handleEditPurchaseLocation = (row) => {
    setPurchaseLocationEditingId(row.id);
    setPurchaseLocationCode(row.location || '');
    setPurchaseLocationDescription(row.description || '');
    setPurchaseLocationMsg('');
  };

  const handleDeletePurchaseLocation = async (row) => {
    if (!window.confirm(`Delete location ${row.location}?`)) return;
    try {
      await api.deletePurchaseLocation(row.id);
      setPurchaseLocationMsg(`✅ Location ${row.location} deleted`);
      if (purchaseLocationEditingId === row.id) resetPurchaseLocationForm();
      await refresh();
    } catch (e) {
      setPurchaseLocationMsg(e.message);
    }
  };

  const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));
  const sortedApfNumbers = [...apfNumbers].sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  const sortedTobaccoTypes = [...tobaccoTypes].sort((a, b) => String(a.type).localeCompare(String(b.type), undefined, { numeric: true }));
  const sortedPurchaseLocations = [...purchaseLocations].sort((a, b) => String(a.location).localeCompare(String(b.location), undefined, { numeric: true }));
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
  const sortedFilteredQrCodes = [...filteredQrCodes].sort((a, b) => compareBy(a?.[qrSort.key], b?.[qrSort.key], qrSort.direction));
  const sortedBags = [...bags].sort((a, b) => compareBy(a?.[bagsSort.key], b?.[bagsSort.key], bagsSort.direction));
  const selectedBuyerIdNum = Number(selectedBuyerActionId);
  const displayedBags = Number.isFinite(selectedBuyerIdNum) && selectedBuyerIdNum > 0
    ? sortedBags.filter((b) => Number(b.buyer_id) === selectedBuyerIdNum)
    : sortedBags;
  const displayedBuyer = buyers.find((b) => b.id === selectedBuyerIdNum) || null;
  const inputDateToDisplayDate = (value) => {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  };
  const parseDisplayDateToInputDate = (dateText) => {
    const text = String(dateText || '').trim();
    if (!text) return '';

    const ddmmyyyy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      return `${yyyy}-${mm}-${dd}`;
    }

    const ddmmyyyyDash = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyDash) {
      const [, dd, mm, yyyy] = ddmmyyyyDash;
      return `${yyyy}-${mm}-${dd}`;
    }

    const yyyymmdd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmdd) {
      const [, yyyy, mm, dd] = yyyymmdd;
      return `${yyyy}-${mm}-${dd}`;
    }

    const inputDateTime = toInputDateTime(text);
    if (inputDateTime) return inputDateTime.split('T')[0] || '';

    return '';
  };
  const getBagDateLabel = (bag) => {
    const purchaseDate = parseDisplayDateToInputDate(bag.purchase_date);
    if (purchaseDate) return inputDateToDisplayDate(purchaseDate);

    const dateOfPurchase = parseDisplayDateToInputDate(bag.date_of_purchase);
    if (dateOfPurchase) return inputDateToDisplayDate(dateOfPurchase);

    const fallback = formatDateTime(bag.date_of_purchase).split(' ')[0] || '';
    const fallbackDate = parseDisplayDateToInputDate(fallback);
    return fallbackDate ? inputDateToDisplayDate(fallbackDate) : '—';
  };
  const formatPurchaseDateDash = (value) => {
    const normalized = parseDisplayDateToInputDate(value);
    if (!normalized) return '—';
    const display = inputDateToDisplayDate(normalized);
    const [dd, mm, yyyy] = display.split('/');
    return dd && mm && yyyy ? `${dd}-${mm}-${yyyy}` : '—';
  };
  const isWithinSelectedRange = (dateLabel) => {
    const normalized = parseDisplayDateToInputDate(dateLabel);
    if (!normalized) return !selectedBaleStartDate && !selectedBaleEndDate;
    if (selectedBaleStartDate && normalized < selectedBaleStartDate) return false;
    if (selectedBaleEndDate && normalized > selectedBaleEndDate) return false;
    return true;
  };
  const dateWiseBaleTotalsMap = displayedBags.reduce((acc, bag) => {
    const dateLabel = getBagDateLabel(bag);
    const baleValue = Number.isFinite(Number(bag.bale_value))
      ? Number(bag.bale_value)
      : (Number(bag.weight || 0) * Number(bag.rate || 0));
    const weight = Number(bag.weight);
    if (!acc[dateLabel]) acc[dateLabel] = { total: 0, bags: 0, kgs: 0 };
    acc[dateLabel].total += baleValue;
    acc[dateLabel].bags += 1;
    acc[dateLabel].kgs += Number.isFinite(weight) ? weight : 0;
    return acc;
  }, {});
  const dateWiseBaleTotals = Object.entries(dateWiseBaleTotalsMap)
    .map(([date, values]) => ({ date, total: values.total, bags: values.bags, kgs: values.kgs }))
    .sort((a, b) => compareBy(parseDisplayDateToInputDate(a.date), parseDisplayDateToInputDate(b.date), 'asc'));
  const filteredDateWiseBaleTotals = dateWiseBaleTotals.filter((row) => isWithinSelectedRange(row.date));
  const selectedDateTotal = filteredDateWiseBaleTotals.reduce((sum, row) => sum + row.total, 0);
  const selectedScopeBags = displayedBags.filter((bag) => isWithinSelectedRange(getBagDateLabel(bag)));
  const selectedScopeBagCount = selectedScopeBags.length;
  const selectedScopeTotalKgs = selectedScopeBags.reduce((sum, bag) => {
    const weight = Number(bag.weight);
    return sum + (Number.isFinite(weight) ? weight : 0);
  }, 0);
  const hasPurchaseSummarySelection = !!selectedBuyerActionId || !!selectedBaleStartDate || !!selectedBaleEndDate;
  const totalPurchaseTd = { ...S.td, fontWeight: 700 };
  const getUniqueColumnValues = (key) => {
    const values = Array.from(new Set(displayedBags.map((bag) => String(bag[key] || '').trim()).filter(Boolean)));
    return values.sort((a, b) => compareBy(a, b, 'asc'));
  };
  const buyerNameFilterOptions = getUniqueColumnValues('buyer_name');
  const uniqueCodeFilterOptions = getUniqueColumnValues('unique_code');
  const apfFilterOptions = getUniqueColumnValues('apf_number');
  const tbGradeFilterOptions = getUniqueColumnValues('tobacco_grade');
  const typeFilterOptions = getUniqueColumnValues('type_of_tobacco');
  const locationFilterOptions = getUniqueColumnValues('purchase_location');
  const filteredDisplayedBags = displayedBags.filter((bag) => {
    const matches = (key) => {
      const selectedValue = String(bagsColumnFilters[key] || '').trim();
      if (!selectedValue) return true;
      return String(bag[key] || '').trim() === selectedValue;
    };
    return (
      isWithinSelectedRange(getBagDateLabel(bag))
      && matches('buyer_name')
      && matches('unique_code')
      && matches('apf_number')
      && matches('tobacco_grade')
      && matches('type_of_tobacco')
      && matches('purchase_location')
    );
  });
  const totalPurchaseCsvRows = displayedBags.map((bag) => ({
    buyer_code: bag.buyer_code || '',
    buyer_name: bag.buyer_name || '',
    unique_code: bag.unique_code || '',
    apf_number: bag.apf_number || '',
    tobacco_grade: bag.tobacco_grade || '',
    type_of_tobacco: bag.type_of_tobacco || '',
    purchase_location: bag.purchase_location || '',
    purchase_date: getBagDateLabel(bag),
    buyer_grade: bag.buyer_grade || '',
    weight: bag.weight ?? '',
    rate: bag.rate ?? '',
    bale_value: Number.isFinite(Number(bag.bale_value))
      ? Number(bag.bale_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '',
    fcv: bag.fcv || '',
    updated_at: formatDateTime(bag.updated_at),
  }));

  const analyticsBuyerId = Number(analyticsBuyerFilter);
  const analyticsScopedBags = useMemo(() => (
    Number.isFinite(analyticsBuyerId) && analyticsBuyerId > 0
      ? bags.filter((bag) => Number(bag.buyer_id) === analyticsBuyerId)
      : bags
  ), [bags, analyticsBuyerId]);
  const analyticsScopedDispatches = useMemo(() => (
    Number.isFinite(analyticsBuyerId) && analyticsBuyerId > 0
      ? dispatches.filter((row) => Number(row.buyer_id) === analyticsBuyerId)
      : dispatches
  ), [dispatches, analyticsBuyerId]);

  const analyticsTotalPurchaseValue = analyticsScopedBags.reduce((sum, bag) => {
    const baleValue = Number.isFinite(Number(bag.bale_value))
      ? Number(bag.bale_value)
      : (Number(bag.weight || 0) * Number(bag.rate || 0));
    return sum + (Number.isFinite(baleValue) ? baleValue : 0);
  }, 0);
  const analyticsTotalWeight = analyticsScopedBags.reduce((sum, bag) => {
    const weight = Number(bag.weight);
    return sum + (Number.isFinite(weight) ? weight : 0);
  }, 0);
  const analyticsStatusCounts = analyticsScopedDispatches.reduce((acc, row) => {
    if (row.status === 'sent_to_admin') acc.sentToAdmin += 1;
    if (row.status === 'sent_to_warehouse') acc.sentToWarehouse += 1;
    if (row.status === 'warehouse_received') acc.warehouseReceived += 1;
    if (row.status === 'unmatched_bags') acc.unmatchedBags += 1;
    return acc;
  }, { sentToAdmin: 0, sentToWarehouse: 0, warehouseReceived: 0, unmatchedBags: 0 });

  const analyticsStatusCountsAll = dispatches.reduce((acc, row) => {
    if (row.status === 'sent_to_admin') acc.sentToAdmin += 1;
    if (row.status === 'sent_to_warehouse') acc.sentToWarehouse += 1;
    if (row.status === 'warehouse_received') acc.warehouseReceived += 1;
    acc.unmatchedBags += Number(row.unmatched_count || 0);
    return acc;
  }, { sentToAdmin: 0, sentToWarehouse: 0, warehouseReceived: 0, unmatchedBags: 0 });

  const analyticsBuyerPurchaseValues = useMemo(() => {
    const map = {};
    analyticsScopedBags.forEach((bag) => {
      const key = String(bag.buyer_code || bag.buyer_name || bag.buyer_id || 'Unknown');
      if (!map[key]) map[key] = { label: key, value: 0 };
      const baleValue = Number.isFinite(Number(bag.bale_value))
        ? Number(bag.bale_value)
        : (Number(bag.weight || 0) * Number(bag.rate || 0));
      map[key].value += Number.isFinite(baleValue) ? baleValue : 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [analyticsScopedBags]);

  const analyticsPurchasesByDate = useMemo(() => {
    const map = {};
    analyticsScopedBags.forEach((bag) => {
      const dateLabel = getBagDateLabel(bag);
      if (!map[dateLabel]) map[dateLabel] = { label: dateLabel, value: 0 };
      const baleValue = Number.isFinite(Number(bag.bale_value))
        ? Number(bag.bale_value)
        : (Number(bag.weight || 0) * Number(bag.rate || 0));
      map[dateLabel].value += Number.isFinite(baleValue) ? baleValue : 0;
    });
    return Object.values(map)
      .filter((row) => row.label && row.label !== '—')
      .sort((a, b) => compareBy(parseDisplayDateToInputDate(a.label), parseDisplayDateToInputDate(b.label), 'asc'))
      .slice(-8);
  }, [analyticsScopedBags]);

  const analyticsPurchasesByLocation = useMemo(() => {
    const map = {};
    analyticsScopedBags.forEach((bag) => {
      const label = String(bag.purchase_location || 'Unknown');
      if (!map[label]) map[label] = { label, value: 0 };
      const baleValue = Number.isFinite(Number(bag.bale_value))
        ? Number(bag.bale_value)
        : (Number(bag.weight || 0) * Number(bag.rate || 0));
      map[label].value += Number.isFinite(baleValue) ? baleValue : 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [analyticsScopedBags]);

  const analyticsDispatchRows = useMemo(
    () => [...dispatches].sort((a, b) => compareBy(a?.[analyticsDispatchSort.key], b?.[analyticsDispatchSort.key], analyticsDispatchSort.direction)),
    [dispatches, analyticsDispatchSort]
  );

  const dispatchStageLabel = (status) => {
    if (status === 'sent_to_admin') return 'Sent to Admin';
    if (status === 'sent_to_warehouse') return 'Sent to Warehouse';
    if (status === 'warehouse_received') return 'Warehouse Received';
    if (status === 'unmatched_bags') return 'Unmatched Bags';
    return status || '—';
  };

  const navigateToTab = (targetTab) => {
    setTab(targetTab);
    refresh();
  };

  const AnalyticsStatCard = ({ title, value, subtitle, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: '#ffffff', border: '1px solid #d7e6ff', borderRadius: 12, padding: 14, textAlign: 'left',
        boxShadow: '0 3px 10px rgba(11,46,107,0.10)', cursor: 'pointer', width: '100%',
      }}
      title="Click to open related tab"
    >
      <div style={{ fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', color: '#4f6b99' }}>{title}</div>
      <div style={{ fontSize: 24, color: '#0b2e6b', fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {subtitle ? <div style={{ fontSize: 12, color: '#5f7297', marginTop: 5 }}>{subtitle}</div> : null}
    </button>
  );

  const DonutChartCard = ({ title, values, colors, totalLabel, onClick, valueFormatter, centerValueFormatter }) => {
    const sum = values.reduce((acc, item) => acc + item.value, 0);
    let currentAngle = 0;
    const segments = values.map((item, idx) => {
      const percent = sum > 0 ? (item.value / sum) * 100 : 0;
      const start = currentAngle;
      const end = currentAngle + percent;
      currentAngle = end;
      return `${colors[idx % colors.length]} ${start}% ${end}%`;
    });
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...S.card,
          marginBottom: 0,
          cursor: 'pointer',
          textAlign: 'left',
          border: '1px solid #d7e6ff',
        }}
        title="Click to open related tab"
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0b2e6b', marginBottom: 10 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `conic-gradient(${segments.join(', ') || '#93c5fd 0% 100%'})` }} />
            <div style={{
              position: 'absolute',
              top: 25,
              left: 25,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              border: '1px solid #dbeafe',
            }}>
              <div style={{ fontSize: 15, color: '#0b2e6b', fontWeight: 900, textAlign: 'center', lineHeight: 1.15, maxWidth: 84, wordBreak: 'break-word' }}>
                {centerValueFormatter ? centerValueFormatter(sum) : (valueFormatter ? valueFormatter(sum) : sum)}
              </div>
              <div style={{ fontSize: 10, color: '#5f7297', textTransform: 'uppercase' }}>{totalLabel}</div>
            </div>
          </div>
          <div>
            {values.map((item, idx) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: colors[idx % colors.length], display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#1e3a5f' }}>{item.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#0b2e6b' }}>{valueFormatter ? valueFormatter(item.value) : item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </button>
    );
  };

  const BarChartCard = ({ title, rows, color, onClick }) => {
    const max = Math.max(...rows.map((row) => row.value), 1);
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...S.card,
          marginBottom: 0,
          cursor: 'pointer',
          textAlign: 'left',
          border: '1px solid #d7e6ff',
        }}
        title="Click to open related tab"
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0b2e6b', marginBottom: 10 }}>{title}</div>
        {rows.length === 0 ? <div style={{ color: '#6b7280', fontSize: 12 }}>No data</div> : rows.map((row) => (
          <div key={row.label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#1e3a5f', marginBottom: 4 }}>
              <span>{row.label}</span>
              <b style={{ color: '#0b2e6b' }}>{row.value}</b>
            </div>
            <div style={{ height: 10, background: '#e6f0ff', borderRadius: 999 }}>
              <div style={{ height: 10, width: `${(row.value / max) * 100}%`, background: color, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </button>
    );
  };

  const SortableTh = ({ label, sortKey, sortState, onSort, minWidth, thStyle }) => (
    <th
      style={{ ...S.th, ...(thStyle || {}), cursor: 'pointer', userSelect: 'none', fontWeight: 700, ...(minWidth ? { minWidth } : {}) }}
      onClick={() => onSort(sortKey)}
      title="Click to sort"
    >
      {label}{sortState.key === sortKey ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
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
        <BrandLogo
          size={38}
          title="Elite Leaf Tobacco Company - Admin"
          titleStyle={S.topBarTitle}
        />
        <div style={S.buyerInfo}>
          <span style={S.buyerBadge}>🔐 Administrator</span>
          <ApiStatusBadge />
          <span style={S.bagsBadge}>📦 {stats.bags || 0} Bags</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={{ ...S.page, maxWidth: 1195 }}>
        <div style={S.tabs}>
          {[['overview','📊 Overview'],['analytics','📈 Dashboard Analytics'],['buyers','🔐 Login Info'],['apf-maintenance','🔢 APF Maintenance'],['non-fcv-locations','📍 NON-FCV Locations'],['tobacco-types','🌿 Tobacco Types'],['tb-grades','🏷️ TB Grades'],['buyer-grades','🏷️ Buyer Grades'],['qrcodes','🔲 QR Codes'],['qr-tracking','📡 QR Tracking'],['vehicle-dispatches','🚚 Vehicle Dispatches'],['generate','⚡ Generate QR'],['bags','📦 Total Purchase'],['database','🗄️ Database']].map(([id, label]) => (
            <button key={id} style={S.tab(tab === id)} onClick={() => { setTab(id); refresh(); }}>{label}</button>
          ))}
        </div>

        {/* ── DASHBOARD ANALYTICS ── */}
        {tab === 'analytics' && (
          <div>
            <div style={{
              background: '#0b2e6b',
              color: '#ffffff',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 14,
              boxShadow: '0 6px 16px rgba(11,46,107,0.22)',
            }}>
              <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 0.3 }}>Dashboard Analytics</div>
              <div style={{ fontSize: 12, opacity: 0.94, marginTop: 2 }}>Interactive analytics with buyer-level filtering and dispatch tracking insights.</div>
            </div>

            <div style={{ ...S.card, background: '#ffffff', border: '1px solid #d7e6ff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'stretch' }}>
                <AnalyticsStatCard title="Purchases" value={analyticsScopedBags.length} onClick={() => navigateToTab('bags')} />
                <AnalyticsStatCard title="Total Purchase Value" value={formatCurrencyINR(analyticsTotalPurchaseValue)} onClick={() => navigateToTab('bags')} />
                <AnalyticsStatCard title="Total Weight" value={`${analyticsTotalWeight.toFixed(2)} kg`} onClick={() => navigateToTab('bags')} />
                <AnalyticsStatCard title="Dispatches" value={analyticsScopedDispatches.length} subtitle="Click to open Vehicle Dispatches" onClick={() => navigateToTab('vehicle-dispatches')} />
                <div style={{ background: '#ffffff', border: '1px solid #d7e6ff', borderRadius: 12, padding: 14, boxShadow: '0 3px 10px rgba(11,46,107,0.10)' }}>
                  <label style={{ ...S.label, marginBottom: 6 }}>Select Buyer</label>
                  <select
                    style={{ ...S.input, marginBottom: 0 }}
                    value={analyticsBuyerFilter}
                    onChange={(e) => setAnalyticsBuyerFilter(e.target.value)}
                  >
                    <option value="">All Buyers</option>
                    {buyers.map((buyer) => (
                      <option key={buyer.id} value={String(buyer.id)}>{buyer.code} - {buyer.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 14 }}>
              <DonutChartCard
                title="Buyer Purchase Values"
                totalLabel="Purchase Value"
                values={analyticsBuyerPurchaseValues}
                colors={['#166534', '#65a30d', '#ca8a04', '#0f766e', '#0369a1', '#7c3aed']}
                onClick={() => navigateToTab('bags')}
                valueFormatter={formatCurrencyINR}
                centerValueFormatter={formatCompactCurrencyINR}
              />
              <DonutChartCard
                title="Warehouse / Dispatch Status"
                totalLabel="Dispatches"
                values={[
                  { label: 'To Admin', value: analyticsStatusCountsAll.sentToAdmin },
                  { label: 'To Warehouse', value: analyticsStatusCountsAll.sentToWarehouse },
                  { label: 'Warehouse Received', value: analyticsStatusCountsAll.warehouseReceived },
                  { label: 'Unmatched Bags', value: analyticsStatusCountsAll.unmatchedBags },
                ]}
                colors={['#0b2e6b', '#2563eb', '#14b8a6', '#f59e0b']}
                onClick={() => navigateToTab('vehicle-dispatches')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 14 }}>
              <BarChartCard
                title="Purchases by Date"
                rows={analyticsPurchasesByDate}
                color="#1d4ed8"
                onClick={() => navigateToTab('bags')}
              />
              <BarChartCard
                title="Purchases by Location"
                rows={analyticsPurchasesByLocation}
                color="#0891b2"
                onClick={() => navigateToTab('bags')}
              />
            </div>

            <div style={{ ...S.card, background: '#ffffff', border: '1px solid #d7e6ff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0b2e6b', marginBottom: 10 }}>Dispatch Tracking - All Buyers</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <SortableTh label="Dispatch" sortKey="dispatch_number" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Buyer" sortKey="buyer_code" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Vehicle" sortKey="vehicle_number" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Current Stage" sortKey="status" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Warehouse Employee" sortKey="warehouse_employee_name" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Bags" sortKey="item_count" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Weight" sortKey="total_weight" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Total Value" sortKey="total_bale_value" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                      <SortableTh label="Updated" sortKey="updated_at" sortState={analyticsDispatchSort} onSort={(key) => toggleSort(analyticsDispatchSort, setAnalyticsDispatchSort, key)} thStyle={{ background: '#0b2e6b', color: '#ffffff', borderColor: '#0b2e6b' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsDispatchRows.length === 0 ? (
                      <tr><td style={S.td} colSpan={9}>No dispatches available.</td></tr>
                    ) : analyticsDispatchRows.map((row) => (
                      <tr key={row.id}>
                        <td style={S.td}>{row.dispatch_number || `DSP-${String(row.id).padStart(5, '0')}`}</td>
                        <td style={S.td}>{row.buyer_code} - {row.buyer_name}</td>
                        <td style={S.td}>{row.vehicle_number || '—'}</td>
                        <td style={S.td}>{dispatchStageLabel(row.status)}</td>
                        <td style={S.td}>{row.warehouse_employee_code ? `${row.warehouse_employee_code} - ${row.warehouse_employee_name}` : (row.warehouse_employee_name || '—')}</td>
                        <td style={S.td}>{Number(row.item_count || 0)}</td>
                        <td style={S.td}>{Number(row.total_weight || 0).toFixed(2)} kg</td>
                        <td style={S.td}>{formatCurrencyINR(row.total_bale_value)}</td>
                        <td style={S.td}>{formatDateTime(row.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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

        {/* ── LOGIN INFO ── */}
        {tab === 'buyers' && (
          <div>
            {/* ── Admin Logins Section ── */}
            <div style={S.card}>
              <div style={S.subheading}>Admin Login Accounts ({adminLogins.length})</div>
              {adminLoginMsg && <div style={adminLoginMsg.startsWith('✅') ? S.success : S.error}>{adminLoginMsg}</div>}
              <table style={S.table}>
                <thead><tr>{['Code / Username','Name','Password','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {adminLogins.map(al => (
                    editingAdminLoginId === al.id ? (
                      <tr key={al.id} style={{ background: '#fffbea' }}>
                        <td style={{ ...S.td, fontWeight: 800 }}>{al.code}</td>
                        <td style={S.td}><input style={{ ...S.input, minWidth: 140, marginBottom: 0 }} value={editAdminLoginForm?.name ?? ''} onChange={e => setEditAdminLoginForm(f => ({ ...f, name: e.target.value }))} /></td>
                        <td style={S.td}><input style={{ ...S.input, minWidth: 140, marginBottom: 0 }} type="password" placeholder="New password" value={editAdminLoginForm?.password ?? ''} onChange={e => setEditAdminLoginForm(f => ({ ...f, password: e.target.value }))} /></td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 12px', fontSize: 12 }} onClick={async () => {
                              try {
                                await api.updateAdminLogin(al.id, { name: editAdminLoginForm.name, password: editAdminLoginForm.password });
                                setAdminLoginMsg('✅ Admin login updated');
                                setEditingAdminLoginId(null);
                                setEditAdminLoginForm(null);
                                setAdminLogins(await api.getAdminLogins());
                              } catch (e) { setAdminLoginMsg(e.message); }
                            }}>Save</button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 12px', fontSize: 12 }} onClick={() => { setEditingAdminLoginId(null); setEditAdminLoginForm(null); }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={al.id}>
                        <td style={{ ...S.td, fontWeight: 800 }}>{al.code}</td>
                        <td style={S.td}>{al.name}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', color: '#c0392b' }}>{al.password}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => { setEditingAdminLoginId(al.id); setEditAdminLoginForm({ name: al.name, password: '' }); setAdminLoginMsg(''); }}>✏️ Edit</button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, color: '#b91c1c' }} onClick={async () => {
                              if (!window.confirm(`Delete admin "${al.code}"? This cannot be undone.`)) return;
                              try {
                                await api.deleteAdminLogin(al.id);
                                setAdminLoginMsg(`✅ Admin "${al.code}" deleted`);
                                setAdminLogins(await api.getAdminLogins());
                              } catch (e) { setAdminLoginMsg(e.message); }
                            }}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>Add New Admin Login</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div><label style={S.label}>Username / Code</label><input style={S.input} placeholder="e.g. admin2" value={newAdminCode} onChange={e => setNewAdminCode(e.target.value)} /></div>
                <div><label style={S.label}>Display Name</label><input style={S.input} placeholder="e.g. Site Admin" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} /></div>
                <div><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="Enter password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} /></div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 20px' }} onClick={async () => {
                  try {
                    await api.createAdminLogin({ code: newAdminCode, name: newAdminName, password: newAdminPassword });
                    setAdminLoginMsg(`✅ Admin "${newAdminCode}" created`);
                    setNewAdminCode(''); setNewAdminName(''); setNewAdminPassword('');
                    setAdminLogins(await api.getAdminLogins());
                  } catch (e) { setAdminLoginMsg(e.message); }
                }}>Add Admin</button>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>Add Buyer / Warehouse Login</div>
              {buyerMsg && <div style={buyerMsg.startsWith('✅') ? S.success : S.error}>{buyerMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>Login Type</label>
                  <select style={S.input} value={newLoginType} onChange={e => setNewLoginType(e.target.value)}>
                    <option value="buyer">Buyer Login</option>
                    <option value="warehouse">Warehouse Login</option>
                  </select>
                </div>
                <div><label style={S.label}>{newLoginType === 'warehouse' ? 'Warehouse Code' : 'Buyer Code'}</label><input style={S.input} placeholder={newLoginType === 'warehouse' ? 'e.g. W003' : 'e.g. B004'} value={newCode} onChange={e => setNewCode(e.target.value)} /></div>
                <div><label style={S.label}>{newLoginType === 'warehouse' ? 'Warehouse Name' : 'Buyer Name'}</label><input style={S.input} placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 20px' }} onClick={handleAddBuyer}>Add</button>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.subheading}>Buyer Login Users ({buyers.length})</div>
              {buyerMsg && <div style={buyerMsg.startsWith('✅') ? S.success : S.error}>{buyerMsg}</div>}
              <table style={S.table}>
                <thead><tr>{['Code','Name','Password','Status','QR Assigned','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {buyers.map(b => (
                    editingBuyerId === b.id ? (
                      <tr key={b.id} style={{ background: '#fffbea' }}>
                        <td style={{ ...S.td, fontWeight: 800 }}>{b.code}</td>
                        <td style={S.td}><input style={{ ...S.input, minWidth: 140, marginBottom: 0 }} value={editBuyerForm?.name ?? ''} onChange={e => setEditBuyerForm(f => ({ ...f, name: e.target.value }))} /></td>
                        <td style={S.td}><input style={{ ...S.input, minWidth: 140, marginBottom: 0 }} type="password" placeholder="New password" value={editBuyerForm?.password ?? ''} onChange={e => setEditBuyerForm(f => ({ ...f, password: e.target.value }))} /></td>
                        <td style={S.td}><span style={{ fontWeight: 800, color: Number(b.is_active ?? 1) === 1 ? '#15803d' : '#b91c1c' }}>{Number(b.is_active ?? 1) === 1 ? 'Active' : 'Inactive'}</span></td>
                        <td style={S.td}>{qrCodes.filter(q => q.buyer_id === b.id).length}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 12px', fontSize: 12 }} onClick={async () => {
                              try {
                                await api.updateBuyer(b.id, { name: editBuyerForm.name, password: editBuyerForm.password });
                                setBuyerMsg('✅ Buyer updated');
                                setEditingBuyerId(null);
                                setEditBuyerForm(null);
                                setBuyers(await api.getBuyers());
                              } catch (e) { setBuyerMsg(e.message); }
                            }}>Save</button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 12px', fontSize: 12 }} onClick={() => { setEditingBuyerId(null); setEditBuyerForm(null); }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={b.id}>
                        <td style={S.td}><b>{b.code}</b></td>
                        <td style={S.td}>{b.name}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', color: '#c0392b' }}>{b.password}</td>
                        <td style={S.td}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            color: Number(b.is_active ?? 1) === 1 ? '#166534' : '#b91c1c',
                            background: Number(b.is_active ?? 1) === 1 ? '#dcfce7' : '#fee2e2',
                            border: Number(b.is_active ?? 1) === 1 ? '1px solid #86efac' : '1px solid #fca5a5'
                          }}>{Number(b.is_active ?? 1) === 1 ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={S.td}>{qrCodes.filter(q => q.buyer_id === b.id).length}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: Number(b.is_active ?? 1) === 1 ? 1 : 0.55 }}
                              onClick={() => handleSetBuyerActive(b, true)}
                            >
                              Active
                            </button>
                            <button
                              style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: Number(b.is_active ?? 1) === 0 ? 1 : 0.55 }}
                              onClick={() => handleSetBuyerActive(b, false)}
                            >
                              Inactive
                            </button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => { setEditingBuyerId(b.id); setEditBuyerForm({ name: b.name, password: '' }); setBuyerMsg(''); }}>✏️ Edit</button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, color: '#b91c1c' }} onClick={() => handleDeleteBuyer(b)}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>Warehouse Login Users ({warehouseEmployees.length})</div>
              <table style={S.table}>
                <thead><tr>{['Code','Name','Password','Status','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {warehouseEmployees.map(w => (
                    editingWarehouseId === w.id ? (
                      <tr key={w.id} style={{ background: '#fffbea' }}>
                        <td style={{ ...S.td, fontWeight: 800 }}>{w.code}</td>
                        <td style={S.td}><input style={{ ...S.input, minWidth: 140, marginBottom: 0 }} value={editWarehouseForm?.name ?? ''} onChange={e => setEditWarehouseForm(f => ({ ...f, name: e.target.value }))} /></td>
                        <td style={S.td}><input style={{ ...S.input, minWidth: 140, marginBottom: 0 }} type="password" placeholder="New password" value={editWarehouseForm?.password ?? ''} onChange={e => setEditWarehouseForm(f => ({ ...f, password: e.target.value }))} /></td>
                        <td style={S.td}><span style={{ fontWeight: 800, color: Number(w.is_active ?? 1) === 1 ? '#15803d' : '#b91c1c' }}>{Number(w.is_active ?? 1) === 1 ? 'Active' : 'Inactive'}</span></td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 12px', fontSize: 12 }} onClick={async () => {
                              try {
                                await api.updateWarehouseEmployee(w.id, { name: editWarehouseForm.name, password: editWarehouseForm.password });
                                setBuyerMsg('✅ Warehouse employee updated');
                                setEditingWarehouseId(null);
                                setEditWarehouseForm(null);
                                setWarehouseEmployees(await api.getWarehouseEmployees());
                              } catch (e) { setBuyerMsg(e.message); }
                            }}>Save</button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 12px', fontSize: 12 }} onClick={() => { setEditingWarehouseId(null); setEditWarehouseForm(null); }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={w.id}>
                        <td style={{ ...S.td, fontWeight: 800 }}>{w.code}</td>
                        <td style={S.td}>{w.name}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', color: '#c0392b' }}>{w.password}</td>
                        <td style={S.td}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            color: Number(w.is_active ?? 1) === 1 ? '#166534' : '#b91c1c',
                            background: Number(w.is_active ?? 1) === 1 ? '#dcfce7' : '#fee2e2',
                            border: Number(w.is_active ?? 1) === 1 ? '1px solid #86efac' : '1px solid #fca5a5'
                          }}>{Number(w.is_active ?? 1) === 1 ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: Number(w.is_active ?? 1) === 1 ? 1 : 0.55 }}
                              onClick={() => handleSetWarehouseActive(w, true)}
                            >
                              Active
                            </button>
                            <button
                              style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: Number(w.is_active ?? 1) === 0 ? 1 : 0.55 }}
                              onClick={() => handleSetWarehouseActive(w, false)}
                            >
                              Inactive
                            </button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => { setEditingWarehouseId(w.id); setEditWarehouseForm({ name: w.name, password: '' }); setBuyerMsg(''); }}>✏️ Edit</button>
                            <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12, color: '#b91c1c' }} onClick={() => handleDeleteWarehouseEmployee(w)}>🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
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
                  <input ref={apfCodeInputRef} style={S.input} placeholder="e.g. 121" value={apfNumberCode} onChange={e => setApfNumberCode(e.target.value)} />
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

        {/* ── NON-FCV LOCATION MAINTENANCE ── */}
        {tab === 'non-fcv-locations' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>NON-FCV Location Maintenance</div>
              {purchaseLocationMsg && <div style={purchaseLocationMsg.startsWith('✅') ? S.success : S.error}>{purchaseLocationMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>Location</label>
                  <input ref={purchaseLocationCodeInputRef} style={S.input} placeholder="e.g. Godown A" value={purchaseLocationCode} onChange={e => setPurchaseLocationCode(e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Description (Optional)</label>
                  <input style={S.input} placeholder="Optional description" value={purchaseLocationDescription} onChange={e => setPurchaseLocationDescription(e.target.value)} />
                </div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 16px' }} onClick={handleSavePurchaseLocation}>
                  {purchaseLocationEditingId ? 'Update' : 'Add'}
                </button>
                {purchaseLocationEditingId && (
                  <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 16px' }} onClick={resetPurchaseLocationForm}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>All NON-FCV Locations ({purchaseLocations.length})</div>
              <table style={S.table}>
                <thead><tr>{['Location','Description','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sortedPurchaseLocations.map(row => (
                    <tr key={row.id}>
                      <td style={S.td}><b>{row.location}</b></td>
                      <td style={S.td}>{row.description || '—'}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditPurchaseLocation(row)}>
                            ✏️ Edit
                          </button>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeletePurchaseLocation(row)}>
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

        {/* ── TOBACCO TYPE / VARIETY MAINTENANCE ── */}
        {tab === 'tobacco-types' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Type of Tobacco / Variety Maintenance</div>
              {tobaccoTypeMsg && <div style={tobaccoTypeMsg.startsWith('✅') ? S.success : S.error}>{tobaccoTypeMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>Type / Variety</label>
                  <input ref={tobaccoTypeCodeInputRef} style={S.input} placeholder="e.g. FCV Virginia" value={tobaccoTypeCode} onChange={e => setTobaccoTypeCode(e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Description (Optional)</label>
                  <input style={S.input} placeholder="Optional description" value={tobaccoTypeDescription} onChange={e => setTobaccoTypeDescription(e.target.value)} />
                </div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 16px' }} onClick={handleSaveTobaccoType}>
                  {tobaccoTypeEditingId ? 'Update' : 'Add'}
                </button>
                {tobaccoTypeEditingId && (
                  <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 16px' }} onClick={resetTobaccoTypeForm}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.subheading}>All Tobacco Types ({tobaccoTypes.length})</div>
              <table style={S.table}>
                <thead><tr>{['Type / Variety','Description','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sortedTobaccoTypes.map(row => (
                    <tr key={row.id}>
                      <td style={S.td}><b>{row.type}</b></td>
                      <td style={S.td}>{row.description || '—'}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleEditTobaccoType(row)}>
                            ✏️ Edit
                          </button>
                          <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteTobaccoType(row)}>
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
                  <input ref={tbGradeCodeInputRef} style={S.input} placeholder="e.g. H1" value={tbGradeCode} onChange={e => setTbGradeCode(e.target.value.toUpperCase())} />
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
                  <input ref={buyerGradeCodeInputRef} style={S.input} placeholder="e.g. A1" value={buyerGradeCode} onChange={e => setBuyerGradeCode(e.target.value.toUpperCase())} />
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
              <div style={S.subheading}>All QR Codes ({sortedFilteredQrCodes.length})</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={S.badge('green')}>Available: {sortedFilteredQrCodes.filter(q => !q.used).length}</span>
                <span style={S.badge('red')}>Used: {sortedFilteredQrCodes.filter(q => q.used).length}</span>
                {sortedFilteredQrCodes.length > 0 && (
                  <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', fontSize: 12 }}
                    onClick={() => printQRCodes(sortedFilteredQrCodes, buyerMap)}>
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
                <thead><tr>
                  <SortableTh label="Code" sortKey="unique_code" sortState={qrSort} onSort={(key) => toggleSort(qrSort, setQrSort, key)} />
                  <th style={S.th}>QR</th>
                  <SortableTh label="Assigned To" sortKey="buyer_code" sortState={qrSort} onSort={(key) => toggleSort(qrSort, setQrSort, key)} />
                  <SortableTh label="Buyer Name" sortKey="buyer_name" sortState={qrSort} onSort={(key) => toggleSort(qrSort, setQrSort, key)} />
                  <SortableTh label="Status" sortKey="used" sortState={qrSort} onSort={(key) => toggleSort(qrSort, setQrSort, key)} />
                  <th style={S.th}>Action</th>
                </tr></thead>
                <tbody>
                  {sortedFilteredQrCodes.map(q => (
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

        {/* ── QR TRACKING ── */}
        {tab === 'qr-tracking' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Track QR Code</div>
              {qrTrackMsg && <div ref={qrTrackMsgRef} style={qrTrackMsg.startsWith('✅') ? S.success : S.error}>{qrTrackMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr auto auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={S.label}>QR Code</label>
                  <input
                    style={S.input}
                    placeholder="Scan or type QR code"
                    value={qrTrackCode}
                    onChange={(e) => setQrTrackCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTrackQRCode(); }}
                  />
                </div>
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 18px', opacity: qrTrackLoading ? 0.6 : 1 }} onClick={handleTrackQRCode} disabled={qrTrackLoading}>
                  {qrTrackLoading ? 'Tracking...' : 'Track'}
                </button>
                <button style={{ ...S.btnSecondary, flex: 'none', padding: '10px 18px' }} onClick={() => { setQrTrackCode(''); setQrTrackResult(null); setQrTrackMsg(''); }}>
                  Clear
                </button>
              </div>
            </div>

            {qrTrackResult && (
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={S.subheading}>Tracking Result: {qrTrackResult.code}</div>
                  <span style={S.badge(qrTrackResult.status === 'USED' ? 'red' : qrTrackResult.status === 'ASSIGNED' ? 'blue' : 'gray')}>{qrTrackResult.status}</span>
                </div>

                {/* Row 1: QR Details + Buyer Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                  {/* QR Details */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>🔲 QR Details</div>
                    <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                      <div><b>Code:</b> {qrTrackResult.qr?.unique_code || '—'}</div>
                      <div><b>QR Status:</b> {qrTrackResult.status || '—'}</div>
                      <div><b>QR Created:</b> {formatDateTime(qrTrackResult.qr?.created_at)}</div>
                      <div><b>Used:</b> {qrTrackResult.qr?.used ? <span style={{ color: '#dc2626' }}>Yes</span> : <span style={{ color: '#16a34a' }}>No</span>}</div>
                      <div><b>Tracked At:</b> {formatDateTime(qrTrackResult.tracked_at)}</div>
                    </div>
                  </div>

                  {/* Buyer Details */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>👤 Buyer Details</div>
                    {!qrTrackResult.qr?.buyer_id ? (
                      <div style={{ fontSize: 13, color: '#777' }}>No buyer assigned to this QR code.</div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                        <div><b>Buyer Code:</b> {qrTrackResult.qr?.buyer_code || '—'}</div>
                        <div><b>Buyer Name:</b> {qrTrackResult.qr?.buyer_name || '—'}</div>
                        {qrTrackResult.bag?.buyer_grade && <div><b>Buyer Grade:</b> {qrTrackResult.bag.buyer_grade}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Purchase/Bag Details + Dispatch Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  {/* Purchase Details */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>📦 Purchase Details</div>
                    {!qrTrackResult.bag ? (
                      <div style={{ fontSize: 13, color: '#777' }}>No purchase recorded for this QR code yet.</div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                        <div><b>Bale Value:</b> {qrTrackResult.bag.bale_value != null ? `₹${Number(qrTrackResult.bag.bale_value).toLocaleString()}` : '—'}</div>
                        <div><b>Weight:</b> {qrTrackResult.bag.weight ?? '—'} kg</div>
                        <div><b>Rate:</b> {qrTrackResult.bag.rate ?? '—'}</div>
                        <div><b>Invoice Number:</b> {qrTrackResult.bag.dispatch_invoice_number || qrTrackResult.dispatch?.invoice_number || '—'}</div>
                        <div><b>FCV Type:</b> {qrTrackResult.bag.fcv || '—'}</div>
                        <div><b>APF:</b> {qrTrackResult.bag.apf_number || '—'}</div>
                        <div><b>Type / Variety:</b> {qrTrackResult.bag.type_of_tobacco || '—'}</div>
                        <div><b>TB Grade:</b> {qrTrackResult.bag.tobacco_grade || '—'}</div>
                        <div><b>Location:</b> {qrTrackResult.bag.purchase_location || '—'}</div>
                        <div><b>Purchase Time:</b> {formatDateTime(qrTrackResult.bag.date_of_purchase)}</div>
                        <div><b>Last Updated:</b> {formatDateTime(qrTrackResult.bag.updated_at)}</div>
                      </div>
                    )}
                  </div>

                  {/* Dispatch Status */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>🚚 Dispatch Status</div>
                    {!qrTrackResult.dispatch ? (
                      <div style={{ fontSize: 13, color: '#777' }}>Not dispatched yet.</div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                        <div style={{ marginBottom: 6 }}>
                          <b>Status:</b>{' '}
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: qrTrackResult.dispatch.dispatch_status === 'warehouse_received' ? '#dcfce7'
                              : qrTrackResult.dispatch.dispatch_status === 'unmatched_bags' ? '#fee2e2'
                              : qrTrackResult.dispatch.dispatch_status === 'sent_to_warehouse' ? '#dbeafe'
                              : '#fef9c3',
                            color: qrTrackResult.dispatch.dispatch_status === 'warehouse_received' ? '#15803d'
                              : qrTrackResult.dispatch.dispatch_status === 'unmatched_bags' ? '#b91c1c'
                              : qrTrackResult.dispatch.dispatch_status === 'sent_to_warehouse' ? '#1d4ed8'
                              : '#92400e',
                          }}>
                            {qrTrackResult.dispatch.dispatch_status === 'sent_to_admin' ? 'Sent to Admin'
                              : qrTrackResult.dispatch.dispatch_status === 'sent_to_warehouse' ? 'Sent to Warehouse'
                              : qrTrackResult.dispatch.dispatch_status === 'warehouse_received' ? 'Warehouse Received'
                              : qrTrackResult.dispatch.dispatch_status === 'unmatched_bags' ? 'Unmatched Bags'
                              : qrTrackResult.dispatch.dispatch_status}
                          </span>
                        </div>
                        <div><b>Dispatch Number:</b> {qrTrackResult.dispatch.dispatch_number || '—'}</div>
                        <div><b>Invoice Number:</b> {qrTrackResult.dispatch.invoice_number || '—'}</div>
                        <div><b>Vehicle Number:</b> {qrTrackResult.dispatch.vehicle_number || '—'}</div>
                        {qrTrackResult.dispatch.warehouse_employee_name && <div><b>Warehouse Employee:</b> {qrTrackResult.dispatch.warehouse_employee_name}</div>}
                        <div><b>Sent to Admin:</b> {formatDateTime(qrTrackResult.dispatch.sent_to_admin_at)}</div>
                        {qrTrackResult.dispatch.sent_to_warehouse_at && <div><b>Sent to Warehouse:</b> {formatDateTime(qrTrackResult.dispatch.sent_to_warehouse_at)}</div>}
                        {qrTrackResult.dispatch.warehouse_confirmed_at && <div><b>Warehouse Confirmed:</b> {formatDateTime(qrTrackResult.dispatch.warehouse_confirmed_at)}</div>}
                        <div style={{ marginTop: 6 }}><b>Item Scan:</b>{' '}
                          <span style={{
                            display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            background: qrTrackResult.dispatch.item_scan_status === 'matched' ? '#dcfce7'
                              : qrTrackResult.dispatch.item_scan_status === 'unmatched' ? '#fee2e2'
                              : '#f1f5f9',
                            color: qrTrackResult.dispatch.item_scan_status === 'matched' ? '#15803d'
                              : qrTrackResult.dispatch.item_scan_status === 'unmatched' ? '#b91c1c'
                              : '#64748b',
                          }}>
                            {qrTrackResult.dispatch.item_scan_status === 'matched' ? 'Scanned at Warehouse'
                              : qrTrackResult.dispatch.item_scan_status === 'unmatched' ? 'Unmatched Scan'
                              : 'Pending Scan'}
                          </span>
                          {qrTrackResult.dispatch.item_scan_status === 'matched' && qrTrackResult.dispatch.scanned_at && (
                            <span style={{ marginLeft: 8, color: '#555' }}>on {formatDateTime(qrTrackResult.dispatch.scanned_at)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'vehicle-dispatches' && (
          <AdminVehicleDispatches />
        )}

        {/* ── GENERATE QR ── */}
        {tab === 'generate' && (
          <div>
            <div style={S.card}>
              <div style={S.subheading}>Generate QR Codes</div>
              {genMsg && <div style={genMsg.startsWith('✅') ? S.success : S.error}>{genMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>Starting Code</label>
                  <input style={S.input} type="text" placeholder="e.g. 200, A100, AB-10/#" value={genStart} onChange={e => setGenStart(e.target.value)} />
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Supports letters, numbers, and special chars. Example: AB-10/#, AB-10/#1, AB-10/#2</div>
                </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
              <select
                style={{ ...S.input, minWidth: 190, width: 200, marginBottom: 0, fontWeight: 700 }}
                value={selectedBuyerActionId}
                onChange={e => setSelectedBuyerActionId(e.target.value)}
              >
                <option value="">Select Buyer</option>
                {buyers.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.code} - {b.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={S.subheading}>Total Purchase ({displayedBags.length}){displayedBuyer ? ` - ${displayedBuyer.name}` : ''}</div>
                {bags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    style={{ ...exportBtnPdf, padding: '6px 10px', fontSize: 11, fontWeight: 700 }}
                    onClick={() => exportBagsPDF(displayedBags, `Total Purchase Report - ${new Date().toISOString().split('T')[0]}`)}
                  >
                    📄 Export PDF
                  </button>
                  <button
                    style={{ ...exportBtnCsv, padding: '6px 10px', fontSize: 11, fontWeight: 700 }}
                    onClick={() => exportCSV(totalPurchaseCsvRows, `all_bags_${new Date().toISOString().split('T')[0]}.csv`)}
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
            <div style={{ marginBottom: 14, overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <label style={S.label}>From Date</label>
                    <input
                      style={{ ...S.input, minWidth: 190, width: 200, marginBottom: 0 }}
                      type="date"
                      lang="en-GB"
                      value={selectedBaleStartDate}
                      onChange={(e) => setSelectedBaleStartDate(e.target.value)}
                    />
                    {selectedBaleStartDate && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                        Selected: {inputDateToDisplayDate(selectedBaleStartDate)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={S.label}>To Date</label>
                    <input
                      style={{ ...S.input, minWidth: 190, width: 200, marginBottom: 0 }}
                      type="date"
                      lang="en-GB"
                      value={selectedBaleEndDate}
                      onChange={(e) => setSelectedBaleEndDate(e.target.value)}
                    />
                    {selectedBaleEndDate && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                        Selected: {inputDateToDisplayDate(selectedBaleEndDate)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {hasPurchaseSummarySelection && (
                    <>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>
                        Total Purchase Value: {formatCurrencyINR(selectedDateTotal)}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                        Total Bags: {selectedScopeBagCount}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                        Total Kgs: {selectedScopeTotalKgs.toFixed(2)}
                      </span>
                    </>
                  )}
                  <button
                    style={{ ...S.btnSecondary, flex: 'none', padding: '12px 22px', fontSize: 14, fontWeight: 800, minWidth: 250 }}
                    onClick={handleToggleBuyerActionAfter6pm}
                  >
                    {enabledBuyerActionIds.includes(Number(selectedBuyerActionId))
                      ? 'Disable Selected Buyer After 6 PM'
                      : 'Enable Selected Buyer After 6 PM'}
                  </button>
                </div>
              </div>
              {filteredDateWiseBaleTotals.length > 0 ? (
                <table style={{ ...S.table, minWidth: 520 }}>
                  <thead><tr><th style={{ ...S.th, fontWeight: 700 }}>Date</th><th style={{ ...S.th, fontWeight: 700 }}>Total Bags</th><th style={{ ...S.th, fontWeight: 700 }}>Total Kgs</th><th style={{ ...S.th, fontWeight: 700 }}>Total Purchase Value</th></tr></thead>
                  <tbody>
                    {filteredDateWiseBaleTotals.map((row, idx) => (
                      <tr key={`${row.date}-${idx}`}>
                        <td style={{ ...S.td, fontWeight: 700 }}>{row.date}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{row.bags}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{row.kgs.toFixed(2)}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{formatCurrencyINR(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                  No purchases found for selected buyer/date range.
                </div>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead><tr>
                      <SortableTh label="Buyer" sortKey="buyer_code" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={60} />
                      <SortableTh label="Name" sortKey="buyer_name" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={90} />
                      <SortableTh label="Code" sortKey="unique_code" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={65} />
                      <SortableTh label="APF" sortKey="apf_number" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={70} />
                      <SortableTh label="TB Grade" sortKey="tobacco_grade" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={80} />
                      <SortableTh label="Type" sortKey="type_of_tobacco" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={75} />
                      <SortableTh label="Location" sortKey="purchase_location" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={85} />
                      <SortableTh label="Purchase Date" sortKey="purchase_date" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={100} />
                      <SortableTh label="Buyer Grade" sortKey="buyer_grade" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={80} />
                      <SortableTh label="Weight" sortKey="weight" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={70} />
                      <SortableTh label="Rate" sortKey="rate" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={65} />
                      <SortableTh label="Bale Value" sortKey="bale_value" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={90} />
                      <SortableTh label="Date & Time" sortKey="date_of_purchase" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={130} />
                      <SortableTh label="FCV" sortKey="fcv" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={60} />
                      <SortableTh label="Updated" sortKey="updated_at" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={130} />
                      <th style={S.th}>Action</th>
                    </tr>
                    <tr>
                      <th style={S.th}></th>
                      <th style={S.th}>
                        <select
                          style={{ ...S.input, minWidth: 85, marginBottom: 0, fontWeight: 700, fontSize: 11 }}
                          value={bagsColumnFilters.buyer_name}
                          onChange={(e) => setBagsColumnFilters((f) => ({ ...f, buyer_name: e.target.value }))}
                        >
                          <option value="">All Names</option>
                          {buyerNameFilterOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                      <th style={S.th}>
                        <select
                          style={{ ...S.input, minWidth: 60, marginBottom: 0, fontWeight: 700, fontSize: 11 }}
                          value={bagsColumnFilters.unique_code}
                          onChange={(e) => setBagsColumnFilters((f) => ({ ...f, unique_code: e.target.value }))}
                        >
                          <option value="">All Codes</option>
                          {uniqueCodeFilterOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                      <th style={S.th}>
                        <select
                          style={{ ...S.input, minWidth: 65, marginBottom: 0, fontWeight: 700, fontSize: 11 }}
                          value={bagsColumnFilters.apf_number}
                          onChange={(e) => setBagsColumnFilters((f) => ({ ...f, apf_number: e.target.value }))}
                        >
                          <option value="">All APF</option>
                          {apfFilterOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                      <th style={S.th}>
                        <select
                          style={{ ...S.input, minWidth: 75, marginBottom: 0, fontWeight: 700, fontSize: 11 }}
                          value={bagsColumnFilters.tobacco_grade}
                          onChange={(e) => setBagsColumnFilters((f) => ({ ...f, tobacco_grade: e.target.value }))}
                        >
                          <option value="">All TB Grades</option>
                          {tbGradeFilterOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                      <th style={S.th}>
                        <select
                          style={{ ...S.input, minWidth: 70, marginBottom: 0, fontWeight: 700, fontSize: 11 }}
                          value={bagsColumnFilters.type_of_tobacco}
                          onChange={(e) => setBagsColumnFilters((f) => ({ ...f, type_of_tobacco: e.target.value }))}
                        >
                          <option value="">All Types</option>
                          {typeFilterOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                      <th style={S.th}>
                        <select
                          style={{ ...S.input, minWidth: 80, marginBottom: 0, fontWeight: 700, fontSize: 11 }}
                          value={bagsColumnFilters.purchase_location}
                          onChange={(e) => setBagsColumnFilters((f) => ({ ...f, purchase_location: e.target.value }))}
                        >
                          <option value="">All Locations</option>
                          {locationFilterOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                      <th style={S.th}></th>
                    </tr></thead>
                    <tbody>
                      {filteredDisplayedBags.length === 0 ? (
                        <tr>
                          <td style={{ ...totalPurchaseTd, textAlign: 'center', color: '#888', padding: 24 }} colSpan={16}>
                            {displayedBags.length === 0
                              ? (displayedBuyer
                                ? `No records for ${displayedBuyer.name}. Select another buyer from the dropdown.`
                                : 'No bags yet. Select a buyer from the dropdown to view records.')
                              : 'No records for selected filter values. Please choose another value.'}
                          </td>
                        </tr>
                      ) : filteredDisplayedBags.map((b, i) => (
                        editingBagId === b.id ? (
                          <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                            <td style={totalPurchaseTd}>{b.buyer_code}</td>
                            <td style={totalPurchaseTd}>{b.buyer_name}</td>
                            <td style={totalPurchaseTd}>{b.unique_code}</td>
                            <td style={totalPurchaseTd}>
                              <SearchableSelect
                                options={apfNumberOptions}
                                value={editBagForm?.apf_number ?? ''}
                                onChange={(val) => setEditBagForm(f => ({ ...f, apf_number: val }))}
                                inputStyle={{ ...S.input, minWidth: 100 }}
                                placeholder="Search APF"
                              />
                            </td>
                            <td style={totalPurchaseTd}>
                              <SearchableSelect
                                options={tobaccoBoardGradeOptions}
                                value={editBagForm?.tobacco_grade ?? ''}
                                onChange={(val) => setEditBagForm(f => ({ ...f, tobacco_grade: val }))}
                                inputStyle={{ ...S.input, minWidth: 110 }}
                                placeholder="Search"
                              />
                            </td>
                            <td style={totalPurchaseTd}><input style={{ ...S.input, minWidth: 120 }} value={editBagForm?.type_of_tobacco ?? ''} onChange={e => setEditBagForm(f => ({ ...f, type_of_tobacco: e.target.value }))} /></td>
                            <td style={totalPurchaseTd}><input style={{ ...S.input, minWidth: 120 }} value={editBagForm?.purchase_location ?? ''} onChange={e => setEditBagForm(f => ({ ...f, purchase_location: e.target.value }))} /></td>
                            <td style={totalPurchaseTd}><input style={{ ...S.input, minWidth: 110 }} value={editBagForm?.purchase_date ?? ''} onChange={e => setEditBagForm(f => ({ ...f, purchase_date: e.target.value }))} /></td>
                            <td style={totalPurchaseTd}><input style={{ ...S.input, minWidth: 110 }} value={editBagForm?.buyer_grade ?? ''} onChange={e => setEditBagForm(f => ({ ...f, buyer_grade: e.target.value }))} /></td>
                            <td style={totalPurchaseTd}><input style={{ ...S.input, minWidth: 90 }} type="number" value={editBagForm?.weight ?? ''} onChange={e => setEditBagForm(f => ({ ...f, weight: e.target.value }))} /></td>
                            <td style={totalPurchaseTd}><input style={{ ...S.input, minWidth: 90 }} type="number" step="0.01" value={editBagForm?.rate ?? ''} onChange={e => setEditBagForm(f => ({ ...f, rate: e.target.value }))} /></td>
                            <td style={totalPurchaseTd}>
                              {Number.isFinite(Number(editBagForm?.weight)) && Number.isFinite(Number(editBagForm?.rate))
                                ? Number((Number(editBagForm.weight) * Number(editBagForm.rate)).toFixed(2))
                                : (editBagForm?.bale_value ?? '—')}
                            </td>
                            <td style={totalPurchaseTd}>
                              <input style={{ ...S.input, minWidth: 180 }} type="datetime-local" value={editBagForm?.date_of_purchase ?? nowInputDateTime()} onChange={e => setEditBagForm(f => ({ ...f, date_of_purchase: e.target.value }))} />
                            </td>
                            <td style={totalPurchaseTd}>
                              <select style={{ ...S.input, minWidth: 95 }} value={editBagForm?.fcv ?? ''} onChange={e => setEditBagForm(f => ({ ...f, fcv: e.target.value }))}>
                                <option value="">Select</option>
                                <option value="FCV">FCV</option>
                                <option value="NON-FCV">NON-FCV</option>
                              </select>
                            </td>
                            <td style={totalPurchaseTd}>{formatDateTime(b.updated_at)}</td>
                            <td style={totalPurchaseTd}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={handleSaveBag} title="Save bag">💾</button>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={handleCancelEditBag} title="Cancel edit">✖</button>
                                <button style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteBag(b)} title="Delete bag">🗑</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                            <td style={totalPurchaseTd}>{b.buyer_code}</td>
                            <td style={totalPurchaseTd}>{b.buyer_name}</td>
                            <td style={totalPurchaseTd}>{b.unique_code}</td>
                            <td style={totalPurchaseTd}>{b.apf_number}</td>
                            <td style={totalPurchaseTd}>{b.tobacco_grade}</td>
                            <td style={totalPurchaseTd}>{b.type_of_tobacco || '—'}</td>
                            <td style={totalPurchaseTd}>{b.purchase_location || '—'}</td>
                            <td style={totalPurchaseTd}>{formatPurchaseDateDash(b.purchase_date || b.date_of_purchase)}</td>
                            <td style={totalPurchaseTd}>{b.buyer_grade || '—'}</td>
                            <td style={totalPurchaseTd}>{b.weight} kg</td>
                            <td style={totalPurchaseTd}>{b.rate ?? '—'}</td>
                            <td style={totalPurchaseTd}>{formatCurrencyINR(b.bale_value)}</td>
                            <td style={totalPurchaseTd}>{formatDateTime(b.date_of_purchase)}</td>
                            <td style={totalPurchaseTd}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
                            <td style={totalPurchaseTd}>{formatDateTime(b.updated_at)}</td>
                            <td style={totalPurchaseTd}>
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
          </div>
        )}

        {/* ── DATABASE VIEWER ── */}
        {tab === 'database' && <DatabaseViewer />}
      </div>
    </div>
  );
}

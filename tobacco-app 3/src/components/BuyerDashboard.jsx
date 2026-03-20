// src/components/BuyerDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import BrandLogo from './BrandLogo';
import BuyingForm from './BuyingForm';
import QRCode from './QRCode';
import SearchableSelect from './SearchableSelect';
import BuyerVehicleDispatch from './BuyerVehicleDispatch';
import { printQRCodes } from '../utils/printQR';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

const buyerGradient = 'linear-gradient(135deg, #20c997 0%, #2780e3 100%)';

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
  topBarTitle: { fontSize: 18, fontWeight: 800, color: '#2780e3', letterSpacing: 1 },
  buyerBadge:  { background: buyerGradient, border: '1px solid #1f67b9', borderRadius: 8, padding: '4px 12px', fontWeight: 800, color: '#ffffff', fontSize: 14 },
  bagsBadge:   { background: buyerGradient, color: '#ffffff', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 800 },
  card:        { background: '#ffffff', borderRadius: 12, border: '1px solid #b7d9f8', padding: '24px', marginBottom: 20, boxShadow: '0 4px 16px rgba(39,128,227,0.16)' },
  heading:     { fontSize: 22, fontWeight: 800, color: '#2780e3', marginBottom: 20, letterSpacing: 0.5 },
  subheading:  { fontSize: 16, fontWeight: 800, color: '#2780e3', marginBottom: 12 },
  label:       { fontSize: 12, fontWeight: 800, color: '#2780e3', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { width: '100%', padding: '10px 14px', border: '1.5px solid #1f67b9', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#1b3555', background: '#ffffff', boxSizing: 'border-box', outline: 'none' },
  toggleGroup: { display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #2780e3', marginBottom: 6 },
  toggleBtn: (active, disabled) => ({
    flex: 1, padding: '12px', border: 'none',
    background: disabled ? '#8ab8ef' : '#2780e3',
    color: '#fff',
    fontWeight: 800, fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 1, transition: 'all 0.2s',
    pointerEvents: disabled ? 'none' : 'auto',
  }),
  btnPrimary:  { background: '#2780e3', color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer', flex: 1, transition: 'background 0.2s' },
  btnSecondary:{ background: '#2780e3', color: '#fff', border: '1px solid #1f67b9', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer', flex: 1 },
  btnIcon:     { background: '#2780e3', border: '1px solid #1f67b9', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 800 },
  th:          { background: '#2780e3', color: '#ffffff', fontWeight: 800, padding: '10px 12px', border: '1px solid #1f67b9', textAlign: 'left', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td:          { padding: '9px 12px', border: '1px solid #d9ebfb', color: '#1b3555', verticalAlign: 'middle', fontWeight: 700, whiteSpace: 'nowrap' },
  tab: (active) => ({
    padding: '6px 12px',
    border: '2px solid #1f67b9',
    borderRadius: 8,
    background: active ? buyerGradient : '#2780e3',
    color: '#fff',
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
    letterSpacing: 0.2, whiteSpace: 'nowrap',
    transition: 'all 0.18s',
  }),
  qrCard: { background: '#fff', border: '1.5px solid #b7d9f8', borderRadius: 10, padding: 14, textAlign: 'center', boxShadow: '0 4px 10px rgba(39,128,227,0.16)' },
};

export default function BuyerDashboard({ user, onLogout }) {
  const buyerTitleColor = '#2780e3';
  const buyerNavColor = '#2780e3';
  const buyerButtonTextColor = '#fff';
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
  const [selectedReportDateFrom, setSelectedReportDateFrom] = useState('');
  const [selectedReportDateTo, setSelectedReportDateTo] = useState('');
  const [dispatchScanCode, setDispatchScanCode] = useState('');
  const [dispatchScanLoading, setDispatchScanLoading] = useState(false);
  const [dispatchInvoiceNumber, setDispatchInvoiceNumber] = useState('');
  const [selectedDispatchBagIds, setSelectedDispatchBagIds] = useState([]);
  const [dispatchAssignLoading, setDispatchAssignLoading] = useState(false);
  const [qrScanDeleteId, setQrScanDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletedHistory, setDeletedHistory] = useState([]);
  const [selectedDeletedKeys, setSelectedDeletedKeys] = useState([]);
  const [restoreDeletedLoading, setRestoreDeletedLoading] = useState(false);
  const [purgeDeletedLoading, setPurgeDeletedLoading] = useState(false);
  const dispatchScanInputRef = useRef(null);

  const deletedHistoryKey = `buyer_deleted_history_${Number(user?.id || 0)}`;

  const buildDeletedRowKey = (row, index = 0) => {
    const idPart = row?.id ?? 'na';
    const deletedAtPart = row?.deleted_at ?? `idx_${index}`;
    const codePart = String(row?.unique_code || 'nocode').replace(/\s+/g, '').toUpperCase();
    return `${idPart}_${deletedAtPart}_${codePart}`;
  };

  const getDeletedRowKey = (row, index = 0) => row?.deleted_key || buildDeletedRowKey(row, index);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(deletedHistoryKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(parsed)
        ? parsed.map((item, index) => ({
            ...item,
            deleted_key: item?.deleted_key || buildDeletedRowKey(item, index),
          }))
        : [];
      setDeletedHistory(normalized);
    } catch {
      setDeletedHistory([]);
    }
  }, [deletedHistoryKey]);

  useEffect(() => {
    try {
      localStorage.setItem(deletedHistoryKey, JSON.stringify(deletedHistory));
    } catch {
      // Ignore storage failures silently (e.g., private mode quota limits)
    }
  }, [deletedHistory, deletedHistoryKey]);

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

  const parseYYYYMMDD = (dateStr) => {
    const text = String(dateStr || '').trim();
    if (!text) return null;

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      const [, yyyy, mm, dd] = ymd;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    const dmy = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) {
      const [, dd, mm, yyyy] = dmy;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    const dmySlash = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmySlash) {
      const [, dd, mm, yyyy] = dmySlash;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    return null;
  };

  const normalizeDateOnly = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const ymd = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymd) return ymd[1];

    const dmy = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (dmy) {
      const [, dd, mm, yyyy] = dmy;
      return `${yyyy}-${mm}-${dd}`;
    }

    const inputDate = toInputDateTime(text).split('T')[0] || '';
    return inputDate;
  };

  const reportRows = bags.map((bag) => {
    const weightValue = toNumber(bag.weight);
    const rateValue = toNumber(bag.rate);
    const baleValue = Number.isFinite(Number(bag.bale_value))
      ? Number(bag.bale_value)
      : Number((weightValue * rateValue).toFixed(2));
    const purchaseDateRaw = normalizeDateOnly(bag.purchase_date || bag.date_of_purchase);
    const purchaseDateValue = parseYYYYMMDD(purchaseDateRaw);
    return {
      ...bag,
      weightValue,
      rateValue,
      baleValue,
      purchaseDateRaw,
      purchaseDateValue,
      purchaseDateDisplay: formatPurchaseDateDash(purchaseDateRaw || bag.date_of_purchase),
    };
  });

  const getReportDateLabel = (row) => {
    const purchaseDateLabel = normalizeReportDateLabel(row.purchase_date);
    if (purchaseDateLabel) return purchaseDateLabel;

    const inputDate = toInputDateTime(row.date_of_purchase).split('T')[0] || '';
    const dateOfPurchaseLabel = inputDateToDisplayDate(inputDate);
    return dateOfPurchaseLabel || '—';
  };

  const getRowDateForRange = (row) => {
    if (row?.purchaseDateValue instanceof Date) return row.purchaseDateValue;
    const raw = normalizeDateOnly(row?.purchaseDateRaw || row?.purchase_date || row?.date_of_purchase);
    return parseYYYYMMDD(raw);
  };

  const dateToStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dateFromObj = parseYYYYMMDD(selectedReportDateFrom);
  const dateToObj = parseYYYYMMDD(selectedReportDateTo);

  const filteredReportRows = reportRows.filter((row) => {
    if (!selectedReportDateFrom && !selectedReportDateTo) return true;
    const rowDate = getRowDateForRange(row);
    if (!rowDate) return false;
    if (dateFromObj && rowDate < dateFromObj) return false;
    if (dateToObj) {
      const nextDay = new Date(dateToObj);
      nextDay.setDate(nextDay.getDate() + 1);
      if (rowDate >= nextDay) return false;
    }
    return true;
  });

  const totalBaleValue = filteredReportRows.reduce((sum, row) => sum + row.baleValue, 0);
  const totalWeight = filteredReportRows.reduce((sum, row) => sum + row.weightValue, 0);
  const sortedBags = [...bags].sort((a, b) => compareBy(a?.[bagsSort.key], b?.[bagsSort.key], bagsSort.direction));
  const sortedReportRows = [...filteredReportRows].sort((a, b) => compareBy(a?.[reportSort.key], b?.[reportSort.key], reportSort.direction));
  const sortedDeletedHistory = [...deletedHistory].sort((a, b) => compareBy(a?.deleted_at, b?.deleted_at, 'desc'));
  const deletedHistoryKeys = sortedDeletedHistory.map((row, index) => getDeletedRowKey(row, index));
  const allDeletedSelected = deletedHistoryKeys.length > 0
    && deletedHistoryKeys.every((key) => selectedDeletedKeys.includes(key));
  const getDispatchState = (bag) => {
    const alreadyMoved = Number(bag.dispatch_list_added) === 1;
    const alreadyDispatched = Number(bag.vehicle_dispatch_id) > 0;
    return { alreadyMoved, alreadyDispatched, selectable: !alreadyMoved && !alreadyDispatched };
  };

  const selectedDispatchBags = selectedDispatchBagIds
    .map((id) => bags.find((bag) => Number(bag.id) === Number(id)))
    .filter(Boolean);
  const selectableBagIds = bags
    .filter((bag) => getDispatchState(bag).selectable)
    .map((bag) => Number(bag.id));
  const allSelectableSelected = selectableBagIds.length > 0
    && selectableBagIds.every((id) => selectedDispatchBagIds.includes(id));

  useEffect(() => {
    setSelectedDispatchBagIds((prev) => prev.filter((id) => {
      const bag = bags.find((item) => Number(item.id) === Number(id));
      return bag ? getDispatchState(bag).selectable : false;
    }));
  }, [bags]);

  useEffect(() => {
    const validKeys = deletedHistory.map((row, index) => getDeletedRowKey(row, index));
    setSelectedDeletedKeys((prev) => prev.filter((key) => validKeys.includes(key)));
  }, [deletedHistory]);

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

  const scanBagToDispatch = async (inputCode) => {
    const raw = String((inputCode ?? dispatchScanCode) || '');
    const scannedCode = raw.replace(/[\r\n\t]/g, '').trim();
    if (!scannedCode) {
      setEditMsg('Scan QR code to select a purchase');
      return;
    }

    // Normalize helper: collapse all whitespace, uppercase
    const norm = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
    const scannedNorm = norm(scannedCode);

    // 1. Exact normalized match
    let matchedBag = bags.find((bag) => norm(bag.unique_code) === scannedNorm);

    // 2. Fallback: contains match (handles partial scans or extra prefix/suffix)
    if (!matchedBag) {
      matchedBag = bags.find((bag) => {
        const bagNorm = norm(bag.unique_code);
        return bagNorm.includes(scannedNorm) || scannedNorm.includes(bagNorm);
      });
    }

    if (!matchedBag) {
      setEditMsg(`No purchase found for code "${scannedCode}". Check the code and try again.`);
      return;
    }
    const { alreadyMoved, alreadyDispatched } = getDispatchState(matchedBag);
    if (alreadyMoved) {
      setEditMsg('This purchase is already moved to vehicle dispatch');
      return;
    }
    if (alreadyDispatched) {
      setEditMsg('This purchase is already dispatched');
      return;
    }

    try {
      setDispatchScanLoading(true);
      const matchedBagId = Number(matchedBag.id);
      setSelectedDispatchBagIds((prev) => {
        if (prev.includes(matchedBagId)) return prev;
        return [...prev, matchedBagId];
      });
      setQrScanDeleteId(Number(matchedBag.id));
      setEditMsg(`✅ ${matchedBag.unique_code} selected. Assign invoice to dispatch, or click 🗑️ Delete to remove this purchase.`);
      setDispatchScanCode('');
    } catch (e) {
      setEditMsg(e.message);
    } finally {
      setDispatchScanLoading(false);
      setTimeout(() => dispatchScanInputRef.current?.focus(), 0);
    }
  };

  const toggleDispatchSelection = (bagId) => {
    const normalizedBagId = Number(bagId);
    setSelectedDispatchBagIds((prev) => (prev.includes(normalizedBagId)
      ? prev.filter((id) => id !== normalizedBagId)
      : [...prev, normalizedBagId]));
  };

  const toggleSelectAllDispatchBags = () => {
    if (allSelectableSelected) {
      setSelectedDispatchBagIds([]);
      return;
    }
    setSelectedDispatchBagIds([...selectableBagIds]);
  };

  const removeSelectedDispatchBag = (bagId) => {
    const bag = bags.find((item) => Number(item.id) === Number(bagId));
    setSelectedDispatchBagIds((prev) => prev.filter((id) => Number(id) !== Number(bagId)));
    if (bag?.unique_code) {
      setEditMsg(`Removed ${bag.unique_code} from selected list`);
    }
  };

  const handleDeleteScannedBag = async (bagId) => {
    const bagToDelete = bags.find((item) => Number(item.id) === Number(bagId));
    try {
      setDeleteLoading(true);
      await api.deleteBag(bagId);
      if (bagToDelete) {
        const deletedAt = new Date().toISOString();
        setDeletedHistory((prev) => ([
          {
            ...bagToDelete,
            deleted_at: deletedAt,
            deleted_key: buildDeletedRowKey({ ...bagToDelete, deleted_at: deletedAt }),
          },
          ...prev,
        ]));
      }
      setQrScanDeleteId(null);
      setSelectedDispatchBagIds((prev) => prev.filter((id) => Number(id) !== Number(bagId)));
      setEditMsg('✅ Purchase deleted successfully');
      await loadBags();
    } catch (e) {
      setEditMsg(e.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleDeletedSelection = (key) => {
    setSelectedDeletedKeys((prev) => (prev.includes(key)
      ? prev.filter((item) => item !== key)
      : [...prev, key]));
  };

  const toggleSelectAllDeleted = () => {
    if (allDeletedSelected) {
      setSelectedDeletedKeys([]);
      return;
    }
    setSelectedDeletedKeys([...deletedHistoryKeys]);
  };

  const mapDeletedRowToSaveBody = (row) => {
    const isFCV = String(row?.fcv || '').toUpperCase() === 'FCV';
    const numericWeight = Number(row?.weight);
    const numericRate = Number(row?.rate);
    const weightValue = Number.isFinite(numericWeight) ? numericWeight : 0;
    const rateValue = Number.isFinite(numericRate) ? numericRate : 0;
    const computedBaleValue = Number.isFinite(Number(row?.bale_value))
      ? Number(row.bale_value)
      : Number((weightValue * rateValue).toFixed(2));
    const purchaseDate = String(row?.purchase_date || '').trim();

    return {
      unique_code: String(row?.unique_code || '').trim(),
      buyer_id: user.id,
      buyer_code: user.code,
      buyer_name: user.name,
      fcv: row?.fcv || '',
      apf_number: isFCV ? (row?.apf_number || '') : '',
      tobacco_grade: isFCV ? (row?.tobacco_grade || '') : '',
      type_of_tobacco: isFCV ? '' : (row?.type_of_tobacco || ''),
      purchase_location: row?.purchase_location || '',
      weight: weightValue,
      rate: rateValue,
      bale_value: computedBaleValue,
      buyer_grade: row?.buyer_grade || '',
      lot_number: isFCV ? (row?.lot_number || '') : '',
      purchase_date: purchaseDate,
      date_of_purchase: row?.date_of_purchase || fromInputDateTime(nowInputDateTime()),
    };
  };

  const moveDeletedRowsToMainList = async (keysToMove) => {
    if (!keysToMove.length) {
      setEditMsg('Select deleted rows to move to list');
      return;
    }

    const selectedSet = new Set(keysToMove);
    const rowsToMove = sortedDeletedHistory
      .map((row, index) => ({ row, key: getDeletedRowKey(row, index) }))
      .filter(({ key }) => selectedSet.has(key));

    if (!rowsToMove.length) {
      setEditMsg('No deleted rows found for restore');
      return;
    }

    const existingCodes = new Set(
      bags.map((bag) => String(bag?.unique_code || '').replace(/\s+/g, '').toUpperCase()).filter(Boolean),
    );

    const restoredKeys = [];
    const failures = [];

    try {
      setRestoreDeletedLoading(true);
      for (const { row, key } of rowsToMove) {
        const normalizedCode = String(row?.unique_code || '').replace(/\s+/g, '').toUpperCase();
        if (!normalizedCode) {
          failures.push('Missing code');
          continue;
        }
        if (existingCodes.has(normalizedCode)) {
          failures.push(`${row.unique_code}: already exists in list`);
          continue;
        }

        try {
          await api.saveBag(mapDeletedRowToSaveBody(row));
          restoredKeys.push(key);
          existingCodes.add(normalizedCode);
        } catch (e) {
          failures.push(`${row.unique_code}: ${e.message || 'restore failed'}`);
        }
      }

      if (restoredKeys.length > 0) {
        const restoredSet = new Set(restoredKeys);
        setDeletedHistory((prev) => prev.filter((row, index) => !restoredSet.has(getDeletedRowKey(row, index))));
        setSelectedDeletedKeys((prev) => prev.filter((key) => !restoredSet.has(key)));
        await loadBags();
      }

      if (restoredKeys.length > 0 && failures.length === 0) {
        setEditMsg(`✅ ${restoredKeys.length} deleted row(s) moved to list`);
      } else if (restoredKeys.length > 0) {
        setEditMsg(`✅ ${restoredKeys.length} moved. ⚠️ ${failures.length} failed.`);
      } else {
        setEditMsg(`⚠️ Could not move rows: ${failures.slice(0, 2).join(' | ') || 'unknown error'}`);
      }
    } finally {
      setRestoreDeletedLoading(false);
    }
  };

  const deleteDeletedRowsPermanently = async (keysToDelete) => {
    if (!keysToDelete.length) {
      setEditMsg('Select deleted rows to remove permanently');
      return;
    }

    const toDeleteSet = new Set(keysToDelete);
    const rowsToDelete = sortedDeletedHistory
      .map((row, index) => ({ row, key: getDeletedRowKey(row, index) }))
      .filter(({ key }) => toDeleteSet.has(key));

    setPurgeDeletedLoading(true);
    try {
      // Re-mark the freed QR codes as used so they show red in My QR Codes
      await Promise.allSettled(
        rowsToDelete
          .map(({ row }) => String(row?.unique_code || '').trim())
          .filter(Boolean)
          .map((code) => api.markQRCodeUsed(code, user.id)),
      );

      setDeletedHistory((prev) => prev.filter((row, index) => !toDeleteSet.has(getDeletedRowKey(row, index))));
      setSelectedDeletedKeys((prev) => prev.filter((key) => !toDeleteSet.has(key)));
      setEditMsg(`🗑️ ${keysToDelete.length} row(s) permanently deleted from history`);
      await loadQR();
    } catch (e) {
      setEditMsg(e.message || 'Failed to permanently delete rows');
    } finally {
      setPurgeDeletedLoading(false);
    }
  };

  const assignInvoiceAndMoveToDispatch = async () => {
    if (selectedDispatchBagIds.length === 0) {
      setEditMsg('Select at least one purchase to move');
      return;
    }

    const invoiceNumber = String(dispatchInvoiceNumber || '').trim();
    if (!invoiceNumber) {
      setEditMsg('Invoice number is required before moving purchases');
      return;
    }

    const eligibleBags = selectedDispatchBagIds
      .map((id) => bags.find((bag) => Number(bag.id) === Number(id)))
      .filter((bag) => bag && getDispatchState(bag).selectable);

    if (eligibleBags.length === 0) {
      setEditMsg('No eligible purchases found in selected list');
      return;
    }

    try {
      setDispatchAssignLoading(true);
      await Promise.all(eligibleBags.map((bag) => api.addBagToDispatchList(bag.id, { invoice_number: invoiceNumber })));
      setEditMsg(`✅ ${eligibleBags.length} purchase(s) moved to vehicle dispatch with invoice ${invoiceNumber}`);
      setSelectedDispatchBagIds([]);
      setDispatchInvoiceNumber('');
      await loadBags();
    } catch (e) {
      setEditMsg(e.message);
    } finally {
      setDispatchAssignLoading(false);
    }
  };

  return (
    <div style={S.app}>
      {/* Top bar */}
      <div style={S.topBar}>
        {isMobileView ? (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
              <BrandLogo
                size={38}
                titleStyle={{ ...S.topBarTitle, color: buyerTitleColor }}
              />
              <button style={{ ...S.btnIcon, color: buyerButtonTextColor }} onClick={onLogout}>Logout</button>
            </div>
            <div style={{ ...S.buyerInfo, justifyContent: 'flex-start', width: '100%' }}>
              <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
              <span style={S.bagsBadge}>🛍️ {bags.length} Bales</span>
            </div>
          </div>
        ) : (
          <>
            <BrandLogo
              size={38}
              titleStyle={{ ...S.topBarTitle, color: buyerTitleColor }}
            />
            <div style={S.buyerInfo}>
              <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
                <span style={S.bagsBadge}>🛍️ {bags.length} Bales</span>
              <button style={{ ...S.btnIcon, color: buyerButtonTextColor }} onClick={onLogout}>Logout</button>
            </div>
          </>
        )}
      </div>

      <div style={S.page}>
        <div style={{ ...S.tabs, justifyContent: 'center' }}>
          <button style={{ ...S.tab(view === 'form'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('form')}>📝 New Purchase Entry</button>
          <button style={{ ...S.tab(view === 'bags'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('bags')}>📦 My Bales <span style={{ fontWeight: 900, marginLeft: 4 }}>{bags.length}</span></button>
          <button style={{ ...S.tab(view === 'vehicle-dispatch'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('vehicle-dispatch')}>🚚 Vehicle Dispatch</button>
          <button style={{ ...S.tab(view === 'bale-report'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('bale-report')}>📊 Purchase Report</button>
          <button style={{ ...S.tab(view === 'qr'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => switchView('qr')}>🔲 My QR Codes ({qrCodes.length})</button>
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
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ ...S.subheading, color: buyerTitleColor }}>All Bales ({bags.length})</div>
            </div>
            {editMsg && <div style={editMsg.startsWith('✅') ? S.success : S.error}>{editMsg}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <input
                ref={dispatchScanInputRef}
                style={{ ...S.input, minWidth: 220, marginBottom: 0 }}
                placeholder="Scan QR code or type code manually"
                value={dispatchScanCode}
                onChange={(e) => {
                  const val = e.target.value;
                  // QR scanners often append Enter/Tab chars — auto-trigger immediately
                  if (/[\r\n\t]$/.test(val)) {
                    const code = val.replace(/[\r\n\t]/g, '').trim();
                    setDispatchScanCode(code);
                    scanBagToDispatch(code);
                  } else {
                    setDispatchScanCode(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    // Pass live DOM value directly to avoid stale React state
                    scanBagToDispatch(e.target.value.trim());
                  }
                }}
              />
              <button
                style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', opacity: dispatchScanLoading ? 0.65 : 1 }}
                disabled={dispatchScanLoading}
                onClick={scanBagToDispatch}
              >
                {dispatchScanLoading ? 'Selecting...' : 'Scan QR'}
              </button>
              <input
                style={{ ...S.input, minWidth: 220, marginBottom: 0 }}
                placeholder="Assign invoice number"
                value={dispatchInvoiceNumber}
                onChange={(e) => setDispatchInvoiceNumber(e.target.value)}
              />
              <button
                style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', opacity: dispatchAssignLoading ? 0.65 : 1 }}
                disabled={dispatchAssignLoading || selectedDispatchBagIds.length === 0}
                onClick={assignInvoiceAndMoveToDispatch}
              >
                {dispatchAssignLoading ? 'Moving...' : `Assign Invoice + Move (${selectedDispatchBagIds.length})`}
              </button>
            </div>
            {selectedDispatchBags.length > 0 && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #e8b1b1', background: '#fff7f7' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Selected QR codes ({selectedDispatchBags.length})</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedDispatchBags.map((bag) => (
                    <span key={bag.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 999, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700 }}>
                      {bag.unique_code}
                      <button
                        type="button"
                        style={{ ...S.btnSecondary, flex: 'none', padding: '2px 8px', fontSize: 11 }}
                        disabled={deleteLoading}
                        onClick={() => handleDeleteScannedBag(bag.id)}
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        style={{ ...S.btnSecondary, flex: 'none', padding: '2px 8px', fontSize: 11 }}
                        onClick={() => removeSelectedDispatchBag(bag.id)}
                      >
                        Remove
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {loading ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Loading…</p>
            : bags.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No bales saved yet.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...S.table, minWidth: 'max-content', width: 'max-content' }}>
                  <thead><tr>
                    <th style={S.th}>
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={toggleSelectAllDispatchBags}
                        title="Select all"
                      />
                    </th>
                    <SortableTh label="Code" sortKey="unique_code" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Lot Number" sortKey="lot_number" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="APF" sortKey="apf_number" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="TB Grade" sortKey="tobacco_grade" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Type" sortKey="type_of_tobacco" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Location" sortKey="purchase_location" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Purchase Date" sortKey="purchase_date" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={170} />
                    <SortableTh label="Weight" sortKey="weight" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Rate" sortKey="rate" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Bale Value" sortKey="bale_value" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="B.Grade" sortKey="buyer_grade" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="FCV" sortKey="fcv" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} />
                    <SortableTh label="Updated" sortKey="updated_at" sortState={bagsSort} onSort={(key) => toggleSort(bagsSort, setBagsSort, key)} minWidth={200} />
                    <th style={S.th}>Dispatch Status</th>
                    {canManageBagActions && <th style={S.th}>Action</th>}
                  </tr></thead>
                  <tbody>
                    {sortedBags.map((b, i) => (
                      editingId === b.id ? (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}>—</td>
                          <td style={{ ...S.td, fontWeight: 400 }}>{b.unique_code}</td>
                          <td style={S.td}><input style={{ ...S.input, minWidth: 100 }} value={editForm?.lot_number ?? ''} onChange={e => setEditForm(f => ({ ...f, lot_number: e.target.value }))} /></td>
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
                            <select style={{ ...S.input, minWidth: 95 }} value={editForm?.fcv ?? ''} onChange={e => setEditForm(f => ({ ...f, fcv: e.target.value }))}>
                              <option value="">Select</option>
                              <option value="FCV">FCV</option>
                              <option value="NON-FCV">NON-FCV</option>
                            </select>
                          </td>
                          <td style={{ ...S.td, fontWeight: 400 }}>{formatUpdatedAt(b.updated_at)}</td>
                          <td style={S.td}>—</td>
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
                        <tr
                          key={b.id}
                          style={{
                            background: qrScanDeleteId === Number(b.id) ? '#ffe0e0' : (selectedDispatchBagIds.includes(Number(b.id)) ? '#fff2b8' : (i % 2 === 0 ? '#fffafa' : '#fff')),
                            outline: qrScanDeleteId === Number(b.id) ? '2px solid #ef4444' : 'none',
                            opacity: (Number(b.dispatch_list_added) === 1 || Number(b.vehicle_dispatch_id) > 0) ? 0.55 : 1,
                          }}
                        >
                          <td style={S.td}>
                            {getDispatchState(b).selectable ? (
                              <input
                                type="checkbox"
                                checked={selectedDispatchBagIds.includes(Number(b.id))}
                                onChange={() => toggleDispatchSelection(b.id)}
                              />
                            ) : '—'}
                          </td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.unique_code}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.lot_number || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.apf_number}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.tobacco_grade}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.type_of_tobacco || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.purchase_location || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatPurchaseDateDash(b.purchase_date || b.date_of_purchase)}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.weight} kg</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.rate ?? '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{Number.isFinite(Number(b.bale_value)) ? `₹${Number(b.bale_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.buyer_grade}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatUpdatedAt(b.updated_at)}</td>
                          <td style={S.td}>
                            {Number(b.dispatch_list_added) === 1
                              ? <span style={S.badge('green')}>Moved to vehicle dispatch</span>
                              : Number(b.vehicle_dispatch_id) > 0
                                ? <span style={S.badge('red')}>Dispatched</span>
                                : <span style={S.badge()}>Available</span>}
                            {b.vehicle_dispatch_number ? <div style={{ marginTop: 4, fontSize: 12 }}>Dispatch: {b.vehicle_dispatch_number}</div> : null}
                            {b.dispatch_invoice_number ? <div style={{ marginTop: 4, fontSize: 12 }}>Invoice: {b.dispatch_invoice_number}</div> : null}
                          </td>
                          {canManageBagActions && (
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: (Number(b.dispatch_list_added) === 1 || Number(b.vehicle_dispatch_id) > 0) ? 0.6 : 1 }} onClick={() => startEdit(b)} disabled={Number(b.dispatch_list_added) === 1 || Number(b.vehicle_dispatch_id) > 0}>
                                  Edit
                                </button>
                                {selectedDispatchBagIds.includes(Number(b.id)) && getDispatchState(b).selectable && (
                                  <button
                                    type="button"
                                    style={{ ...S.btnSecondary, color: '#fff', borderColor: '#1f67b9', background: '#2780e3', flex: 'none', padding: '6px 10px', fontSize: 12 }}
                                    onClick={() => removeSelectedDispatchBag(b.id)}
                                  >
                                    Remove
                                  </button>
                                )}
                                {qrScanDeleteId === Number(b.id) && getDispatchState(b).selectable && (
                                  <button
                                    type="button"
                                    style={{ ...S.btnSecondary, color: '#fff', borderColor: '#1f67b9', background: '#2780e3', fontWeight: 700, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                                    disabled={deleteLoading}
                                    onClick={() => handleDeleteScannedBag(b.id)}
                                  >
                                    {deleteLoading ? 'Deleting...' : '🗑️ Delete'}
                                  </button>
                                )}
                                {selectedDispatchBagIds.includes(Number(b.id)) && getDispatchState(b).selectable && qrScanDeleteId !== Number(b.id) && (
                                  <button
                                    type="button"
                                    style={{ ...S.btnSecondary, color: '#fff', borderColor: '#1f67b9', background: '#2780e3', fontWeight: 700, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                                    disabled={deleteLoading}
                                    onClick={() => handleDeleteScannedBag(b.id)}
                                  >
                                    {deleteLoading ? 'Deleting...' : '🗑️ Delete'}
                                  </button>
                                )}
                              </div>
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

            <div style={{ marginTop: 22 }}>
              <div style={{ ...S.subheading, color: buyerTitleColor }}>Deleted Purchase History ({deletedHistory.length})</div>
              {sortedDeletedHistory.length === 0 ? (
                <p style={{ color: '#7b8ca6', padding: '8px 0 4px 0' }}>No deleted purchases yet.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                    <button
                      type="button"
                      style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', fontSize: 12, opacity: restoreDeletedLoading ? 0.65 : 1 }}
                      disabled={restoreDeletedLoading || purgeDeletedLoading || selectedDeletedKeys.length === 0}
                      onClick={() => moveDeletedRowsToMainList(selectedDeletedKeys)}
                    >
                      {restoreDeletedLoading ? 'Moving...' : `Move to List (${selectedDeletedKeys.length})`}
                    </button>
                    <button
                      type="button"
                      style={{ ...S.btnSecondary, flex: 'none', padding: '6px 14px', fontSize: 12, opacity: purgeDeletedLoading ? 0.65 : 1 }}
                      disabled={restoreDeletedLoading || purgeDeletedLoading || selectedDeletedKeys.length === 0}
                      onClick={() => deleteDeletedRowsPermanently(selectedDeletedKeys)}
                    >
                      {purgeDeletedLoading ? 'Deleting...' : `Delete (${selectedDeletedKeys.length})`}
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ ...S.table, minWidth: 'max-content', width: 'max-content' }}>
                    <thead>
                      <tr>
                        <th style={S.th}>
                          <input
                            type="checkbox"
                            checked={allDeletedSelected}
                            onChange={toggleSelectAllDeleted}
                            title="Select all deleted rows"
                          />
                        </th>
                        <th style={S.th}>Code</th>
                        <th style={S.th}>APF</th>
                        <th style={S.th}>TB Grade</th>
                        <th style={S.th}>Type</th>
                        <th style={S.th}>Location</th>
                        <th style={S.th}>Purchase Date</th>
                        <th style={S.th}>Weight</th>
                        <th style={S.th}>Rate</th>
                        <th style={S.th}>Bale Value</th>
                        <th style={S.th}>B.Grade</th>
                        <th style={S.th}>FCV</th>
                        <th style={S.th}>Deleted At</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDeletedHistory.map((b, i) => {
                        const deletedKey = getDeletedRowKey(b, i);
                        return (
                        <tr key={deletedKey} style={{ background: i % 2 === 0 ? '#fff9ef' : '#fffdf8' }}>
                          <td style={S.td}>
                            <input
                              type="checkbox"
                              checked={selectedDeletedKeys.includes(deletedKey)}
                              onChange={() => toggleDeletedSelection(deletedKey)}
                            />
                          </td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.unique_code || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.apf_number || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.tobacco_grade || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.type_of_tobacco || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.purchase_location || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatPurchaseDateDash(b.purchase_date || b.date_of_purchase)}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.weight ? `${b.weight} kg` : '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.rate ?? '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{Number.isFinite(Number(b.bale_value)) ? `₹${Number(b.bale_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{b.buyer_grade || '—'}</td>
                          <td style={{ ...S.td, fontWeight: 800 }}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv || '—'}</span></td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{formatUpdatedAt(b.deleted_at)}</td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                style={{ ...S.btnPrimary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                                disabled={restoreDeletedLoading || purgeDeletedLoading}
                                onClick={() => moveDeletedRowsToMainList([deletedKey])}
                              >
                                Move to List
                              </button>
                              <button
                                type="button"
                                style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                                disabled={restoreDeletedLoading || purgeDeletedLoading}
                                onClick={() => deleteDeletedRowsPermanently([deletedKey])}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {view === 'bale-report' && (
          <div style={S.card}>
            <div style={{ background: '#f0f7ff', border: '1.5px solid #b7d9f8', borderRadius: 10, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              <div>
                <div style={{ ...S.subheading, color: buyerTitleColor, marginBottom: 14 }}>Purchase Report ({sortedReportRows.length})</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={S.label}>From Date</label>
                    <input
                      style={{ ...S.input, marginBottom: 0, fontWeight: 400 }}
                      type="date"
                      value={selectedReportDateFrom}
                      onChange={(e) => setSelectedReportDateFrom(e.target.value)}
                    />
                    {!!selectedReportDateFrom && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#5b6f86' }}>
                        Selected: {formatPurchaseDateDash(selectedReportDateFrom)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={S.label}>To Date</label>
                    <input
                      style={{ ...S.input, marginBottom: 0, fontWeight: 400 }}
                      type="date"
                      value={selectedReportDateTo}
                      onChange={(e) => setSelectedReportDateTo(e.target.value)}
                    />
                    {!!selectedReportDateTo && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#5b6f86' }}>
                        Selected: {formatPurchaseDateDash(selectedReportDateTo)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', textAlign: 'right' }}>
                  <div style={{ ...S.label, marginBottom: 4 }}>Total Purchase Value</div>
                  <span style={{ ...S.badge('green'), fontSize: 15, fontWeight: 800, padding: '8px 14px', display: 'inline-block' }}>₹ {totalBaleValue.toFixed(2)}</span>
                </div>
                <div style={{ width: '100%', textAlign: 'right' }}>
                  <div style={{ ...S.label, marginBottom: 4 }}>Total Weight</div>
                  <span style={{ ...S.badge(), fontSize: 15, fontWeight: 800, padding: '8px 14px', display: 'inline-block' }}>{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>
            {sortedReportRows.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>No purchases available for selected date.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    <SortableTh label="Code" sortKey="unique_code" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Purchase Date" sortKey="purchaseDateRaw" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Dispatch" sortKey="vehicle_dispatch_number" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Invoice" sortKey="dispatch_invoice_number" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Weight" sortKey="weightValue" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Rate" sortKey="rateValue" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="Bale Value" sortKey="baleValue" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                    <SortableTh label="FCV" sortKey="fcv" sortState={reportSort} onSort={(key) => toggleSort(reportSort, setReportSort, key)} />
                  </tr></thead>
                  <tbody>
                    {sortedReportRows.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                        <td style={S.td}><b>{row.unique_code}</b></td>
                        <td style={S.td}>{row.purchaseDateDisplay || '—'}</td>
                        <td style={S.td}>{row.vehicle_dispatch_number || '—'}</td>
                        <td style={S.td}>{row.dispatch_invoice_number || '—'}</td>
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

        {view === 'vehicle-dispatch' && (
          <BuyerVehicleDispatch buyer={user} />
        )}

        {view === 'qr' && (
          <div style={S.card}>
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

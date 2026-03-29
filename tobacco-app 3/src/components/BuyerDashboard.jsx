import DeletedHistoryTable from './BuyerDashboard/DeletedHistoryTable';
import PurchaseReport from './BuyerDashboard/PurchaseReport';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import TopBar from './BuyerDashboard/TopBar';
import TabsNav from './BuyerDashboard/TabsNav';
import BalesTable from './BuyerDashboard/BalesTable';
import SelectedDispatchList from './BuyerDashboard/SelectedDispatchList';
import BuyingForm from './BuyingForm';
import QRCode from './QRCode';
import QRCameraScanner from './QRCameraScanner';
import SearchableSelect from './SearchableSelect';
import BuyerVehicleDispatch from './BuyerVehicleDispatch';
import { printQRCodes } from '../utils/printQR';
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from '../utils/dateFormat';

// Gradient used for buyer badges and backgrounds
const buyerGradient = 'linear-gradient(90deg, #2780e3 0%, #56ccf2 100%)';



const BALES_COLUMNS = [
  { key: 'unique_code', label: 'Code' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'apf_number', label: 'APF' },
  { key: 'tobacco_grade', label: 'TB Grade' },
  { key: 'type_of_tobacco', label: 'Type' },
  { key: 'purchase_location', label: 'Location' },
  { key: 'purchase_date', label: 'Purchase Date' },
  { key: 'weight', label: 'Weight' },
  { key: 'rate', label: 'Rate' },
  { key: 'bale_value', label: 'Bale Value' },
  { key: 'buyer_grade', label: 'B.Grade' },
  { key: 'fcv', label: 'FCV' },
  { key: 'dispatch_invoice_number', label: 'Invoice Number' },
  { key: 'updated_at', label: 'Updated' },
  { key: 'dispatch_status', label: 'Dispatch Status' },
  { key: 'status', label: 'Bag Status' }
];

function getDefaultVisibleColumns() {
  return BALES_COLUMNS.map(col => col.key);
}

function BuyerDashboard({ user, onLogout }) {
                // Toggle selection of a bag for dispatch
                const toggleDispatchSelection = (bagId) => {
                  setSelectedDispatchBagIds((prev) =>
                    prev.includes(bagId)
                      ? prev.filter((id) => id !== bagId)
                      : [...prev, bagId]
                  );
                };
              // Remove a bag from the selected dispatch list
              const removeSelectedDispatchBag = (bagId) => {
                setSelectedDispatchBagIds((prev) => prev.filter((id) => id !== bagId));
              };
            // Assign invoice number and move selected bags to dispatch
            const assignInvoiceAndMoveToDispatch = async () => {
              if (!dispatchInvoiceNumber.trim()) {
                setEditMsg('Invoice number is required');
                return;
              }
              if (selectedDispatchBagIds.length === 0) {
                setEditMsg('Select at least one bag to dispatch');
                return;
              }
              setDispatchAssignLoading(true);
              setEditMsg('');
              try {
                // Assign invoice and move each selected bag to dispatch
                await Promise.all(selectedDispatchBagIds.map(async (bagId) => {
                  await api.addBagToDispatchList(bagId, { invoice_number: dispatchInvoiceNumber });
                }));
                setEditMsg('✅ Invoice assigned and bags moved to dispatch');
                setDispatchInvoiceNumber('');
                setSelectedDispatchBagIds([]);
                await loadBags();
              } catch (e) {
                setEditMsg(e.message || 'Failed to assign invoice and move to dispatch');
              } finally {
                setDispatchAssignLoading(false);
              }
            };
          // Handler functions for deleted history table
          const toggleSelectAllDeleted = () => {
            if (allDeletedSelected) {
              setSelectedDeletedKeys([]);
            } else {
              setSelectedDeletedKeys([...deletedHistoryKeys]);
            }
          };
          const toggleSelectDeletedRow = (key) => {
            setSelectedDeletedKeys((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
          };
          const isDeletedRowSelected = (keys, row, index) => {
            const selectedKeySet = new Set((keys || selectedDeletedKeys).map((key) => String(key)));
            const computedKey = String(getDeletedRowKey(row, index));
            const legacyKey = String(row.deleted_key || row.id);
            return selectedKeySet.has(computedKey) || selectedKeySet.has(legacyKey);
          };
          const handleRestoreDeleted = async (keys) => {
            setRestoreDeletedLoading(true);
            try {
              // Only restore bags with status 'Delete in-progress'
              const toRestore = sortedDeletedHistory.filter((row, index) => isDeletedRowSelected(keys, row, index) && row.status === 'Delete in-progress');
              if (toRestore.length === 0) {
                setEditMsg('Select at least one bag with status Delete in-progress to restore.');
                setRestoreDeletedLoading(false);
                return;
              }
              // Call API to restore
              await api.restoreDeletedBags(toRestore.map(row => row.id));
              // Update status to 'Available' in local state
              setDeletedHistory(prev => prev.map((row, index) =>
                isDeletedRowSelected(keys, row, index) && row.status === 'Delete in-progress'
                  ? { ...row, status: 'Available' }
                  : row
              ));
              setEditMsg('✅ Bag(s) restored and status set to Available.');
              setSelectedDeletedKeys([]);
              await loadBags();
            } catch (e) {
              setEditMsg(e.message || 'Failed to restore deleted bag(s)');
            } finally {
              setRestoreDeletedLoading(false);
            }
          };
          // Permanently delete: remove from deleted_bags, bags, and unassign QR code
          const handlePermanentDeleteDeleted = async (keys) => {
            console.log('[DEBUG] handlePermanentDeleteDeleted called with keys:', keys);
            setPurgeDeletedLoading(true);
            try {
              // Ensure keys is always an array
              const keyArr = Array.isArray(keys) ? keys : selectedDeletedKeys;
              const keySet = new Set((keyArr || []).map((k) => String(k)));
              const toDelete = sortedDeletedHistory.filter((row, index) => keySet.has(String(getDeletedRowKey(row, index))));
              console.log('[DEBUG] toDelete rows:', toDelete);
              if (toDelete.length === 0) {
                setEditMsg('Select at least one bag to delete permanently.');
                setPurgeDeletedLoading(false);
                return;
              }
              const isNotFoundError = (error, label) => {
                const message = String(error?.message || '');
                return message.includes(label);
              };
              // Delete from deleted_bags, bags, and unassign QR code
              await Promise.all(toDelete.map(async (row) => {
                if (row.deleted_key) {
                  console.log('[DEBUG] Deleting from deleted_bags, deleted_key:', row.deleted_key);
                  await api.deleteDeletedBag(row.deleted_key);
                }
                // Delete bag by unique_code (QR code)
                if (row.unique_code) {
                  console.log('[DEBUG] UI: Deleting bag by unique_code:', row.unique_code, typeof row.unique_code, JSON.stringify(row.unique_code));
                  try {
                    await api.deleteBagByCode(row.unique_code);
                  } catch (error) {
                    if (!isNotFoundError(error, 'Bag not found')) {
                      throw error;
                    }
                  }
                  // Set QR code to available (unassign)
                  console.log('[DEBUG] UI: Unassigning QR code:', row.unique_code, typeof row.unique_code, JSON.stringify(row.unique_code));
                  try {
                    await api.unassignQRCode(row.unique_code);
                  } catch (error) {
                    if (!isNotFoundError(error, 'QR code not found')) {
                      throw error;
                    }
                  }
                }
              }));
              setDeletedHistory((prev) => prev.filter((row, index) => !keySet.has(String(getDeletedRowKey(row, index)))));
              setEditMsg('✅ Bag(s) permanently deleted and QR code unassigned.');
              setSelectedDeletedKeys([]);
              await loadQR();
              await loadBags();
            } catch (e) {
              setEditMsg(e.message || 'Failed to permanently delete bag(s)');
              console.error('[DEBUG] Error in handlePermanentDeleteDeleted:', e);
            } finally {
              setPurgeDeletedLoading(false);
            }
          };

          // Confirm delete: add entry to deleted-bags, set bag status to Deleted, update local state
          const handleConfirmDelete = async (keys) => {
            setPurgeDeletedLoading(true);
            try {
              // Find the bags to delete
              const toDelete = sortedDeletedHistory.filter((row, index) => isDeletedRowSelected(keys, row, index) && row.status === 'Delete in-progress');
              if (toDelete.length === 0) {
                setEditMsg('Select at least one bag with status Delete in-progress to delete.');
                setPurgeDeletedLoading(false);
                return;
              }
              // For each, add entry to deleted-bags, set bag status to Deleted, and unassign QR
              await Promise.all(toDelete.map(async (row) => {
                // Add entry to deleted-bags
                await api.addDeletedBag({
                  bag_id: row.id,
                  buyer_id: user.id,
                  unique_code: row.unique_code,
                  deleted_at: new Date().toISOString(),
                  bag_data: {
                    ...row,
                    id: row.id,
                    unique_code: row.unique_code,
                    buyer_id: user.id,
                    status: 'Deleted',
                  },
                  status: 'Deleted',
                });
                // Update only the status field in the bag table
                await api.updateBag(row.id, { status: 'Deleted' });
                // Unassign QR code so it becomes available again
                if (row.unique_code) {
                  try {
                    await api.unassignQRCode(row.unique_code);
                  } catch (_e) {
                    // ignore if QR code already unassigned/not found
                  }
                }
              }));
              // Update local deletedHistory state
              setDeletedHistory(prev => prev.map((row, index) =>
                isDeletedRowSelected(keys, row, index) && row.status === 'Delete in-progress'
                  ? { ...row, status: 'Deleted' }
                  : row
              ));
              setEditMsg('✅ Bag(s) permanently deleted.');
              setSelectedDeletedKeys([]);
              await loadBags();
            } catch (e) {
              setEditMsg(e.message || 'Failed to permanently delete bag(s)');
            } finally {
              setPurgeDeletedLoading(false);
            }
          };
        // State for edit messages
        const [editMsg, setEditMsg] = useState('');
        // Grouped state for grades
        const [grades, setGrades] = useState({ tobaccoBoard: [], buyer: [] });
        // Extract grades for use throughout the component (after grades is initialized)
        const tobaccoBoardGrades = grades.tobaccoBoard;
        const buyerGrades = grades.buyer;
        // Grouped state for bags and related
        const [bags, setBags] = useState([]);
        const [editing, setEditing] = useState({ id: null, form: null });
        // Grouped state for types and locations
        const [meta, setMeta] = useState({ tobaccoTypes: [], purchaseLocations: [] });
        // General loading state
        const [loading, setLoad] = useState(false);
        // For per-row delete confirmation
        const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);
        // Debug
        console.log('[DEBUG] BuyerDashboard rendered. user:', user);
  // Add missing qrCodes state for QR code data
  const [qrCodes, setQR] = useState([]);
  // Add missing view state for tab switching
  const [view, setView] = useState('bags');
  // Consistent color for buyer button text
  const buyerButtonTextColor = '#fff';
  // Consistent color for buyer title
  const buyerTitleColor = '#2780e3';
  // Add missing apfNumbers state
  const [apfNumbers, setApfNumbers] = useState([]);
  // Column selection state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('bales_visible_columns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultVisibleColumns();
  });
  const [columnMenu, setColumnMenu] = useState({ open: false, x: 0, y: 0 });

  const handleHeaderRightClick = (e) => {
    e.preventDefault();
    setColumnMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  const handleColumnToggle = (key) => {
    setVisibleColumns((prev) => {
      let next;
      if (prev.includes(key)) {
        next = prev.filter(k => k !== key);
      } else {
        next = [...prev, key];
      }
      localStorage.setItem('bales_visible_columns', JSON.stringify(next));
      return next;
    });
  };

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

// ...existing code...
  // Restore dispatchInvoiceNumber state for manual input
  const [dispatchInvoiceNumber, setDispatchInvoiceNumber] = useState('');
  const [enabledBuyerActionIds, setEnabledBuyerActionIds] = useState([]);
  const [now, setNow] = useState(new Date());
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const [bagsSort, setBagsSort] = useState({ key: 'updated_at', direction: 'desc' });
  const [reportSort, setReportSort] = useState({ key: 'date_of_purchase', direction: 'desc' });
  const [selectedReportDateFrom, setSelectedReportDateFrom] = useState('');
  const [selectedReportDateTo, setSelectedReportDateTo] = useState('');
  const [dispatchScanCode, setDispatchScanCode] = useState('');
  const [dispatchScanLoading, setDispatchScanLoading] = useState(false);
  const [dispatchScanStatus, setDispatchScanStatus] = useState(null); // null | ok | error
  const [dispatchScanStatusMsg, setDispatchScanStatusMsg] = useState('');
  // Removed dispatchInvoiceNumber state, invoice number will be auto-generated
  const [selectedDispatchBagIds, setSelectedDispatchBagIds] = useState([]);
  const [dispatchAssignLoading, setDispatchAssignLoading] = useState(false);
  const [qrScanDeleteId, setQrScanDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletedHistory, setDeletedHistory] = useState([]);
  const [selectedDeletedKeys, setSelectedDeletedKeys] = useState([]);
  const [restoreDeletedLoading, setRestoreDeletedLoading] = useState(false);
  const [purgeDeletedLoading, setPurgeDeletedLoading] = useState(false);
  const dispatchScanInputRef = useRef(null);

  const deletedHistoryKey = `buyer_deleted_history_${Number(user?.id || 0)}`; // Key for deleted history

  const buildDeletedRowKey = (row, index = 0) => {
    const idPart = row?.id ?? 'na';
    const deletedAtPart = row?.deleted_at ?? `idx_${index}`;
    const codePart = String(row?.unique_code || 'nocode').replace(/\s+/g, '').toUpperCase();
    return `${idPart}_${deletedAtPart}_${codePart}`;
  };

  const getDeletedRowKey = (row, index = 0) => row?.deleted_key || buildDeletedRowKey(row, index);

  // Always display date in IST (Asia/Kolkata)
  const inputDateToDisplayDate = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    // Parse as local date, but display as IST
    const date = new Date(text);
    if (isNaN(date.getTime())) return '';
    // Format as dd/mm/yyyy in IST
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const pick = (type) => parts.find((p) => p.type === type)?.value || '';
    return `${pick('day')}/${pick('month')}/${pick('year')}`;
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

  // Always display date in IST (Asia/Kolkata) as dd-mm-yyyy
  const formatPurchaseDateDash = (value) => {
    const text = String(value || '').trim();
    if (!text) return '—';
    const date = new Date(text);
    if (isNaN(date.getTime())) return '—';
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const pick = (type) => parts.find((p) => p.type === type)?.value || '';
    return `${pick('day')}-${pick('month')}-${pick('year')}`;
  };

  const loadBags = async () => {
    setLoad(true);
    try {
      const bagsData = await api.getBags(user.id);
      setBags(bagsData);
      console.log('[DEBUG] Loaded bags:', bagsData);
    } finally {
      setLoad(false);
    }
  };
  const loadQR = async () => {
    const all = await api.getQRCodes();
    const userQRCodes = all.filter(q => q.buyer_id === user.id);
    setQR(userQRCodes);
    console.log('[DEBUG] Loaded QR codes:', userQRCodes);
  };
  const loadGrades = useCallback(async () => {
    const [tbGrades, byGrades] = await Promise.all([
      api.getGrades('tobacco_board'),
      api.getGrades('buyer'),
    ]);
    setGrades({ tobaccoBoard: tbGrades, buyer: byGrades });
    console.log('[DEBUG] Loaded grades:', { tobaccoBoard: tbGrades, buyer: byGrades });
  }, []);

  const loadApfNumbers = async () => {
    const apfData = await api.getApfNumbers();
    setApfNumbers(apfData);
    console.log('[DEBUG] Loaded APF numbers:', apfData);
  };

  const loadTobaccoTypes = useCallback(async () => {
    const types = await api.getTobaccoTypes();
    setMeta((prev) => ({ ...prev, tobaccoTypes: types }));
    console.log('[DEBUG] Loaded tobacco types:', types);
  }, []);

  const loadPurchaseLocations = useCallback(async () => {
    const locations = await api.getPurchaseLocations();
    setMeta((prev) => ({ ...prev, purchaseLocations: locations }));
    console.log('[DEBUG] Loaded purchase locations:', locations);
  }, []);

  const loadBuyerBagActionSetting = async () => {
    try {
      const res = await api.getBuyerBagActionSetting();
      const ids = Array.isArray(res?.enabled_buyer_ids) ? res.enabled_buyer_ids : [];
      setEnabledBuyerActionIds(ids.map(Number));
      console.log('[DEBUG] Loaded enabledBuyerActionIds:', ids);
    } catch {
      setEnabledBuyerActionIds([]);
      console.log('[DEBUG] Failed to load enabledBuyerActionIds');
    }
  };

  useEffect(() => {
    loadBags();
    loadQR();
    loadGrades();
    loadApfNumbers();
    loadTobaccoTypes();
    loadPurchaseLocations();
    loadBuyerBagActionSetting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load deleted history from backend
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const rows = await api.getDeletedBags(user.id);
        setDeletedHistory(rows.map((row, idx) => ({
          ...row.bag_data,
          deleted_at: row.deleted_at,
          deleted_key: row.id,
          db_id: row.db_id || row.id,
        })));
      } catch (e) {
        setDeletedHistory([]);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(deletedHistoryKey, JSON.stringify(deletedHistory));
    } catch {
      // Ignore storage failures silently (e.g., private mode quota limits)
    }
  }, [deletedHistory, deletedHistoryKey]);

  const switchView = useCallback((v) => {
    setView(v);
    setEditMsg('');
    if (v !== 'bags') {
      setEditing({ id: null, form: null });
    }
    if (v === 'bags' || v === 'bale-report') loadBags();
    if (v === 'qr')   loadQR();
    if (v === 'tb-grades' || v === 'buyer-grades') loadGrades();
    if (v === 'form' || v === 'bags') { loadApfNumbers(); loadTobaccoTypes(); loadPurchaseLocations(); }
    if (v === 'bags') loadBuyerBagActionSetting();
  }, [loadBags, loadQR, loadGrades, loadApfNumbers, loadTobaccoTypes, loadPurchaseLocations, loadBuyerBagActionSetting]);

  const isAfter6pm = now.getHours() >= 18;
  const canManageBagActions = !isAfter6pm || enabledBuyerActionIds.includes(Number(user.id));

  useEffect(() => {
    if (!canManageBagActions && editing.id !== null) {
      setEditing({ id: null, form: null });
      setEditMsg('Action access is disabled after 6 PM. Contact admin to enable it.');
    }
  }, [canManageBagActions, editing.id]);

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

  // Parse date in dd-mm-yyyy or yyyy-mm-dd to Date object
  const parseDDMMYYYY = (dateStr) => {
    const text = String(dateStr || '').trim();
    if (!text) return null;
    // dd-mm-yyyy
    const dmy = text.match(/^([0-9]{2})-([0-9]{2})-([0-9]{4})$/);
    if (dmy) {
      const [, dd, mm, yyyy] = dmy;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    // yyyy-mm-dd
    const ymd = text.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    if (ymd) {
      const [, yyyy, mm, dd] = ymd;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    // dd/mm/yyyy
    const dmySlash = text.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
    if (dmySlash) {
      const [, dd, mm, yyyy] = dmySlash;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    return null;
  };

  const normalizeDateOnly = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    // Parse as local date, but display as IST
    const date = new Date(text);
    if (isNaN(date.getTime())) return '';
    // Format as dd/mm/yyyy in IST
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const pick = (type) => parts.find((p) => p.type === type)?.value || '';
    return `${pick('day')}/${pick('month')}/${pick('year')}`;
  };

  const getReportDateLabel = (row) => {
    const purchaseDateLabel = normalizeReportDateLabel(row.purchase_date);
    if (purchaseDateLabel) return purchaseDateLabel;

    const inputDate = toInputDateTime(row.date_of_purchase).split('T')[0] || '';
    const dateOfPurchaseLabel = inputDateToDisplayDate(inputDate);
    return dateOfPurchaseLabel || '—';
  };

  const getRowDateForRange = (row) => {
    // Use only the date part in YYYY-MM-DD for robust filtering
    const raw = row.purchase_date || row.date_of_purchase;
    if (!raw) return null;
    // Accept both YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss formats
    const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  // Use YYYY-MM-DD string for comparison
  const dateFromStr = selectedReportDateFrom ? String(selectedReportDateFrom).slice(0, 10) : null;
  const dateToStr = selectedReportDateTo ? String(selectedReportDateTo).slice(0, 10) : null;

  // fixedReportRows is just bags for now, but can be replaced with filtered/processed data if needed
  const fixedReportRows = bags;

  const filteredReportRows = fixedReportRows.filter((row) => {
    if (!selectedReportDateFrom && !selectedReportDateTo) return true;
    const rowDate = getRowDateForRange(row);
    if (!rowDate) return false;
    if (dateFromStr && rowDate < dateFromStr) return false;
    if (dateToStr && rowDate > dateToStr) return false;
    return true;
  });

  // Calculate totals from all bags, not just filtered rows, for always-visible totals
  const totalBaleValue = bags.reduce((sum, row) => sum + (Number.isFinite(Number(row.bale_value)) ? Number(row.bale_value) : (Number(row.weight) * Number(row.rate) || 0)), 0);
  const totalWeight = bags.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  // Exclude deleted bags from Not Dispatched section
  // Exclude bags with status 'Delete in-progress' from Not Dispatched
  const visibleBags = bags.filter(bag => bag.status !== 'Delete in-progress');
  // Exclude bags with status 'Deleted' from Not Dispatched
  const sortedBags = [...visibleBags.filter(bag => bag.status !== 'Deleted')].sort((a, b) => compareBy(a?.[bagsSort.key], b?.[bagsSort.key], bagsSort.direction));
  const hasVehicleDispatchHistory = (bag) => Number(bag.vehicle_dispatch_id) > 0;
  const isActiveVehicleDispatchBag = (bag) => ['sent_to_admin', 'sent_to_warehouse'].includes(String(bag.vehicle_dispatch_status || '').trim());
  const isDispatchSectionBag = (bag) => Number(bag.dispatch_list_added) === 1 || hasVehicleDispatchHistory(bag);
  const notDispatchedBags = sortedBags.filter((bag) => !isDispatchSectionBag(bag));
  const dispatchedBags = sortedBags.filter(isDispatchSectionBag);
  const sortedReportRows = [...filteredReportRows].sort((a, b) => compareBy(a?.[reportSort.key], b?.[reportSort.key], reportSort.direction));
  // Show only Delete in-progress and Deleted
  const sortedDeletedHistory = useMemo(() =>
    [...deletedHistory]
      .filter(row => row.status === 'Delete in-progress' || row.status === 'Deleted')
      .sort((a, b) => {
        // Show 'Delete in-progress' first, then 'Deleted', both sorted by deleted_at desc
        if (a.status === b.status) {
          return compareBy(a?.deleted_at, b?.deleted_at, 'desc');
        }
        return a.status === 'Delete in-progress' ? -1 : 1;
      })
  , [deletedHistory]);
  const deletedHistoryKeys = sortedDeletedHistory.map((row, index) => getDeletedRowKey(row, index));
  const allDeletedSelected = deletedHistoryKeys.length > 0
    && deletedHistoryKeys.every((key) => selectedDeletedKeys.includes(key));
  const getDispatchState = (bag) => {
    const alreadyMoved = Number(bag.dispatch_list_added) === 1;
    const alreadyDispatched = hasVehicleDispatchHistory(bag);
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
    const rateValue = bag.rate ?? '';
    const weightValue = bag.weight ?? '';
    const computedBaleValue = Number.isFinite(Number(weightValue)) && Number.isFinite(Number(rateValue))
      ? Number((Number(weightValue) * Number(rateValue)).toFixed(2))
      : (bag.bale_value ?? '');
    setEditing({
      id: bag.id,
      form: {
        fcv: bag.fcv || '',
        lot_number: bag.lot_number || '',
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
      }
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
    if (!editing.id || !editing.form) return;
    const { form } = editing;
    const isFCV = form.fcv === 'FCV';
    const isNonFCV = form.fcv === 'NON-FCV';
    if (!form.weight || !form.buyer_grade) {
      setEditMsg('Weight and Buyer Grade are required');
      return;
    }
    if (isFCV && (!form.apf_number || !form.tobacco_grade)) {
      setEditMsg('For FCV, APF Number and Tobacco Grade are required');
      return;
    }
    if (isNonFCV && (!form.type_of_tobacco || !form.purchase_location)) {
      setEditMsg('For NON-FCV, Type of Tobacco and Location are required');
      return;
    }
    try {
      const numericWeight = parseFloat(form.weight);
      const numericRate = parseFloat(form.rate);
      const baleValue = Number.isFinite(numericWeight) && Number.isFinite(numericRate)
        ? Number((numericWeight * numericRate).toFixed(2))
        : (form.bale_value ?? null);
      await api.updateBag(editing.id, {
        ...form,
        weight: numericWeight,
        rate: Number.isFinite(numericRate) ? numericRate : null,
        bale_value: baleValue,
        date_of_purchase: fromInputDateTime(form.date_of_purchase),
      });
      setEditMsg('✅ Bag updated successfully');
      setEditing({ id: null, form: null });
      await loadBags();
    } catch (e) {
      setEditMsg(e.message);
    }
  };

  const cancelEdit = () => {
    setEditing({ id: null, form: null });
    setEditMsg('');
  };

  const onEditFieldChange = (key, value) => {
    setEditing((prev) => ({
      ...prev,
      form: {
        ...(prev.form || {}),
        [key]: value,
      },
    }));
  };

  const scanBagToDispatch = async (inputCode) => {
    const raw = String((inputCode ?? dispatchScanCode) || '');
    const scannedCode = raw.replace(/[\r\n\t]/g, '').trim();
    if (!scannedCode) {
      setDispatchScanStatus(null);
      setDispatchScanStatusMsg('');
      setEditMsg('Scan QR code to select a purchase');
      return;
    }

    const norm = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
    const scannedNorm = norm(scannedCode);

    let matchedBag = bags.find((bag) => norm(bag.unique_code) === scannedNorm);

    if (!matchedBag) {
      matchedBag = bags.find((bag) => {
        const bagNorm = norm(bag.unique_code);
        return bagNorm.includes(scannedNorm) || scannedNorm.includes(bagNorm);
      });
    }

    if (!matchedBag) {
      setDispatchScanStatus('error');
      setDispatchScanStatusMsg('Invalid QR for this buyer');
      setEditMsg(`No purchase found for code "${scannedCode}". Check the code and try again.`);
      return;
    }

    const { alreadyMoved, alreadyDispatched } = getDispatchState(matchedBag);
    if (alreadyMoved) {
      setDispatchScanStatus('error');
      setDispatchScanStatusMsg('QR already moved to dispatch');
      setEditMsg('This purchase is already moved to vehicle dispatch');
      return;
    }
    if (alreadyDispatched) {
      setDispatchScanStatus('error');
      setDispatchScanStatusMsg('QR already dispatched');
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
      setQrScanDeleteId(matchedBagId);
      setDispatchScanStatus('ok');
      setDispatchScanStatusMsg('Valid QR for this buyer');
      setDispatchScanCode(matchedBag.unique_code);
      setEditMsg(`✅ ${matchedBag.unique_code} selected. Assign invoice to dispatch, or click Delete to remove this purchase.`);
    } catch (e) {
      setDispatchScanStatus('error');
      setDispatchScanStatusMsg('Scan failed');
      setEditMsg(e.message || 'Failed to select scanned purchase');
    } finally {
      setDispatchScanLoading(false);
      setTimeout(() => dispatchScanInputRef.current?.focus(), 0);
    }
  };

  const handleDeleteScannedBag = async (bagId) => {
    setDeleteLoading(true);
    try {
      const bag = bags.find((b) => Number(b.id) === Number(bagId));
      await api.deleteBag(bagId);
      setQrScanDeleteId(null);
      setEditMsg(`✅ Bag${bag ? ` ${bag.unique_code}` : ''} deleted and QR code is now available.`);
      await loadBags();
    } catch (e) {
      setEditMsg(e.message || 'Failed to delete bag');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
        <div style={S.app}>
          <TopBar
            user={user}
            onLogout={onLogout}
            bagsLength={bags.length}
            isMobileView={isMobileView}
            buyerButtonTextColor={buyerButtonTextColor}
            buyerTitleColor={buyerTitleColor}
            S={S}
          />
          <div style={S.page}>
            <TabsNav
              view={view}
              setView={switchView}
              bagsLength={bags.length}
              qrCodesLength={qrCodes.length}
              S={S}
              buyerTitleColor={buyerTitleColor}
            />


            {view === 'form-fcv' && (
              <BuyingForm
                buyer={user}
                grades={grades}
                apfNumbers={apfNumbers}
                tobaccoTypes={meta.tobaccoTypes}
                purchaseLocations={meta.purchaseLocations}
                assignedQRCodes={qrCodes}
                onBagSaved={loadQR}
                onSaveExit={() => switchView('bags')}
                forceFcvType="FCV"
              />
            )}
            {view === 'form-nonfcv' && (
              <BuyingForm
                buyer={user}
                grades={grades}
                apfNumbers={apfNumbers}
                tobaccoTypes={meta.tobaccoTypes}
                purchaseLocations={meta.purchaseLocations}
                assignedQRCodes={qrCodes}
                onBagSaved={loadQR}
                onSaveExit={() => switchView('bags')}
                forceFcvType="NON-FCV"
              />
            )}

            {view === 'bags' && (
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ ...S.subheading, color: buyerTitleColor }}>All Bales ({bags.length})</div>
                </div>
                {editMsg && <div style={editMsg.startsWith('✅') ? S.success : S.error}>{editMsg}</div>}
           
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ minWidth: 260, flex: '1 1 260px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    className="mybales-scan-input"
                    ref={dispatchScanInputRef}
                    style={{
                      ...S.input,
                      minWidth: 220,
                      marginBottom: 0,
                      paddingLeft: 36,
                      borderColor: dispatchScanStatus === 'ok' ? '#2e7d32' : dispatchScanStatus === 'error' ? '#c0392b' : undefined,
                    }}
                    placeholder="Scan QR code or type code manually"
                    value={dispatchScanCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDispatchScanStatus(null);
                      setDispatchScanStatusMsg('');
                      if (/([\r\n\t])$/.test(val)) {
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
                        scanBagToDispatch(e.target.value.trim());
                      }
                    }}
                  />
                  {dispatchScanStatus && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 16,
                        color: dispatchScanStatus === 'ok' ? '#2e7d32' : '#c0392b',
                        pointerEvents: 'none',
                      }}
                      aria-hidden="true"
                    >
                      {dispatchScanStatus === 'ok' ? '✓' : '✕'}
                    </span>
                  )}
                </div>
                {dispatchScanStatusMsg && (
                  <div style={{ fontSize: 12, marginTop: 5, color: dispatchScanStatus === 'ok' ? '#2e7d32' : '#c0392b', fontWeight: dispatchScanStatus === 'ok' ? 700 : 800 }}>
                    {dispatchScanStatusMsg}
                  </div>
                )}
              </div>
              <QRCameraScanner
                buttonLabel="Scan QR"
                onDetected={(value) => {
                  setDispatchScanCode(value);
                  scanBagToDispatch(value);
                }}
              />
              <input
                className="mybales-invoice-input"
                style={{ ...S.input, minWidth: 180, marginBottom: 0 }}
                placeholder="Invoice number"
                value={dispatchInvoiceNumber}
                onChange={e => setDispatchInvoiceNumber(e.target.value)}
                disabled={dispatchAssignLoading}
                required
              />
              <button
                style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', opacity: dispatchAssignLoading ? 0.65 : 1 }}
                disabled={dispatchAssignLoading || selectedDispatchBagIds.length === 0}
                onClick={assignInvoiceAndMoveToDispatch}
              >
                {dispatchAssignLoading ? 'Moving...' : `Assign Invoice + Move to Dispatch (${selectedDispatchBagIds.length})`}
              </button>
            </div>
            <SelectedDispatchList
              selectedDispatchBags={selectedDispatchBags}
              S={S}
              removeSelectedDispatchBag={removeSelectedDispatchBag}
              setEditMsg={setEditMsg}
              bags={bags}
              api={api}
              user={user}
              setBags={setBags}
              setDeletedHistory={setDeletedHistory}
              setSelectedDispatchBagIds={setSelectedDispatchBagIds}
            />
            <BalesTable
              notDispatchedBags={notDispatchedBags}
              sectionTitle="Not Dispatched"
              emptyMessage="No available bales."
              editingId={editing.id}
              editForm={editing.form}
              S={S}
              BALES_COLUMNS={BALES_COLUMNS}
              visibleColumns={visibleColumns}
              bagsSort={bagsSort}
              toggleSort={toggleSort}
              setBagsSort={setBagsSort}
              canManageBagActions={canManageBagActions}
              startEdit={startEdit}
              selectedDispatchBagIds={selectedDispatchBagIds}
              getDispatchState={getDispatchState}
              toggleDispatchSelection={toggleDispatchSelection}
              removeSelectedDispatchBag={removeSelectedDispatchBag}
              qrScanDeleteId={qrScanDeleteId}
              deleteLoading={deleteLoading}
              handleDeleteScannedBag={handleDeleteScannedBag}
              formatPurchaseDateDash={formatPurchaseDateDash}
              formatUpdatedAt={formatUpdatedAt}
              buyerButtonTextColor={buyerButtonTextColor}
              onEditFieldChange={onEditFieldChange}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              apfNumberOptions={apfNumberOptions}
              tobaccoBoardGradeOptions={tobaccoBoardGradeOptions}
              buyerGradeOptions={buyerGradeOptions}
            />
            <BalesTable
              notDispatchedBags={dispatchedBags}
              sectionTitle="Dispatched"
              emptyMessage="No dispatched bales."
              editingId={editing.id}
              editForm={editing.form}
              S={S}
              BALES_COLUMNS={BALES_COLUMNS}
              visibleColumns={visibleColumns}
              bagsSort={bagsSort}
              toggleSort={toggleSort}
              setBagsSort={setBagsSort}
              canManageBagActions={false}
              startEdit={startEdit}
              selectedDispatchBagIds={selectedDispatchBagIds}
              getDispatchState={getDispatchState}
              toggleDispatchSelection={toggleDispatchSelection}
              removeSelectedDispatchBag={removeSelectedDispatchBag}
              qrScanDeleteId={qrScanDeleteId}
              deleteLoading={deleteLoading}
              handleDeleteScannedBag={handleDeleteScannedBag}
              formatPurchaseDateDash={formatPurchaseDateDash}
              formatUpdatedAt={formatUpdatedAt}
              buyerButtonTextColor={buyerButtonTextColor}
              showSelectionColumn={false}
              onEditFieldChange={onEditFieldChange}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              apfNumberOptions={apfNumberOptions}
              tobaccoBoardGradeOptions={tobaccoBoardGradeOptions}
              buyerGradeOptions={buyerGradeOptions}
            />

            <DeletedHistoryTable
              deletedHistory={sortedDeletedHistory}
              selectedDeletedKeys={selectedDeletedKeys}
              allDeletedSelected={allDeletedSelected}
              toggleSelectAll={toggleSelectAllDeleted}
              toggleSelectRow={toggleSelectDeletedRow}
              handleRestore={handleRestoreDeleted}
              handleConfirmDelete={handleConfirmDelete}
              handlePermanentDelete={handlePermanentDeleteDeleted}
              getRowKey={getDeletedRowKey}
              loading={restoreDeletedLoading || purgeDeletedLoading}
              S={S}
            />
          </div>
        )}

        {view === 'bale-report' && (
          <PurchaseReport
            bags={bags}
            S={S}
            buyerTitleColor={buyerTitleColor}
            formatPurchaseDateDash={formatPurchaseDateDash}
          />
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

export default BuyerDashboard;

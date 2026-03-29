

// src/components/BuyingForm.jsx
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import { fromInputDateTime, nowInputDateTime, formatDateTime } from '../utils/dateFormat';
import QRCameraScanner from './QRCameraScanner';
import SearchableSelect from './SearchableSelect';

const S = {
  ..._S,
  card: {
    ..._S.card,
    background: '#ffffff',
    border: '1px solid #b7d9f8',
    boxShadow: '0 4px 16px rgba(39,128,227,0.16)',
  },
  heading: {
    ..._S.heading,
    color: '#2780e3',
  },
  label: {
    ..._S.label,
    color: '#2780e3',
  },
  input: {
    ..._S.input,
    border: '1.5px solid #1f67b9',
    background: '#ffffff',
    color: '#1b3555',
  },
  toggleGroup: {
    ..._S.toggleGroup,
    border: '1.5px solid #2780e3',
  },
};

export default function BuyingForm({ buyer, grades = { tobaccoBoard: [], buyer: [] }, apfNumbers = [], tobaccoTypes = [], purchaseLocations = [], assignedQRCodes = [], onSaveExit, forceFcvType, onBagSaved }) {
  // Support deletedHistory and setDeletedHistory if passed as props (for deletedCodes logic)
  const buyerTitleColor = '#2780e3';
  const buyerButtonTextColor = '#fff';
  // Fallbacks for deletedCodes and setDeletedHistory if not provided
  const deletedHistory = typeof window !== 'undefined' && window.deletedHistory ? window.deletedHistory : [];
  const setDeletedHistory = typeof window !== 'undefined' && window.setDeletedHistory ? window.setDeletedHistory : undefined;
  const deletedCodes = Array.isArray(deletedHistory) ? deletedHistory.map(row => String(row.unique_code).trim()) : [];
  const fcvToggleColor = '#fff';
  const buyerLabelStyle = { ...S.label, fontWeight: 800 };
  const missingFieldStyle = {
    background: '#fffee0',
    color: '#1b3555',
  };
  const [fcv, setFcv] = useState(forceFcvType || '');

  // If forceFcvType changes, update fcv state
  useEffect(() => {
    if (forceFcvType && fcv !== forceFcvType) {
      setFcv(forceFcvType);
    }
  }, [forceFcvType]);
  const [uniqueCode, setUniqueCode]     = useState('');
  const [codeStatus, setCodeStatus]     = useState(null); // null|checking|ok|duplicate|error
  const [codeMsg, setCodeMsg]           = useState('');
  const [apfNumber, setApfNumber]       = useState('');
  const [tobaccoGrade, setTobaccoGrade] = useState('');
  const [weight, setWeight]             = useState('');
  const [rate, setRate]                 = useState('');
  const [buyerGrade, setBuyerGrade]     = useState('');
  const [lotNumber, setLotNumber]       = useState('');
  const [typeOfTobacco, setTypeOfTobacco] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [nonFcvPurchaseDate, setNonFcvPurchaseDate] = useState(() => {
    // If this is the NON-FCV page, default to today
    if (forceFcvType === 'NON-FCV') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  });
  const [dateOfPurchase, setDate]       = useState(nowInputDateTime());
  const [error, setError]               = useState('');
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fcvFieldsLocked, setFcvFieldsLocked] = useState(false);
  const debounceRef = useRef(null);
  const uniqueCodeInputRef = useRef(null);
  const errorRef = useRef(null);
  const latestCodeRef = useRef('');
  const validateRequestRef = useRef(0);
  const isFCV = fcv === 'FCV';
  const isNonFCV = fcv === 'NON-FCV';
  const tobaccoBoardGrades = [...grades.tobaccoBoard].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const buyerGrades = [...grades.buyer].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const tobaccoBoardGradeCodes = tobaccoBoardGrades.map(g => g.code);
  const buyerGradeCodes = buyerGrades.map(g => g.code);
  const tobaccoBoardGradeOptions = tobaccoBoardGradeCodes.map(g => ({ value: g, label: g }));
  const buyerGradeOptions = buyerGradeCodes.map(g => ({ value: g, label: g }));
  const tobaccoTypeOptions = (Array.isArray(tobaccoTypes) ? [...tobaccoTypes] : [])
    .sort((a, b) => String(a.type).localeCompare(String(b.type), undefined, { numeric: true }))
    .map((item) => ({
      value: String(item.type),
      label: item.description ? `${item.type} - ${item.description}` : String(item.type),
      keywords: `${item.type} ${item.description || ''}`,
    }));
  const locationOptions = (Array.isArray(purchaseLocations) ? [...purchaseLocations] : [])
    .sort((a, b) => String(a.location).localeCompare(String(b.location), undefined, { numeric: true }))
    .map((item) => ({
      value: String(item.location),
      label: item.description ? `${item.location} - ${item.description}` : String(item.location),
      keywords: `${item.location} ${item.description || ''}`,
    }));
  const apfNumberOptions = [...apfNumbers]
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }))
    .map(a => ({
      value: String(a.number),
      label: a.description ? `${a.number} - ${a.description}` : String(a.number),
      keywords: `${a.number} ${a.description || ''}`,
    }));
  // Assigned and unused QR codes
  const assignedAvailableCodes = [...assignedQRCodes]
    .filter((q) => !q.used)
    .map((q) => String(q.unique_code));
  const qrListId = `assigned-qr-codes-${buyer?.id || 'buyer'}`;

  const requiredLabel = (text, isRequired = true) => (
    <>
      {text}
      {isRequired ? <span style={{ color: '#2780e3' }}> *</span> : ''}
    </>
  );

  useEffect(() => {
    if (!error || !errorRef.current) return;
    errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    errorRef.current.focus({ preventScroll: true });
  }, [error]);

  const reset = ({ preserveFcvContext = false, preserveFcvLock = false, focusUniqueCode = false } = {}) => {
    const keepFcvContext = preserveFcvContext && fcv === 'FCV' && !!purchaseDate && !!apfNumber;
    setFcv(keepFcvContext ? 'FCV' : '');
    setUniqueCode('');
    setApfNumber(keepFcvContext ? apfNumber : '');
    setTobaccoGrade('');
    setWeight('');
    setRate('');
    setBuyerGrade('');
    setLotNumber('');
    setTypeOfTobacco('');
    setPurchaseLocation('');
    setPurchaseDate(keepFcvContext ? purchaseDate : '');
    setNonFcvPurchaseDate('');
    setFcvFieldsLocked(keepFcvContext && preserveFcvLock);
    setError('');
    setSaved(false);
    setSubmitAttempted(false);
    setCodeStatus(null);
    setCodeMsg('');
    setDate(nowInputDateTime());

    if (focusUniqueCode) {
      setTimeout(() => uniqueCodeInputRef.current?.focus(), 0);
    }
  };

  const numericWeight = parseFloat(weight);
  const numericRate = parseFloat(rate);
  const baleValue = Number.isFinite(numericWeight) && Number.isFinite(numericRate)
    ? Number((numericWeight * numericRate).toFixed(2))
    : '';
  const isPurchaseDateLocked = isFCV && fcvFieldsLocked;
  const isApfNumberLocked = isFCV && fcvFieldsLocked;
  const lockedFieldStyle = {
    ...S.input,
    background: '#ffffff',
    borderColor: '#1f67b9',
    borderWidth: 2,
    color: '#2780e3',
    fontWeight: 700,
    opacity: 1,
    cursor: 'not-allowed',
    boxShadow: '0 0 0 3px rgba(39,128,227,0.16)',
  };

  const checkCode = async (code) => {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) return;
    const requestId = ++validateRequestRef.current;
    latestCodeRef.current = normalizedCode;

    setCodeStatus('checking');
    setDate(nowInputDateTime()); // stamp date+time on scan
    try {
      const v = await api.validateCode(normalizedCode);
      if (requestId !== validateRequestRef.current || latestCodeRef.current !== normalizedCode) return;
      if (!v.valid) {
        setCodeStatus(v.alreadyUsed ? 'duplicate' : 'error');
        setCodeMsg(v.error);
      } else if (v.qr.buyer_id && v.qr.buyer_id !== buyer.id) {
        setCodeStatus('error');
        setCodeMsg('This code is assigned to another buyer');
      } else {
        setCodeStatus('ok');
        setCodeMsg('Code is valid and ready to use');
      }
    } catch {
      if (requestId !== validateRequestRef.current || latestCodeRef.current !== normalizedCode) return;
      setCodeStatus('error');
      setCodeMsg('Could not validate code — check connection');
    }
  };

  const handleCodeChange = (val) => {
    const nextValue = String(val || '');
    setUniqueCode(nextValue);
    setCodeStatus(null);
    setCodeMsg('');
    latestCodeRef.current = nextValue.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!nextValue.trim()) {
      validateRequestRef.current += 1;
      return;
    }
    debounceRef.current = setTimeout(() => checkCode(nextValue.trim()), 600);
  };

  const handleCodeBlur = () => {
    if (uniqueCode.trim() && codeStatus === null) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      checkCode(uniqueCode.trim());
    }
  };

  const clearUniqueCode = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    validateRequestRef.current += 1;
    latestCodeRef.current = '';
    setUniqueCode('');
    setCodeStatus(null);
    setCodeMsg('');
    setError('');
    setTimeout(() => uniqueCodeInputRef.current?.focus(), 0);
  };

  const handleDetectedCode = (value) => {
    const nextValue = String(value || '').trim();
    setUniqueCode(nextValue);
    setCodeStatus(null);
    setCodeMsg('');
    latestCodeRef.current = nextValue;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!nextValue) {
      validateRequestRef.current += 1;
      setTimeout(() => uniqueCodeInputRef.current?.focus(), 0);
      return;
    }
    checkCode(nextValue);
    setTimeout(() => uniqueCodeInputRef.current?.focus(), 0);
  };

  const handleFcvSelect = (nextValue) => {
    const value = fcv === nextValue ? '' : nextValue;
    setFcv(value);
    setFcvFieldsLocked(false);

    if (value === 'FCV') {
      setTypeOfTobacco('');
      setPurchaseLocation('');
      setNonFcvPurchaseDate('');
      // If purchaseDate is empty, set to today
      setPurchaseDate(prev => {
        if (prev) return prev;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      });
    }
    if (value === 'NON-FCV') {
      setApfNumber('');
      setTobaccoGrade('');
      setPurchaseDate('');
      // Set nonFcvPurchaseDate to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setNonFcvPurchaseDate(`${yyyy}-${mm}-${dd}`);
    }
    if (!value) {
      setTypeOfTobacco('');
      setPurchaseLocation('');
      setApfNumber('');
      setTobaccoGrade('');
      setPurchaseDate('');
      setNonFcvPurchaseDate('');
    }
  };

  const validate = () => {
    if (!fcv)                          return 'Please select FCV or NON-FCV';
    if (!uniqueCode)                   return 'Unique Code is required';
    if (codeStatus === 'duplicate')    return codeMsg;
    if (codeStatus === 'error')        return codeMsg;
    if (codeStatus === 'checking')     return 'Please wait — validating code…';
    if (isNonFCV && !typeOfTobacco)       return 'Type of Tobacco/Variety is required for NON-FCV';
    if (isNonFCV && !nonFcvPurchaseDate)   return 'Purchase Date is required for NON-FCV';
    if (isFCV && !purchaseDate)            return 'Purchase Date is required for FCV';
    if (isFCV && !apfNumber)           return 'APF Number is required for FCV';
    if (isFCV && !tobaccoGrade)        return 'Tobacco Board Grade is required for FCV';
    if (!lotNumber.trim())    return 'Lot Number is required';
    if (!weight)                       return 'Weight is required';
    if (!rate)                         return 'Rate is required';
    if (!buyerGrade)                   return 'Buyer Grade is required';
    // Prevent out-of-range baleValue
    const MAX_BALE_VALUE = 99999999.99;
    if (baleValue !== '' && Number(baleValue) > MAX_BALE_VALUE) {
      return `Bale Value exceeds maximum allowed (${MAX_BALE_VALUE}). Please enter smaller weight or rate.`;
    }
    return null;
  };

  const isMissingField = (field) => {
    if (!submitAttempted) return false;
    if (field === 'fcv') return !fcv;
    if (field === 'uniqueCode') return !uniqueCode.trim();
    if (field === 'typeOfTobacco') return isNonFCV && !typeOfTobacco;
    if (field === 'nonFcvPurchaseDate') return isNonFCV && !nonFcvPurchaseDate;
    if (field === 'purchaseDate') return isFCV && !purchaseDate;
    if (field === 'apfNumber') return isFCV && !apfNumber;
    if (field === 'tobaccoGrade') return isFCV && !tobaccoGrade;
    if (field === 'lotNumber') return !lotNumber.trim();
    if (field === 'weight') return !weight;
    if (field === 'rate') return !rate;
    if (field === 'buyerGrade') return !buyerGrade;
    return false;
  };

  const labelWithMissing = (missing) => (missing ? { ...buyerLabelStyle, color: '#c79a00' } : buyerLabelStyle);
  const inputWithMissing = (baseStyle, missing) => (missing ? { ...baseStyle, ...missingFieldStyle } : baseStyle);

  const doSave = async (exit) => {
    setSubmitAttempted(true);
    setError('');
    if (!lotNumber.trim()) {
      setError('Lot Number is required');
      return;
    }
    if (uniqueCode.trim() && codeStatus === null) {
      await checkCode(uniqueCode.trim());
      return;
    }
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      // Use the selected purchase date for both fields
      const selectedDate = isFCV ? purchaseDate : nonFcvPurchaseDate;
      const payload = {
        unique_code: uniqueCode.trim(), buyer_id: buyer.id,
        buyer_code: buyer.code, buyer_name: buyer.name,
        fcv,
        apf_number: isFCV ? apfNumber : '',
        tobacco_grade: isFCV ? tobaccoGrade : '',
        type_of_tobacco: isNonFCV ? typeOfTobacco : '',
        purchase_location: purchaseLocation || '',
        weight: parseFloat(weight), rate: parseFloat(rate), bale_value: baleValue, buyer_grade: buyerGrade,
        lot_number: lotNumber.trim(),
        purchase_date: selectedDate,
        date_of_purchase: selectedDate,
      };
      console.log('DEBUG: API payload for saveBag:', payload);
      await api.saveBag(payload);
      if (typeof onBagSaved === 'function') {
        await onBagSaved();
      }
      // Remove from deletedHistory if present
      if (deletedCodes.includes(uniqueCode.trim()) && typeof setDeletedHistory === 'function') {
        setDeletedHistory((prev) => prev.filter(row => String(row.unique_code) !== uniqueCode.trim()));
      }
      setSaved(true);
      setSubmitAttempted(false);
      if (exit) {
        setFcvFieldsLocked(false);
        setTimeout(onSaveExit, 600);
      }
      else {
        if (isNonFCV) {
          // For NON-FCV, always reset to a fresh NON-FCV state
          setFcvFieldsLocked(false);
          setTimeout(() => {
            setFcv('NON-FCV');
            setUniqueCode('');
            setApfNumber('');
            setTobaccoGrade('');
            setWeight('');
            setRate('');
            setBuyerGrade('');
            setLotNumber('');
            setTypeOfTobacco('');
            setPurchaseLocation('');
            // Set nonFcvPurchaseDate to today
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setNonFcvPurchaseDate(`${yyyy}-${mm}-${dd}`);
            setPurchaseDate('');
            setError('');
            setSaved(false);
            setSubmitAttempted(false);
            setCodeStatus(null);
            setCodeMsg('');
            setDate(nowInputDateTime());
            setTimeout(() => uniqueCodeInputRef.current?.focus(), 0);
          }, 800);
        } else {
          setFcvFieldsLocked(fcv === 'FCV' && !!purchaseDate && !!apfNumber);
          setTimeout(() => reset({ preserveFcvContext: true, preserveFcvLock: true, focusUniqueCode: true }), 800);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const borderColor = codeStatus === 'ok' ? '#2e7d32'
    : codeStatus === 'duplicate' ? '#e67e22'
    : codeStatus === 'error' ? '#c0392b'
    : undefined;

  return (
    <div style={S.card}>
      <div style={{ ...S.heading, color: buyerTitleColor }}>Buying</div>

      {saved && <div style={S.success}>✅ Bag saved successfully!</div>}
      {error && <div ref={errorRef} tabIndex={-1} style={S.error}>⚠️ {error}</div>}

      {/* FCV Toggle */}
      {/*
        FCV/NON-FCV label, toggle, and 'FCV selected. Clear' message are commented out when forceFcvType is set (i.e., on split entry pages)
      */}
      {!forceFcvType && (
        <>
          <label style={labelWithMissing(isMissingField('fcv'))}>{requiredLabel('FCV / NON-FCV')}</label>
          <div
            style={{
              ...S.toggleGroup,
              gap: 10,
              border: 'none',
              overflow: 'visible',
              ...(isMissingField('fcv') ? { background: '#fffee0', borderRadius: 10, padding: 2 } : {}),
            }}
          >
            <button
              style={{
                ...S.toggleBtn(fcv === 'FCV', fcv === 'NON-FCV'),
                color: fcvToggleColor,
                border: '1.5px solid #1f67b9',
                borderRadius: 8,
              }}
              onClick={() => handleFcvSelect('FCV')}
            >
              FCV
            </button>
            <button
              style={{
                ...S.toggleBtn(fcv === 'NON-FCV', fcv === 'FCV'),
                color: fcvToggleColor,
                border: '1.5px solid #1f67b9',
                borderRadius: 8,
              }}
              onClick={() => handleFcvSelect('NON-FCV')}
            >
              NON-FCV
            </button>
          </div>
          {fcv && (
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>
              <b style={{ color: '#c0392b' }}>{fcv}</b> selected.{' '}
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setFcv('')}>Clear</span>
            </div>
          )}
        </>
      )}

      {/* Unique Code */}
      <div style={S.row}>
        <label style={labelWithMissing(isMissingField('uniqueCode'))}>{requiredLabel('Unique Code')}</label>
        <div style={{ position: 'relative' }}>
          <>
            <input
              ref={uniqueCodeInputRef}
              style={inputWithMissing({ ...S.input, borderColor, paddingRight: 38 }, isMissingField('uniqueCode'))}
              placeholder="Scan QR or enter code manually"
              value={uniqueCode}
              list={qrListId}
              onChange={e => handleCodeChange(e.target.value)}
              onBlur={handleCodeBlur}
              autoFocus
            />
            {uniqueCode ? (
              <button
                type="button"
                aria-label="Clear code"
                title="Clear"
                onClick={clearUniqueCode}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: '#eef4fb',
                  color: '#335b87',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            ) : codeStatus ? (
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 16,
                  pointerEvents: 'none',
                  color: codeStatus === 'ok' ? '#2e7d32' : '#c0392b',
                }}
                aria-hidden="true"
              >
                {codeStatus === 'ok' ? '✓' : '✕'}
              </span>
            ) : null}
            <datalist id={qrListId}>
              {assignedAvailableCodes.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, width: '100%' }}>
              <QRCameraScanner onDetected={handleDetectedCode} buttonLabel="Scan QR" />
              <div style={{ fontSize: 12, color: '#5b708b' }}>Use the camera on Android or type the code manually.</div>
            </div>
            {codeStatus && codeMsg && (
              <div
                style={{
                  fontSize: 12,
                  marginTop: 5,
                  fontWeight: codeStatus !== 'ok' ? 'bold' : 'normal',
                  color: codeStatus === 'ok' ? '#2e7d32' : codeStatus === 'duplicate' ? '#e67e22' : '#c0392b',
                }}
              >
                {codeMsg}
              </div>
            )}
          </>
        </div>
    </div>

      {/* Duplicate warning banner */}
      {codeStatus === 'duplicate' && (
        <div style={{ background: '#fff8e1', border: '2px solid #f9a825', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', color: '#e65100', marginBottom: 4, fontSize: 14 }}>⚠️ Duplicate QR Code</div>
          <div style={{ color: '#555', fontSize: 13 }}>{codeMsg}</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>Please scan a different QR code or contact admin.</div>
        </div>
      )}

      {isNonFCV && (
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('typeOfTobacco'))}>{requiredLabel('Type of Tobacco / Variety')}</label>
          <SearchableSelect
            options={tobaccoTypeOptions}
            value={typeOfTobacco}
            onChange={setTypeOfTobacco}
            inputStyle={inputWithMissing(S.input, isMissingField('typeOfTobacco'))}
            placeholder=""
          />
        </div>
      )}

      {isNonFCV && (
        <div style={S.row}>
          <label style={buyerLabelStyle}>{requiredLabel('Location', false)}</label>
          <SearchableSelect
            options={locationOptions}
            value={purchaseLocation}
            onChange={setPurchaseLocation}
            inputStyle={S.input}
            placeholder=""
          />
        </div>
      )}


      {isNonFCV && (
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('nonFcvPurchaseDate'))}>{requiredLabel('Date of Purchase (dd-mm-yyyy)')}</label>
          <input
            style={inputWithMissing(S.input, isMissingField('nonFcvPurchaseDate'))}
            type="date"
            lang="en-GB"
            value={nonFcvPurchaseDate || (() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            })()}
            min="2020-01-01"
            max={(() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            })()}
            onChange={e => setNonFcvPurchaseDate(e.target.value)}
          />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            Selected Date: {nonFcvPurchaseDate ? formatDateTime(nonFcvPurchaseDate) : ''}
          </div>
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('purchaseDate'))}>{requiredLabel('Date of Purchase (dd-mm-yyyy)')}</label>
          <input
            style={inputWithMissing(isPurchaseDateLocked ? lockedFieldStyle : S.input, isMissingField('purchaseDate'))}
            type="date"
            lang="en-GB"
            value={purchaseDate || (() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            })()}
            min="2020-01-01"
            max={(() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            })()}
            onChange={e => setPurchaseDate(e.target.value)}
            disabled={isPurchaseDateLocked}
          />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            Selected Date: {purchaseDate ? formatDateTime(purchaseDate) : ''}
          </div>
          {isPurchaseDateLocked && (
            <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, marginTop: 4 }}>
              🔒 Purchase Date locked after Save & Next Bag.
            </div>
          )}
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={buyerLabelStyle}>{requiredLabel('Location', false)}</label>
          <SearchableSelect
            options={locationOptions}
            value={purchaseLocation}
            onChange={setPurchaseLocation}
            inputStyle={S.input}
            placeholder=""
          />
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('apfNumber'))}>{requiredLabel('APF Number')}</label>
          <SearchableSelect
            options={apfNumberOptions}
            value={apfNumber}
            onChange={setApfNumber}
            inputStyle={inputWithMissing(isApfNumberLocked ? lockedFieldStyle : S.input, isMissingField('apfNumber'))}
            placeholder=""
            disabled={isApfNumberLocked}
          />
          {isApfNumberLocked && (
            <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, marginTop: 4 }}>
              🔒 APF Number locked after Save & Next Bag.
            </div>
          )}
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('tobaccoGrade'))}>{requiredLabel('Tobacco Board Grade')}</label>
          <SearchableSelect
            options={tobaccoBoardGradeOptions}
            value={tobaccoGrade}
            onChange={setTobaccoGrade}
            inputStyle={inputWithMissing(S.input, isMissingField('tobaccoGrade'))}
            placeholder=""
          />
        </div>
      )}

      <div style={S.row}>
        <label style={labelWithMissing(isMissingField('buyerGrade'))}>{requiredLabel('Buyer Grade')}</label>
        <SearchableSelect
          options={buyerGradeOptions}
          value={buyerGrade}
          onChange={setBuyerGrade}
          inputStyle={inputWithMissing(S.input, isMissingField('buyerGrade'))}
          placeholder=""
        />
      </div>

      <div style={S.row}>
        <label style={labelWithMissing(isMissingField('lotNumber'))}>{requiredLabel('Lot Number', isFCV)}</label>
        <input
          style={inputWithMissing(S.input, isMissingField('lotNumber'))}
          type="text"
          placeholder=""
          value={lotNumber}
          onChange={e => setLotNumber(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('weight'))}>{requiredLabel('Weight (kg)')}</label>
          <input style={inputWithMissing(S.input, isMissingField('weight'))} type="number" placeholder="" value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={labelWithMissing(isMissingField('rate'))}>{requiredLabel('Rate')}</label>
          <input style={inputWithMissing(S.input, isMissingField('rate'))} type="number" step="0.01" placeholder="" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={buyerLabelStyle}>Bale Value (Weight x Rate)</label>
          <input style={S.input} type="text" value={baleValue === '' ? '' : String(baleValue)} readOnly />
        </div>
      </div>

      <div style={S.btnRow}>
        <button
          style={{ ...S.btnSecondary, color: '#1b3555', opacity: (loading || codeStatus === 'duplicate') ? 0.5 : 1 }}
          onClick={() => doSave(true)}
          disabled={loading || codeStatus === 'duplicate'}
        >
          Save & Exit
        </button>
        <button
          style={{ ...S.btnPrimary, color: '#fff', opacity: (loading || codeStatus === 'duplicate') ? 0.5 : 1 }}
          onClick={() => doSave(false)}
          disabled={loading || codeStatus === 'duplicate'}
        >
          {loading ? 'Saving…' : 'Save & Next Bag →'}
        </button>
      </div>
    </div>
  );
}

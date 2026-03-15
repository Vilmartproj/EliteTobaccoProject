// src/components/BuyingForm.jsx
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { S } from '../styles';
import { fromInputDateTime, nowInputDateTime } from '../utils/dateFormat';
import SearchableSelect from './SearchableSelect';

const calendarValueToDisplayDate = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, yyyy, mm, dd] = match;
  return `${dd}/${mm}/${yyyy}`;
};

const dateTimeInputToDisplayDate = (value) => {
  const datePart = String(value || '').split('T')[0] || '';
  return calendarValueToDisplayDate(datePart);
};

export default function BuyingForm({ buyer, grades = { tobaccoBoard: [], buyer: [] }, apfNumbers = [], tobaccoTypes = [], purchaseLocations = [], assignedQRCodes = [], onSaveExit }) {
  const buyerTitleColor = 'rgb(14,14,156)';
  const buyerButtonTextColor = 'rgb(30,30,203)';
  const fcvToggleColor = 'rgb(30,30,203)';
  const buyerLabelStyle = { ...S.label, fontWeight: 800 };
  const [fcv, setFcv]                   = useState('');
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
  const [purchaseDate, setPurchaseDate] = useState('');
  const [nonFcvPurchaseDate, setNonFcvPurchaseDate] = useState('');
  const [dateOfPurchase, setDate]       = useState(nowInputDateTime());
  const [error, setError]               = useState('');
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(false);
  const [fcvFieldsLocked, setFcvFieldsLocked] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const debounceRef = useRef(null);
  const videoRef = useRef(null);
  const uniqueCodeInputRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerTimerRef = useRef(null);
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
  const assignedAvailableCodes = [...assignedQRCodes]
    .filter((q) => !q.used)
    .map((q) => String(q.unique_code));
  const qrListId = `assigned-qr-codes-${buyer?.id || 'buyer'}`;
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  const scannerSupported = typeof window !== 'undefined'
    && 'mediaDevices' in navigator
    && typeof navigator.mediaDevices.getUserMedia === 'function'
    && 'BarcodeDetector' in window;

  const requiredLabel = (text, isRequired = true) => (
    <>
      {text}
      {isRequired ? <span style={{ color: '#d62839' }}> *</span> : ''}
    </>
  );

  const stopScanner = () => {
    if (scannerTimerRef.current) {
      clearInterval(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => () => stopScanner(), []);

  const reset = ({ preserveFcvContext = false, preserveFcvLock = false } = {}) => {
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
    setCodeStatus(null);
    setCodeMsg('');
    setDate(nowInputDateTime());
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
    background: '#eef9ff',
    borderColor: '#0284c7',
    borderWidth: 2,
    color: '#0c4a6e',
    fontWeight: 700,
    opacity: 1,
    cursor: 'not-allowed',
    boxShadow: '0 0 0 3px rgba(2,132,199,0.14)',
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

  const startScanner = async () => {
    setScannerError('');
    if (!scannerSupported) {
      setScannerError('Scanner not supported on this device/browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      scannerStreamRef.current = stream;
      setScannerActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scannerTimerRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const scannedValue = String(codes[0].rawValue || '').trim();
            if (scannedValue) {
              handleCodeChange(scannedValue);
              stopScanner();
            }
          }
        } catch {
          // keep scanner alive on transient detect errors
        }
      }, 400);
    } catch {
      stopScanner();
      setScannerError('Unable to access camera. Please allow camera permission.');
    }
  };

  const handleFcvSelect = (nextValue) => {
    const value = fcv === nextValue ? '' : nextValue;
    setFcv(value);
    setFcvFieldsLocked(false);

    if (value === 'FCV') {
      setTypeOfTobacco('');
      setPurchaseLocation('');
      setNonFcvPurchaseDate('');
    }
    if (value === 'NON-FCV') {
      setApfNumber('');
      setTobaccoGrade('');
      setPurchaseDate('');
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
    if (isFCV && !lotNumber.trim())    return 'Lot Number is required for FCV';
    if (!weight)                       return 'Weight is required';
    if (!rate)                         return 'Rate is required';
    if (!buyerGrade)                   return 'Buyer Grade is required';
    return null;
  };

  const doSave = async (exit) => {
    setError('');
    if (uniqueCode.trim() && codeStatus === null) {
      await checkCode(uniqueCode.trim());
      return;
    }
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await api.saveBag({
        unique_code: uniqueCode.trim(), buyer_id: buyer.id,
        buyer_code: buyer.code, buyer_name: buyer.name,
        fcv,
        apf_number: isFCV ? apfNumber : '',
        tobacco_grade: isFCV ? tobaccoGrade : '',
        type_of_tobacco: isNonFCV ? typeOfTobacco : '',
        purchase_location: purchaseLocation || '',
        weight: parseFloat(weight), rate: parseFloat(rate), bale_value: baleValue, buyer_grade: buyerGrade,
        lot_number: isFCV ? lotNumber.trim() : '',
        purchase_date: isFCV ? calendarValueToDisplayDate(purchaseDate) : calendarValueToDisplayDate(nonFcvPurchaseDate),
        date_of_purchase: fromInputDateTime(dateOfPurchase),
      });
      setSaved(true);
      if (exit) {
        setFcvFieldsLocked(false);
        setTimeout(onSaveExit, 600);
      }
      else {
        setFcvFieldsLocked(fcv === 'FCV' && !!purchaseDate && !!apfNumber);
        setTimeout(() => reset({ preserveFcvContext: true, preserveFcvLock: true }), 800);
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
    <div style={{ ...S.card, background: 'rgb(255,208,214)' }}>
      <div style={{ ...S.heading, color: buyerTitleColor }}>Buying</div>

      {saved && <div style={S.success}>✅ Bag saved successfully!</div>}
      {error && <div style={S.error}>⚠️ {error}</div>}

      {/* FCV Toggle */}
      <label style={buyerLabelStyle}>{requiredLabel('FCV / NON-FCV')}</label>
      <div style={S.toggleGroup}>
        <button
          style={{ ...S.toggleBtn(fcv === 'FCV', fcv === 'NON-FCV'), color: fcvToggleColor, borderRight: '2px solid #e63946' }}
          onClick={() => handleFcvSelect('FCV')}
        >
          FCV
        </button>
        <button
          style={{ ...S.toggleBtn(fcv === 'NON-FCV', fcv === 'FCV'), color: fcvToggleColor }}
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

      {/* Unique Code */}
      <div style={S.row}>
        <label style={buyerLabelStyle}>{requiredLabel('Unique Code')}</label>
        <div style={{ position: 'relative' }}>
          {isMobileDevice ? (
            <select
              ref={uniqueCodeInputRef}
              style={{ ...S.input, borderColor, paddingRight: 38, appearance: 'none' }}
              value={uniqueCode}
              onChange={e => handleCodeChange(e.target.value)}
              onBlur={handleCodeBlur}
              autoFocus
            >
              <option value="">Select Unique Code</option>
              {assignedAvailableCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          ) : (
            <>
              <input
                ref={uniqueCodeInputRef}
                style={{ ...S.input, borderColor, paddingRight: 38 }}
                placeholder="📷 Scan QR or enter code manually"
                value={uniqueCode}
                list={qrListId}
                onChange={e => handleCodeChange(e.target.value)}
                onBlur={handleCodeBlur}
                autoFocus
              />
              <datalist id={qrListId}>
                {assignedAvailableCodes.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </>
          )}
          {(codeStatus === 'error' || codeStatus === 'duplicate') ? (
            <button
              type="button"
              aria-label="Clear unique code"
              title="Clear code"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearUniqueCode}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid #ffc2cc',
                background: '#fff0f2',
                color: '#c0392b',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 800,
                lineHeight: '22px',
                padding: 0,
              }}
            >
              ×
            </button>
          ) : codeStatus ? (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
              {codeStatus === 'ok' ? '✅' : '⏳'}
            </span>
          ) : null}
        </div>
        {codeStatus && codeMsg && (
          <div style={{
            fontSize: 12, marginTop: 5, fontWeight: codeStatus !== 'ok' ? 'bold' : 'normal',
            color: codeStatus === 'ok' ? '#2e7d32' : codeStatus === 'duplicate' ? '#e67e22' : '#c0392b',
          }}>
            {codeMsg}
          </div>
        )}
        {!codeStatus && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            Scan QR or type — date &amp; time will be auto-stamped on entry
          </div>
        )}
        {isMobileDevice && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!scannerActive ? (
              <button
                type="button"
                style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '8px 12px', fontSize: 12 }}
                onClick={startScanner}
              >
                Open Scanner
              </button>
            ) : (
              <button
                type="button"
                style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '8px 12px', fontSize: 12 }}
                onClick={stopScanner}
              >
                Stop Scanner
              </button>
            )}
            {scannerError && <span style={{ fontSize: 12, color: '#c0392b' }}>{scannerError}</span>}
          </div>
        )}
        {scannerActive && (
          <div style={{ marginTop: 10, border: '1px solid #ffd0d6', borderRadius: 10, overflow: 'hidden' }}>
            <video ref={videoRef} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', background: '#000' }} playsInline muted />
          </div>
        )}
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
          <label style={buyerLabelStyle}>{requiredLabel('Type of Tobacco / Variety')}</label>
          <SearchableSelect
            options={tobaccoTypeOptions}
            value={typeOfTobacco}
            onChange={setTypeOfTobacco}
            inputStyle={S.input}
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
          <label style={buyerLabelStyle}>{requiredLabel('Date of Purchase (dd/mm/yyyy)')}</label>
          <input
            style={S.input}
            type="date"
            lang="en-GB"
            value={nonFcvPurchaseDate}
            onChange={e => setNonFcvPurchaseDate(e.target.value)}
          />
          {nonFcvPurchaseDate && (
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Selected Date: {calendarValueToDisplayDate(nonFcvPurchaseDate)}
            </div>
          )}
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={buyerLabelStyle}>{requiredLabel('Date of Purchase (dd/mm/yyyy)')}</label>
          <input
            style={isPurchaseDateLocked ? lockedFieldStyle : S.input}
            type="date"
            lang="en-GB"
            value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
            disabled={isPurchaseDateLocked}
          />
          {purchaseDate && (
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Selected Date: {calendarValueToDisplayDate(purchaseDate)}
            </div>
          )}
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
          <label style={buyerLabelStyle}>{requiredLabel('APF Number')}</label>
          <SearchableSelect
            options={apfNumberOptions}
            value={apfNumber}
            onChange={setApfNumber}
            inputStyle={isApfNumberLocked ? lockedFieldStyle : S.input}
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
          <label style={buyerLabelStyle}>{requiredLabel('Tobacco Board Grade')}</label>
          <SearchableSelect
            options={tobaccoBoardGradeOptions}
            value={tobaccoGrade}
            onChange={setTobaccoGrade}
            inputStyle={S.input}
            placeholder=""
          />
        </div>
      )}

      <div style={S.row}>
        <label style={buyerLabelStyle}>{requiredLabel('Buyer Grade')}</label>
        <SearchableSelect
          options={buyerGradeOptions}
          value={buyerGrade}
          onChange={setBuyerGrade}
          inputStyle={S.input}
          placeholder=""
        />
      </div>

      <div style={S.row}>
        <label style={buyerLabelStyle}>{requiredLabel('Lot Number', isFCV)}</label>
        <input
          style={S.input}
          type="text"
          placeholder=""
          value={lotNumber}
          onChange={e => setLotNumber(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <div style={S.row}>
          <label style={buyerLabelStyle}>{requiredLabel('Weight (kg)')}</label>
          <input style={S.input} type="number" placeholder="" value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={buyerLabelStyle}>{requiredLabel('Rate')}</label>
          <input style={S.input} type="number" step="0.01" placeholder="" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={buyerLabelStyle}>Bale Value (Weight x Rate)</label>
          <input style={S.input} type="text" value={baleValue === '' ? '' : String(baleValue)} readOnly />
        </div>
      </div>

      <div style={S.btnRow}>
        <button
          style={{ ...S.btnSecondary, color: buyerButtonTextColor, opacity: (loading || codeStatus === 'duplicate') ? 0.5 : 1 }}
          onClick={() => doSave(true)}
          disabled={loading || codeStatus === 'duplicate'}
        >
          Save & Exit
        </button>
        <button
          style={{ ...S.btnPrimary, color: buyerButtonTextColor, opacity: (loading || codeStatus === 'duplicate') ? 0.5 : 1 }}
          onClick={() => doSave(false)}
          disabled={loading || codeStatus === 'duplicate'}
        >
          {loading ? 'Saving…' : 'Save & Next Bag →'}
        </button>
      </div>
    </div>
  );
}

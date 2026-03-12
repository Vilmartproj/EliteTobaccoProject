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

export default function BuyingForm({ buyer, grades = { tobaccoBoard: [], buyer: [] }, apfNumbers = [], tobaccoTypes = [], assignedQRCodes = [], onSaveExit }) {
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
  const [dateOfPurchase, setDate]       = useState(nowInputDateTime());
  const [error, setError]               = useState('');
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const debounceRef = useRef(null);
  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerTimerRef = useRef(null);
  const isFCV = fcv === 'FCV';
  const isNonFCV = fcv === 'NON-FCV';
  const tobaccoBoardGrades = [...grades.tobaccoBoard].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const buyerGrades = [...grades.buyer].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const tobaccoBoardGradeCodes = tobaccoBoardGrades.map(g => g.code);
  const buyerGradeCodes = buyerGrades.map(g => g.code);
  const tobaccoBoardGradeOptions = tobaccoBoardGradeCodes.map(g => ({ value: g, label: g }));
  const buyerGradeOptions = buyerGradeCodes.map(g => ({ value: g, label: g }));
  const tobaccoTypeOptions = (Array.isArray(tobaccoTypes) && tobaccoTypes.length > 0
    ? [...tobaccoTypes].sort((a, b) => String(a.type).localeCompare(String(b.type), undefined, { numeric: true })).map((item) => ({
        value: String(item.type),
        label: item.description ? `${item.type} - ${item.description}` : String(item.type),
        keywords: `${item.type} ${item.description || ''}`,
      }))
    : [
      'FCV Virginia',
      'Burley',
      'Natu',
      'White Burley',
      'Rustica',
      'Other',
    ].map((item) => ({ value: item, label: item }))
  );
  const locationOptions = [
    'Godown A',
    'Godown B',
    'Godown C',
    'Warehouse 1',
    'Warehouse 2',
    'Warehouse 3',
  ].map((item) => ({ value: item, label: item }));
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

  const reset = ({ preserveFcvContext = false } = {}) => {
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
  const isPurchaseDateLocked = isFCV && !!purchaseDate;
  const isApfNumberLocked = isFCV && !!apfNumber;
  const lockedFieldStyle = {
    ...S.input,
    background: '#fff7d6',
    borderColor: '#eab308',
    color: '#7a5100',
    fontWeight: 700,
  };

  const checkCode = async (code) => {
    setCodeStatus('checking');
    setDate(nowInputDateTime()); // stamp date+time on scan
    try {
      const v = await api.validateCode(code);
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
      setCodeStatus('error');
      setCodeMsg('Could not validate code — check connection');
    }
  };

  const handleCodeChange = (val) => {
    setUniqueCode(val);
    setCodeStatus(null); setCodeMsg('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) debounceRef.current = setTimeout(() => checkCode(val.trim()), 600);
  };

  const handleCodeBlur = () => {
    if (uniqueCode.trim() && codeStatus === null) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      checkCode(uniqueCode.trim());
    }
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

    if (value === 'FCV') {
      setTypeOfTobacco('');
      setPurchaseLocation('');
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
    }
  };

  const validate = () => {
    if (!fcv)                          return 'Please select FCV or NON-FCV';
    if (!uniqueCode)                   return 'Unique Code is required';
    if (codeStatus === 'duplicate')    return codeMsg;
    if (codeStatus === 'error')        return codeMsg;
    if (codeStatus === 'checking')     return 'Please wait — validating code…';
    if (isNonFCV && !typeOfTobacco)    return 'Type of Tobacco/Variety is required for NON-FCV';
    if (isNonFCV && !purchaseLocation) return 'Location is required for NON-FCV';
    if (isFCV && !purchaseDate)        return 'Purchase Date is required for FCV';
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
        purchase_location: isNonFCV ? purchaseLocation : '',
        weight: parseFloat(weight), rate: parseFloat(rate), bale_value: baleValue, buyer_grade: buyerGrade,
        lot_number: isFCV ? lotNumber.trim() : '',
        purchase_date: isFCV ? calendarValueToDisplayDate(purchaseDate) : dateTimeInputToDisplayDate(dateOfPurchase),
        date_of_purchase: fromInputDateTime(dateOfPurchase),
      });
      setSaved(true);
      if (exit) setTimeout(onSaveExit, 600);
      else setTimeout(() => reset({ preserveFcvContext: true }), 800);
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
      <div style={S.heading}>Buying</div>

      {saved && <div style={S.success}>✅ Bag saved successfully!</div>}
      {error && <div style={S.error}>⚠️ {error}</div>}

      {/* FCV Toggle */}
      <label style={S.label}>FCV / NON-FCV</label>
      <div style={S.toggleGroup}>
        <button
          style={{ ...S.toggleBtn(fcv === 'FCV', fcv === 'NON-FCV'), borderRight: '2px solid #e63946' }}
          onClick={() => handleFcvSelect('FCV')}
        >
          FCV
        </button>
        <button
          style={S.toggleBtn(fcv === 'NON-FCV', fcv === 'FCV')}
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
        <label style={S.label}>Unique Code</label>
        <div style={{ position: 'relative' }}>
          <input
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
          {codeStatus && (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
              {codeStatus === 'ok' ? '✅' : codeStatus === 'duplicate' ? '⚠️' : codeStatus === 'error' ? '❌' : '⏳'}
            </span>
          )}
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
                style={{ ...S.btnSecondary, flex: 'none', padding: '8px 12px', fontSize: 12 }}
                onClick={startScanner}
              >
                Open Scanner
              </button>
            ) : (
              <button
                type="button"
                style={{ ...S.btnSecondary, flex: 'none', padding: '8px 12px', fontSize: 12 }}
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
          <label style={S.label}>Type of Tobacco / Variety</label>
          <SearchableSelect
            options={tobaccoTypeOptions}
            value={typeOfTobacco}
            onChange={setTypeOfTobacco}
            inputStyle={S.input}
            placeholder="Search Tobacco Type/Variety"
          />
        </div>
      )}

      {isNonFCV && (
        <div style={S.row}>
          <label style={S.label}>Location</label>
          <SearchableSelect
            options={locationOptions}
            value={purchaseLocation}
            onChange={setPurchaseLocation}
            inputStyle={S.input}
            placeholder="Search Location"
          />
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={S.label}>Date of Purchase (dd/mm/yyyy)</label>
          <input
            style={isPurchaseDateLocked ? lockedFieldStyle : S.input}
            type="date"
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
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Purchase Date locked until save.
            </div>
          )}
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={S.label}>APF Number</label>
          <SearchableSelect
            options={apfNumberOptions}
            value={apfNumber}
            onChange={setApfNumber}
            inputStyle={isApfNumberLocked ? lockedFieldStyle : S.input}
            placeholder="Search APF Number"
            disabled={isApfNumberLocked}
          />
          {isApfNumberLocked && (
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              APF Number locked until save.
            </div>
          )}
        </div>
      )}

      {isFCV && (
        <div style={S.row}>
          <label style={S.label}>Tobacco Board Grade</label>
          <SearchableSelect
            options={tobaccoBoardGradeOptions}
            value={tobaccoGrade}
            onChange={setTobaccoGrade}
            inputStyle={S.input}
            placeholder="Search Tobacco Board Grade"
          />
        </div>
      )}

      <div style={S.row}>
        <label style={S.label}>Buyer Grade</label>
        <SearchableSelect
          options={buyerGradeOptions}
          value={buyerGrade}
          onChange={setBuyerGrade}
          inputStyle={S.input}
          placeholder="Search Buyer Grade"
        />
      </div>

      <div style={S.row}>
        <label style={S.label}>Lot Number</label>
        <input
          style={S.input}
          type="text"
          placeholder="Enter lot number (optional for NON-FCV)"
          value={lotNumber}
          onChange={e => setLotNumber(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <div style={S.row}>
          <label style={S.label}>Weight (kg)</label>
          <input style={S.input} type="number" placeholder="e.g. 22" value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Rate</label>
          <input style={S.input} type="number" step="0.01" placeholder="e.g. 120.5" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Bale Value (Weight x Rate)</label>
          <input style={S.input} type="text" value={baleValue === '' ? '' : String(baleValue)} readOnly />
        </div>
      </div>

      <div style={S.row}>
        <label style={S.label}>Date &amp; Time of Purchase</label>
        <input style={S.input} type="datetime-local" value={dateOfPurchase} onChange={e => setDate(e.target.value)} />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          ⏱ Auto-stamped when QR code is scanned · IST: {fromInputDateTime(dateOfPurchase)}
        </div>
      </div>

      <div style={S.btnRow}>
        <button
          style={{ ...S.btnSecondary, opacity: (loading || codeStatus === 'duplicate') ? 0.5 : 1 }}
          onClick={() => doSave(true)}
          disabled={loading || codeStatus === 'duplicate'}
        >
          Save & Exit
        </button>
        <button
          style={{ ...S.btnPrimary, opacity: (loading || codeStatus === 'duplicate') ? 0.5 : 1 }}
          onClick={() => doSave(false)}
          disabled={loading || codeStatus === 'duplicate'}
        >
          {loading ? 'Saving…' : 'Save & Next Bag →'}
        </button>
      </div>
    </div>
  );
}

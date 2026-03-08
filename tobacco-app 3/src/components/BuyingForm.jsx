// src/components/BuyingForm.jsx
import { useState, useRef } from 'react';
import { api } from '../api';
import { S } from '../styles';

const TOBACCO_GRADES = [
  'H1','H2','H3','H4',
  'C1','C2','C3','C4',
  'B1','B2','B3','B4',
  'X1','X2','X3','X4',
  'L1','L2','L3','L4',
  'G1','G2','G3','G4',
  'F1','F2','F3','F4',
];

function nowDatetime() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BuyingForm({ buyer, onSaveExit }) {
  const [fcv, setFcv]                   = useState('');
  const [uniqueCode, setUniqueCode]     = useState('');
  const [codeStatus, setCodeStatus]     = useState(null); // null|checking|ok|duplicate|error
  const [codeMsg, setCodeMsg]           = useState('');
  const [apfNumber, setApfNumber]       = useState('');
  const [tobaccoGrade, setTobaccoGrade] = useState('');
  const [weight, setWeight]             = useState('');
  const [buyerGrade, setBuyerGrade]     = useState('');
  const [dateOfPurchase, setDate]       = useState(nowDatetime());
  const [purchaseLocation, setLocation] = useState('Guntur');
  const [error, setError]               = useState('');
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(false);
  const debounceRef = useRef(null);

  const reset = () => {
    setFcv(''); setUniqueCode(''); setApfNumber(''); setTobaccoGrade('');
    setWeight(''); setBuyerGrade(''); setError(''); setSaved(false);
    setCodeStatus(null); setCodeMsg('');
    // keep date & location for next bag
  };

  const checkCode = async (code) => {
    setCodeStatus('checking');
    setDate(nowDatetime()); // stamp date+time on scan
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

  const validate = () => {
    if (!fcv)                          return 'Please select FCV or NON-FCV';
    if (!uniqueCode)                   return 'Unique Code is required';
    if (codeStatus === 'duplicate')    return codeMsg;
    if (codeStatus === 'error')        return codeMsg;
    if (codeStatus === 'checking')     return 'Please wait — validating code…';
    if (!apfNumber)                    return 'APF Number is required';
    if (!tobaccoGrade)                 return 'Tobacco Board Grade is required';
    if (!weight)                       return 'Weight is required';
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
        fcv, apf_number: apfNumber, tobacco_grade: tobaccoGrade,
        weight: parseFloat(weight), buyer_grade: buyerGrade,
        date_of_purchase: dateOfPurchase.replace('T', ' '),
        purchase_location: purchaseLocation,
      });
      setSaved(true);
      if (exit) setTimeout(onSaveExit, 600);
      else setTimeout(reset, 800);
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
        <button style={S.toggleBtn(fcv === 'FCV', fcv === 'NON-FCV')} onClick={() => setFcv(fcv === 'FCV' ? '' : 'FCV')}>FCV</button>
        <button style={S.toggleBtn(fcv === 'NON-FCV', fcv === 'FCV')} onClick={() => setFcv(fcv === 'NON-FCV' ? '' : 'NON-FCV')}>NON-FCV</button>
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
            onChange={e => handleCodeChange(e.target.value)}
            onBlur={handleCodeBlur}
            autoFocus
          />
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
      </div>

      {/* Duplicate warning banner */}
      {codeStatus === 'duplicate' && (
        <div style={{ background: '#fff8e1', border: '2px solid #f9a825', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', color: '#e65100', marginBottom: 4, fontSize: 14 }}>⚠️ Duplicate QR Code</div>
          <div style={{ color: '#555', fontSize: 13 }}>{codeMsg}</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>Please scan a different QR code or contact admin.</div>
        </div>
      )}

      <div style={S.row}>
        <label style={S.label}>APF Number</label>
        <input style={S.input} placeholder="e.g. 121" value={apfNumber} onChange={e => setApfNumber(e.target.value)} />
      </div>

      {/* Tobacco Board Grade — dropdown */}
      <div style={S.row}>
        <label style={S.label}>Tobacco Board Grade</label>
        <select style={S.input} value={tobaccoGrade} onChange={e => setTobaccoGrade(e.target.value)}>
          <option value="">— Select Grade —</option>
          {TOBACCO_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.row}>
          <label style={S.label}>Weight (kg)</label>
          <input style={S.input} type="number" placeholder="e.g. 22" value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Buyer Grade</label>
          <input style={S.input} placeholder="e.g. 23" value={buyerGrade} onChange={e => setBuyerGrade(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.row}>
          <label style={S.label}>Date &amp; Time of Purchase</label>
          <input style={S.input} type="datetime-local" value={dateOfPurchase} onChange={e => setDate(e.target.value)} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>⏱ Auto-stamped when QR code is scanned</div>
        </div>
        <div style={S.row}>
          <label style={S.label}>Purchase Location</label>
          <input style={S.input} placeholder="e.g. Guntur" value={purchaseLocation} onChange={e => setLocation(e.target.value)} />
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

// src/components/BuyerDashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import BuyingForm from './BuyingForm';
import QRCode from './QRCode';
import { printQRCodes } from '../utils/printQR';
import { exportCSV } from '../utils/exportCSV';

export default function BuyerDashboard({ user, onLogout }) {
  const [view, setView]     = useState('form');
  const [bags, setBags]     = useState([]);
  const [qrCodes, setQR]    = useState([]);
  const [loading, setLoad]  = useState(false);

  const loadBags = async () => {
    setLoad(true);
    try { setBags(await api.getBags(user.id)); } finally { setLoad(false); }
  };
  const loadQR = async () => {
    const all = await api.getQRCodes();
    setQR(all.filter(q => q.buyer_id === user.id));
  };

  useEffect(() => { loadBags(); loadQR(); }, []);

  const switchView = (v) => {
    setView(v);
    if (v === 'bags') loadBags();
    if (v === 'qr')   loadQR();
  };

  return (
    <div style={S.app}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topBarTitle}>🌿 Elite Tobacco</div>
        <div style={S.buyerInfo}>
          <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
          <span style={S.bagsBadge}>🛍️ {bags.length} Bags</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={S.page}>
        <div style={S.tabs}>
          <button style={S.tab(view === 'form')} onClick={() => switchView('form')}>📝 New Bag Entry</button>
          <button style={S.tab(view === 'bags')} onClick={() => switchView('bags')}>📦 My Bags ({bags.length})</button>
          <button style={S.tab(view === 'qr')}   onClick={() => switchView('qr')}>🔲 My QR Codes ({qrCodes.length})</button>
        </div>

        {view === 'form' && (
          <BuyingForm buyer={user} onSaveExit={() => switchView('bags')} />
        )}

        {view === 'bags' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>All Bags ({bags.length})</div>
              {bags.length > 0 && (
                <button style={{ ...S.btnPrimary, flex: 'none', padding: '8px 18px', fontSize: 13 }}
                  onClick={() => exportCSV(bags, `${user.name}_bags_${new Date().toISOString().split('T')[0]}.csv`)}>
                  ⬇ Export CSV
                </button>
              )}
            </div>
            {loading ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Loading…</p>
            : bags.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No bags saved yet.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Code','APF','TB Grade','Weight','B.Grade','Date','Location','FCV'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {bags.map((b, i) => (
                      <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                        <td style={S.td}><b>{b.unique_code}</b></td>
                        <td style={S.td}>{b.apf_number}</td>
                        <td style={S.td}>{b.tobacco_grade}</td>
                        <td style={S.td}>{b.weight} kg</td>
                        <td style={S.td}>{b.buyer_grade}</td>
                        <td style={S.td}>{b.date_of_purchase}</td>
                        <td style={S.td}>{b.purchase_location}</td>
                        <td style={S.td}><span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span></td>
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
      </div>
    </div>
  );
}

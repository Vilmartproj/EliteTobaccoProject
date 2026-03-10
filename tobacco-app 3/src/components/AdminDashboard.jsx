// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import QRCode from './QRCode';
import DatabaseViewer from './DatabaseViewer';
import { printQRCodes } from '../utils/printQR';
import { exportCSV } from '../utils/exportCSV';
import { exportBagsPDF, exportBagsXLS, shareBagsWhatsApp } from '../utils/exportBags';
import { formatDateTime } from '../utils/dateFormat';

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab]         = useState('overview');
  const [stats, setStats]     = useState({});
  const [buyers, setBuyers]   = useState([]);
  const [qrCodes, setQR]      = useState([]);
  const [bags, setBags]       = useState([]);

  // Generate QR state
  const [genStart, setGenStart]   = useState('200');
  const [genCount, setGenCount]   = useState(5);
  const [genBuyerId, setGenBuyer] = useState('');
  const [genMsg, setGenMsg]       = useState('');

  // Add buyer state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [buyerMsg, setBuyerMsg] = useState('');

  const refresh = async () => {
    const [s, b, q, bg] = await Promise.all([api.getStats(), api.getBuyers(), api.getQRCodes(), api.getBags()]);
    setStats(s); setBuyers(b); setQR(q); setBags(bg);
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

  const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));

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
          <span style={S.bagsBadge}>📦 {stats.bags || 0} Bags</span>
          <button style={S.btnIcon} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={S.page}>
        <div style={S.tabs}>
          {[['overview','📊 Overview'],['buyers','👥 Buyers'],['qrcodes','🔲 QR Codes'],['generate','⚡ Generate QR'],['bags','📦 All Bags'],['database','🗄️ Database']].map(([id, label]) => (
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
                <thead><tr>{['Code','Name','Password','QR Assigned'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {buyers.map(b => (
                    <tr key={b.id}>
                      <td style={S.td}><b>{b.code}</b></td>
                      <td style={S.td}>{b.name}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace', color: '#c0392b' }}>{b.password}</td>
                      <td style={S.td}>{qrCodes.filter(q => q.buyer_id === b.id).length}</td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>All QR Codes ({qrCodes.length})</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={S.badge('green')}>Available: {qrCodes.filter(q => !q.used).length}</span>
                <span style={S.badge('red')}>Used: {qrCodes.filter(q => q.used).length}</span>
                {qrCodes.length > 0 && (
                  <button style={{ ...S.btnPrimary, flex: 'none', padding: '6px 14px', fontSize: 12 }}
                    onClick={() => printQRCodes(qrCodes, buyerMap)}>
                    🖨️ Print All
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead><tr>{['Code','QR','Assigned To','Buyer Name','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {qrCodes.map(q => (
                    <tr key={q.id}>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 'bold' }}>{q.unique_code}</td>
                      <td style={S.td}><QRCode value={q.unique_code} size={52} /></td>
                      <td style={S.td}>{q.buyer_code ? <span style={S.badge('green')}>{q.buyer_code}</span> : <span style={S.badge()}>Unassigned</span>}</td>
                      <td style={S.td}>{q.buyer_name || '—'}</td>
                      <td style={S.td}><span style={S.badge(q.used ? 'red' : 'green')}>{q.used ? 'Used' : 'Available'}</span></td>
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
                    {buyers.map(b => <option key={b.id} value={b.id}>{b.code} – {b.name}</option>)}
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
                  {(genBuyerId ? qrCodes.filter(q => q.buyer_id === parseInt(genBuyerId)) : qrCodes).slice(0, 24).map(q => (
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

        {/* ── ALL BAGS ── */}
        {tab === 'bags' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.subheading}>All Bags ({bags.length})</div>
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
                    onClick={() => exportBagsPDF(bags, `All Bags Report - ${new Date().toISOString().split('T')[0]}`)}
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
            {bags.length === 0
              ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No bags yet.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead><tr>{['Buyer','Name','Code','APF','Grade','Weight','Date','Location','FCV'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {bags.map((b, i) => (
                        <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                          <td style={S.td}><b>{b.buyer_code}</b></td>
                          <td style={S.td}>{b.buyer_name}</td>
                          <td style={S.td}>{b.unique_code}</td>
                          <td style={S.td}>{b.apf_number}</td>
                          <td style={S.td}>{b.tobacco_grade}</td>
                          <td style={S.td}>{b.weight} kg</td>
                          <td style={S.td}>{formatDateTime(b.date_of_purchase)}</td>
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

        {/* ── DATABASE VIEWER ── */}
        {tab === 'database' && <DatabaseViewer />}
      </div>
    </div>
  );
}

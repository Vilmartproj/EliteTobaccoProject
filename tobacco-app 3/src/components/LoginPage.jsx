// src/components/LoginPage.jsx
import { useState } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function LoginPage({ onLogin }) {
  const [mode, setMode]       = useState('buyer');
  const [code, setCode]       = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      const data = await api.login({ code: code.trim(), password: password.trim(), role: mode });
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#fff5f5 0%,#ffe8e8 100%)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', boxShadow: '0 8px 40px rgba(192,57,43,0.12)', width: 480, maxWidth: '95vw', border: '1px solid #f5d5d0' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 28, display: 'block' }}>🌿</span>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: '#c0392b', letterSpacing: 1, display: 'block', marginTop: 6 }}>Elite Tobacco</span>
          <span style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, display: 'block' }}>Buying Management System</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 20 }}>
          <button style={{ ...S.toggleBtn(mode === 'buyer', false), minWidth: '100px' }} onClick={() => setMode('buyer')}>🧑‍🌾 Buyer</button>
          <button style={{ ...S.toggleBtn(mode === 'admin', false), minWidth: '100px' }} onClick={() => setMode('admin')}>🔐 Admin</button>
          <button style={{ ...S.toggleBtn(mode === 'dispatch', false), minWidth: '100px' }} onClick={() => setMode('dispatch')}>🚚 Dispatch</button>
          <button style={{ ...S.toggleBtn(mode === 'warehouse_admin', false), minWidth: '100px' }} onClick={() => setMode('warehouse_admin')}>🏭 Wh. Admin</button>
          <button style={{ ...S.toggleBtn(mode === 'warehouse_user', false), minWidth: '100px', gridColumn: 'span 2' }} onClick={() => setMode('warehouse_user')}>👷 Wh. User</button>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <div style={S.row}>
          <label style={S.label}>
            {mode === 'admin' ? 'Username' : 
             mode === 'dispatch' ? 'Dispatch Code' :
             mode.includes('warehouse') ? 'Warehouse Code' : 'Buyer Code'}
          </label>
          <input style={S.input} placeholder={
            mode === 'admin' ? 'admin' : 
            mode === 'dispatch' ? 'e.g. D001' :
            mode.includes('warehouse') ? 'e.g. W001' : 'e.g. B001'
          } value={code}
            onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder={mode === 'buyer' ? 'Same as buyer code' : ''} value={password}
            onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <button style={{ ...S.btnPrimary, width: '100%', marginTop: 8, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in…' : 'Login →'}
        </button>


      </div>
    </div>
  );
}

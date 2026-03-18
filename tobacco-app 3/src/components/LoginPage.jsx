// src/components/LoginPage.jsx
import { useState } from 'react';
import { api } from '../api';
import { S } from '../styles';
import BrandLogo from './BrandLogo';

export default function LoginPage({ onLogin }) {
  const [code, setCode]       = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      const normalizedCode = code.trim();
      const payload = {
        code: normalizedCode,
        password: password.trim(),
      };

      if (normalizedCode.toLowerCase() === 'admin') {
        payload.role = 'admin';
      }

      const data = await api.login(payload);
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#fff5f5 0%,#ffe8e8 100%)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', boxShadow: '0 8px 40px rgba(192,57,43,0.12)', width: 380, maxWidth: '95vw', border: '1px solid #f5d5d0' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <BrandLogo
            size={96}
            align="center"
            titleStyle={{ fontSize: 19, fontWeight: 'bold', color: '#c0392b', letterSpacing: 1, display: 'block' }}
            subtitle="Buying Management System"
            subtitleStyle={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, display: 'block' }}
          />
        </div>

        {error && <div style={S.error}>{error}</div>}

        <div style={S.row}>
          <label style={S.label}>Login Code</label>
          <input style={S.input} placeholder="Enter Code" value={code}
            onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="Enter password" value={password}
            onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <button style={{ ...S.btnPrimary, width: '100%', marginTop: 8, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in…' : 'Login →'}
        </button>


      </div>
    </div>
  );
}

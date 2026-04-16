// src/App.jsx
import { useState } from 'react';
import LoginPage from './components/LoginPage';
import RegisterUser from './components/RegisterUser';
import { api } from './api';
import BuyerDashboard from './components/BuyerDashboard';
import AdminDashboard from './components/AdminDashboard';
import WarehouseDashboard from './components/WarehouseDashboard';

export default function App() {
     const [session, setSession] = useState(null);
     const [showRegister, setShowRegister] = useState(false);
     const [registerLoading, setRegisterLoading] = useState(false);
     const [registerMsg, setRegisterMsg] = useState('');

     const handleRegister = async (form) => {
          setRegisterLoading(true);
          try {
               const res = await api.registerUser(form);
               setRegisterMsg(res.message || 'Registration submitted. Awaiting admin approval.');
               setShowRegister(false);
          } catch (e) {
               alert(e.message);
          } finally {
               setRegisterLoading(false);
          }
     };

     if (session === null && showRegister) {
          return <RegisterUser onRegister={handleRegister} loading={registerLoading} />;
     }
     if (session === null && registerMsg) {
          return <div style={{ maxWidth: 400, margin: '60px auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 4px 16px #2780e322', textAlign: 'center' }}>
               <h2 style={{ color: '#2780e3', marginBottom: 18 }}>Registration Submitted</h2>
               <div style={{ color: '#166534', fontSize: 17, marginBottom: 18 }}>{registerMsg}</div>
               <button style={{ background: '#2780e3', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 6, padding: 12, cursor: 'pointer', width: '100%' }} onClick={() => setRegisterMsg('')}>Back to Login</button>
          </div>;
     }
     if (session === null) {
          return <LoginPage onLogin={setSession} onShowRegister={() => setShowRegister(true)} />;
     }
     if (session.role === 'admin') {
          return <AdminDashboard user={session} onLogout={() => setSession(null)} />;
     }
     if (session.role === 'warehouse' || session.role === 'classification' || session.role === 'supervisor') {
          return <WarehouseDashboard user={session} onLogout={() => setSession(null)} />;
     }
     return <BuyerDashboard user={session} onLogout={() => setSession(null)} />;
}

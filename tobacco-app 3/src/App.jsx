// src/App.jsx
import { useState } from 'react';
import LoginPage from './components/LoginPage';
import BuyerDashboard from './components/BuyerDashboard';
import AdminDashboard from './components/AdminDashboard';
import WarehouseDashboard from './components/WarehouseDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  return session === null      ? <LoginPage      onLogin={setSession}                        />
       : session.role === 'admin' ? <AdminDashboard user={session} onLogout={() => setSession(null)} />
  : session.role === 'warehouse' ? <WarehouseDashboard user={session} onLogout={() => setSession(null)} />
       :                           <BuyerDashboard user={session} onLogout={() => setSession(null)} />;
}

// src/App.jsx
import { useState } from 'react';
import LoginPage from './components/LoginPage';
import BuyerDashboard from './components/BuyerDashboard';
import AdminDashboard from './components/AdminDashboard';
import BuyingListScreen from './components/BuyingListScreen';
import InvoiceScreen from './components/InvoiceScreen';
import DispatchModule from './components/DispatchModule';
import WarehouseModule from './components/WarehouseModule';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [invoiceData, setInvoiceData] = useState(null);

  const handleNavigateToInvoice = (selectedItems) => {
    setInvoiceData(selectedItems);
    setCurrentView('invoice');
  };

  const handleBackToList = () => {
    setCurrentView('buying-list');
    setInvoiceData(null);
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentView('dashboard');
    setInvoiceData(null);
  };

  if (session === null) {
    return <LoginPage onLogin={setSession} />;
  }

  // Role-based routing
  if (session.role === 'admin') {
    return (
      <div>
        {currentView === 'dashboard' ? (
          <AdminDashboard user={session} onLogout={handleLogout} />
        ) : currentView === 'buying-list' ? (
          <BuyingListScreen 
            user={session} 
            onLogout={handleLogout} 
            onNavigateToInvoice={handleNavigateToInvoice}
          />
        ) : currentView === 'invoice' ? (
          <InvoiceScreen 
            user={session} 
            onLogout={handleLogout} 
            selectedItems={invoiceData || []}
            onBackToList={handleBackToList}
          />
        ) : (
          <AdminDashboard user={session} onLogout={handleLogout} />
        )}
      </div>
    );
  }

  if (session.role === 'dispatch') {
    return <DispatchModule user={session} onLogout={handleLogout} />;
  }

  if (session.role === 'warehouse_admin' || session.role === 'warehouse_user') {
    return <WarehouseModule user={session} onLogout={handleLogout} />;
  }

  // Default to buyer dashboard (no access to buying list/invoice)
  return <BuyerDashboard user={session} onLogout={handleLogout} />;
}

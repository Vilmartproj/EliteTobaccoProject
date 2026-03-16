// src/components/BuyingListScreen.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function BuyingListScreen({ user, onLogout, onNavigateToInvoice }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [buyingList, setBuyingList] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBuyingList();
    fetchBuyers();
  }, [selectedDate, selectedBuyer]);

  // Listen for refresh signals from parent
  useEffect(() => {
    const handleRefresh = () => {
      fetchBuyingList();
    };

    // Check for refresh signal
    if (window.buyingListRefresh) {
      handleRefresh();
      window.buyingListRefresh = null;
    }

    // Set up interval to check for refresh signals
    const interval = setInterval(() => {
      if (window.buyingListRefresh) {
        handleRefresh();
        window.buyingListRefresh = null;
      }
    }, 1000);

    // Cleanup function to clear interval
    return () => {
      clearInterval(interval);
    };
  }, [selectedDate, selectedBuyer]);

  const fetchBuyers = async () => {
    try {
      const response = await api.getBuyers();
      setBuyers(response || []);
    } catch (err) {
      console.error('Error fetching buyers:', err);
    }
  };

  const fetchBuyingList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedBuyer) params.append('buyer_id', selectedBuyer);
      
      const queryString = params.toString();
      const response = await api.getBuyingList(queryString);
      let items = response.items || [];
      
      setBuyingList(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (qrNumber, itemStatus) => {
    // Only allow selection of 'available' and 'admin_review' items
    if (itemStatus !== 'available' && itemStatus !== 'admin_review') {
      return;
    }
    
    const newSelected = new Set(selectedItems);
    if (newSelected.has(qrNumber)) {
      newSelected.delete(qrNumber);
    } else {
      newSelected.add(qrNumber);
    }
    setSelectedItems(newSelected);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      available: { bg: '#d4edda', color: '#155724', text: 'Available' },
      admin_review: { bg: '#fff3cd', color: '#856404', text: 'Admin Review' },
      assigned_to_invoice: { bg: '#cce5ff', color: '#004085', text: 'Assigned to Invoice' },
      invoiced: { bg: '#f8d7da', color: '#721c24', text: 'Invoiced' }
    };
    
    const style = statusColors[status] || statusColors.available;
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {style.text}
      </span>
    );
  };

  const isItemDisabled = (itemStatus) => {
    return itemStatus === 'assigned_to_invoice' || itemStatus === 'invoiced';
  };

  const handleSelectAll = () => {
    if (selectedItems.size === buyingList.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(buyingList.map(item => item.qr_number)));
    }
  };

  const handlePushToInvoice = () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item');
      return;
    }
    
    const selectedData = buyingList.filter(item => selectedItems.has(item.qr_number));
    onNavigateToInvoice(selectedData);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '28px' }}>📋 Buying List</h2>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>View and select items for invoice generation</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontWeight: '600', color: '#2c3e50' }}>Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ ...S.input, padding: '8px 12px', borderRadius: '6px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontWeight: '600', color: '#2c3e50' }}>Buyer:</label>
              <select
                value={selectedBuyer}
                onChange={(e) => setSelectedBuyer(e.target.value)}
                style={{ ...S.input, padding: '8px 12px', borderRadius: '6px', minWidth: '150px' }}
              >
                <option value="">All Buyers</option>
                {buyers.map(buyer => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.code} - {buyer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={S.btnPrimary}
              onClick={handleSelectAll}
              disabled={loading || buyingList.length === 0}
            >
              {selectedItems.size === buyingList.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <button
              style={{
                ...S.btnPrimary,
                backgroundColor: selectedItems.size > 0 ? '#27ae60' : '#95a5a6',
                cursor: selectedItems.size > 0 ? 'pointer' : 'not-allowed'
              }}
              onClick={handlePushToInvoice}
              disabled={selectedItems.size === 0 || loading}
            >
              📄 Push to Invoice ({selectedItems.size})
            </button>
          </div>
        </div>

        {error && <div style={S.error}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <div style={{ display: 'inline-block', padding: '20px', border: '2px solid #3498db', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
              <div style={{ fontSize: '16px', marginBottom: '10px' }}>🔄</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>Loading buying list...</div>
              <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>Please wait while we fetch your data</div>
            </div>
          </div>
        ) : buyingList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <div style={{ display: 'inline-block', padding: '20px', border: '2px solid #e74c3c', borderRadius: '8px', backgroundColor: '#fdf2f2' }}>
              <div style={{ fontSize: '16px', marginBottom: '10px' }}>📋</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>No buying list items found</div>
              <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>
                {selectedDate ? `for ${new Date(selectedDate).toLocaleDateString()}` : 'for the selected criteria'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#ecf0f1', borderBottom: '2px solid #bdc3c7' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.size === buyingList.length && buyingList.length > 0}
                      onChange={handleSelectAll}
                      style={{ marginRight: '8px' }}
                    />
                    Select
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>QR Number</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Buyer Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Tobacco Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Grade</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Bag Weight (kg)</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Bag Price ($)</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Location</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {buyingList.map((item, index) => (
                  <tr
                    key={item.qr_number}
                    style={{
                      backgroundColor: isItemDisabled(item.status) ? '#f8f9fa' : index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      opacity: isItemDisabled(item.status) ? 0.6 : 1,
                      borderBottom: '1px solid #dee2e6',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.qr_number)}
                        onChange={() => handleItemToggle(item.qr_number, item.status)}
                        disabled={isItemDisabled(item.status)}
                        style={{ marginRight: '8px', cursor: isItemDisabled(item.status) ? 'not-allowed' : 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500', color: isItemDisabled(item.status) ? '#6c757d' : '#2c3e50' }}>
                      {item.qr_number}
                    </td>
                    <td style={{ padding: '12px', color: isItemDisabled(item.status) ? '#6c757d' : '#495057' }}>{item.buyer_code}</td>
                    <td style={{ padding: '12px', color: isItemDisabled(item.status) ? '#6c757d' : '#495057' }}>{item.tobacco_type}</td>
                    <td style={{ padding: '12px', color: isItemDisabled(item.status) ? '#6c757d' : '#495057' }}>{item.grade}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: isItemDisabled(item.status) ? '#6c757d' : '#495057' }}>{item.bag_weight}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: isItemDisabled(item.status) ? '#6c757d' : '#495057' }}>{item.bag_price}</td>
                    <td style={{ padding: '12px', color: isItemDisabled(item.status) ? '#6c757d' : '#495057' }}>{item.purchase_location}</td>
                    <td style={{ padding: '12px' }}>
                      {getStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#7f8c8d' }}>
                      {new Date(item.saved_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {buyingList.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <strong>Total Items:</strong> {buyingList.length} | 
            <strong> Selected:</strong> {selectedItems.size} | 
            <strong> Total Weight:</strong> {
              buyingList
                .filter(item => selectedItems.has(item.qr_number))
                .reduce((sum, item) => sum + (parseFloat(item.bag_weight) || 0), 0)
                .toFixed(2)
            } kg | 
            <strong> Total Value:</strong> ${
              buyingList
                .filter(item => selectedItems.has(item.qr_number))
                .reduce((sum, item) => sum + (parseFloat(item.bag_price) || 0), 0)
                .toFixed(2)
            }
          </div>
        )}
      </div>
    </div>
  );
}

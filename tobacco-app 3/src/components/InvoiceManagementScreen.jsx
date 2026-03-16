// src/components/InvoiceManagementScreen.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function InvoiceManagementScreen({ user, onLogout, onBackToList }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.getInvoices();
      setInvoices(response.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceItems = async (invoiceId) => {
    setLoading(true);
    try {
      const response = await api.getInvoiceItems(invoiceId);
      setInvoiceItems(response.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    fetchInvoiceItems(invoice.id);
    setError('');
    setSuccess('');
  };

  const handleRemoveItem = async (itemId, qrNumber) => {
    if (!confirm(`Are you sure you want to remove item ${qrNumber} from this invoice?`)) {
      return;
    }

    console.log('Removing invoice item:', {
      itemId,
      qrNumber,
      invoiceId: selectedInvoice.id,
      userId: user.id,
      userObject: user
    });

    setLoading(true);
    try {
      const response = await api.removeInvoiceItem(selectedInvoice.id, itemId, { user_id: user.id });
      
      console.log('Remove item response:', response);
      
      setSuccess('Item removed from invoice successfully');
      setInvoiceItems(prev => prev.filter(item => item.id !== itemId));
      
      // Update invoice totals
      setSelectedInvoice(prev => ({
        ...prev,
        item_count: response.updated_totals.item_count,
        total_weight: response.updated_totals.total_weight,
        total_price: response.updated_totals.total_price
      }));
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedInvoice(null);
    setInvoiceItems([]);
    setError('');
    setSuccess('');
    // Refresh the invoice list when going back
    fetchInvoices();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '28px' }}>📑 Invoice Management</h2>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            {selectedInvoice ? `Editing Invoice #${selectedInvoice.id}` : 'Select an invoice to edit'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedInvoice && (
            <button style={S.btnSecondary} onClick={handleBack}>
              ← Back to Invoices
            </button>
          )}
          <button style={S.btnSecondary} onClick={onBackToList}>
            ← Back to Buying List
          </button>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}
      {success && <div style={{ ...S.success, backgroundColor: '#d4edda', color: '#155724' }}>{success}</div>}

      {!selectedInvoice ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Generated Invoices</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No invoices found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Invoice ID</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Buyer Code</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Items</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Weight</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Price</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <tr key={invoice.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>#{invoice.id}</td>
                      <td style={{ padding: '12px' }}>{invoice.buyer_code}</td>
                      <td style={{ padding: '12px' }}>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{invoice.item_count}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{invoice.total_weight.toFixed(2)} kg</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>${invoice.total_price.toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          style={{
                            ...S.btnPrimary,
                            padding: '6px 12px',
                            fontSize: '12px'
                          }}
                          onClick={() => handleInvoiceSelect(invoice)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Invoice Details</h3>
            <p style={{ margin: '5px 0' }}><strong>Invoice ID:</strong> #{selectedInvoice.id}</p>
            <p style={{ margin: '5px 0' }}><strong>Buyer Code:</strong> {selectedInvoice.buyer_code}</p>
            <p style={{ margin: '5px 0' }}><strong>Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
            <p style={{ margin: '5px 0' }}><strong>Total Items:</strong> {selectedInvoice.item_count}</p>
            <p style={{ margin: '5px 0' }}><strong>Total Weight:</strong> {selectedInvoice.total_weight.toFixed(2)} kg</p>
            <p style={{ margin: '5px 0' }}><strong>Total Price:</strong> ${selectedInvoice.total_price.toFixed(2)}</p>
          </div>

          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Invoice Items</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              Loading invoice items...
            </div>
          ) : invoiceItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No items found in this invoice
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>QR Number</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Buyer Code</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Tobacco Type</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Grade</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Weight (kg)</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Price ($)</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Bag Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, index) => (
                    <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{item.qr_number}</td>
                      <td style={{ padding: '12px' }}>{item.buyer_code}</td>
                      <td style={{ padding: '12px' }}>{item.tobacco_type}</td>
                      <td style={{ padding: '12px' }}>{item.grade}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{item.bag_weight}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>${item.bag_price}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          backgroundColor: item.bag_status === 'invoiced' ? '#f8d7da' : '#d4edda',
                          color: item.bag_status === 'invoiced' ? '#721c24' : '#155724',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {item.bag_status || 'unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          style={{
                            ...S.btnSecondary,
                            backgroundColor: '#e74c3c',
                            padding: '6px 12px',
                            fontSize: '12px'
                          }}
                          onClick={() => handleRemoveItem(item.id, item.qr_number)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

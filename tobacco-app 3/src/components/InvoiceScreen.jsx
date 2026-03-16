// src/components/InvoiceScreen.jsx
import { useState } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function InvoiceScreen({ user, onLogout, selectedItems, onBackToList }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extract buyer info from selected items
  const buyerInfo = selectedItems.length > 0 ? {
    code: selectedItems[0].buyer_code,
    name: selectedItems[0].buyer_name
  } : { code: '', name: '' };

  const calculateTotals = () => {
    const totalWeight = selectedItems.reduce((sum, item) => sum + (parseFloat(item.bag_weight) || 0), 0);
    const totalPrice = selectedItems.reduce((sum, item) => sum + (parseFloat(item.bag_price) || 0), 0);
    return { totalWeight, totalPrice };
  };

  const handleGenerateInvoice = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (selectedItems.length === 0) {
      setError('No items selected for invoice');
      setLoading(false);
      return;
    }
    
    try {
      // Extract buyer code from the first selected item (all items should be from same buyer)
      const buyerCode = selectedItems[0]?.buyer_code;
      if (!buyerCode) {
        setError('Buyer code not found in selected items');
        setLoading(false);
        return;
      }
      
      const invoiceData = {
        items: selectedItems,
        user_id: user.id,
        buyer_code: buyerCode,
        total_weight: calculateTotals().totalWeight,
        total_price: calculateTotals().totalPrice,
        invoice_date: new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
      };
      
      console.log('Sending invoice data:', invoiceData);
      
      const response = await api.generateInvoice(invoiceData);
      console.log('Invoice response:', response);
      
      setSuccess(`Invoice generated successfully! Invoice ID: ${response.invoice_id}`);
      
      // Optionally reset and go back to list after successful generation
      setTimeout(() => {
        onBackToList();
      }, 2000);
      
    } catch (err) {
      console.error('Invoice generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    const printContent = document.getElementById('invoice-content');
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - Elite Tobacco</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { text-align: right; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const { totalWeight, totalPrice } = calculateTotals();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '28px' }}>📑 Invoice Details</h2>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>Review and generate invoice for selected items</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={S.btnSecondary} onClick={onBackToList}>
            ← Back to List
          </button>
          <button style={S.btnSecondary} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div id="invoice-content" style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        {/* Invoice Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #3498db', paddingBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '36px' }}>🌿 Elite Tobacco</h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>Buying Management System - Invoice</p>
          <div style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#3498db' }}>
            Invoice #INV-{new Date().getTime()}
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
            Date: {new Date().toLocaleDateString()} | Time: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Buyer Information */}
        <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Buyer Information</h3>
            <p style={{ margin: '5px 0' }}><strong>Code:</strong> {buyerInfo.code}</p>
            <p style={{ margin: '5px 0' }}><strong>Name:</strong> {buyerInfo.name}</p>
            <p style={{ margin: '5px 0' }}><strong>Total Items:</strong> {selectedItems.length}</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Invoice Summary</h3>
            <p style={{ margin: '5px 0' }}><strong>Total Weight:</strong> {totalWeight.toFixed(2)} kg</p>
            <p style={{ margin: '5px 0' }}><strong>Total Price:</strong> ${totalPrice.toFixed(2)}</p>
            <p style={{ margin: '5px 0' }}><strong>Avg Price/kg:</strong> ${totalWeight > 0 ? (totalPrice / totalWeight).toFixed(2) : '0.00'}</p>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Item Details</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>QR Number</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Tobacco Type</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Grade</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Bag Weight (kg)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Bag Price ($)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Price/kg ($)</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item, index) => (
                  <tr key={item.qr_number} style={{
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    borderBottom: '1px solid #dee2e6'
                  }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{item.qr_number}</td>
                    <td style={{ padding: '12px' }}>{item.tobacco_type}</td>
                    <td style={{ padding: '12px' }}>{item.grade}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{item.bag_weight}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{item.bag_price}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.bag_weight > 0 ? (parseFloat(item.bag_price) / parseFloat(item.bag_weight)).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>TOTALS:</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{totalWeight.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>${totalPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    ${totalWeight > 0 ? (totalPrice / totalWeight).toFixed(2) : '0.00'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Terms & Conditions</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#856404' }}>
            <li>All weights and prices are as per the agreed terms</li>
            <li>Payment to be made as per company policy</li>
            <li>This invoice is electronically generated and valid</li>
            <li>Any discrepancies should be reported within 24 hours</li>
          </ul>
        </div>

        {/* Signature Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: '5px', height: '40px' }}></div>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>Authorized Signature</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: '5px', height: '40px' }}></div>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>Buyer Signature</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        {error && <div style={S.error}>{error}</div>}
        {success && <div style={{ ...S.success, marginBottom: '20px' }}>{success}</div>}
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            style={S.btnPrimary}
            onClick={handlePrintInvoice}
            disabled={loading}
          >
            🖨️ Print Invoice
          </button>
          
          <button
            style={{
              ...S.btnPrimary,
              backgroundColor: loading ? '#95a5a6' : '#27ae60',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onClick={handleGenerateInvoice}
            disabled={loading}
          >
            {loading ? 'Generating...' : '💾 Save Invoice'}
          </button>
          
          <button
            style={S.btnSecondary}
            onClick={onBackToList}
            disabled={loading}
          >
            ← Back to List
          </button>
        </div>
      </div>
    </div>
  );
}

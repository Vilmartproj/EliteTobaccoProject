// src/components/DispatchModule.jsx
import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function DispatchModule({ user, onLogout }) {
  const [lorryNumber, setLorryNumber] = useState('');
  const [loadBundleNumber, setLoadBundleNumber] = useState('');
  const [maxLoadCapacity, setMaxLoadCapacity] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const qrInputRef = useRef(null);

  useEffect(() => {
    if (maxLoadCapacity) {
      const totalWeight = scannedItems.reduce((sum, item) => sum + (parseFloat(item.bag_weight) || 0), 0);
      setRemainingCapacity(parseFloat(maxLoadCapacity) - totalWeight);
    }
  }, [scannedItems, maxLoadCapacity]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!lorryNumber || !loadBundleNumber || !maxLoadCapacity) {
      setError('Please fill all required fields');
      setLoading(false);
      return;
    }

    try {
      const dispatchData = {
        lorry_number: lorryNumber,
        load_bundle_number: loadBundleNumber,
        max_load_capacity: parseFloat(maxLoadCapacity),
        dispatch_user_id: user.id,
        status: 'in_progress'
      };
      
      await api.createDispatch(dispatchData);
      setIsFormSubmitted(true);
      setSuccess('Dispatch setup completed! You can now start scanning QR codes.');
      qrInputRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async () => {
    const qrCode = qrInputRef.current?.value.trim();
    if (!qrCode) return;

    setLoading(true);
    setError('');
    
    try {
      const qrData = await api.validateCode(qrCode);
      
      if (!qrData || !qrData.qr_number) {
        setError('Invalid QR code');
        setLoading(false);
        return;
      }

      // Check if already scanned
      if (scannedItems.some(item => item.qr_number === qrData.qr_number)) {
        setError('This QR code has already been scanned');
        setLoading(false);
        return;
      }

      // Check weight capacity
      const itemWeight = parseFloat(qrData.bag_weight) || 0;
      if (itemWeight > remainingCapacity) {
        setError(`Insufficient capacity. Item weight: ${itemWeight}kg, Remaining capacity: ${remainingCapacity.toFixed(2)}kg`);
        setLoading(false);
        return;
      }

      // Add scanned item
      const newItem = {
        ...qrData,
        scanned_at: new Date().toISOString(),
        scan_order: scannedItems.length + 1
      };
      
      setScannedItems([...scannedItems, newItem]);
      setSuccess(`QR ${qrData.qr_number} scanned successfully!`);
      
      // Clear input for next scan
      if (qrInputRef.current) {
        qrInputRef.current.value = '';
        qrInputRef.current.focus();
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = (qrNumber) => {
    setScannedItems(scannedItems.filter(item => item.qr_number !== qrNumber));
    setSuccess('Item removed successfully');
  };

  const handleCompleteDispatch = async () => {
    if (scannedItems.length === 0) {
      setError('No items scanned. Please scan at least one item.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const dispatchCompleteData = {
        lorry_number: lorryNumber,
        load_bundle_number: loadBundleNumber,
        items: scannedItems,
        total_weight: scannedItems.reduce((sum, item) => sum + (parseFloat(item.bag_weight) || 0), 0),
        completed_at: new Date().toISOString(),
        status: 'completed'
      };
      
      await api.completeDispatch(dispatchCompleteData);
      setSuccess('Dispatch completed successfully!');
      
      // Reset form after 3 seconds
      setTimeout(() => {
        handleReset();
      }, 3000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setLorryNumber('');
    setLoadBundleNumber('');
    setMaxLoadCapacity('');
    setScannedItems([]);
    setRemainingCapacity(0);
    setIsFormSubmitted(false);
    setSuccess('');
    setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleQRScan();
    }
  };

  const totalWeight = scannedItems.reduce((sum, item) => sum + (parseFloat(item.bag_weight) || 0), 0);
  const capacityPercentage = maxLoadCapacity > 0 ? (totalWeight / parseFloat(maxLoadCapacity)) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '28px' }}>🚚 Dispatch Module</h2>
          <p style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.8)' }}>Load management and QR scanning system</p>
        </div>
        <button style={S.btnSecondary} onClick={onLogout}>
          Logout
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        {!isFormSubmitted ? (
          /* Initial Setup Form */
          <div>
            <h3 style={{ margin: '0 0 25px 0', color: '#2c3e50', fontSize: '20px' }}>📋 Dispatch Setup</h3>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={S.label}>Lorry Number *</label>
                  <input
                    type="text"
                    value={lorryNumber}
                    onChange={(e) => setLorryNumber(e.target.value)}
                    placeholder="e.g., LORRY-001"
                    style={S.input}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Load Bundle Number *</label>
                  <input
                    type="text"
                    value={loadBundleNumber}
                    onChange={(e) => setLoadBundleNumber(e.target.value)}
                    placeholder="e.g., BUNDLE-2024-001"
                    style={S.input}
                    required
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={S.label}>Maximum Load Capacity (kg) *</label>
                <input
                  type="number"
                  value={maxLoadCapacity}
                  onChange={(e) => setMaxLoadCapacity(e.target.value)}
                  placeholder="e.g., 1000"
                  style={S.input}
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              {error && <div style={S.error}>{error}</div>}
              {success && <div style={S.success}>{success}</div>}

              <button
                type="submit"
                style={{
                  ...S.btnPrimary,
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  backgroundColor: loading ? '#95a5a6' : '#27ae60'
                }}
                disabled={loading}
              >
                {loading ? 'Setting up...' : '🚀 Start Dispatch Setup'}
              </button>
            </form>
          </div>
        ) : (
          /* QR Scanning Interface */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Dispatch Info</h4>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Lorry:</strong> {lorryNumber}</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Bundle:</strong> {loadBundleNumber}</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Max Capacity:</strong> {maxLoadCapacity} kg</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Load Status</h4>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Items Scanned:</strong> {scannedItems.length}</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Total Weight:</strong> {totalWeight.toFixed(2)} kg</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Remaining:</strong> {remainingCapacity.toFixed(2)} kg</p>
                <div style={{ marginTop: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', height: '8px' }}>
                  <div
                    style={{
                      width: `${Math.min(capacityPercentage, 100)}%`,
                      height: '100%',
                      backgroundColor: capacityPercentage > 90 ? '#e74c3c' : capacityPercentage > 70 ? '#f39c12' : '#27ae60',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {capacityPercentage.toFixed(1)}% capacity used
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={S.label}>📱 QR Scanner (Scan or Enter QR Code)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  ref={qrInputRef}
                  type="text"
                  placeholder="Enter QR code or scan..."
                  style={{ ...S.input, flex: 1 }}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
                <button
                  style={S.btnPrimary}
                  onClick={handleQRScan}
                  disabled={loading}
                >
                  {loading ? 'Scanning...' : '🔍 Scan'}
                </button>
              </div>
            </div>

            {error && <div style={S.error}>{error}</div>}
            {success && <div style={S.success}>{success}</div>}

            {/* Scanned Items Table */}
            {scannedItems.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>📦 Scanned Items</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>QR Number</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Buyer</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Weight (kg)</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedItems.map((item, index) => (
                        <tr key={item.qr_number} style={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.scan_order}</td>
                          <td style={{ padding: '10px', fontWeight: '500' }}>{item.qr_number}</td>
                          <td style={{ padding: '10px' }}>{item.buyer_code}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{item.bag_weight}</td>
                          <td style={{ padding: '10px' }}>{item.tobacco_type}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <button
                              style={{
                                ...S.btnSecondary,
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: '#e74c3c',
                                color: 'white'
                              }}
                              onClick={() => handleRemoveItem(item.qr_number)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                style={{
                  ...S.btnPrimary,
                  backgroundColor: remainingCapacity < 0 ? '#e74c3c' : '#27ae60'
                }}
                onClick={handleCompleteDispatch}
                disabled={loading || scannedItems.length === 0 || remainingCapacity < 0}
              >
                {loading ? 'Completing...' : '✅ Complete Dispatch'}
              </button>
              
              <button
                style={S.btnSecondary}
                onClick={handleReset}
                disabled={loading}
              >
                🔄 Reset Dispatch
              </button>
            </div>

            {remainingCapacity < 0 && (
              <div style={{ ...S.error, marginTop: '15px', textAlign: 'center' }}>
                ⚠️ Overload detected! Please remove items to stay within capacity.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

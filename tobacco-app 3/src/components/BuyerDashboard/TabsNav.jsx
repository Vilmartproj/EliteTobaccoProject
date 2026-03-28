import React from 'react';

export default function TabsNav({ view, setView, bagsLength, qrCodesLength, S, buyerTitleColor }) {
  return (
    <div style={S.tabs && { ...S.tabs, justifyContent: 'center' }}>
      <button style={{ ...S.tab(view === 'form-fcv'), flex: '1 1 180px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => setView('form-fcv')}>📝 New Purchase Entry - FCV</button>
      <button style={{ ...S.tab(view === 'form-nonfcv'), flex: '1 1 200px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => setView('form-nonfcv')}>📝 New Purchase Entry - NON-FCV</button>
      <button style={{ ...S.tab(view === 'bags'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => setView('bags')}>📦 My Bales <span style={{ fontWeight: 900, marginLeft: 4 }}>({bagsLength})</span></button>
      <button style={{ ...S.tab(view === 'vehicle-dispatch'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => setView('vehicle-dispatch')}>🚚 Vehicle Dispatch</button>
      <button style={{ ...S.tab(view === 'qr'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => setView('qr')}>🔲 My QR Codes ({qrCodesLength})</button>
      <button style={{ ...S.tab(view === 'bale-report'), flex: '1 1 140px', minWidth: 0, margin: 0, textAlign: 'center' }} onClick={() => setView('bale-report')}>📈 Purchase Report</button>
    </div>
  );
}

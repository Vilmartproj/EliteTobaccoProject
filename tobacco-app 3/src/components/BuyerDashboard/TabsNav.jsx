import React from 'react';

export default function TabsNav({ view, setView, bagsLength, qrCodesLength, S, buyerTitleColor }) {
  const centeredTabStyle = {
    minWidth: 0,
    margin: 0,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    lineHeight: 1.2,
  };

  return (
    <div style={S.tabs && { ...S.tabs, justifyContent: 'center' }}>
      <button style={{ ...S.tab(view === 'form-fcv'), ...centeredTabStyle, flex: '1 1 200px' }} onClick={() => setView('form-fcv')}>📝 New Purchase Entry - FCV</button>
      <button style={{ ...S.tab(view === 'form-nonfcv'), ...centeredTabStyle, flex: '1 1 200px' }} onClick={() => setView('form-nonfcv')}>📝 New Purchase Entry - NON-FCV</button>
      <button style={{ ...S.tab(view === 'bags'), ...centeredTabStyle, flex: '1 1 140px' }} onClick={() => setView('bags')}>📦 My Bales <span style={{ fontWeight: 900, marginLeft: 4 }}>({bagsLength})</span></button>
      <button style={{ ...S.tab(view === 'vehicle-dispatch'), ...centeredTabStyle, flex: '1 1 140px' }} onClick={() => setView('vehicle-dispatch')}>🚚 Vehicle Dispatch</button>
      <button style={{ ...S.tab(view === 'qr'), ...centeredTabStyle, flex: '1 1 140px' }} onClick={() => setView('qr')}>🔲 My QR Codes ({qrCodesLength})</button>
      <button style={{ ...S.tab(view === 'bale-report'), ...centeredTabStyle, flex: '1 1 140px' }} onClick={() => setView('bale-report')}>📈 Purchase Report</button>
    </div>
  );
}

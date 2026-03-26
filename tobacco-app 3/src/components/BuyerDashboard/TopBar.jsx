import React from 'react';
import BrandLogo from '../BrandLogo';

export default function TopBar({ user, onLogout, bagsLength, isMobileView, buyerButtonTextColor, buyerTitleColor, S }) {
  return (
    <div style={S.topBar}>
      {isMobileView ? (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
            <BrandLogo size={38} titleStyle={{ ...S.topBarTitle, color: buyerTitleColor }} />
            <button style={{ ...S.btnIcon, color: buyerButtonTextColor }} onClick={onLogout}>Logout</button>
          </div>
          <div style={{ ...S.buyerInfo, justifyContent: 'flex-start', width: '100%' }}>
            <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
            <span style={S.bagsBadge}>🛍️ {bagsLength} Bales</span>
          </div>
        </div>
      ) : (
        <>
          <BrandLogo size={38} titleStyle={{ ...S.topBarTitle, color: buyerTitleColor }} />
          <div style={S.buyerInfo}>
            <span style={S.buyerBadge}>👤 {user.name} ({user.code})</span>
            <span style={S.bagsBadge}>🛍️ {bagsLength} Bales</span>
            <button style={{ ...S.btnIcon, color: buyerButtonTextColor }} onClick={onLogout}>Logout</button>
          </div>
        </>
      )}
    </div>
  );
}

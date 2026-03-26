import React from 'react';

export default function BalesTable({
  notDispatchedBags,
  editingId,
  editForm,
  S,
  BALES_COLUMNS,
  visibleColumns,
  bagsSort,
  toggleSort,
  setBagsSort,
  canManageBagActions,
  startEdit,
  selectedDispatchBagIds,
  getDispatchState,
  toggleDispatchSelection,
  removeSelectedDispatchBag,
  qrScanDeleteId,
  deleteLoading,
  handleDeleteScannedBag,
  formatPurchaseDateDash,
  formatUpdatedAt,
  buyerButtonTextColor
}) {
  const SortableTh = ({ label, sortKey, sortState, onSort, minWidth }) => (
    <th
      style={{ ...S.th, cursor: 'pointer', userSelect: 'none', fontWeight: 700, ...(minWidth ? { minWidth } : {}) }}
      onClick={() => onSort(sortKey)}
      title="Click to sort"
    >
      {label}{sortState.key === sortKey ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontWeight: 700, color: '#2780e3', marginBottom: 8 }}>Not Dispatched ({notDispatchedBags.length})</div>
      {notDispatchedBags.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No available bales.</p>
      : (
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ ...S.table, minWidth: 'max-content', width: 'max-content' }}>
            <thead>
              <tr>
                <th style={S.th}></th>
                {BALES_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                  <SortableTh
                    key={col.key}
                    label={col.label}
                    sortKey={col.key}
                    sortState={bagsSort}
                    onSort={(key) => toggleSort(bagsSort, setBagsSort, key)}
                    minWidth={col.key === 'purchase_date' ? 110 : col.key === 'dispatch_status' ? 110 : undefined}
                  />
                ))}
                {canManageBagActions && <th style={S.th}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {notDispatchedBags.map((b, i) => (
                editingId === b.id ? (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                    <td style={S.td}>—</td>
                    {/* ...existing code for edit row... */}
                  </tr>
                ) : (
                  <tr
                    key={b.id}
                    style={{
                      background: qrScanDeleteId === Number(b.id) ? '#ffe0e0' : (selectedDispatchBagIds.includes(Number(b.id)) ? '#fff2b8' : (i % 2 === 0 ? '#fffafa' : '#fff')),
                      outline: qrScanDeleteId === Number(b.id) ? '2px solid #ef4444' : 'none',
                      opacity: (Number(b.dispatch_list_added) === 1) ? 0.55 : 1,
                    }}
                  >
                    <td style={S.td}>
                      {getDispatchState(b).selectable ? (
                        <input
                          type="checkbox"
                          checked={selectedDispatchBagIds.includes(Number(b.id))}
                          onChange={() => toggleDispatchSelection(b.id)}
                        />
                      ) : '—'}
                    </td>
                    {BALES_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => {
                      let value = b[col.key];
                      if (col.key === 'purchase_date') value = formatPurchaseDateDash(b.purchase_date || b.date_of_purchase);
                      if (col.key === 'weight') value = b.weight ? `${b.weight} kg` : '—';
                      if (col.key === 'bale_value') value = Number.isFinite(Number(b.bale_value)) ? `₹${Number(b.bale_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
                      if (col.key === 'fcv') value = <span style={S.badge(b.fcv === 'FCV' ? 'green' : 'red')}>{b.fcv}</span>;
                      if (col.key === 'lot_number') value = b.lot_number || '—';
                      if (col.key === 'updated_at') value = formatUpdatedAt(b.updated_at);
                      if (col.key === 'dispatch_invoice_number') value = b.dispatch_invoice_number || '—';
                      if (col.key === 'dispatch_status') value = (
                        <>
                          {Number(b.dispatch_list_added) === 1
                            ? <span style={S.badge('green')}>Moved to vehicle dispatch</span>
                            : <span style={S.badge()}>Available</span>}
                          {b.vehicle_dispatch_number ? <div style={{ marginTop: 4, fontSize: 12 }}>Dispatch: {b.vehicle_dispatch_number}</div> : null}
                        </>
                      );
                      return <td key={col.key} style={{ ...S.td, fontWeight: 800 }}>{value}</td>;
                    })}
                    {canManageBagActions && (
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12, opacity: (Number(b.dispatch_list_added) === 1) ? 0.6 : 1 }} onClick={() => startEdit(b)} disabled={Number(b.dispatch_list_added) === 1}>
                            Edit
                          </button>
                          {selectedDispatchBagIds.includes(Number(b.id)) && getDispatchState(b).selectable && (
                            <button
                              type="button"
                              style={{ ...S.btnSecondary, color: '#fff', borderColor: '#1f67b9', background: '#2780e3', flex: 'none', padding: '6px 10px', fontSize: 12 }}
                              onClick={() => removeSelectedDispatchBag(b.id)}
                            >
                              Remove
                            </button>
                          )}
                          {qrScanDeleteId === Number(b.id) && getDispatchState(b).selectable && (
                            <button
                              type="button"
                              style={{ ...S.btnSecondary, color: '#fff', borderColor: '#1f67b9', background: '#2780e3', fontWeight: 700, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                              disabled={deleteLoading}
                              onClick={() => handleDeleteScannedBag(b.id)}
                            >
                              {deleteLoading ? 'Deleting...' : '🗑️ Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

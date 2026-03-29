import React from 'react';

export default function BalesTable({
  notDispatchedBags,
  sectionTitle = 'Not Dispatched',
  emptyMessage = 'No available bales.',
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
  buyerButtonTextColor,
  showSelectionColumn = true,
  onEditFieldChange,
  onSaveEdit,
  onCancelEdit,
  apfNumberOptions = [],
  tobaccoBoardGradeOptions = [],
  buyerGradeOptions = []
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

  const dispatchStatusBadge = (bag) => {
    const status = String(bag.vehicle_dispatch_status || '').trim();
    if (Number(bag.dispatch_list_added) === 1 && !status) return S.badge();
    if (status === 'sent_to_admin') return S.badge('red');
    if (status === 'sent_to_warehouse') return S.badge();
    if (status === 'warehouse_received') return S.badge('green');
    if (status === 'unmatched_bags' || status === 'confirmed_mismatch') return S.badge('red');
    return S.badge();
  };

  const dispatchStatusLabel = (bag) => {
    const status = String(bag.vehicle_dispatch_status || '').trim();
    if (Number(bag.dispatch_list_added) === 1 && !status) return 'Ready for Dispatch';
    if (status === 'sent_to_admin') return 'Sent to Admin';
    if (status === 'sent_to_warehouse') return 'Sent to Warehouse';
    if (status === 'warehouse_received') return 'Warehouse Received';
    if (status === 'unmatched_bags') return 'Unmatched Bags';
    if (status === 'confirmed_mismatch') return 'Confirmed Mismatch';
    return 'Available';
  };

  const renderInlineEditValue = (bag, colKey) => {
    const form = editForm || {};
    const handleChange = (key, value) => {
      if (typeof onEditFieldChange === 'function') onEditFieldChange(key, value);
    };

    if (colKey === 'unique_code') return bag.unique_code;

    if (colKey === 'lot_number') {
      return (
        <input
          style={{ ...S.input, marginBottom: 0, minWidth: 120 }}
          value={form.lot_number ?? ''}
          onChange={(e) => handleChange('lot_number', e.target.value)}
        />
      );
    }

    if (colKey === 'apf_number') {
      return (
        <select
          style={{ ...S.input, marginBottom: 0, minWidth: 120 }}
          value={form.apf_number ?? ''}
          onChange={(e) => handleChange('apf_number', e.target.value)}
        >
          <option value="">Select</option>
          {apfNumberOptions.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label || String(opt.value)}</option>
          ))}
        </select>
      );
    }

    if (colKey === 'tobacco_grade') {
      return (
        <select
          style={{ ...S.input, marginBottom: 0, minWidth: 110 }}
          value={form.tobacco_grade ?? ''}
          onChange={(e) => handleChange('tobacco_grade', e.target.value)}
        >
          <option value="">Select</option>
          {tobaccoBoardGradeOptions.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label || String(opt.value)}</option>
          ))}
        </select>
      );
    }

    if (colKey === 'type_of_tobacco') {
      return (
        <input
          style={{ ...S.input, marginBottom: 0, minWidth: 140 }}
          value={form.type_of_tobacco ?? ''}
          onChange={(e) => handleChange('type_of_tobacco', e.target.value)}
        />
      );
    }

    if (colKey === 'purchase_location') {
      return (
        <input
          style={{ ...S.input, marginBottom: 0, minWidth: 140 }}
          value={form.purchase_location ?? ''}
          onChange={(e) => handleChange('purchase_location', e.target.value)}
        />
      );
    }

    if (colKey === 'purchase_date') {
      return (
        <input
          style={{ ...S.input, marginBottom: 0, minWidth: 130 }}
          value={form.purchase_date ?? ''}
          onChange={(e) => handleChange('purchase_date', e.target.value)}
        />
      );
    }

    if (colKey === 'weight') {
      return (
        <input
          type="number"
          style={{ ...S.input, marginBottom: 0, minWidth: 90 }}
          value={form.weight ?? ''}
          onChange={(e) => handleChange('weight', e.target.value)}
        />
      );
    }

    if (colKey === 'rate') {
      return (
        <input
          type="number"
          step="0.01"
          style={{ ...S.input, marginBottom: 0, minWidth: 90 }}
          value={form.rate ?? ''}
          onChange={(e) => handleChange('rate', e.target.value)}
        />
      );
    }

    if (colKey === 'bale_value') {
      if (Number.isFinite(Number(form.weight)) && Number.isFinite(Number(form.rate))) {
        return `₹${Number((Number(form.weight) * Number(form.rate)).toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return Number.isFinite(Number(form.bale_value))
        ? `₹${Number(form.bale_value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '—';
    }

    if (colKey === 'buyer_grade') {
      return (
        <select
          style={{ ...S.input, marginBottom: 0, minWidth: 110 }}
          value={form.buyer_grade ?? ''}
          onChange={(e) => handleChange('buyer_grade', e.target.value)}
        >
          <option value="">Select</option>
          {buyerGradeOptions.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label || String(opt.value)}</option>
          ))}
        </select>
      );
    }

    if (colKey === 'fcv') {
      return (
        <select
          style={{ ...S.input, marginBottom: 0, minWidth: 100 }}
          value={form.fcv ?? ''}
          onChange={(e) => handleChange('fcv', e.target.value)}
        >
          <option value="">Select</option>
          <option value="FCV">FCV</option>
          <option value="NON-FCV">NON-FCV</option>
        </select>
      );
    }

    if (colKey === 'dispatch_invoice_number') return bag.dispatch_invoice_number || '—';
    if (colKey === 'updated_at') return formatUpdatedAt(bag.updated_at);
    if (colKey === 'dispatch_status') {
      return (
        <>
          <span style={dispatchStatusBadge(bag)}>{dispatchStatusLabel(bag)}</span>
          {bag.vehicle_dispatch_number ? <div style={{ marginTop: 4, fontSize: 12 }}>Dispatch: {bag.vehicle_dispatch_number}</div> : null}
        </>
      );
    }
    if (colKey === 'status') return bag.status || '—';

    return bag[colKey] ?? '—';
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontWeight: 700, color: '#2780e3', marginBottom: 8 }}>{sectionTitle} ({notDispatchedBags.length})</div>
      {notDispatchedBags.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>{emptyMessage}</p>
      : (
        <div style={{ overflowX: 'auto', position: 'relative' }}>
          <table style={{ ...S.table, minWidth: 'max-content', width: 'max-content' }}>
            <thead>
              <tr>
                {showSelectionColumn && <th style={S.th}></th>}
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
                    {showSelectionColumn && <td style={S.td}>—</td>}
                    {BALES_COLUMNS.filter(col => visibleColumns.includes(col.key)).map((col) => (
                      <td key={col.key} style={{ ...S.td, fontWeight: 800 }}>
                        {renderInlineEditValue(b, col.key)}
                      </td>
                    ))}
                    {canManageBagActions && (
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={{ ...S.btnPrimary, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                            onClick={onSaveEdit}
                          >
                            Save
                          </button>
                          <button
                            style={{ ...S.btnSecondary, color: buyerButtonTextColor, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                            onClick={onCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ) : (
                  <tr
                    key={b.id}
                    style={{
                      background: qrScanDeleteId === Number(b.id) ? '#ffe0e0' : (showSelectionColumn && selectedDispatchBagIds.includes(Number(b.id)) ? '#fff2b8' : (i % 2 === 0 ? '#fffafa' : '#fff')),
                      outline: qrScanDeleteId === Number(b.id) ? '2px solid #ef4444' : 'none',
                      opacity: (Number(b.dispatch_list_added) === 1) ? 0.55 : 1,
                    }}
                  >
                    {showSelectionColumn && (
                      <td style={S.td}>
                        {getDispatchState(b).selectable ? (
                          <input
                            type="checkbox"
                            checked={selectedDispatchBagIds.includes(Number(b.id))}
                            onChange={() => toggleDispatchSelection(b.id)}
                          />
                        ) : '—'}
                      </td>
                    )}
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
                          <span style={dispatchStatusBadge(b)}>{dispatchStatusLabel(b)}</span>
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

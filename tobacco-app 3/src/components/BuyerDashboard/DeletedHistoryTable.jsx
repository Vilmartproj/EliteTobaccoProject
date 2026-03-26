import React from 'react';

function DeletedHistoryTable({ deletedHistory, selectedDeletedKeys, allDeletedSelected, toggleSelectAll, toggleSelectRow, handleRestore, handlePermanentDelete, loading, S }) {
  return (
    <div style={S.card}>
      <div style={{ ...S.subheading, marginBottom: 10 }}>Deleted History ({deletedHistory.length})</div>
      <div style={{ marginBottom: 10 }}>
        <button style={S.btnPrimary} onClick={toggleSelectAll} disabled={loading}>
          {allDeletedSelected ? 'Deselect All' : 'Select All'}
        </button>
        <button
          style={S.btnSecondary}
          onClick={handleRestore}
          disabled={loading || selectedDeletedKeys.length === 0 || !deletedHistory.some(row => selectedDeletedKeys.includes(row.deleted_key || row.id) && row.status === 'Delete in-progress')}
        >
          Restore Selected
        </button>
        <button style={S.btnSecondary} onClick={handlePermanentDelete} disabled={loading || selectedDeletedKeys.length === 0}>
          Delete Permanently
        </button>
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}><input type="checkbox" checked={allDeletedSelected} onChange={toggleSelectAll} /></th>
            <th style={S.th}>Code</th>
            <th style={S.th}>Deleted At</th>
            <th style={S.th}>Weight</th>
            <th style={S.th}>Rate</th>
            <th style={S.th}>Bale Value</th>
            <th style={S.th}>Bag Status</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deletedHistory.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>No deleted history.</td></tr>
          ) : (
            deletedHistory.map((row, idx) => (
              <tr key={row.deleted_key || row.id}>
                <td style={S.td}>
                  <input
                    type="checkbox"
                    checked={selectedDeletedKeys.includes(row.deleted_key || row.id)}
                    onChange={() => toggleSelectRow(row.deleted_key || row.id)}
                  />
                </td>
                <td style={S.td}>{row.unique_code}</td>
                <td style={S.td}>{row.deleted_at}</td>
                <td style={S.td}>{row.weight}</td>
                <td style={S.td}>{row.rate}</td>
                <td style={S.td}>{row.bale_value}</td>
                <td style={S.td}>{row.status}</td>
                <td style={S.td}>
                  {row.status === 'Delete in-progress' ? (
                    <button style={S.btnIcon} onClick={() => handleRestore([row.deleted_key || row.id])} disabled={loading}>Restore</button>
                  ) : (
                    <button style={{ ...S.btnIcon, background: '#f0f0f0', color: '#bbb', border: '1px solid #eee', cursor: 'not-allowed' }} disabled>Restore</button>
                  )}
                  <button
                    style={row.status === 'Deleted'
                      ? { ...S.btnIcon, background: '#f0f0f0', color: '#bbb', border: '1px solid #eee', cursor: 'not-allowed' }
                      : S.btnIcon}
                    onClick={() => handlePermanentDelete([row.deleted_key || row.id])}
                    disabled={loading || row.status === 'Deleted'}
                  >
                    Confirm Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DeletedHistoryTable;

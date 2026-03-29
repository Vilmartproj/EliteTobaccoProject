import React from 'react';

export default function SelectedDispatchList({ selectedDispatchBags, S, removeSelectedDispatchBag, setEditMsg, bags, api, user, setBags, setDeletedHistory, setSelectedDispatchBagIds }) {
  if (selectedDispatchBags.length === 0) return null;
  return (
    <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #e8b1b1', background: '#fff7f7' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Selected QR codes ({selectedDispatchBags.length})</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {selectedDispatchBags.map((bag) => (
          <span key={bag.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 999, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700 }}>
            {bag.unique_code}
            <button
              type="button"
              style={{ ...S.btnSecondary, flex: 'none', padding: '2px 8px', fontSize: 11 }}
              onClick={() => removeSelectedDispatchBag(bag.id)}
            >
              Unselect
            </button>
            <button
              type="button"
              style={{ ...S.btnSecondary, background: '#e53e3e', color: '#fff', flex: 'none', padding: '2px 8px', fontSize: 11 }}
              onClick={async () => {
                const bagToDelete = bags.find((item) => Number(item.id) === Number(bag.id));
                if (bagToDelete) {
                  try {
                    await api.setBagDeleteInProgress(bag.id);
                    if (user?.id) {
                      const [freshBags, deletedRows] = await Promise.all([
                        api.getBags(user.id),
                        api.getDeletedBags(user.id)
                      ]);
                      setBags(freshBags);
                      setDeletedHistory(deletedRows.map((row, idx) => ({
                        ...row.bag_data,
                        deleted_at: row.deleted_at,
                        deleted_key: row.id,
                        db_id: row.db_id || row.id,
                      })));
                    }
                    setSelectedDispatchBagIds((prev) => prev.filter((id) => Number(id) !== Number(bag.id)));
                    setEditMsg(`Moved ${bag.unique_code} to Deleted Purchase History`);
                  } catch (e) {
                    setEditMsg(e.message || 'Failed to update bag status');
                  }
                } else {
                  setSelectedDispatchBagIds((prev) => prev.filter((id) => Number(id) !== Number(bag.id)));
                }
              }}
            >
              Move to Delete
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

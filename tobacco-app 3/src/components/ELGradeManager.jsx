import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function ELGradeManager({ S }) {
  const [grades, setGrades] = useState([]);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const codeInputRef = useRef(null);

  const load = async () => {
    try {
      const rows = await api.getElGrades();
      setGrades(rows);
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setCode('');
    setDescription('');
    setEditingId(null);
    setTimeout(() => codeInputRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    if (!code.trim()) { setMsg('Grade code is required'); return; }
    try {
      if (editingId) {
        await api.updateElGrade(editingId, { code: code.trim(), description: description.trim() });
        setMsg(`✅ EL Grade ${code.trim().toUpperCase()} updated`);
      } else {
        await api.addElGrade({ code: code.trim(), description: description.trim() });
        setMsg(`✅ EL Grade ${code.trim().toUpperCase()} added`);
      }
      resetForm();
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleEdit = (grade) => {
    setEditingId(grade.id);
    setCode(grade.code);
    setDescription(grade.description || '');
    setMsg('');
  };

  const handleDelete = async (grade) => {
    if (!window.confirm(`Delete EL grade ${grade.code}?`)) return;
    try {
      await api.deleteElGrade(grade.id);
      setMsg(`✅ EL Grade ${grade.code} deleted`);
      if (editingId === grade.id) resetForm();
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const sorted = [...grades].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return (
    <div style={S.card}>
      <div style={S.heading}>🏷️ EL Grades</div>
      {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 8, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label style={S.label}>Code</label>
          <input ref={codeInputRef} style={S.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. EL-A1"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
        </div>
        <div>
          <label style={S.label}>Description</label>
          <input style={S.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
        </div>
        <button style={{ ...S.btnPrimary, flex: 'none', padding: '8px 16px' }} onClick={handleSave}>
          {editingId ? '💾 Update' : '➕ Add'}
        </button>
        {editingId && (
          <button style={{ ...S.btnSecondary, flex: 'none', padding: '8px 16px' }} onClick={resetForm}>Cancel</button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Code</th>
              <th style={S.th}>Description</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={3} style={{ ...S.td, color: '#999', textAlign: 'center' }}>No EL grades yet</td></tr>
            ) : sorted.map((g) => (
              <tr key={g.id} style={editingId === g.id ? { background: '#fff8e1' } : undefined}>
                <td style={{ ...S.td, fontWeight: 800 }}>{g.code}</td>
                <td style={S.td}>{g.description || '—'}</td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={S.btnIcon} onClick={() => handleEdit(g)}>✏️</button>
                    <button style={{ ...S.btnIcon, color: '#c62828' }} onClick={() => handleDelete(g)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

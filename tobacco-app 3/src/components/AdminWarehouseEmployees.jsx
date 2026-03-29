import { useEffect, useState } from 'react';
import { api } from '../api';
import { S } from '../styles';
import { formatDateTime } from '../utils/dateFormat';

export default function AdminWarehouseEmployees() {
  const [rows, setRows] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const data = await api.getWarehouseEmployees();
    setRows(data);
  };

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  const addEmployee = async () => {
    if (!code.trim() || !name.trim()) {
      setMsg('Code and name are required');
      return;
    }
    try {
      await api.addWarehouseEmployee({ code: code.trim(), name: name.trim() });
      setMsg(`✅ Warehouse employee ${code.trim().toUpperCase()} added. Password = ${code.trim().toUpperCase()}`);
      setCode('');
      setName('');
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const deleteEmployee = async (row) => {
    if (!window.confirm(`Delete warehouse employee ${row.code} (${row.name})?`)) return;
    try {
      await api.deleteWarehouseEmployee(row.id);
      setMsg(`✅ Warehouse employee ${row.code} deleted`);
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.subheading}>Warehouse Employee Login Setup</div>
        {msg && <div style={msg.startsWith('✅') ? S.success : S.error}>{msg}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={S.label}>Employee Code</label>
            <input style={S.input} placeholder="e.g. W003" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Employee Name</label>
            <input style={S.input} placeholder="Warehouse staff name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button style={{ ...S.btnPrimary, flex: 'none', padding: '10px 18px' }} onClick={addEmployee}>Add</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.subheading}>Warehouse Employees ({rows.length})</div>
        {rows.length === 0 ? (
          <div style={{ color: '#777' }}>No warehouse employees configured.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Code</th>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Created</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.code}</td>
                    <td style={S.td}>{row.name}</td>
                    <td style={S.td}>{formatDateTime(row.created_at)}</td>
                    <td style={S.td}>
                      <button
                        style={{ ...S.btnSecondary, flex: 'none', padding: '6px 10px', fontSize: 12 }}
                        onClick={() => deleteEmployee(row)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/DatabaseViewer.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';
import { formatDateTime } from '../utils/dateFormat';

export default function DatabaseViewer() {
  const [tables, setTables]       = useState([]);
  const [activeTable, setActive]  = useState('');
  const [tableData, setTableData] = useState({ rows: [], cols: [], total: 0 });
  const [customSQL, setCustomSQL] = useState('');
  const [queryResult, setQueryRes]= useState(null);
  const [queryErr, setQueryErr]   = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.getDbTables().then(t => { setTables(t); if (t.length) loadTable(t[0]); });
  }, []);

  const loadTable = async (name) => {
    setActive(name);
    setLoading(true);
    try { setTableData(await api.getDbTable(name)); }
    finally { setLoading(false); }
  };

  const runQuery = async () => {
    if (!customSQL.trim()) return;
    setQueryErr(''); setQueryRes(null);
    try { setQueryRes(await api.runDbQuery(customSQL)); }
    catch (e) { setQueryErr(e.message); }
  };

  const isDateField = (column) => /(_at|date)/i.test(column);

  const ResultTable = ({ data }) => (
    data.rows.length === 0
      ? <p style={{ color: '#aaa', padding: '20px 0' }}>No results.</p>
      : (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead><tr>{data.cols.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fffafa' : '#fff' }}>
                  {data.cols.map(c => (
                    <td key={c} style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row[c] === null ? <span style={{ color: '#bbb' }}>NULL</span>
                        : typeof row[c] === 'number' ? <span style={{ fontFamily: 'monospace' }}>{row[c]}</span>
                        : isDateField(c) ? formatDateTime(row[c]) : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
            Showing {data.rows.length} of {data.total} rows
          </div>
        </div>
      )
  );

  return (
    <div>
      {/* Table selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tables.map(t => (
          <button key={t}
            style={{ ...S.btnSecondary, flex: 'none', padding: '7px 16px', fontSize: 13,
              background: activeTable === t ? '#fde8e5' : '#fff',
              fontWeight: activeTable === t ? 'bold' : 'normal' }}
            onClick={() => loadTable(t)}>
            🗄️ {t}
          </button>
        ))}
      </div>

      {/* Table data */}
      {activeTable && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={S.subheading}>Table: <span style={{ fontFamily: 'monospace' }}>{activeTable}</span></div>
            <div style={{ fontSize: 12, color: '#888' }}>{tableData.total} total rows</div>
          </div>
          {loading ? <p style={{ color: '#aaa' }}>Loading…</p> : <ResultTable data={tableData} />}
        </div>
      )}

      {/* Custom SQL */}
      <div style={S.card}>
        <div style={S.subheading}>Custom SQL Query</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
          Only <code>SELECT</code> statements are allowed. Max 500 rows returned.
        </div>
        <textarea
          style={{ ...S.input, height: 90, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
          placeholder={'SELECT * FROM bags WHERE buyer_code = \'B001\'\nSELECT b.name, COUNT(bag.id) as bag_count FROM buyers b LEFT JOIN bags bag ON b.id = bag.buyer_id GROUP BY b.id'}
          value={customSQL}
          onChange={e => setCustomSQL(e.target.value)}
        />
        {queryErr && <div style={{ ...S.error, marginTop: 8 }}>{queryErr}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button style={{ ...S.btnPrimary, flex: 'none', padding: '9px 20px', fontSize: 13 }} onClick={runQuery}>
            ▶ Run Query
          </button>
          {/* Quick query buttons */}
          {[
            ['All Bags', 'SELECT * FROM bags ORDER BY id DESC'],
            ['All Buyers', 'SELECT * FROM buyers'],
            ['All QR Codes', 'SELECT q.unique_code, b.code as buyer_code, q.used FROM qr_codes q LEFT JOIN buyers b ON q.buyer_id = b.id'],
            ['Bag Summary', 'SELECT buyer_code, buyer_name, COUNT(*) as bags, SUM(weight) as total_kg FROM bags GROUP BY buyer_id'],
          ].map(([label, sql]) => (
            <button key={label}
              style={{ ...S.btnSecondary, flex: 'none', padding: '8px 14px', fontSize: 12 }}
              onClick={() => { setCustomSQL(sql); }}>
              {label}
            </button>
          ))}
        </div>
        {queryResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: '#2e7d32', marginBottom: 8 }}>✅ {queryResult.total} row(s) returned</div>
            <ResultTable data={queryResult} />
          </div>
        )}
      </div>

      {/* Schema reference */}
      <div style={S.card}>
        <div style={S.subheading}>Database Schema</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { table: 'buyers', cols: ['id','code','name','password','created_at'] },
            { table: 'qr_codes', cols: ['id','unique_code','buyer_id','used','created_at'] },
            { table: 'bags', cols: ['id','unique_code','buyer_id','buyer_code','buyer_name','fcv','apf_number','tobacco_grade','weight','buyer_grade','date_of_purchase','purchase_location','saved_at','updated_at'] },
          ].map(({ table, cols }) => (
            <div key={table} style={{ background: '#fdf8f8', border: '1px solid #f0dada', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 'bold', color: '#c0392b', marginBottom: 8, fontFamily: 'monospace' }}>{table}</div>
              {cols.map(c => (
                <div key={c} style={{ fontSize: 12, color: '#555', padding: '2px 0', fontFamily: 'monospace' }}>
                  {c === 'id' ? '🔑 ' : c.endsWith('_id') ? '🔗 ' : '   '}{c}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

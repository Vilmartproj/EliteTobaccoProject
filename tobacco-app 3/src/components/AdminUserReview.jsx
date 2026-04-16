
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';

const S = {
  ..._S,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Roboto',
    fontSize: 14,
    background: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 2px 10px #2780e322',
    marginTop: 18,
  },
  th: {
    background: '#2780e3',
    color: '#fff',
    fontWeight: 800,
    padding: '10px 8px',
    border: '1px solid #b7d9f8',
    textAlign: 'left',
    fontSize: 13,
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 8px',
    border: '1px solid #d9ebfb',
    color: '#1b3555',
    verticalAlign: 'middle',
    fontWeight: 700,
    fontSize: 14,
    background: '#fff',
    whiteSpace: 'nowrap',
  },
  pendingRow: { background: '#fffbe6' },
  reviewedRow: { background: '#f0f0f0' },
};

const ROLE_LABELS = {
  buyer: 'Buyer',
  warehouse: 'Warehouse',
  classification: 'Classification User',
  supervisor: 'Supervisor',
  admin: 'Admin',
};


// Allow parent to get pending count via ref
import { forwardRef, useImperativeHandle } from 'react';

const AdminUserReview = forwardRef(function AdminUserReview(props, ref) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useImperativeHandle(ref, () => ({
    getPendingCount: () => requests.filter(r => r.status === 'pending').length
  }), [requests]);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRegistrationRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    }
    setLoading(false);
  }

  async function handleAction(id, action, reviewNote = '') {
    setActionLoading(id + action);
    setError('');
    try {
      if (action === 'approve') {
        await api.approveRegistrationRequest(id, { reviewNote });
      } else {
        await api.denyRegistrationRequest(id, { reviewNote });
      }
      await fetchRequests();
    } catch (err) {
      setError(err.message || 'Action failed');
    }
    setActionLoading(null);
  }


  if (loading) return <div style={{ fontFamily: 'Roboto', fontSize: 16, color: '#2780e3', margin: '32px 0', textAlign: 'center' }}>Loading registration requests...</div>;
  if (error) return <div style={{ color: '#d32f2f', fontFamily: 'Roboto', fontSize: 15, margin: '32px 0', textAlign: 'center' }}>{error}</div>;

  return (
    <div>
      <h2 style={{ color: '#2780e3', fontFamily: 'Roboto', fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Pending User Registrations</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Username</th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Phone</th>
              <th style={S.th}>Address</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} style={req.status === 'pending' ? S.pendingRow : S.reviewedRow}>
                <td style={S.td}>{req.id}</td>
                <td style={S.td}>{req.username}</td>
                <td style={S.td}>{req.name}</td>
                <td style={S.td}>{req.email}</td>
                <td style={S.td}>{req.phone}</td>
                <td style={S.td}>{req.address || ''}</td>
                <td style={S.td}>{ROLE_LABELS[String(req.role || '').toLowerCase()] || req.role}</td>
                <td style={S.td}>{req.status}</td>
                <td style={S.td}>
                  {req.status === 'pending' ? (
                    <>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAction(req.id, 'approve')}
                        style={{ background: '#2780e3', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginRight: 6 }}
                      >Approve</button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAction(req.id, 'deny')}
                        style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                      >Deny</button>
                    </>
                  ) : (
                    <span>{req.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
export default AdminUserReview;

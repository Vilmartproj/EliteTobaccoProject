// src/components/WarehouseModule.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { S } from '../styles';

export default function WarehouseModule({ user, onLogout }) {
  const [view, setView] = useState(user.role === 'warehouse_admin' ? 'dashboard' : 'tasks');
  const [loadBundles, setLoadBundles] = useState([]);
  const [warehouseUsers, setWarehouseUsers] = useState([]);
  const [reviewTasks, setReviewTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');

  const REVIEW_STATUSES = {
    NOT_ASSIGNED: 'not_assigned',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    PENDING: 'pending',
    COMPLETED: 'completed'
  };

  const STATUS_COLORS = {
    [REVIEW_STATUSES.NOT_ASSIGNED]: '#95a5a6',
    [REVIEW_STATUSES.ASSIGNED]: '#3498db',
    [REVIEW_STATUSES.IN_PROGRESS]: '#f39c12',
    [REVIEW_STATUSES.PENDING]: '#e67e22',
    [REVIEW_STATUSES.COMPLETED]: '#27ae60'
  };

  const STATUS_LABELS = {
    [REVIEW_STATUSES.NOT_ASSIGNED]: 'Review Not Assigned',
    [REVIEW_STATUSES.ASSIGNED]: 'Review Assigned',
    [REVIEW_STATUSES.IN_PROGRESS]: 'Review In Progress',
    [REVIEW_STATUSES.PENDING]: 'Review Pending',
    [REVIEW_STATUSES.COMPLETED]: 'Review Complete'
  };

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (user.role === 'warehouse_admin') {
        const [bundlesData, usersData, tasksData] = await Promise.all([
          api.getLoadBundles(),
          api.getWarehouseUsers(),
          api.getReviewTasks()
        ]);
        setLoadBundles(bundlesData || []);
        setWarehouseUsers(usersData || []);
        setReviewTasks(tasksData || []);
      } else {
        const tasksData = await api.getUserReviewTasks(user.id);
        setReviewTasks(tasksData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (bundleId) => {
    if (!assignedUserId) {
      setError('Please select a warehouse user');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await api.assignReviewTask({
        load_bundle_id: bundleId,
        assigned_to_user_id: assignedUserId,
        assigned_by_user_id: user.id,
        status: REVIEW_STATUSES.ASSIGNED
      });
      
      setSuccess('Task assigned successfully!');
      setAssignedUserId('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    setLoading(true);
    setError('');
    
    try {
      await api.updateReviewTaskStatus(taskId, {
        status: newStatus,
        updated_by_user_id: user.id
      });
      
      setSuccess('Task status updated successfully!');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTaskDetails = (task) => {
    setSelectedTask(task);
    setView('task-details');
  };

  const getStatusBadge = (status) => (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: STATUS_COLORS[status] || '#95a5a6'
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );

  if (view === 'task-details' && selectedTask) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#74b9ff 0%,#0984e3 100%)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '28px' }}>📋 Task Details</h2>
            <p style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.8)' }}>Review task information</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={S.btnSecondary} onClick={() => setView(user.role === 'warehouse_admin' ? 'dashboard' : 'tasks')}>
              ← Back
            </button>
            <button style={S.btnSecondary} onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            <div>
              <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Bundle Information</h3>
              <p style={{ margin: '5px 0' }}><strong>Bundle Number:</strong> {selectedTask.load_bundle_number}</p>
              <p style={{ margin: '5px 0' }}><strong>Lorry Number:</strong> {selectedTask.lorry_number}</p>
              <p style={{ margin: '5px 0' }}><strong>Total Weight:</strong> {selectedTask.total_weight} kg</p>
              <p style={{ margin: '5px 0' }}><strong>Items Count:</strong> {selectedTask.items_count}</p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Task Information</h3>
              <p style={{ margin: '5px 0' }}><strong>Status:</strong> {getStatusBadge(selectedTask.status)}</p>
              <p style={{ margin: '5px 0' }}><strong>Assigned To:</strong> {selectedTask.assigned_to_name || 'Not assigned'}</p>
              <p style={{ margin: '5px 0' }}><strong>Assigned By:</strong> {selectedTask.assigned_by_name}</p>
              <p style={{ margin: '5px 0' }}><strong>Created At:</strong> {new Date(selectedTask.created_at).toLocaleString()}</p>
            </div>
          </div>

          {user.role === 'warehouse_user' && (
            <div style={{ marginTop: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Update Status</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedTask.status === REVIEW_STATUSES.ASSIGNED && (
                  <button
                    style={{ ...S.btnPrimary, backgroundColor: STATUS_COLORS[REVIEW_STATUSES.IN_PROGRESS] }}
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, REVIEW_STATUSES.IN_PROGRESS)}
                    disabled={loading}
                  >
                    Start Review
                  </button>
                )}
                {selectedTask.status === REVIEW_STATUSES.IN_PROGRESS && (
                  <button
                    style={{ ...S.btnPrimary, backgroundColor: STATUS_COLORS[REVIEW_STATUSES.PENDING] }}
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, REVIEW_STATUSES.PENDING)}
                    disabled={loading}
                  >
                    Mark as Pending
                  </button>
                )}
                {selectedTask.status === REVIEW_STATUSES.PENDING && (
                  <button
                    style={{ ...S.btnPrimary, backgroundColor: STATUS_COLORS[REVIEW_STATUSES.COMPLETED] }}
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, REVIEW_STATUSES.COMPLETED)}
                    disabled={loading}
                  >
                    Complete Review
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <div style={S.error}>{error}</div>}
          {success && <div style={S.success}>{success}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#74b9ff 0%,#0984e3 100%)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '28px' }}>🏭 Warehouse Module</h2>
          <p style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.8)' }}>
            {user.role === 'warehouse_admin' ? 'Admin Dashboard' : 'My Tasks'}
          </p>
        </div>
        <button style={S.btnSecondary} onClick={onLogout}>
          Logout
        </button>
      </div>

      {user.role === 'warehouse_admin' && (
        <div style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              style={{
                ...S.btnPrimary,
                backgroundColor: view === 'dashboard' ? '#2980b9' : '#3498db'
              }}
              onClick={() => setView('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              style={{
                ...S.btnPrimary,
                backgroundColor: view === 'tasks' ? '#2980b9' : '#3498db'
              }}
              onClick={() => setView('tasks')}
            >
              📋 Review Tasks
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            Loading...
          </div>
        ) : user.role === 'warehouse_admin' && view === 'dashboard' ? (
          /* Admin Dashboard View */
          <div>
            <h3 style={{ margin: '0 0 25px 0', color: '#2c3e50', fontSize: '20px' }}>📊 Load Bundles Overview</h3>
            
            {loadBundles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                No load bundles found
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Bundle Number</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Lorry Number</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total Weight (kg)</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Items Count</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadBundles.map((bundle, index) => (
                      <tr key={bundle.id} style={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{bundle.load_bundle_number}</td>
                        <td style={{ padding: '12px' }}>{bundle.lorry_number}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{bundle.total_weight}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{bundle.items_count}</td>
                        <td style={{ padding: '12px' }}>
                          {bundle.review_status ? getStatusBadge(bundle.review_status) : 'No review'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {bundle.review_status === REVIEW_STATUSES.NOT_ASSIGNED && (
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                              <select
                                value={assignedUserId}
                                onChange={(e) => setAssignedUserId(e.target.value)}
                                style={{ padding: '4px', fontSize: '12px', borderRadius: '4px' }}
                              >
                                <option value="">Select User</option>
                                {warehouseUsers.map(user => (
                                  <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                              </select>
                              <button
                                style={{
                                  ...S.btnPrimary,
                                  padding: '4px 8px',
                                  fontSize: '12px'
                                }}
                                onClick={() => handleAssignTask(bundle.id)}
                                disabled={loading || !assignedUserId}
                              >
                                Assign
                              </button>
                            </div>
                          )}
                          {bundle.review_status !== REVIEW_STATUSES.NOT_ASSIGNED && (
                            <button
                              style={{
                                ...S.btnSecondary,
                                padding: '4px 8px',
                                fontSize: '12px'
                              }}
                              onClick={() => handleViewTaskDetails(bundle)}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Tasks View (Admin or User) */
          <div>
            <h3 style={{ margin: '0 0 25px 0', color: '#2c3e50', fontSize: '20px' }}>
              📋 {user.role === 'warehouse_admin' ? 'All Review Tasks' : 'My Review Tasks'}
            </h3>
            
            {reviewTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                No review tasks found
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Bundle Number</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Lorry Number</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total Weight (kg)</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Assigned To</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewTasks.map((task, index) => (
                      <tr key={task.id} style={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{task.load_bundle_number}</td>
                        <td style={{ padding: '12px' }}>{task.lorry_number}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{task.total_weight}</td>
                        <td style={{ padding: '12px' }}>{task.assigned_to_name || 'Not assigned'}</td>
                        <td style={{ padding: '12px' }}>{getStatusBadge(task.status)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            style={{
                              ...S.btnPrimary,
                              padding: '4px 8px',
                              fontSize: '12px'
                            }}
                            onClick={() => handleViewTaskDetails(task)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {error && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}
      </div>
    </div>
  );
}

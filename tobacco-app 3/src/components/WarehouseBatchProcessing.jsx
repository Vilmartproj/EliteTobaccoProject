import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import QRCameraScanner from './QRCameraScanner';
import QRCode from './QRCode';
import { formatDateTime } from '../utils/dateFormat';

const PROCESSING_ALLOWED_ROLES = new Set(['classification', 'supervisor']);

const cardStyle = {
  ..._S.card,
  border: '1px solid #b7d9f8',
  boxShadow: '0 4px 16px rgba(39,128,227,0.16)',
};

function toStageLabel(stageKey, stages) {
  return stages.find((stage) => stage.key === stageKey)?.label || stageKey || '-';
}

function parseWorkers(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function WarehouseBatchProcessing({ user }) {
  const canProcess = PROCESSING_ALLOWED_ROLES.has(String(user?.role || '').toLowerCase());

  const [stages, setStages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);

  const [scanCode, setScanCode] = useState('');
  const [pendingCodes, setPendingCodes] = useState([]);
  const [reAddCode, setReAddCode] = useState('');

  const [stageWorkersText, setStageWorkersText] = useState('');
  const [stageQuantity, setStageQuantity] = useState('');
  const [stageNote, setStageNote] = useState('');

  const [exportGrade, setExportGrade] = useState('');
  const [exportQuantity, setExportQuantity] = useState('');
  const [exportCode, setExportCode] = useState('');

  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyProgress, setDailyProgress] = useState({ date: null, stages: [] });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const activeStageKey = activeBatch?.current_stage_key || '';
  const activeStageLabel = toStageLabel(activeStageKey, stages);

  const activeItemCount = useMemo(
    () => (activeBatch?.items || []).filter((item) => item.status === 'active').length,
    [activeBatch]
  );

  const loadBaseData = async () => {
    const [stageRows, batchRows] = await Promise.all([
      api.getProcessingStages(),
      api.getProcessingBatches(),
    ]);
    setStages(stageRows || []);
    setBatches(batchRows || []);

    if (!activeBatchId && batchRows.length > 0) {
      setActiveBatchId(batchRows[0].id);
    }

    if (activeBatchId && !batchRows.find((row) => row.id === activeBatchId)) {
      setActiveBatchId(batchRows.length > 0 ? batchRows[0].id : null);
    }
  };

  const loadActiveBatch = async (batchId) => {
    if (!batchId) {
      setActiveBatch(null);
      return;
    }
    const detail = await api.getProcessingBatchById(batchId);
    setActiveBatch(detail);
  };

  const loadDailyProgress = async (date) => {
    const data = await api.getDailyProcessingProgress(date);
    setDailyProgress(data || { date, stages: [] });
  };

  useEffect(() => {
    if (!canProcess) return;
    loadBaseData().catch((error) => setMessage(error.message));
  }, [canProcess]);

  useEffect(() => {
    if (!canProcess) return;
    loadActiveBatch(activeBatchId).catch((error) => setMessage(error.message));
  }, [canProcess, activeBatchId]);

  useEffect(() => {
    if (!canProcess) return;
    loadDailyProgress(dailyDate).catch((error) => setMessage(error.message));
  }, [canProcess, dailyDate]);

  const addPendingCode = (rawValue) => {
    const normalized = String(rawValue || '').replace(/[\r\n\t]/g, '').trim();
    if (!normalized) return;
    setPendingCodes((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setScanCode('');
  };

  const removePendingCode = (code) => {
    setPendingCodes((prev) => prev.filter((value) => value !== code));
  };

  const createBatch = async () => {
    if (pendingCodes.length === 0) {
      setMessage('Add at least one QR code before creating a batch');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const result = await api.createProcessingBatch({
        qr_codes: pendingCodes,
        actor_id: user.id,
        actor_role: user.role,
      });
      setPendingCodes([]);
      setActiveBatchId(result?.batch?.id || null);
      await loadBaseData();
      if (result?.batch?.id) await loadActiveBatch(result.batch.id);
      setMessage('Batch created successfully');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitStageAction = async (action) => {
    if (!activeBatch || !activeStageKey) return;
    const payload = {
      action,
      actor_id: user.id,
      actor_role: user.role,
      worker_names: parseWorkers(stageWorkersText),
      note: stageNote,
    };
    if (action === 'finish') payload.total_quantity = Number(stageQuantity || 0);

    setBusy(true);
    setMessage('');
    try {
      await api.updateProcessingStage(activeBatch.id, activeStageKey, payload);
      await loadBaseData();
      await loadActiveBatch(activeBatch.id);
      setStageQuantity('');
      setStageNote('');
      setMessage(`${activeStageLabel} marked as ${action === 'start' ? 'started' : 'finished'}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const removeBatchItem = async (itemId) => {
    if (!activeBatch) return;
    setBusy(true);
    setMessage('');
    try {
      await api.removeProcessingBatchItem(activeBatch.id, itemId, {
        actor_id: user.id,
        actor_role: user.role,
      });
      await loadBaseData();
      await loadActiveBatch(activeBatch.id);
      setMessage('Item removed from active batch');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const addItemToBatch = async () => {
    if (!activeBatch) return;
    const normalized = String(reAddCode || '').replace(/[\r\n\t]/g, '').trim();
    if (!normalized) return;

    setBusy(true);
    setMessage('');
    try {
      await api.addProcessingBatchItems(activeBatch.id, {
        qr_codes: [normalized],
        actor_id: user.id,
        actor_role: user.role,
      });
      setReAddCode('');
      await loadBaseData();
      await loadActiveBatch(activeBatch.id);
      setMessage('Batch item added');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const createExportBag = async () => {
    if (!activeBatch) return;
    const quantity = Number(exportQuantity || 0);
    if (!exportGrade.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setMessage('Provide export grade and a valid quantity');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await api.createProcessingExportBags(activeBatch.id, {
        actor_id: user.id,
        actor_role: user.role,
        bags: [
          {
            grade: exportGrade.trim(),
            quantity,
            export_unique_code: String(exportCode || '').trim(),
          },
        ],
      });
      setExportQuantity('');
      setExportCode('');
      await loadActiveBatch(activeBatch.id);
      setMessage('Export bag created');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!canProcess) {
    return (
      <div style={cardStyle}>
        <div style={_S.subheading}>Classification Batch Processing</div>
        <div style={{ color: '#b91c1c', fontWeight: 600 }}>
          Your role is not authorized for batch processing actions.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={_S.subheading}>Batch-Based Classification Processing</div>
      {message && <div style={message.toLowerCase().includes('success') || message.toLowerCase().includes('created') ? _S.success : _S.error}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: '#1b3555', marginBottom: 8 }}>Create Batch from Bag QR Codes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              style={_S.input}
              placeholder="Scan or enter QR code"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPendingCode(scanCode);
                }
              }}
            />
            <button style={{ ..._S.btnSecondary, flex: 'none' }} onClick={() => addPendingCode(scanCode)}>Add</button>
            <QRCameraScanner onDetected={(value) => addPendingCode(value)} buttonLabel="Scan" />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {pendingCodes.map((code) => (
              <button key={code} style={{ ..._S.badge(), cursor: 'pointer' }} onClick={() => removePendingCode(code)}>
                {code} x
              </button>
            ))}
            {pendingCodes.length === 0 && <span style={{ color: '#777' }}>No codes selected yet</span>}
          </div>

          <button
            style={{ ..._S.btnPrimary, width: '100%', opacity: busy ? 0.7 : 1 }}
            onClick={createBatch}
            disabled={busy}
          >
            Create Processing Batch
          </button>
        </div>

        <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: '#1b3555', marginBottom: 8 }}>Daily Stage Progress</div>
          <input style={_S.input} type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
          <div style={{ marginTop: 8, maxHeight: 230, overflow: 'auto' }}>
            {(dailyProgress.stages || []).length === 0 ? (
              <div style={{ color: '#777' }}>No stage completions for selected day.</div>
            ) : (
              (dailyProgress.stages || []).map((row) => (
                <div key={row.stage_key} style={{ padding: '6px 0', borderBottom: '1px solid #eef4fb' }}>
                  <div style={{ fontWeight: 700 }}>{row.stage_label}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    Batches: {row.total_batches} | Quantity: {Number(row.total_quantity || 0).toFixed(2)}
                  </div>
                  {(row.workers || []).map((worker) => (
                    <div key={`${row.stage_key}-${worker.worker_name}`} style={{ fontSize: 12, color: '#666' }}>
                      {worker.worker_name}: entries {worker.entries}, qty {Number(worker.quantity || 0).toFixed(2)}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={_S.table}>
          <thead>
            <tr>
              <th style={_S.th}>Open</th>
              <th style={_S.th}>Batch Code</th>
              <th style={_S.th}>Status</th>
              <th style={_S.th}>Current Stage</th>
              <th style={_S.th}>Items</th>
              <th style={_S.th}>Weight</th>
              <th style={_S.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} style={{ background: batch.id === activeBatchId ? '#fff3f3' : undefined }}>
                <td style={_S.td}>
                  <button style={{ ..._S.btnSecondary, flex: 'none', padding: '4px 8px' }} onClick={() => setActiveBatchId(batch.id)}>Open</button>
                </td>
                <td style={_S.td}>{batch.batch_code}</td>
                <td style={_S.td}><span style={_S.badge(batch.status === 'completed' ? 'green' : undefined)}>{batch.status}</span></td>
                <td style={_S.td}>{toStageLabel(batch.current_stage_key, stages)}</td>
                <td style={_S.td}>{batch.item_count}</td>
                <td style={_S.td}>{Number(batch.total_weight || 0).toFixed(2)}</td>
                <td style={_S.td}>{formatDateTime(batch.created_at)}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td style={_S.td} colSpan={7}>No processing batches created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeBatch && (
        <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, color: '#1b3555', marginBottom: 8 }}>
            Active Batch: {activeBatch.batch_code}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={_S.badge()}>Status: {activeBatch.status}</span>
            <span style={_S.badge('green')}>Current Stage: {activeStageLabel}</span>
            <span style={_S.badge()}>Items: {activeItemCount}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Stage Action</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                Stage actions are batch-level only. Legacy per-bag stage processing is disabled.
              </div>
              <input
                style={{ ..._S.input, marginBottom: 6 }}
                placeholder="Workers (comma separated)"
                value={stageWorkersText}
                onChange={(e) => setStageWorkersText(e.target.value)}
              />
              <input
                style={{ ..._S.input, marginBottom: 6 }}
                placeholder="Total quantity for finish"
                value={stageQuantity}
                onChange={(e) => setStageQuantity(e.target.value)}
              />
              <input
                style={{ ..._S.input, marginBottom: 8 }}
                placeholder="Optional note"
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={_S.btnSecondary} disabled={busy || activeBatch.status === 'completed'} onClick={() => submitStageAction('start')}>Start Stage</button>
                <button style={_S.btnPrimary} disabled={busy || activeBatch.status === 'completed'} onClick={() => submitStageAction('finish')}>Finish Stage</button>
              </div>
            </div>

            <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Batch Item Re-Grouping</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
                <input style={_S.input} placeholder="QR code to add back" value={reAddCode} onChange={(e) => setReAddCode(e.target.value)} />
                <button style={{ ..._S.btnSecondary, flex: 'none' }} onClick={addItemToBatch} disabled={busy || activeBatch.status === 'completed'}>Add</button>
                <QRCameraScanner onDetected={(value) => setReAddCode(value)} buttonLabel="Scan" />
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                Remove unwanted items below and add corrected QRs here for partial batching and reprocessing.
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 10 }}>
            <table style={_S.table}>
              <thead>
                <tr>
                  <th style={_S.th}>QR Code</th>
                  <th style={_S.th}>Weight</th>
                  <th style={_S.th}>Value</th>
                  <th style={_S.th}>Status</th>
                  <th style={_S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(activeBatch.items || []).map((item) => (
                  <tr key={item.id} style={{ opacity: item.status === 'removed' ? 0.5 : 1 }}>
                    <td style={{ ..._S.td, fontFamily: 'monospace' }}>{item.unique_code}</td>
                    <td style={_S.td}>{Number(item.weight || 0).toFixed(2)}</td>
                    <td style={_S.td}>{Number(item.bale_value || 0).toFixed(2)}</td>
                    <td style={_S.td}>{item.status}</td>
                    <td style={_S.td}>
                      {item.status === 'active' ? (
                        <button
                          style={{ ..._S.btnSecondary, flex: 'none', padding: '4px 8px' }}
                          onClick={() => removeBatchItem(item.id)}
                          disabled={busy || activeBatch.status === 'completed'}
                        >
                          Remove
                        </button>
                      ) : ' - '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Stage History</div>
            {(activeBatch.stage_logs || []).length === 0 ? (
              <div style={{ color: '#777' }}>No stage logs yet.</div>
            ) : (
              (activeBatch.stage_logs || []).map((log) => (
                <div key={log.id} style={{ borderBottom: '1px solid #f1f5fb', padding: '5px 0' }}>
                  <div style={{ fontWeight: 600 }}>
                    {log.stage_label} - {log.action}
                  </div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    Qty: {log.total_quantity ?? '-'} | Workers: {(log.worker_names || []).join(', ') || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: '#777' }}>
                    {formatDateTime(log.logged_at)} by {log.logged_by_name || log.logged_by_role || '-'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Export Bagging</div>
            {activeBatch.status !== 'completed' ? (
              <div style={{ color: '#777' }}>Complete all stages to enable export bag creation.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input style={_S.input} placeholder="Export grade" value={exportGrade} onChange={(e) => setExportGrade(e.target.value)} />
                  <input style={_S.input} placeholder="Quantity" value={exportQuantity} onChange={(e) => setExportQuantity(e.target.value)} />
                  <input style={_S.input} placeholder="Optional export QR code" value={exportCode} onChange={(e) => setExportCode(e.target.value)} />
                  <button style={{ ..._S.btnPrimary, flex: 'none' }} onClick={createExportBag} disabled={busy}>Create Export Bag</button>
                </div>
                {(activeBatch.export_bags || []).length === 0 ? (
                  <div style={{ color: '#777' }}>No export bags created yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {(activeBatch.export_bags || []).map((row) => (
                      <div key={row.id} style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{row.export_unique_code}</div>
                        <QRCode value={row.export_unique_code} size={96} />
                        <div style={{ fontSize: 12, marginTop: 6 }}>Grade: {row.grade}</div>
                        <div style={{ fontSize: 12 }}>Qty: {Number(row.quantity || 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

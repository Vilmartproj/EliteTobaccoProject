import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { S as _S } from '../styles';
import QRCameraScanner from './QRCameraScanner';
import QRCode from './QRCode';
import { formatDateTime } from '../utils/dateFormat';
import { exportCSV } from '../utils/exportCSV';

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

function formatActionLabel(action) {
  const labels = {
    started: 'Started',
    finished: 'Finished',
    paused: 'Paused',
    resumed: 'Resumed',
    note: 'Note',
  };
  return labels[action] || action || '-';
}

const PROCESSING_STAGE_ORDER = [
  { key: 'butting', label: 'Butting' },
  { key: 'stripping', label: 'Stripping' },
  { key: 'kutcha', label: 'Kutcha' },
  { key: 'threshing', label: 'Threshing' },
  { key: 'grading', label: 'Grading' },
  { key: 'packing', label: 'Packing' },
];

const STAGE_PARAMETER_FIELDS = {
  butting: [
    { key: 'machine_id', label: 'Machine ID', type: 'text' },
    { key: 'input_bales', label: 'Input Bales', type: 'number' },
    { key: 'input_weight', label: 'Input Weight (kg)', type: 'number' },
    { key: 'stalk_removal_pct', label: 'Stalk Removal %', type: 'number' },
    { key: 'output_weight', label: 'Output Weight (kg)', type: 'number' },
    { key: 'waste_weight', label: 'Waste Weight (kg)', type: 'number' },
  ],
  stripping: [
    { key: 'machine_id', label: 'Machine ID', type: 'text' },
    { key: 'input_weight', label: 'Input Weight (kg)', type: 'number' },
    { key: 'leaf_recovery_pct', label: 'Leaf Recovery %', type: 'number' },
    { key: 'output_weight', label: 'Output Weight (kg)', type: 'number' },
  ],
  kutcha: [
    { key: 'machine_id', label: 'Machine ID', type: 'text' },
    { key: 'moisture_pct', label: 'Moisture %', type: 'number' },
    { key: 'cut_size_mm', label: 'Cut Size (mm)', type: 'number' },
    { key: 'output_weight', label: 'Output Weight (kg)', type: 'number' },
  ],
  threshing: [
    { key: 'machine_id', label: 'Machine ID', type: 'text' },
    { key: 'feed_rate_kgph', label: 'Feed Rate (kg/h)', type: 'number' },
    { key: 'waste_pct', label: 'Waste %', type: 'number' },
    { key: 'output_weight', label: 'Output Weight (kg)', type: 'number' },
  ],
  grading: [
    { key: 'machine_id', label: 'Machine ID', type: 'text' },
    { key: 'grade_mix', label: 'Grade Mix', type: 'text' },
    { key: 'uniformity_pct', label: 'Uniformity %', type: 'number' },
    { key: 'output_weight', label: 'Output Weight (kg)', type: 'number' },
  ],
  packing: [
    { key: 'machine_id', label: 'Machine ID', type: 'text' },
    { key: 'pack_count', label: 'Pack Count', type: 'number' },
    { key: 'pack_weight', label: 'Pack Weight', type: 'number' },
    { key: 'output_weight', label: 'Output Weight (kg)', type: 'number' },
  ],
};

const STAGE_COMMON_FIELDS = [
  { key: 'efficiency_pct', label: 'Efficiency %', type: 'number' },
  { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number' },
];

function formatStagesCompleted(stages) {
  return Object.entries(stages || {})
    .map(([stageKey, count]) => `${toStageLabel(stageKey, PROCESSING_STAGE_ORDER)} x${count}`)
    .join(', ');
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
  const [stageOutputBagCount, setStageOutputBagCount] = useState('');
  const [stageOutputGrade, setStageOutputGrade] = useState('');
  const [stageOutputDetails, setStageOutputDetails] = useState('');
  const [stageMetrics, setStageMetrics] = useState({});
  const [stageNote, setStageNote] = useState('');

  const [exportGrade, setExportGrade] = useState('');
  const [exportQuantity, setExportQuantity] = useState('');
  const [exportCode, setExportCode] = useState('');

  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyProgress, setDailyProgress] = useState({ date: null, stages: [] });
  const [batchReports, setBatchReports] = useState({ summary: null, grade_distribution: [], worker_productivity: [], batches: [] });
  const [missingStageAlerts, setMissingStageAlerts] = useState([]);
  const [traceability, setTraceability] = useState({ batches: [] });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedStageKey, setSelectedStageKey] = useState('');

  const activeStageKey = activeBatch?.current_stage_key || '';
  const activeStageLabel = toStageLabel(activeStageKey, stages);
  const activeStageIndex = PROCESSING_STAGE_ORDER.findIndex((stage) => stage.key === activeStageKey);

  const stageTabs = useMemo(
    () => PROCESSING_STAGE_ORDER.map((stage) => ({ key: stage.key, label: toStageLabel(stage.key, stages) })),
    [stages]
  );

  const isSelectedStageCurrent = !selectedStageKey || selectedStageKey === activeStageKey;
  const stageParameterFields = useMemo(() => {
    const target = selectedStageKey || activeStageKey;
    if (!target) return [];
    return [...(STAGE_PARAMETER_FIELDS[target] || []), ...STAGE_COMMON_FIELDS];
  }, [selectedStageKey, activeStageKey]);

  const activeItemCount = useMemo(
    () => (activeBatch?.items || []).filter((item) => item.status === 'active').length,
    [activeBatch]
  );

  const batchStatusSummary = useMemo(() => {
    const summary = { open: 0, in_progress: 0, paused: 0, completed: 0 };
    for (const row of batches) {
      const key = String(row.status || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(summary, key)) summary[key] += 1;
    }
    return summary;
  }, [batches]);

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

  const loadBatchReports = async (batchId) => {
    if (!batchId) {
      setBatchReports({ summary: null, grade_distribution: [], worker_productivity: [], batches: [] });
      return;
    }
    const data = await api.getProcessingReports({ batch_id: batchId });
    setBatchReports(data || { summary: null, grade_distribution: [], worker_productivity: [], batches: [] });
  };

  const loadMissingStageAlerts = async () => {
    const data = await api.getProcessingMissingStageAlerts();
    setMissingStageAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
  };

  const loadTraceability = async (batchId) => {
    if (!batchId) {
      setTraceability({ batches: [] });
      return;
    }
    const data = await api.getProcessingTraceability({ batch_id: batchId });
    setTraceability(data || { batches: [] });
  };

  useEffect(() => {
    if (!canProcess) return;
    loadBaseData().catch((error) => setMessage(error.message));
    loadMissingStageAlerts().catch((error) => setMessage(error.message));
  }, [canProcess]);

  useEffect(() => {
    if (!canProcess) return;
    loadActiveBatch(activeBatchId).catch((error) => setMessage(error.message));
  }, [canProcess, activeBatchId]);

  useEffect(() => {
    if (!canProcess) return;
    loadDailyProgress(dailyDate).catch((error) => setMessage(error.message));
  }, [canProcess, dailyDate]);

  useEffect(() => {
    if (!canProcess) return;
    loadBatchReports(activeBatchId).catch((error) => setMessage(error.message));
    loadTraceability(activeBatchId).catch((error) => setMessage(error.message));
  }, [canProcess, activeBatchId]);

  useEffect(() => {
    if (!activeStageKey) {
      setSelectedStageKey('');
      return;
    }
    setSelectedStageKey(activeStageKey);
  }, [activeStageKey]);

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
    const targetStageKey = selectedStageKey || activeStageKey;
    if (targetStageKey !== activeStageKey) {
      setMessage(`Only current stage (${activeStageLabel}) can be processed now`);
      return;
    }

    const payload = {
      action,
      actor_id: user.id,
      actor_role: user.role,
      worker_names: parseWorkers(stageWorkersText),
      note: stageNote,
      stage_metrics: Object.fromEntries(
        Object.entries(stageMetrics).filter(([, value]) => String(value || '').trim() !== '')
          .map(([key, value]) => {
            if (['machine_id', 'grade_mix'].includes(key)) return [key, String(value).trim()];
            const numeric = Number(value);
            return [key, Number.isFinite(numeric) ? numeric : String(value).trim()];
          })
      ),
      machine_id: String(stageMetrics.machine_id || '').trim(),
    };
    for (const key of ['input_bales', 'input_weight', 'output_weight', 'waste_weight', 'efficiency_pct', 'duration_minutes']) {
      if (stageMetrics[key] === undefined || stageMetrics[key] === null || String(stageMetrics[key]).trim() === '') continue;
      const numeric = Number(stageMetrics[key]);
      payload[key] = Number.isFinite(numeric) ? numeric : stageMetrics[key];
    }
    if (action === 'finish') {
      payload.total_quantity = Number(stageQuantity || 0);
      if (stageOutputBagCount !== '') payload.output_bag_count = Number(stageOutputBagCount);
      if (stageOutputGrade.trim()) payload.output_grade = stageOutputGrade.trim();
      if (stageOutputDetails.trim()) payload.output_details = stageOutputDetails.trim();
    }

    setBusy(true);
    setMessage('');
    try {
      await api.updateProcessingStage(activeBatch.id, targetStageKey, payload);
      await loadBaseData();
      await loadActiveBatch(activeBatch.id);
      setStageQuantity('');
      setStageOutputBagCount('');
      setStageOutputGrade('');
      setStageOutputDetails('');
      setStageMetrics({});
      setStageNote('');
      await loadBatchReports(activeBatch.id);
      await loadMissingStageAlerts();
      await loadTraceability(activeBatch.id);
      setMessage(`${toStageLabel(targetStageKey, stages)} marked as ${action === 'start' ? 'started' : 'finished'}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const updateBatchStatus = async (action) => {
    if (!activeBatch) return;

    setBusy(true);
    setMessage('');
    try {
      await api.updateProcessingBatchStatus(activeBatch.id, {
        action,
        actor_id: user.id,
        actor_role: user.role,
        note: stageNote,
      });
      await loadBaseData();
      await loadActiveBatch(activeBatch.id);
      await loadBatchReports(activeBatch.id);
      await loadMissingStageAlerts();
      setMessage(`Batch ${action === 'pause' ? 'paused' : 'resumed'} successfully`);
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
      await loadBatchReports(activeBatch.id);
      await loadMissingStageAlerts();
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
      await loadBatchReports(activeBatch.id);
      await loadMissingStageAlerts();
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
      await loadBatchReports(activeBatch.id);
      await loadMissingStageAlerts();
      await loadTraceability(activeBatch.id);
      setMessage('Export bag created');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const exportReportCsv = () => {
    if (!batchReports?.summary) {
      setMessage('No report data available to export');
      return;
    }
    const rows = [
      {
        section: 'summary',
        total_batches: batchReports.summary.total_batches || 0,
        total_input_weight: batchReports.summary.total_input_weight || 0,
        total_output_quantity: batchReports.summary.total_output_quantity || 0,
        total_output_bags: batchReports.summary.total_output_bags || 0,
        yield_percentage: batchReports.summary.yield_percentage || 0,
      },
      ...(batchReports.grade_distribution || []).map((row) => ({
        section: 'grade_distribution',
        grade: row.grade,
        bag_count: row.bag_count,
        total_quantity: row.total_quantity,
      })),
      ...(batchReports.worker_productivity || []).map((row) => ({
        section: 'worker_productivity',
        worker_name: row.worker_name,
        entries: row.entries,
        total_quantity: row.total_quantity,
        stages: formatStagesCompleted(row.stages),
      })),
    ];
    exportCSV(rows, `processing-report-${activeBatch?.batch_code || 'batch'}.csv`);
  };

  const exportReportPdf = () => {
    const targetBatchId = activeBatch?.id;
    if (!targetBatchId) {
      setMessage('Select a batch to export PDF report');
      return;
    }
    const url = api.getProcessingReportExportUrl({ batch_id: targetBatchId, format: 'pdf' });
    window.open(url, '_blank', 'width=1200,height=850');
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
      <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
        Mandatory sequence: Butting -&gt; Stripping -&gt; Kutcha -&gt; Threshing -&gt; Grading -&gt; Packing.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={_S.badge()}>Open: {batchStatusSummary.open}</span>
        <span style={_S.badge('green')}>In Progress: {batchStatusSummary.in_progress}</span>
        <span style={_S.badge()}>Paused: {batchStatusSummary.paused}</span>
        <span style={_S.badge()}>Completed: {batchStatusSummary.completed}</span>
      </div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
        Multiple batches can run in parallel. Select a batch below and the stage workflow panel will follow that selected batch.
      </div>

      <div style={{ marginBottom: 12, maxWidth: 420 }}>
        <label style={{ ..._S.label, marginBottom: 4 }}>Selected Batch</label>
        <select
          style={_S.input}
          value={activeBatchId || ''}
          onChange={(e) => {
            const value = Number(e.target.value);
            setActiveBatchId(Number.isFinite(value) && value > 0 ? value : null);
          }}
        >
          {batches.length === 0 ? (
            <option value="">No batches available</option>
          ) : (
            batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batch_code} | {batch.status} | {toStageLabel(batch.current_stage_key, stages)}
              </option>
            ))
          )}
        </select>
      </div>

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
              <th style={_S.th}>Select</th>
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
                  <button
                    style={{ ..._S.btnSecondary, flex: 'none', padding: '4px 8px' }}
                    onClick={() => setActiveBatchId(batch.id)}
                  >
                    {batch.id === activeBatchId ? 'Selected' : 'Select'}
                  </button>
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
            {activeBatch.paused_at && <span style={_S.badge()}>Last Paused: {formatDateTime(activeBatch.paused_at)}</span>}
            {activeBatch.resumed_at && activeBatch.status !== 'paused' && <span style={_S.badge()}>Last Resumed: {formatDateTime(activeBatch.resumed_at)}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Stage Action</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                Stage actions are batch-level only. Stages cannot be skipped or reordered.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {stageTabs.map((stage, index) => {
                  const isDone = activeStageIndex >= 0 && index < activeStageIndex;
                  const isCurrent = stage.key === activeStageKey;
                  const isSelected = stage.key === selectedStageKey;
                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setSelectedStageKey(stage.key)}
                      style={{
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        border: isSelected ? '2px solid #0f4c81' : '1px solid #c6dcf3',
                        background: isCurrent ? '#d7ecff' : isDone ? '#ecfdf3' : '#f8fbff',
                        color: '#1b3555',
                        cursor: 'pointer',
                      }}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
              {!isSelectedStageCurrent && (
                <div style={{ fontSize: 12, color: '#b45309', marginBottom: 8 }}>
                  Selected tab is not the current stage. Current stage is {activeStageLabel}.
                </div>
              )}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 6 }}>
                {stageParameterFields.map((field) => (
                  <input
                    key={field.key}
                    style={_S.input}
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.label}
                    value={stageMetrics[field.key] || ''}
                    onChange={(e) => setStageMetrics((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ))}
              </div>
              <input
                style={{ ..._S.input, marginBottom: 6 }}
                placeholder="Output bag count"
                value={stageOutputBagCount}
                onChange={(e) => setStageOutputBagCount(e.target.value)}
              />
              <input
                style={{ ..._S.input, marginBottom: 6 }}
                placeholder="Output grade"
                value={stageOutputGrade}
                onChange={(e) => setStageOutputGrade(e.target.value)}
              />
              <textarea
                style={{ ..._S.input, marginBottom: 6, minHeight: 74, resize: 'vertical' }}
                placeholder="Output details"
                value={stageOutputDetails}
                onChange={(e) => setStageOutputDetails(e.target.value)}
              />
              <input
                style={{ ..._S.input, marginBottom: 8 }}
                placeholder="Optional note"
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                <button style={_S.btnSecondary} disabled={busy || activeBatch.status === 'completed' || activeBatch.status === 'paused' || !isSelectedStageCurrent} onClick={() => submitStageAction('start')}>Start Stage</button>
                <button style={_S.btnPrimary} disabled={busy || activeBatch.status === 'completed' || activeBatch.status === 'paused' || !isSelectedStageCurrent} onClick={() => submitStageAction('finish')}>Finish Stage</button>
                <button style={_S.btnSecondary} disabled={busy || activeBatch.status !== 'in_progress'} onClick={() => updateBatchStatus('pause')}>Pause Batch</button>
                <button style={_S.btnPrimary} disabled={busy || activeBatch.status !== 'paused'} onClick={() => updateBatchStatus('resume')}>Resume Batch</button>
              </div>
            </div>

            <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Batch Item Re-Grouping</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
                <input style={_S.input} placeholder="QR code to add back" value={reAddCode} onChange={(e) => setReAddCode(e.target.value)} />
                <button style={{ ..._S.btnSecondary, flex: 'none' }} onClick={addItemToBatch} disabled={busy || activeBatch.status === 'completed' || activeBatch.status === 'paused'}>Add</button>
                <QRCameraScanner onDetected={(value) => setReAddCode(value)} buttonLabel="Scan" />
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                Remove unwanted items below and add corrected QRs here for partial batching and reprocessing. Editing is disabled while the batch is paused.
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
                          disabled={busy || activeBatch.status === 'completed' || activeBatch.status === 'paused'}
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
                    {log.stage_label} - {formatActionLabel(log.action)}
                  </div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    Operator: {log.logged_by_code || log.logged_by_employee_id || '-'} | Qty: {log.total_quantity ?? '-'} | Workers: {(log.worker_names || []).join(', ') || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    Output: bags {log.output_bag_count ?? '-'} | grade {log.output_grade || '-'} | details {log.output_details?.summary || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: '#777' }}>
                    {formatDateTime(log.logged_at)} by {log.logged_by_name || log.logged_by_role || '-'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Batch Reports</div>
            {!batchReports.summary ? (
              <div style={{ color: '#777' }}>No report data available for this batch yet.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <button style={{ ..._S.btnSecondary, flex: 'none' }} onClick={exportReportCsv}>Export CSV</button>
                  <button style={{ ..._S.btnPrimary, flex: 'none' }} onClick={exportReportPdf}>Export PDF</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 10 }}>
                  <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, color: '#666' }}>Input Weight</div>
                    <div style={{ fontWeight: 700 }}>{Number(batchReports.summary.total_input_weight || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, color: '#666' }}>Packed Qty</div>
                    <div style={{ fontWeight: 700 }}>{Number(batchReports.summary.total_output_quantity || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, color: '#666' }}>Yield</div>
                    <div style={{ fontWeight: 700 }}>{Number(batchReports.summary.yield_percentage || 0).toFixed(2)}%</div>
                  </div>
                  <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, color: '#666' }}>Output Bags</div>
                    <div style={{ fontWeight: 700 }}>{batchReports.summary.total_output_bags || 0}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Grade Distribution</div>
                    {(batchReports.grade_distribution || []).length === 0 ? (
                      <div style={{ color: '#777' }}>No packed grades recorded yet.</div>
                    ) : (
                      (batchReports.grade_distribution || []).map((row) => (
                        <div key={row.grade} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eef4fb' }}>
                          {row.grade}: bags {row.bag_count}, qty {Number(row.total_quantity || 0).toFixed(2)}
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Worker Productivity</div>
                    {(batchReports.worker_productivity || []).length === 0 ? (
                      <div style={{ color: '#777' }}>No worker productivity data yet.</div>
                    ) : (
                      (batchReports.worker_productivity || []).map((row) => (
                        <div key={row.worker_name} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eef4fb' }}>
                          <div style={{ fontWeight: 600 }}>{row.worker_name}</div>
                          <div>Entries {row.entries} | Qty {Number(row.total_quantity || 0).toFixed(2)}</div>
                          <div style={{ color: '#666' }}>{formatStagesCompleted(row.stages)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Missing Stage Alerts</div>
            {missingStageAlerts.length === 0 ? (
              <div style={{ color: '#777' }}>No missing-stage alerts right now.</div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {missingStageAlerts.slice(0, 8).map((alertRow) => (
                  <div
                    key={alertRow.batch_id}
                    style={{
                      border: '1px solid #f8d7da',
                      background: '#fff8f8',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {alertRow.batch_code} ({alertRow.status}) - {String(alertRow.severity || '').toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Missing: {(alertRow.missing_stages || []).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #eef4fb', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Traceability and Audit Trail</div>
            {(traceability.batches || []).length === 0 ? (
              <div style={{ color: '#777' }}>No traceability records for selected batch.</div>
            ) : (
              (traceability.batches || []).map((batchRow) => (
                <div key={batchRow.id} style={{ border: '1px solid #d9ebfb', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {batchRow.batch_code} - {batchRow.status}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                    QRs: {(batchRow.items || []).map((item) => item.unique_code).join(', ') || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                    Stage Sessions:
                  </div>
                  {(batchRow.stage_sessions || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: '#777' }}>No stage sessions yet.</div>
                  ) : (
                    (batchRow.stage_sessions || []).map((session) => (
                      <div key={session.id} style={{ fontSize: 12, borderBottom: '1px solid #eef4fb', padding: '4px 0' }}>
                        {session.stage_label}: machine {session.machine_id || '-'} | in {Number(session.input_weight || 0).toFixed(2)} | out {Number(session.output_weight || 0).toFixed(2)} | eff {Number(session.efficiency_pct || 0).toFixed(2)}% | duration {session.duration_minutes ?? '-'} min
                      </div>
                    ))
                  )}
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

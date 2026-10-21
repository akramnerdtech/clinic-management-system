import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FileSearch,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/utils/toast';
import {
  dateKey,
  RANGE_PRESETS,
  resolveRange,
  validateCustomRange,
} from '@/utils/reportRange';
import type { RangePreset } from '@/utils/reportRange';
import { triggerDownload } from '@/utils/exportFile';
import type { GeneratedFile, ReportFormat } from '@/utils/reportExport';
import type { ReportModule } from '@/services/reportService';
import '@/styles/export.css';
import '@/styles/patient-export.css';
import '@/styles/report.css';

interface Props {
  module: ReportModule;
  onClose: () => void;
}

type Phase = 'idle' | 'loading' | 'success' | 'empty' | 'error';

const COPY: Record<ReportModule, { title: string; noun: string }> = {
  patients: { title: 'Export patient records', noun: 'patient' },
  appointments: { title: 'Export appointments', noun: 'appointment' },
  rooms: { title: 'Export rooms & beds report', noun: 'bed record' },
  billing: { title: 'Export billing report', noun: 'billing record' },
  dashboard: { title: 'Export dashboard summary', noun: 'record' },
};

const FORMATS: {
  id: ReportFormat;
  title: string;
  hint: string;
  icon: typeof FileText;
}[] = [
  {
    id: 'pdf',
    title: 'PDF report',
    hint: 'Print-ready, with clinic letterhead',
    icon: FileText,
  },
  {
    id: 'csv',
    title: 'CSV spreadsheet',
    hint: 'Opens in Excel or Google Sheets',
    icon: FileSpreadsheet,
  },
];

/** Keeps the "Generating…" state from flashing past when a small report is ready instantly. */
const MIN_LOADING_MS = 500;

// Loaded on demand so the PDF library and report logic aren't part of the initial page load.
const loadService = () => import('@/services/reportService');
const loadExport = () => import('@/utils/reportExport');

export function ReportModal({ module, onClose }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const today = dateKey(new Date());
  const [preset, setPreset] = useState<RangePreset>('today');
  const [custom, setCustom] = useState({ from: today, to: today });
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<number | null>(null);
  const [downloadedFile, setDownloadedFile] = useState<GeneratedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);

  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);
  const customError = preset === 'custom' ? validateCustomRange(custom) : null;
  const copy = COPY[module];

  // Recalculate preview record count whenever range or module changes
  useEffect(() => {
    if (!range) {
      setPreview(null);
      return;
    }

    let isMounted = true;
    loadService().then((service) => {
      if (!isMounted) return;
      try {
        const dataset = service.buildReport(module, range);
        setPreview(dataset.recordCount);
      } catch {
        setPreview(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [module, range]);

  const handleGenerate = async () => {
    if (!range) {
      toast.error('Choose a valid date range.');
      return;
    }

    setPhase('loading');
    setErrorMessage('');
    const startTime = Date.now();

    try {
      const [service, exporter] = await Promise.all([loadService(), loadExport()]);
      const dataset = service.buildReport(module, range);

      if (dataset.recordCount === 0) {
        setPhase('empty');
        return;
      }

      const clinic = service.getClinicIdentity();
      const meta = {
        clinicName: clinic.name,
        clinicAddress: clinic.address,
        generatedBy: user?.fullName || user?.email || 'Clinical Staff',
        generatedAt: new Date(),
        range,
      };

      const file = exporter.renderReport(format, dataset, meta);

      // Enforce minimum loading time for UI feedback stability
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
      }

      if (cancelledRef.current) return;

      triggerDownload(file.blob, file.filename);
      setDownloadedFile(file);
      setPhase('success');
      toast.success(`${file.filename} generated and downloaded.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not generate report.';
      setErrorMessage(msg);
      setPhase('error');
      toast.error(msg);
    }
  };

  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setCustom((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      title={copy.title}
      subtitle={`Select a date range and file format to export ${copy.noun} data.`}
      onClose={onClose}
      className="report-modal export-modal"
      footer={
        phase === 'idle' ? (
          <>
            <button type="button" className="exp-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="exp-btn primary"
              disabled={!range || !!customError || preview === 0}
              onClick={handleGenerate}
            >
              <Download size={15} /> Download {format.toUpperCase()}
            </button>
          </>
        ) : phase === 'success' ? (
          <>
            <button type="button" className="exp-btn" onClick={() => setPhase('idle')}>
              Generate Another
            </button>
            <button type="button" className="exp-btn primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : phase === 'empty' ? (
          <>
            <button type="button" className="exp-btn" onClick={() => setPhase('idle')}>
              Change Range
            </button>
            <button type="button" className="exp-btn primary" onClick={onClose}>
              Close
            </button>
          </>
        ) : phase === 'error' ? (
          <>
            <button type="button" className="exp-btn" onClick={() => setPhase('idle')}>
              Back
            </button>
            <button type="button" className="exp-btn primary" onClick={handleGenerate}>
              Retry
            </button>
          </>
        ) : null
      }
    >
      {phase === 'loading' && (
        <div className="rpt-state">
          <div className="rpt-icon" style={{ background: '#e6f4f2', color: '#007d72' }}>
            <Loader2 size={28} className="exp-spin" />
          </div>
          <h3>Generating {copy.noun} report…</h3>
          <p>Compiling dated records, calculating summaries and formatting your {format.toUpperCase()} document.</p>
        </div>
      )}

      {phase === 'success' && (
        <div className="rpt-state success">
          <div className="rpt-icon">
            <CheckCircle2 size={32} />
          </div>
          <h3>Report ready &amp; downloaded</h3>
          <p>Your {format.toUpperCase()} file was generated and saved to your downloads.</p>
          {downloadedFile && <code>{downloadedFile.filename}</code>}
        </div>
      )}

      {phase === 'empty' && (
        <div className="rpt-state empty">
          <div className="rpt-icon">
            <FileSearch size={30} />
          </div>
          <h3>No records found</h3>
          <p>There are no recorded {copy.noun} entries matching the selected period ({range?.label}). Try expanding the date range.</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="rpt-state error">
          <div className="rpt-icon">
            <TriangleAlert size={30} />
          </div>
          <h3>Generation failed</h3>
          <p>{errorMessage || 'An error occurred while compiling this report document.'}</p>
        </div>
      )}

      {phase === 'idle' && (
        <div className="pex-body">
          {/* Preset Buttons */}
          <div className="exp-group">
            <span className="exp-label">Date Range</span>
            <div className="pex-quick rpt-presets">
              {RANGE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={preset === p.id ? 'selected' : ''}
                  onClick={() => setPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {preset === 'custom' && (
              <div className="rpt-custom">
                <label className="pex-date">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={custom.from}
                    max={today}
                    onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  />
                </label>
                <label className="pex-date">
                  <span>End Date</span>
                  <input
                    type="date"
                    value={custom.to}
                    max={today}
                    onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  />
                </label>
              </div>
            )}
            {customError && <p className="exp-error">{customError}</p>}
          </div>

          {/* Record Count Preview */}
          <div className={`pex-summary ${preview === 0 ? 'empty' : ''}`}>
            <b>
              {preview !== null
                ? `${preview} ${copy.noun}${preview === 1 ? '' : 's'}`
                : 'Checking records…'}
            </b>
            <span>
              {preview !== null && preview > 0
                ? `Available for export in ${range?.label || 'selected range'}`
                : preview === 0
                ? `No records found in ${range?.label || 'selected range'}`
                : 'Searching active EHR records…'}
            </span>
          </div>

          {/* Format Selection (PDF / CSV) */}
          <div className="exp-group">
            <span className="exp-label">File Format</span>
            <div className="exp-formats">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                const isSelected = format === f.id;
                return (
                  <button
                    type="button"
                    key={f.id}
                    className={`exp-format ${isSelected ? 'selected' : ''}`}
                    onClick={() => setFormat(f.id)}
                  >
                    <span className="exp-format-icon">
                      <Icon size={18} />
                    </span>
                    <b>{f.title}</b>
                    <small>{f.hint}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
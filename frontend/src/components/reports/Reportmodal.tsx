import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, FileText, FileSearch, Loader2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/utils/toast';
import { dateKey, RANGE_PRESETS, resolveRange, validateCustomRange } from '@/utils/reportRange';
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

const FORMATS: { id: ReportFormat; title: string; hint: string; icon: typeof FileText }[] = [
  { id: 'pdf', title: 'PDF report', hint: 'Print-ready, with clinic letterhead', icon: FileText },
  { id: 'csv', title: 'CSV spreadsheet', hint: 'Opens in Excel or Google Sheets', icon: FileSpreadsheet },
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
  const [file, setFile] = useState<GeneratedFile | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const customError = preset === 'custom' ? validateCustomRange(custom) : null;
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);
  const busy = phase === 'loading';

  // Live count of real records in the chosen period, so the person knows what to expect before generating.
  useEffect(() => {
    if (!range || phase !== 'idle') { setPreview(null); return; }
    let cancelled = false;
    setPreview(null);
    loadService()
      .then((svc) => { if (!cancelled) setPreview(svc.buildReport(module, range).recordCount); })
      .catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [module, range, phase]);

  const generate = async () => {
    if (!range || busy) return;
    setPhase('loading');
    try {
      const started = Date.now();
      const [svc, exporter] = await Promise.all([loadService(), loadExport()]);
      const now = new Date();
      const dataset = svc.buildReport(module, range, now);
      let generated: GeneratedFile | null = null;
      if (dataset.recordCount > 0) {
        const clinic = svc.getClinicIdentity();
        generated = exporter.renderReport(format, dataset, {
          clinicName: clinic.name,
          clinicAddress: clinic.address,
          generatedBy: user?.fullName?.trim() || 'Clinic staff',
          generatedAt: now,
          range,
        });
      }
      const wait = MIN_LOADING_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (!mounted.current) return;
      if (!generated) {
        setResultCount(0);
        setPhase('empty');
        return;
      }
      triggerDownload(generated.filename, generated.blob);
      setFile(generated);
      setResultCount(dataset.recordCount);
      setPhase('success');
      toast.success(`${generated.filename} downloaded.`);
    } catch {
      if (mounted.current) setPhase('error');
    }
  };

  const backToOptions = () => { setFile(null); setPhase('idle'); };
  const noun = COPY[module].noun;
  const count = (n: number) => `${n} ${noun}${n === 1 ? '' : 's'}`;

  let footer;
  if (phase === 'success' && file) {
    footer = <>
      <button type="button" className="exp-btn" onClick={() => triggerDownload(file.filename, file.blob)}><Download size={15} /> Download again</button>
      <button type="button" className="exp-btn primary" onClick={onClose}>Done</button>
    </>;
  } else if (phase === 'empty' || phase === 'error') {
    footer = <>
      <button type="button" className="exp-btn" onClick={onClose}>Close</button>
      <button type="button" className="exp-btn primary" onClick={backToOptions}>{phase === 'empty' ? 'Change date range' : 'Try again'}</button>
    </>;
  } else {
    footer = <>
      <button type="button" className="exp-btn" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="button" className="exp-btn primary" onClick={generate} disabled={busy || !range}>
        {busy ? <><Loader2 size={15} className="exp-spin" /> Generating report…</> : <><Download size={15} /> Generate Report</>}
      </button>
    </>;
  }

  return (
    <Modal
      title={COPY[module].title}
      subtitle="Choose a period and format, then generate the report."
      onClose={busy ? () => undefined : onClose}
      className="export-modal report-modal"
      footer={footer}
    >
      {(phase === 'idle' || phase === 'loading') && (
        <>
          <div className="exp-group">
            <span className="exp-label">Date range</span>
            <div className="pex-quick rpt-presets" role="radiogroup" aria-label="Date range">
              {RANGE_PRESETS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={preset === id}
                  className={preset === id ? 'selected' : ''}
                  disabled={busy}
                  onClick={() => setPreset(id)}
                >{label}</button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="rpt-custom">
                <label className="pex-date"><span>From</span>
                  <input type="date" value={custom.from} max={custom.to || undefined} disabled={busy} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                </label>
                <label className="pex-date"><span>To</span>
                  <input type="date" value={custom.to} min={custom.from || undefined} disabled={busy} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
                </label>
              </div>
            )}
            {customError && <p className="exp-error">{customError}</p>}
          </div>

          <div className="exp-group">
            <span className="exp-label">Format</span>
            <div className="exp-formats" role="radiogroup" aria-label="Export format">
              {FORMATS.map(({ id, title, hint, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={format === id}
                  className={`exp-format ${format === id ? 'selected' : ''}`}
                  onClick={() => setFormat(id)}
                  disabled={busy}
                >
                  <span className="exp-format-icon"><Icon size={18} /></span>
                  <b>{title}</b>
                  <small>{hint}</small>
                </button>
              ))}
            </div>
          </div>

          {range && (
            <div className={`pex-summary ${preview === 0 ? 'empty' : ''}`} aria-live="polite">
              <b>{preview === null ? 'Checking records…' : count(preview)}</b>
              <span>{preview === 0 ? `none recorded for ${range.label}` : `in ${range.label}`}</span>
            </div>
          )}

          <div className="exp-notice">
            <ShieldAlert size={16} />
            <p>This report contains <b>protected patient information</b>. Store and share it only as allowed by your clinic&apos;s privacy policy.</p>
          </div>
        </>
      )}

      {phase === 'success' && file && range && (
        <div className="rpt-state success" role="status">
          <span className="rpt-icon"><CheckCircle2 size={28} /></span>
          <h3>Report ready</h3>
          <p>{count(resultCount)} for {range.label}</p>
          <code>{file.filename}</code>
        </div>
      )}

      {phase === 'empty' && range && (
        <div className="rpt-state empty" role="status">
          <span className="rpt-icon"><FileSearch size={28} /></span>
          <h3>No data for this period</h3>
          <p>There are no {noun}s recorded for {range.label}. No file was created.</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="rpt-state error" role="alert">
          <span className="rpt-icon"><TriangleAlert size={28} /></span>
          <h3>Could not generate the report</h3>
          <p>Something went wrong while building the file. Please try again.</p>
        </div>
      )}
    </Modal>
  );
}
import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/utils/toast';
import type { ActivityItem, AppointmentRow, MetricConfig } from '@/types';
import type { ExportFormat, ExportSections } from '@/utils/dashboardReport';
import '@/styles/export.css';

interface Props {
  clinicName: string;
  generatedBy: string;
  metrics: MetricConfig[];
  appointments: AppointmentRow[];
  activity: ActivityItem[];
  onClose: () => void;
}

const FORMATS: { id: ExportFormat; title: string; hint: string; icon: typeof FileText }[] = [
  { id: 'pdf', title: 'PDF report', hint: 'Print-ready, with clinic letterhead', icon: FileText },
  { id: 'csv', title: 'CSV spreadsheet', hint: 'Opens in Excel or Google Sheets', icon: FileSpreadsheet },
];

export function ExportSummaryModal({ clinicName, generatedBy, metrics, appointments, activity, onClose }: Props) {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [sections, setSections] = useState<ExportSections>({ kpis: true, queue: true, activity: true });
  const [busy, setBusy] = useState(false);

  const rows: { key: keyof ExportSections; title: string; hint: string }[] = [
    { key: 'kpis', title: 'Key metrics', hint: `${metrics.length} indicators` },
    { key: 'queue', title: "Today's appointments queue", hint: `${appointments.length} appointment${appointments.length === 1 ? '' : 's'}` },
    { key: 'activity', title: 'Recent activity log', hint: `${activity.length} event${activity.length === 1 ? '' : 's'}` },
  ];
  const nothingSelected = !sections.kpis && !sections.queue && !sections.activity;

  const handleExport = async () => {
    if (busy || nothingSelected) return;
    setBusy(true);
    try {
      // Loaded on demand so the PDF library isn't part of the initial page load.
      const report = await import('@/utils/dashboardReport');
      const filename = report.buildFilename(format);
      const data = { clinicName, generatedBy, metrics, appointments, activity, sections };
      // Brief pause so the "Generating…" state is visible, like a server-side report.
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      if (format === 'pdf') report.exportDashboardPdf(data, filename);
      else report.exportDashboardCsv(data, filename);
      toast.success(`${filename} downloaded.`);
      onClose();
    } catch {
      toast.error('Could not generate the report. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Export summary"
      subtitle="Download today's operations report to share or file."
      onClose={busy ? () => undefined : onClose}
      className="export-modal"
      footer={<>
        <button type="button" className="exp-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="exp-btn primary" onClick={handleExport} disabled={busy || nothingSelected}>
          {busy ? <><Loader2 size={15} className="exp-spin" /> Generating report…</> : <><Download size={15} /> Export report</>}
        </button>
      </>}
    >
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

      <div className="exp-group">
        <span className="exp-label">Include in report</span>
        <div className="exp-sections">
          {rows.map((r) => (
            <label key={r.key} className="exp-section">
              <input
                type="checkbox"
                checked={sections[r.key]}
                disabled={busy}
                onChange={(e) => setSections((prev) => ({ ...prev, [r.key]: e.target.checked }))}
              />
              <span className="exp-check" aria-hidden="true" />
              <div><b>{r.title}</b><small>{r.hint}</small></div>
            </label>
          ))}
        </div>
        {nothingSelected && <p className="exp-error">Select at least one section to export.</p>}
      </div>

      <div className="exp-notice">
        <ShieldAlert size={16} />
        <p>This report contains <b>protected patient information</b>. Store and share it only as allowed by your clinic&apos;s privacy policy.</p>
      </div>
    </Modal>
  );
}
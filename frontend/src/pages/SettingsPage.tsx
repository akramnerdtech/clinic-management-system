import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Building2, CheckCircle2, Clock, Download, FileJson, FileText, Hash, Mail, MapPin, Phone, ShieldCheck,
  Siren, TriangleAlert, Users, BedDouble, Globe, Activity, Upload, ConciergeBell, Database,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Field } from '@/components/settings/Field';
import { ScheduleCard } from '@/components/settings/ScheduleCard';
import { ReceptionCard } from '@/components/settings/ReceptionCard';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useToast } from '@/utils/toast';
import { downloadCsv, exportAllLocalStorage } from '@/utils/exportFile';
import { appointmentsService } from '@/services/appointmentsService';
import '@/styles/settings.css';

const TABS: { label: string; icon: ReactNode }[] = [
  { label: 'Clinic Profile', icon: <Building2 size={15} /> },
  { label: 'Hours & Slots', icon: <Clock size={15} /> },
  { label: 'Reception', icon: <ConciergeBell size={15} /> },
  { label: 'Data & Compliance', icon: <Database size={15} /> },
];

/** Icons for the identity fields, in the same order as the data. */
const FIELD_ICONS: ReactNode[] = [
  <Building2 size={16} />, <Hash size={16} />, <MapPin size={16} />,
  <Phone size={16} />, <Siren size={16} />, <Mail size={16} />, <FileText size={16} />,
];

const SLOT_HOURS = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];

export function SettingsPage() {
  const {
    identityFields, updateIdentityField, scheduleRows, durationOptions,
    receptionDefaults, toggleWalkInAutoCheckin, campusInfo, slotSaturationBars, complianceInfo,
    status, saveChanges, discardChanges,
  } = useSettingsData();
  const toast = useToast();
  const [tab, setTab] = useState(0);

  const handleExportLogs = () => {
    const entries = appointmentsService.getEntries();
    downloadCsv(
      'clinical-logs',
      ['Time', 'Slot', 'Token', 'Patient', 'Age/Sex', 'Complaint', 'Note', 'Doctor', 'Room', 'Visit Type', 'Status'],
      entries,
    );
    toast.success('Clinical logs exported as CSV.');
  };

  const handleExportAuditTrail = () => {
    exportAllLocalStorage('curaclinic-audit-trail');
    toast.success('Full audit trail exported as JSON.');
  };

  const renderField = (index: number) => {
    const f = identityFields[index];
    if (!f) return null;
    return <Field key={f.label} {...f} icon={FIELD_ICONS[index]} onChange={(v) => updateIdentityField(index, v)} />;
  };

  const maxBar = Math.max(...slotSaturationBars, 1);
  const peakIndex = slotSaturationBars.indexOf(Math.max(...slotSaturationBars));

  return (
    <div className="sp">
      <PageHeader
        eyebrow="Facility management"
        title="Clinic settings"
        description="Manage your clinic's details, opening hours and reception preferences."
        actions={<>
          {status && <span className="sp-status"><i /> {status}</span>}
          <IconButton className="white-button" onClick={discardChanges}>Discard</IconButton>
          <IconButton className="teal-button" onClick={saveChanges}><CheckCircle2 size={14} /> Save changes</IconButton>
        </>}
      />

      <nav className="sp-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={tab === i}
            className={tab === i ? 'active' : ''}
            onClick={() => setTab(i)}
          >{t.icon}{t.label}</button>
        ))}
      </nav>

      {tab === 0 && (
        <>
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><Building2 size={18} /></span>
              <div>
                <h2>Clinic identity</h2>
                <p>Shown on patient records, invoices and prescriptions.</p>
              </div>
              <span className="sp-badge green"><i className="sp-dot" /> Accredited</span>
            </header>

            <div className="sp-logo-row">
              <div className="sp-logo"><Building2 size={26} /></div>
              <div className="sp-logo-text">
                <b>Branch logo</b>
                <p>Appears on prescription headers, lab requests and reminders. PNG, SVG or WebP, 512×512 recommended.</p>
              </div>
              <div className="sp-logo-actions">
                <button type="button" className="sp-btn" onClick={() => toast.info('Logo uploads require a connected file store — not available in this demo.')}><Upload size={14} /> Replace</button>
                <button type="button" className="sp-btn ghost" onClick={() => toast.info('Branch monogram removed (demo only — not persisted).')}>Remove</button>
              </div>
            </div>

            <h3 className="sp-section">Basic details</h3>
            <div className="sp-grid">{renderField(0)}{renderField(1)}</div>

            <h3 className="sp-section">Location</h3>
            <div className="sp-grid">{renderField(2)}</div>

            <h3 className="sp-section">Contact</h3>
            <div className="sp-grid">{renderField(3)}{renderField(4)}{renderField(5)}{renderField(6)}</div>
          </section>

          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><MapPin size={18} /></span>
              <div>
                <h2>Campus at a glance</h2>
                <p>{campusInfo.locationLabel} · {campusInfo.buildingLabel}</p>
              </div>
              <span className="sp-badge teal">Geo-verified</span>
            </header>
            <div className="sp-stats">
              <div className="sp-stat"><Globe size={16} /><small>Time zone</small><b>{campusInfo.timeZone}</b></div>
              <div className="sp-stat"><BedDouble size={16} /><small>Beds &amp; suites</small><b>{campusInfo.suites}</b></div>
              <div className="sp-stat"><Users size={16} /><small>Clinical staff</small><b>{campusInfo.activeStaff}</b></div>
            </div>
          </section>
        </>
      )}

      {tab === 1 && (
        <>
          <ScheduleCard scheduleRows={scheduleRows} durationOptions={durationOptions} />
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><Activity size={18} /></span>
              <div>
                <h2>Today&apos;s patient load</h2>
                <p>Projected from the current 30-minute consultation cadence.</p>
              </div>
              <span className="sp-badge green">Optimal pacing</span>
            </header>
            <div className="sp-chart">
              {slotSaturationBars.map((v, i) => (
                <div className={`sp-bar ${i === peakIndex ? 'peak' : ''}`} key={i}>
                  <div className="sp-bar-track"><i style={{ height: `${(v / maxBar) * 100}%` }} /></div>
                  <small>{SLOT_HOURS[i] ?? ''}</small>
                </div>
              ))}
            </div>
            <p className="sp-note">Busiest around <b>{SLOT_HOURS[peakIndex] ?? '—'}</b>.</p>
          </section>
        </>
      )}

      {tab === 2 && (
        <ReceptionCard receptionDefaults={receptionDefaults} onToggleWalkInAutoCheckin={toggleWalkInAutoCheckin} />
      )}

      {tab === 3 && (
        <>
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><ShieldCheck size={18} /></span>
              <div>
                <h2>Data &amp; compliance</h2>
                <p>{complianceInfo.description}</p>
              </div>
            </header>
            <div className="sp-list">
              <div className="sp-list-row">
                <span className="sp-list-icon"><FileText size={16} /></span>
                <div><b>Clinical logs</b><p>Appointments and visit records as a spreadsheet (CSV).</p></div>
                <button type="button" className="sp-btn" onClick={handleExportLogs}><Download size={14} /> Export CSV</button>
              </div>
              <div className="sp-list-row">
                <span className="sp-list-icon"><FileJson size={16} /></span>
                <div><b>Full audit trail</b><p>Everything stored in the system, as a JSON file.</p></div>
                <button type="button" className="sp-btn" onClick={handleExportAuditTrail}><Download size={14} /> Export JSON</button>
              </div>
            </div>
          </section>

          <section className="sp-card sp-danger">
            <header className="sp-card-head">
              <span className="sp-card-icon"><TriangleAlert size={18} /></span>
              <div>
                <h2>Danger zone</h2>
                <p>{complianceInfo.dangerZoneNote}</p>
              </div>
            </header>
            <button type="button" className="sp-btn danger" onClick={() => toast.info('Branch decommissioning is disabled in this demo.')}>{complianceInfo.branchLabel}</button>
          </section>
        </>
      )}
    </div>
  );
}
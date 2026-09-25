import { Activity, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Field } from '@/components/settings/Field';
import { ScheduleCard } from '@/components/settings/ScheduleCard';
import { ReceptionCard } from '@/components/settings/ReceptionCard';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useToast } from '@/utils/toast';
import { downloadCsv, exportAllLocalStorage } from '@/utils/exportFile';
import { appointmentsService } from '@/services/appointmentsService';

export function SettingsPage() {
  const {
    tabs, identityFields, updateIdentityField, scheduleRows, durationOptions,
    receptionDefaults, toggleWalkInAutoCheckin, campusInfo, slotSaturationBars, complianceInfo,
    status, saveChanges, discardChanges,
  } = useSettingsData();
  const toast = useToast();

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

  return (
    <>
      <PageHeader
        eyebrow="FACILITY MANAGEMENT / SYSTEM SETTINGS"
        title="Clinic Profile & System Settings"
        description="Configure clinic operating hours, branch contact details, receptionist preferences, and triage rules."
        actions={<>
          <span className="autosaved"><i /> {status ?? 'Autosaved 2 mins ago'}</span>
          <IconButton className="white-button" onClick={discardChanges}>Discard Changes</IconButton>
          <IconButton className="teal-button" onClick={saveChanges}><CheckCircle2 size={14} /> Save Changes</IconButton>
        </>}
      />
      <div className="settings-tabs">
        {tabs.map((t, i) => i === 0 ? <b key={t}>{t}</b> : <span key={t}>{t}{i === 2 && <i>14</i>}</span>)}
      </div>
      <div className="settings-layout">
        <div>
          <section className="content-card identity-card">
            <div className="card-title">
              <div>
                <h2>▦ Clinic Identity & Branch Info</h2>
                <p>Primary legal identity and accredited registry attributes for patient records and billing invoices.</p>
              </div>
              <em>ACTIVE<br />ACCREDITATION</em>
            </div>
            <div className="monogram">
              <div className="logo-box">◉</div>
              <div>
                <h3>Official Branch Monogram</h3>
                <p>Appears on verified prescription headers, diagnostic lab requests, and patient appointment reminders.</p>
                <button onClick={() => toast.info('Logo uploads require a connected file store — not available in this demo.')}>Replace Seal</button> <b onClick={() => toast.info('Branch monogram removed (demo only — not persisted).')}>Remove</b>
              </div>
              <small>Recommended 512×512 PNG, SVG, or high-res WebP</small>
            </div>
            <div className="form-grid">
              {identityFields.map((f, i) => (
                <Field key={f.label} {...f} onChange={(v) => updateIdentityField(i, v)} />
              ))}
            </div>
          </section>
          <ScheduleCard scheduleRows={scheduleRows} durationOptions={durationOptions} />
          <ReceptionCard receptionDefaults={receptionDefaults} onToggleWalkInAutoCheckin={toggleWalkInAutoCheckin} />
        </div>
        <div className="settings-rail">
          <section className="content-card rail-card">
            <h2>▧ Campus Location <em>GEO-VERIFIED</em></h2>
            <div className="map-placeholder">
              <MapPin size={22} />
              <span>{campusInfo.locationLabel}<br />{campusInfo.buildingLabel}</span>
            </div>
            <p>Time Zone <b>{campusInfo.timeZone}</b></p>
            <p>Assigned Beds / Suites <b>{campusInfo.suites}</b></p>
            <p>Active Clinical Staff <b className="text-green">{campusInfo.activeStaff}</b></p>
          </section>
          <section className="content-card rail-card">
            <h2><Activity size={15} /> Slot Saturation Matrix <small>Today</small></h2>
            <p>Projected daily patient load based on current 30-minute default consultation cadence.</p>
            <div className="slot-bars">
              {slotSaturationBars.map((h, i) => <i style={{ height: `${h}px` }} key={i} />)}
            </div>
            <small>Peak throughput: 12:00 PM <b className="text-green">Optimal Pacing</b></small>
          </section>
          <section className="content-card rail-card compliance">
            <h2><ShieldCheck size={15} /> Data Custody & Compliance</h2>
            <p>{complianceInfo.description}</p>
            <button onClick={handleExportLogs}>◉ Export Clinical Logs (CSV)</button>
            <button onClick={handleExportAuditTrail}>‹ Full Audit Trail (Encrypted JSON)</button>
            <div className="danger-box">
              <b>⚠ Danger Zone</b>
              <p>{complianceInfo.dangerZoneNote}</p>
              <strong>{complianceInfo.branchLabel}</strong>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

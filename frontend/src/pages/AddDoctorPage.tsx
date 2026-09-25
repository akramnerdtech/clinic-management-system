import { useNavigate } from 'react-router-dom';
import { Briefcase, Stethoscope, Clock3, Camera, ShieldCheck, UserPlus2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { DoctorFormField } from '@/components/doctors/DoctorFormField';
import { DutyDaySelector } from '@/components/doctors/DutyDaySelector';
import { RegistrationPreview } from '@/components/doctors/RegistrationPreview';
import { SpecialtyRosterCard } from '@/components/doctors/SpecialtyRosterCard';
import { CredentialingChecklist } from '@/components/doctors/CredentialingChecklist';
import { useAddDoctor } from '@/hooks/useAddDoctor';

export function AddDoctorPage() {
  const {
    basicInfoFields,
    credentialFields,
    formValues,
    updateField,
    dutyDays,
    toggleDutyDay,
    activeDaysCount,
    shiftTimes,
    updateShiftTime,
    capacityInfo,
    onCallInfo,
    onCallEnabled,
    setOnCallEnabled,
    preview,
    specialtyRoster,
    checklist,
    meta,
    status,
    saveDraft,
    registerDoctor,
  } = useAddDoctor();
  const navigate = useNavigate();

  const handleRegister = () => {
    const doctor = registerDoctor();
    if (doctor) navigate('/doctors');
  };

  return (
    <>
      <PageHeader
        eyebrow="DOCTORS / ADD NEW DOCTOR"
        title="Add New Doctor"
        description="Register a credentialed physician, assign clinic rooms, specialties, and weekly duty schedules."
        actions={<>
          <span className="live-sync"><i /> {meta.status}</span>
          <span className="autosaved">{meta.step}</span>
        </>}
      />

      <div className="doctors-layout">
        <div className="add-doctor-main">
          <section className="content-card doctor-form-card">
            <div className="card-title icon-title">
              <div className="form-icon"><Briefcase size={16} /></div>
              <div>
                <h2>1. Basic & Personal Information</h2>
                <p>Primary legal identity, medical license registry, and direct contacts.</p>
              </div>
              <span className="section-badge">REQUIRED INFO</span>
            </div>
            <div className="photo-upload">
              <div className="photo-drop">
                <Camera size={20} />
                <b>Upload Photo</b>
                <small>Drag and drop or browse</small>
              </div>
              <div className="photo-notes">
                <b>Clinical Photo Standards</b>
                <p>Strictly plain neutral or clinical teal background. Professional attire or laboratory white coat. JPG, PNG or WEBP format. Minimum 600×600 px (Max 4MB).</p>
                <span><ShieldCheck size={11} /> Verified Secure Vault</span>
                <span><Clock3 size={11} /> Used on Patient Portals</span>
              </div>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="form-grid">
              {basicInfoFields.map((f) => (
                <DoctorFormField key={f.id} field={f} value={formValues[f.id] ?? ''} onChange={(v) => updateField(f.id, v)} />
              ))}
            </form>
          </section>

          <section className="content-card doctor-form-card">
            <div className="card-title icon-title">
              <div className="form-icon"><Stethoscope size={16} /></div>
              <div>
                <h2>2. Clinical Department & Credentials</h2>
                <p>Medical domain, hospital suite allocation, and consultation fee structuring.</p>
              </div>
              <span className="section-badge">CLINICAL SPECS</span>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="form-grid">
              {credentialFields.map((f) => (
                <DoctorFormField key={f.id} field={f} value={formValues[f.id] ?? ''} onChange={(v) => updateField(f.id, v)} />
              ))}
            </form>
          </section>

          <section className="content-card doctor-form-card">
            <div className="card-title icon-title">
              <div className="form-icon"><Clock3 size={16} /></div>
              <div>
                <h2>3. Duty Schedule & Capacity</h2>
                <p>Configure recurring weekly availability, patient intake thresholds, and emergency coverage.</p>
              </div>
              <span className="section-badge">WEEKLY ROSTER</span>
            </div>
            <div className="duty-block">
              <div className="duty-block-head">
                <span>Scheduled Duty Days</span>
                <small>{activeDaysCount} Selected / Week</small>
              </div>
              <DutyDaySelector days={dutyDays} onToggle={toggleDutyDay} />
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="form-grid shift-grid">
              <label><span>Shift Start Time</span><input placeholder="e.g. 09:00 AM" value={shiftTimes.start} onChange={(e) => updateShiftTime('start', e.target.value)} /></label>
              <label><span>Shift End Time</span><input placeholder="e.g. 05:00 PM" value={shiftTimes.end} onChange={(e) => updateShiftTime('end', e.target.value)} /></label>
            </form>
            <div className="capacity-row">
              <div className="capacity-box">
                <div className="capacity-box-head">
                  <span>Daily Intake Cap</span>
                  <b>{capacityInfo.cap} Patients</b>
                </div>
                <p>Prevents overbooking beyond clinical focus thresholds.</p>
                <div className="cap-breakdown">
                  {capacityInfo.breakdown.map((b) => <small key={b.label}>{b.value} {b.label}</small>)}
                </div>
              </div>
              <div className="oncall-box">
                <div className="oncall-box-head">
                  <span>On-Call Emergency Triage</span>
                  <button
                    type="button"
                    className={`toggle-switch ${onCallEnabled ? 'on' : ''}`}
                    onClick={() => setOnCallEnabled(!onCallEnabled)}
                    aria-label="Toggle on-call emergency triage"
                  >
                    <i />
                  </button>
                </div>
                <p>{onCallInfo.description}</p>
                <small className="oncall-link"><Clock3 size={10} /> {onCallInfo.linkLabel}</small>
              </div>
            </div>
          </section>
        </div>

        <div className="right-rail">
          <RegistrationPreview preview={preview} dutyDays={dutyDays} />
          <SpecialtyRosterCard roster={specialtyRoster} />
          <CredentialingChecklist items={checklist} />
        </div>
      </div>

      <section className="content-card registration-actions add-doctor-footer">
        <span className="autosaved"><ShieldCheck size={12} /> {status ?? 'Credentials will be verified with State Licensure API.'}</span>
        <div>
          <IconButton className="white-button" onClick={() => navigate('/doctors')}>Cancel</IconButton>
          <IconButton className="soft-button" onClick={saveDraft}>Save as Draft</IconButton>
          <IconButton className="teal-button" onClick={handleRegister}><UserPlus2 size={14} /> Register Doctor</IconButton>
        </div>
      </section>
    </>
  );
}

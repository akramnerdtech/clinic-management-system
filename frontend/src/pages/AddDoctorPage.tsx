import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Stethoscope, Clock3, Camera, ImagePlus, ShieldCheck, UserPlus2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { DoctorFormField } from '@/components/doctors/DoctorFormField';
import { DutyDaySelector } from '@/components/doctors/DutyDaySelector';
import { useAddDoctor } from '@/hooks/useAddDoctor';
import { useToast } from '@/utils/toast';

export function AddDoctorPage() {
  const {
    basicInfoFields,
    credentialFields,
    formValues,
    updateField,
    dutyDays,
    toggleDutyDay,
    activeDaysCount,
    updateDaySchedule,
    changePhoto,
    capacityInfo,
    onCallInfo,
    onCallEnabled,
    setOnCallEnabled,
    meta,
    status,
    saveDraft,
    registerDoctor,
  } = useAddDoctor();
  const navigate = useNavigate();
  const toast = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleRegister = () => {
    const doctor = registerDoctor();
    if (doctor) {

      navigate('/doctors');
    }
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

      <div className="doctors-layout add-doctor-layout">
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
              <button type="button" className="photo-drop" onClick={() => photoInputRef.current?.click()}>
                {formValues.photo
                  ? <img className="doctor-upload-preview" src={formValues.photo} alt="Doctor profile preview" />
                  : <Camera size={22} />}
                <b>{formValues.photo ? 'Change photo' : 'Upload photo'}</b>
                <small>JPG, PNG or WEBP · up to 4 MB</small>
              </button>
              <input ref={photoInputRef} className="doctor-photo-input" type="file" accept="image/*" aria-label="Upload doctor photo" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void changePhoto(file);
                event.currentTarget.value = '';
              }} />
              <div className="photo-notes">
                <b>Doctor profile image</b>
                <p>Choose a clear, well-lit headshot. The image is resized and stored with this doctor’s record.</p>
                <span><ShieldCheck size={13} /> Stored with roster profile</span>
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
                <span>Weekly working hours</span>
                <small>{activeDaysCount} working days</small>
              </div>
              <DutyDaySelector days={dutyDays} onToggle={toggleDutyDay} onTimeChange={(dayKey, part, value) => updateDaySchedule(dayKey, { [part]: value })} />
            </div>

          </section>
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

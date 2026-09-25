import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Lock, UserPlus, Users } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { RegistrationField } from '@/components/patients/RegistrationField';
import { usePatientRegistration } from '@/hooks/usePatientRegistration';

export function AddPatientPage() {
  const { fields, genderOptions, meta, formValues, updateField, gender, updateGender, status, registerPatient } = usePatientRegistration();
  const navigate = useNavigate();

  const handleRegister = () => {
    const patient = registerPatient();
    if (patient) navigate('/patients');
  };

  const handleSaveAndBook = () => {
    const patient = registerPatient();
    if (patient) navigate('/appointments/new');
  };

  return (
    <>
      <div className="registration-topline">
        <div className="breadcrumb">
          <Users size={13} /> <button type="button" onClick={() => navigate('/patients')}>Patients</button>
          <span>Add New Patient</span>
        </div>
        <span className="intake-chip"><CheckCircle2 size={13} /> {meta.mode}</span>
      </div>
      <div className="registration-title-row">
        <h1>Quick Patient Registration</h1>
        <span className="mrn-chip"><i /> Auto-MRN: {meta.mrn}</span>
      </div>
      <div className="registration-center">
        <section className="content-card identity-card registration-card">
          <div className="card-title">
            <div>
              <h2>Patient Information</h2>
              <p>Fill in essential patient details for immediate intake.</p>
            </div>
            <em className="quick-form-pill">Quick Form</em>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="form-grid">
            {fields.filter((f) => ['fullName', 'phone', 'dob'].includes(f.id)).map((f) => (
              <RegistrationField key={f.id} field={f} value={formValues[f.id] ?? ''} onChange={(v) => updateField(f.id, v)} />
            ))}
            <label className="wide">
              <span>Gender / Biological Sex *</span>
              <div className="view-switch gender-switch">
                {genderOptions.map((g) => (
                  <button type="button" key={g} className={gender === g ? 'selected' : ''} onClick={() => updateGender(g)}>{g}</button>
                ))}
              </div>
            </label>
            {fields.filter((f) => ['complaint', 'allergies', 'doctor'].includes(f.id)).map((f) => (
              <RegistrationField key={f.id} field={f} value={formValues[f.id] ?? ''} onChange={(v) => updateField(f.id, v)} />
            ))}
            {fields.filter((f) => f.id === 'notes').map((f) => (
              <RegistrationField key={f.id} field={f} value={formValues[f.id] ?? ''} onChange={(v) => updateField(f.id, v)} />
            ))}
          </form>
        </section>
      </div>
      <div className="registration-actions">
        <span className="autosaved"><Lock size={12} /> {status ?? 'Encrypted Fast Registration'}</span>
        <div>
          <IconButton className="white-button" onClick={() => navigate('/patients')}>Cancel</IconButton>
          <IconButton className="teal-outline-button" onClick={handleSaveAndBook}><CalendarCheck size={14} /> Save & Book Appointment</IconButton>
          <IconButton className="teal-button" onClick={handleRegister}><UserPlus size={14} /> Register Patient <kbd>⌘+Enter</kbd></IconButton>
        </div>
      </div>
    </>
  );
}

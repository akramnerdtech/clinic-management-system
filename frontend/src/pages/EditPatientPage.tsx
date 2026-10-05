import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import type { Patient } from '@/types';

const GENDER_OPTIONS = ['Female', 'Male', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TEST_SUGGESTIONS = ['CBC', 'Metabolic panel', 'ECG', 'X-ray', 'Ultrasound', 'Echocardiogram', 'Urinalysis', 'Other'];

/** Splits the stored "26 / M" string into a numeric age and a full gender label. */
function parseAgeSex(ageSex: string): { age: string; gender: string } {
  const [rawAge = '', rawSex = ''] = ageSex.split('/').map((part) => part.trim());
  const age = /^\d+$/.test(rawAge) ? rawAge : '';
  const gender = GENDER_OPTIONS.find((g) => g.charAt(0).toLowerCase() === rawSex.charAt(0).toLowerCase()) ?? GENDER_OPTIONS[0];
  return { age, gender };
}

export function EditPatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [patient, setPatient] = useState<Patient | null>(() =>
    patientsService.getPatients().find(([id]) => id === patientId) ?? null,
  );

  const [age, setAge] = useState(() => parseAgeSex(patient?.[2] ?? '').age);
  const [gender, setGender] = useState(() => parseAgeSex(patient?.[2] ?? '').gender);

  useEffect(() => {
    const found = patientsService.getPatients().find(([id]) => id === patientId) ?? null;
    setPatient(found);
    const parsed = parseAgeSex(found?.[2] ?? '');
    setAge(parsed.age);
    setGender(parsed.gender);
  }, [patientId]);

  const updateField = (index: number, value: string) => {
    setPatient((current) => {
      if (!current) return current;
      const updated: Patient = [...current];
      updated[index] = value;
      return updated;
    });
  };

  const savePatient = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!patient) return;
    if (!patient[1].trim() || !patient[3].trim()) {
      toast.error('Patient name and reason for visit are required.');
      return;
    }
    const ageValue = Number(age);
    if (!age || Number.isNaN(ageValue) || ageValue < 0 || ageValue > 120) {
      toast.error('Please enter a valid age (0–120).');
      return;
    }

    const updated: Patient = [
      patient[0],
      patient[1].trim(),
      `${age} / ${gender.charAt(0)}`,
      patient[3].trim(),
      patient[4].trim(),
      patient[5].trim(),
      patient[6].trim(),
      patient[7].trim(),
      patient[8]?.trim() ?? '',
      patient[9] ?? '',
    ];
    patientsService.updatePatient(updated);
    toast.success(`${updated[1]} was updated successfully.`);
    navigate('/patients');
  };

  if (!patient) {
    return (
      <>
        <PageHeader eyebrow="CLINICAL REGISTRY / EDIT RECORD" title="Patient not found" description="This patient record may have been removed." />
        <IconButton className="white-button" onClick={() => navigate('/patients')}><ArrowLeft size={14} /> Back to Patients</IconButton>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="CLINICAL REGISTRY / EDIT RECORD"
        title="Edit Patient"
        description={`Update the patient record for ${patient[1]}.`}
        actions={<IconButton className="white-button" onClick={() => navigate('/patients')}><ArrowLeft size={14} /> Back to Patients</IconButton>}
      />
      <div className="registration-center patient-edit-center">
        <section className="content-card registration-card patient-edit-card">
          <div className="card-title">
            <div>
              <h2>Patient Information</h2>
              <p>Update the details stored in the patient registry.</p>
            </div>
            <span className="patient-id">{patient[0]}</span>
          </div>
          <form className="form-grid" onSubmit={savePatient}>
            <label className="wide">
              <span>Patient Full Name *</span>
              <input placeholder="e.g. Jane Doe" value={patient[1]} onChange={(event) => updateField(1, event.target.value)} required />
            </label>
            <label>
              <span>Email<em>Optional</em></span>
              <input type="email" placeholder="e.g. jane@example.com" value={patient[6]} onChange={(event) => updateField(6, event.target.value)} />
            </label>
            <label>
              <span>Age *</span>
              <input
                placeholder="e.g. 34"
                inputMode="numeric"
                maxLength={3}
                value={age}
                onChange={(event) => setAge(event.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </label>
            <label className="wide">
              <span>Gender / Biological Sex *</span>
              <div className="view-switch gender-switch">
                {GENDER_OPTIONS.map((g) => (
                  <button type="button" key={g} className={gender === g ? 'selected' : ''} onClick={() => setGender(g)}>{g}</button>
                ))}
              </div>
            </label>
            <label className="wide">
              <span>Primary Reason for Visit / Chief Complaint *</span>
              <input placeholder="e.g. Follow-up consultation" value={patient[3]} onChange={(event) => updateField(3, event.target.value)} required />
            </label>
            <label className="wide">
              <span>Blood Group<em>Optional</em></span>
              <input placeholder="e.g. O+" value={patient[7]} list="patient-blood-group-suggestions" onChange={(event) => updateField(7, event.target.value)} />
              <datalist id="patient-blood-group-suggestions">
                {BLOOD_GROUPS.map((group) => <option key={group} value={group} />)}
              </datalist>
            </label>
            <label className="wide">
              <span>Recommended Test / Investigation<em>Optional</em></span>
              <input placeholder="Enter recommended test / investigation" value={patient[8] ?? ''} onChange={(event) => updateField(8, event.target.value)} list="patient-test-suggestions" />
              <datalist id="patient-test-suggestions">
                {TEST_SUGGESTIONS.map((test) => <option key={test} value={test} />)}
              </datalist>
            </label>
            <label className="wide">
              <span>Last Visit</span>
              <input value={patient[5]} onChange={(event) => updateField(5, event.target.value)} />
            </label>
          </form>
        </section>
      </div>
      <div className="registration-actions patient-edit-actions">
        <span>Patient ID <b>{patient[0]}</b></span>
        <div>
          <IconButton className="white-button" onClick={() => navigate('/patients')}>Cancel</IconButton>
          <IconButton className="teal-button" onClick={() => savePatient()}><Save size={14} /> Save Changes</IconButton>
        </div>
      </div>
    </>
  );
}
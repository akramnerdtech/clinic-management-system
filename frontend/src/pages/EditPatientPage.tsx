import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import type { Patient } from '@/types';

export function EditPatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [patient, setPatient] = useState<Patient | null>(() =>
    patientsService.getPatients().find(([id]) => id === patientId) ?? null,
  );

  useEffect(() => {
    setPatient(patientsService.getPatients().find(([id]) => id === patientId) ?? null);
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
      toast.error('Patient name and condition are required.');
      return;
    }

    const updated: Patient = [
      patient[0],
      patient[1].trim(),
      patient[2].trim(),
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
              <span>Patient Name *</span>
              <input value={patient[1]} onChange={(event) => updateField(1, event.target.value)} required />
            </label>
            <label>
              <span>Age / Sex</span>
              <input value={patient[2]} onChange={(event) => updateField(2, event.target.value)} />
            </label>
            <label className="wide">
              <span>Condition / Reason for Visit *</span>
              <input value={patient[3]} onChange={(event) => updateField(3, event.target.value)} required />
            </label>
            <label className="wide">
              <span>Recommended Test / Investigation</span>
              <input value={patient[8] ?? ''} onChange={(event) => updateField(8, event.target.value)} list="patient-test-suggestions" placeholder="Type a test or choose a suggestion" />
              <datalist id="patient-test-suggestions">
                <option value="CBC" />
                <option value="Metabolic panel" />
                <option value="ECG" />
                <option value="X-ray" />
                <option value="Ultrasound" />
                <option value="Echocardiogram" />
                <option value="Urinalysis" />
              </datalist>
            </label>
            <label>
              <span>Last Visit</span>
              <input value={patient[5]} onChange={(event) => updateField(5, event.target.value)} />
            </label>
            <label>
              <span>Blood Group</span>
              <input value={patient[7]} onChange={(event) => updateField(7, event.target.value)} />
            </label>
            <label className="wide">
              <span>Email</span>
              <input type="email" value={patient[6]} onChange={(event) => updateField(6, event.target.value)} />
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
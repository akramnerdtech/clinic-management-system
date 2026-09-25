import { useState } from 'react';
import { Download, HeartPulse, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Metric } from '@/components/ui/Metric';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { useSpecialties } from '@/hooks/useSpecialties';
import { useToast } from '@/utils/toast';
import { downloadCsv } from '@/utils/exportFile';
import type { Specialty } from '@/types';

const EMPTY_FORM = { name: '', code: '', description: '', fee: '', duration: '' };

export function SpecialtiesPage() {
  const { specialties, metrics, addSpecialty } = useSpecialties();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();

  const filtered = specialties.filter((s) =>
    `${s[0]} ${s[1]}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const handleExport = () => {
    downloadCsv('specialties', ['Name', 'Code', 'Description', 'Fee', 'Slot Duration', 'Doctors'], specialties);
    toast.success('Specialty roster exported.');
  };

  const updateForm = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Specialty name is required.');
      return;
    }
    const newSpecialty: Specialty = [
      name,
      form.code.trim() || 'MED-NEW',
      form.description.trim() || 'Newly configured specialty — description pending.',
      form.fee.trim() || '$0.00',
      form.duration.trim() || '30 min',
      '0 Doctors',
    ];
    addSpecialty(newSpecialty);
    closeModal();
  };

  return (
    <>
      <PageHeader
        eyebrow="CLINICAL GOVERNANCE / TAXONOMY"
        title="Medical Specialties & Categories"
        description="Configure clinic departments, consultation fee schedules, and assigned specialist doctors."
        actions={<>
          <IconButton className="white-button" onClick={handleExport}><Download size={14} /> Export Spec</IconButton>
          <IconButton className="teal-button" onClick={() => setModalOpen(true)}><Plus size={14} /> Add Category</IconButton>
        </>}
      />
      <div className="metrics-grid">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
      <div className="filter-row specialty-filter">
        <div className="small-search">
          <Search size={14} />
          <input placeholder="Search specialty name or code (e.g. MED-NEU)..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span>Status: <b>Active Only ({specialties.length})</b></span>
        <span>Sort: <b>Alphabetical</b></span>
      </div>
      <div className="specialty-grid">
        {filtered.map((s, i) => (
          <section className="content-card specialty-card" key={s[0]}>
            <div className="specialty-heading">
              <div className={`specialty-icon color-${i}`}><HeartPulse size={20} /></div>
              <div><h2>{s[0]}</h2><small>CODE: <b>{s[1]}</b></small></div>
              <em>ACTIVE</em>
            </div>
            <p>{s[2]}</p>
            <div className="specialty-meta">
              <span>CONSULT FEE<b>{s[3]}</b></span>
              <span>SLOT DURATION<b>◷ {s[4]}</b></span>
            </div>
            <div className="specialty-foot">
              <div className="avatar-stack"><i>DR</i><i>AM</i><i>TW</i></div>
              <b>{s[5]}</b>
              <span>♧</span>
              <span>≡</span>
            </div>
          </section>
        ))}
      </div>

      {modalOpen && (
        <Modal
          title="Add Specialty Category"
          subtitle="Configure a new clinical department for the taxonomy roster."
          onClose={closeModal}
          footer={<>
            <IconButton className="white-button" onClick={closeModal}>Cancel</IconButton>
            <IconButton className="teal-button" onClick={handleSubmit}><Plus size={14} /> Add Category</IconButton>
          </>}
        >
          <div className="form-grid">
            <label className="wide">
              <span>Specialty Name *</span>
              <input
                placeholder="e.g. Endocrinology & Metabolism"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                autoFocus
              />
            </label>
            <label>
              <span>Short Code</span>
              <input placeholder="e.g. MED-END-07" value={form.code} onChange={(e) => updateForm('code', e.target.value)} />
            </label>
            <label>
              <span>Consultation Fee</span>
              <input placeholder="e.g. $80.00" value={form.fee} onChange={(e) => updateForm('fee', e.target.value)} />
            </label>
            <label>
              <span>Slot Duration</span>
              <input placeholder="e.g. 30 min" value={form.duration} onChange={(e) => updateForm('duration', e.target.value)} />
            </label>
            <label className="wide">
              <span>Description</span>
              <textarea
                rows={3}
                placeholder="Short summary of the services this department covers"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

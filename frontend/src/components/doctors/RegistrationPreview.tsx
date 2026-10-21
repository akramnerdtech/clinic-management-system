import type { AddDoctorPreview, DutyDay } from '@/types';

interface RegistrationPreviewProps {
  preview: AddDoctorPreview;
  dutyDays: DutyDay[];
}

export function RegistrationPreview({ preview, dutyDays }: RegistrationPreviewProps) {
  return (
    <section className="content-card live-preview-card">
      <div className="card-title">
        <h2>Registration Live Preview</h2>
        <span className="floor-sync">New Entry</span>
      </div>
      <div className="preview-head">
        {preview.avatar ? (
          <img src={preview.avatar} alt="" />
        ) : (
          <div
            className="preview-avatar-fallback"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
              border: '2px solid #99f6e4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {preview.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() || 'DR'}
          </div>
        )}
        <div>
          <b>{preview.name}</b>
          <span>{preview.specialty}</span>
          <small>{preview.location}</small>
        </div>
      </div>
      <div className="preview-stats">
        <div><small>FEE BENCHMARK</small><b>{preview.fee}</b></div>
        <div><small>CAPACITY CAP</small><b>{preview.capacity}</b></div>
      </div>
      <h4>WEEKLY DUTY SCHEDULE:</h4>
      <div className="preview-days">
        {dutyDays.map((d) => (
          <span key={d.key} className={d.active ? '' : 'off'}>{d.key[0]}</span>
        ))}
      </div>
    </section>
  );
}

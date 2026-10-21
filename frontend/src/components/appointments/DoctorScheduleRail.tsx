import { Star, MapPin, Clock3 } from 'lucide-react';
import type { AppointmentDoctorInfo, AppointmentMiniChip } from '@/types';

export function DoctorScheduleRail({ chips, doctor }: { chips: AppointmentMiniChip[]; doctor: AppointmentDoctorInfo }) {
  return (
    <>
      <div className="mini-chip-row">
        {chips.map((c) => (
          <div className="mini-chip" key={c.label}>
            <c.icon size={11} /> {c.label}
            <b>{c.value}</b>
          </div>
        ))}
      </div>

      <div className="content-card doctor-feature-card">
        {doctor.avatar ? (
          <img src={doctor.avatar} alt={doctor.name} />
        ) : (
          <div
            className="doctor-avatar-fallback"
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
            {doctor.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() || 'DR'}
          </div>
        )}
        <div className="doctor-feature-info">
          <h3>{doctor.name}</h3>
          <p>{doctor.title}</p>
          <small><MapPin size={9} /> {doctor.suite}</small>
          <small><Clock3 size={9} /> {doctor.hours}</small>
        </div>
        <span className="rating"><Star size={11} fill="currentColor" /> {doctor.rating}</span>
      </div>
    </>
  );
}

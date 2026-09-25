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
        <img src={doctor.avatar} alt={doctor.name} />
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

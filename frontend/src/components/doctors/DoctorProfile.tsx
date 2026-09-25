import { Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/ui/IconButton';
import { doctorProfile } from '@/data/doctors';
import { useToast } from '@/utils/toast';

export function DoctorProfile() {
  const d = doctorProfile;
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <section className="content-card doctor-profile">
      <div className="profile-head">
        <img src={d.avatar} alt="" />
        <div>
          <h2>{d.name}</h2>
          <b>{d.title}</b>
          <small>{d.credentials}</small>
        </div>
        <em>{d.status}</em>
      </div>
      <div className="profile-stats">
        {d.stats.map((s) => <span key={s.label}><b>{s.value}</b>{s.label}</span>)}
      </div>
      <h4>{d.loadLabel} <span>{d.loadNote}</span></h4>
      <div className="load-bar"><i /></div>
      <div className="profile-info">
        <p>◷ Consultation Hours <b>{d.consultationHours}</b></p>
        <p>▥ Room Assignment <b>{d.roomAssignment}</b></p>
        <p>⌖ Direct Station Ext <b>{d.directStationExt}</b></p>
      </div>
      <h4>UPCOMING SCHEDULE TODAY</h4>
      <div className="upcoming">
        {d.upcomingSchedule.map((s) => <p key={s.time}><b>{s.time}</b> {s.patient} <span>{s.reason}</span></p>)}
      </div>
      <div className="profile-actions">
        <IconButton className="teal-button" onClick={() => navigate('/appointments/new')}><Clock3 size={14} /> Book Slot</IconButton>
        <IconButton className="soft-button" onClick={() => toast.info(`Full profile for ${d.name} is not yet available in this build.`)}>Full Profile</IconButton>
      </div>
    </section>
  );
}

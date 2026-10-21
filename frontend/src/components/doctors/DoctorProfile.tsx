import { Clock3, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/ui/IconButton';
import { doctorProfile } from '@/data/doctors';
import { doctorsService } from '@/services/doctorsService';
import { useToast } from '@/utils/toast';

export function DoctorProfile() {
  const navigate = useNavigate();
  const toast = useToast();

  const registeredDoctors = doctorsService.getDoctors();
  const activeDoctor = registeredDoctors[0];

  const d = activeDoctor
    ? {
      name: activeDoctor[0],
      title: activeDoctor[1],
      credentials: 'Board Certified Specialist',
      status: activeDoctor[4],
      avatar: activeDoctor[6] || '',
      fee: activeDoctor[8] || '₹800.00',
      stats: [
        { value: '12 yrs', label: 'EXPERIENCE' },
        { value: '★ 4.9', label: 'RATING' },
        { value: '85%', label: 'CAPACITY' },
      ],
      loadLabel: "Today's Appointment Load",
      loadNote: `${activeDoctor[5] || '0/16'} slots booked`,
      consultationHours: 'Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM',
      roomAssignment: activeDoctor[2] || 'Suite 105',
      directStationExt: '+1 (555) 019-382',
      mobile: activeDoctor[9] || doctorsService.getDoctorMobile(activeDoctor[0]) || '+91 98765 43210',
      upcomingSchedule: [
        { time: '10:30 AM', patient: 'Scheduled Patient', reason: 'Routine Consultation (Morning)' },
        { time: '06:30 PM', patient: 'Follow-up Patient', reason: 'Review & Assessment (Evening)' },
      ],
    }
    : {
      ...doctorProfile,
      fee: '₹800.00',
      mobile: '+91 98765 43210',
    };
  return (
    <section className="content-card doctor-profile">
      <div className="profile-head">
        {d.avatar ? (
          <img src={d.avatar} alt={d.name} />
        ) : (
          <div
            className="doctor-avatar-fallback"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
              border: '2px solid #99f6e4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {d.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() || 'DR'}
          </div>
        )}
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
        <p>💳 Consultation Fee <b style={{ color: '#007d72' }}>{d.fee} / 15-min slot</b></p>
        <p>◷ Visiting Hours <b>{d.consultationHours}</b></p>
        <div style={{ display: 'flex', gap: 6, margin: '6px 0 10px 0', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
            ☀️ Morning: 10:00 AM – 12:00 PM
          </span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>
            🌙 Evening: 06:00 PM – 08:00 PM
          </span>
        </div>
        <p>▥ Room Assignment <b>{d.roomAssignment}</b></p>
        <p>💬 WhatsApp / Mobile <b>{d.mobile}</b></p>
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

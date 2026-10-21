import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Building2, CheckCircle2, Clock, Download, FileJson, FileText, Hash, Mail, MapPin, Phone, ShieldCheck,
  Siren, TriangleAlert, Users, BedDouble, Globe, Activity, Upload, ConciergeBell, Database, MessageCircle, Send,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Field } from '@/components/settings/Field';
import { ScheduleCard } from '@/components/settings/ScheduleCard';
import { ReceptionCard } from '@/components/settings/ReceptionCard';
import { RoomsManagementCard } from '@/components/settings/RoomsManagementCard';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useToast } from '@/utils/toast';
import { downloadCsv, exportAllLocalStorage } from '@/utils/exportFile';
import { appointmentsService } from '@/services/appointmentsService';
import { whatsappService } from '@/services/whatsappService';
import { doctorsService } from '@/services/doctorsService';
import { roomsService } from '@/services/roomsService';
import '@/styles/settings.css';

const TABS: { label: string; icon: ReactNode }[] = [
  { label: 'Clinic Profile', icon: <Building2 size={15} /> },
  { label: 'Hours & Slots', icon: <Clock size={15} /> },
  { label: 'Reception', icon: <ConciergeBell size={15} /> },
  { label: 'WhatsApp Alerts', icon: <MessageCircle size={15} /> },
  { label: 'Data & Compliance', icon: <Database size={15} /> },
];

/** Icons for the identity fields, in the same order as the data. */
const FIELD_ICONS: ReactNode[] = [
  <Building2 size={16} />, <Hash size={16} />, <MapPin size={16} />,
  <Phone size={16} />, <Siren size={16} />, <Mail size={16} />, <FileText size={16} />,
];

const SLOT_HOURS = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];

export function SettingsPage() {
  const {
    identityFields, updateIdentityField, scheduleRows, durationOptions,
    receptionDefaults, toggleWalkInAutoCheckin, campusInfo, slotSaturationBars, complianceInfo,
    status, saveChanges, discardChanges,
  } = useSettingsData();
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [roomsList, setRoomsList] = useState(() => roomsService.getRooms());

  useEffect(() => {
    const handleRoomsUpdate = () => {
      setRoomsList(roomsService.getRooms());
    };
    window.addEventListener('curaclinic:rooms-updated', handleRoomsUpdate);
    window.addEventListener('storage', handleRoomsUpdate);
    return () => {
      window.removeEventListener('curaclinic:rooms-updated', handleRoomsUpdate);
      window.removeEventListener('storage', handleRoomsUpdate);
    };
  }, []);

  const [waAutoLaunch, setWaAutoLaunch] = useState(() => whatsappService.getAutoLaunch());
  const [waCountryCode, setWaCountryCode] = useState(() => whatsappService.getDefaultCountryCode());
  const doctorsList = doctorsService.getDoctors();
  const [testDoctor, setTestDoctor] = useState(() => doctorsList[0]?.[0] || 'Dr. Eleanor Vance');
  const [testPhone, setTestPhone] = useState(() => whatsappService.getDoctorPhone(testDoctor) || '+91 98765 43210');
  const [waHistory, setWaHistory] = useState(() => whatsappService.getHistory());

  const handleToggleAutoLaunch = (val: boolean) => {
    setWaAutoLaunch(val);
    whatsappService.setAutoLaunch(val);
    toast.success(`WhatsApp auto-launch ${val ? 'enabled' : 'disabled'}.`);
  };

  const handleCountryCodeChange = (code: string) => {
    setWaCountryCode(code);
    whatsappService.setDefaultCountryCode(code);
  };

  const handleDoctorSelect = (name: string) => {
    setTestDoctor(name);
    setTestPhone(whatsappService.getDoctorPhone(name) || '');
  };

  const handleSendTestPush = () => {
    if (!testPhone.trim()) {
      toast.error('Enter a mobile number to send the test alert.');
      return;
    }

    const params = {
      doctorName: testDoctor,
      doctorMobile: testPhone.trim(),
      patientName: 'Test Patient (John Doe)',
      patientAgeSex: '34 / M',
      date: new Date().toISOString().slice(0, 10),
      timeSlot: '11:15 AM',
      roomSuite: 'Suite 101',
      opdUnit: 'OPD-1 • General Medicine',
      reason: 'Routine Clinical Checkup (Test Alert)',
      token: 'TK-TEST-99',
    };

    const prep = whatsappService.prepareNotification(params);
    whatsappService.logNotification({
      doctorName: params.doctorName,
      doctorMobile: prep.phone,
      patientName: params.patientName,
      date: params.date,
      timeSlot: params.timeSlot,
      message: prep.message,
      status: 'sent',
    });
    setWaHistory(whatsappService.getHistory());
    whatsappService.openWhatsApp(prep.url);
    toast.success(`WhatsApp test notification opened for ${testDoctor}.`);
  };

  const handleClearWaHistory = () => {
    whatsappService.clearHistory();
    setWaHistory([]);
    toast.success('WhatsApp alert dispatch logs cleared.');
  };

  const handleExportLogs = () => {
    const entries = appointmentsService.getEntries();
    downloadCsv(
      'clinical-logs',
      ['Time', 'Slot', 'Token', 'Patient', 'Age/Sex', 'Complaint', 'Note', 'Doctor', 'Room', 'Visit Type', 'Status'],
      entries,
    );
    toast.success('Clinical logs exported as CSV.');
  };

  const handleExportAuditTrail = () => {
    exportAllLocalStorage('curaclinic-audit-trail');
    toast.success('Full audit trail exported as JSON.');
  };

  const renderField = (index: number) => {
    const f = identityFields[index];
    if (!f) return null;
    return <Field key={f.label} {...f} icon={FIELD_ICONS[index]} onChange={(v) => updateIdentityField(index, v)} />;
  };

  const maxBar = Math.max(...slotSaturationBars, 1);
  const peakIndex = slotSaturationBars.indexOf(Math.max(...slotSaturationBars));

  return (
    <div className="sp">
      <PageHeader
        eyebrow="Facility management"
        title="Clinic settings"
        description="Manage your clinic's details, opening hours and reception preferences."
        actions={<>
          {status && <span className="sp-status"><i /> {status}</span>}
          <IconButton className="white-button" onClick={discardChanges}>Discard</IconButton>
          <IconButton className="teal-button" onClick={saveChanges}><CheckCircle2 size={14} /> Save changes</IconButton>
        </>}
      />

      <nav className="sp-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={tab === i}
            className={tab === i ? 'active' : ''}
            onClick={() => setTab(i)}
          >{t.icon}{t.label}</button>
        ))}
      </nav>

      {tab === 0 && (
        <>
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><Building2 size={18} /></span>
              <div>
                <h2>Clinic identity</h2>
                <p>Shown on patient records, invoices and prescriptions.</p>
              </div>
              <span className="sp-badge green"><i className="sp-dot" /> Accredited</span>
            </header>

            <div className="sp-logo-row">
              <div className="sp-logo"><Building2 size={26} /></div>
              <div className="sp-logo-text">
                <b>Branch logo</b>
                <p>Appears on prescription headers, lab requests and reminders. PNG, SVG or WebP, 512×512 recommended.</p>
              </div>
              <div className="sp-logo-actions">
                <button type="button" className="sp-btn" onClick={() => toast.info('Logo uploads require a connected file store — not available in this demo.')}><Upload size={14} /> Replace</button>
                <button type="button" className="sp-btn ghost" onClick={() => toast.info('Branch monogram removed (demo only — not persisted).')}>Remove</button>
              </div>
            </div>

            <h3 className="sp-section">Basic details</h3>
            <div className="sp-grid">{renderField(0)}{renderField(1)}</div>

            <h3 className="sp-section">Location</h3>
            <div className="sp-grid">{renderField(2)}</div>

            <h3 className="sp-section">Contact</h3>
            <div className="sp-grid">{renderField(3)}{renderField(4)}{renderField(5)}{renderField(6)}</div>
          </section>

          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><MapPin size={18} /></span>
              <div>
                <h2>Campus at a glance</h2>
                <p>{campusInfo.locationLabel} · {campusInfo.buildingLabel}</p>
              </div>
              <span className="sp-badge teal">Geo-verified</span>
            </header>
            <div className="sp-stats">
              <div className="sp-stat"><Globe size={16} /><small>Time zone</small><b>{campusInfo.timeZone}</b></div>
              <div className="sp-stat"><BedDouble size={16} /><small>Beds &amp; suites</small><b>{roomsList.length} Rooms ({roomsList.reduce((acc, r) => acc + r.capacity, 0)} Beds)</b></div>
              <div className="sp-stat"><Users size={16} /><small>Clinical staff</small><b>{campusInfo.activeStaff}</b></div>
            </div>
          </section>

          <RoomsManagementCard
            rooms={roomsList}
            onRoomsChanged={() => setRoomsList(roomsService.getRooms())}
          />
        </>
      )}

      {tab === 1 && (
        <>
          <ScheduleCard scheduleRows={scheduleRows} durationOptions={durationOptions} />
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><Activity size={18} /></span>
              <div>
                <h2>Today&apos;s patient load</h2>
                <p>Projected from the current 30-minute consultation cadence.</p>
              </div>
              <span className="sp-badge green">Optimal pacing</span>
            </header>
            <div className="sp-chart">
              {slotSaturationBars.map((v, i) => (
                <div className={`sp-bar ${i === peakIndex ? 'peak' : ''}`} key={i}>
                  <div className="sp-bar-track"><i style={{ height: `${(v / maxBar) * 100}%` }} /></div>
                  <small>{SLOT_HOURS[i] ?? ''}</small>
                </div>
              ))}
            </div>
            <p className="sp-note">Busiest around <b>{SLOT_HOURS[peakIndex] ?? '—'}</b>.</p>
          </section>
        </>
      )}

      {tab === 2 && (
        <ReceptionCard receptionDefaults={receptionDefaults} onToggleWalkInAutoCheckin={toggleWalkInAutoCheckin} />
      )}

      {tab === 3 && (
        <>
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}><MessageCircle size={18} /></span>
              <div>
                <h2>WhatsApp Doctor Notifications</h2>
                <p>Configure automated appointment alert pushes sent to physicians via WhatsApp.</p>
              </div>
              <span className="sp-badge green"><i className="sp-dot" /> WhatsApp Cloud/Web Ready</span>
            </header>

            <h3 className="sp-section">Alert Preferences</h3>
            <div className="sp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Default Country Calling Code</label>
                <input
                  type="text"
                  value={waCountryCode}
                  onChange={(e) => handleCountryCodeChange(e.target.value)}
                  placeholder="+91"
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <small style={{ fontSize: 11, color: '#64748b' }}>Used when doctor numbers are entered without country prefix (e.g. 10 digits).</small>
              </div>

              <div className="sp-wa-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8 }}>
                <div>
                  <b style={{ fontSize: 13, display: 'block' }}>Auto-launch WhatsApp on Booking</b>
                  <span style={{ fontSize: 12, color: 'var(--sp-muted, #64748b)' }}>Automatically open wa.me link when an appointment slot is confirmed</span>
                </div>
                <input
                  type="checkbox"
                  checked={waAutoLaunch}
                  onChange={(e) => handleToggleAutoLaunch(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>
            </div>

            <h3 className="sp-section" style={{ marginTop: 24 }}>Test Notification Dispatch</h3>
            <div className="sp-wa-box" style={{ padding: 16, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                Send a sample notification push to verify doctor mobile configuration and WhatsApp messaging template.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Select Doctor</label>
                  <select
                    value={testDoctor}
                    onChange={(e) => handleDoctorSelect(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {doctorsList.length > 0 ? (
                      doctorsList.map((doc) => (
                        <option key={doc[0]} value={doc[0]}>
                          {doc[0]} ({doc[1]})
                        </option>
                      ))
                    ) : (
                      <option value="Dr. Eleanor Vance">Dr. Eleanor Vance (Consultant)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Doctor WhatsApp Number</label>
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 6,
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={14} /> Send Test WhatsApp Push
                </button>
              </div>
            </div>

            <h3 className="sp-section" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Recent WhatsApp Dispatch Logs ({waHistory.length})</span>
              {waHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearWaHistory}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Clear History
                </button>
              )}
            </h3>

            {waHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {waHistory.map((item) => (
                  <div
                    key={item.id}
                    className="sp-wa-item"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <b>{item.doctorName}</b> ({item.doctorMobile})
                      <span style={{ color: '#64748b', marginLeft: 8 }}>Patient: {item.patientName} • {item.timeSlot}</span>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 10, backgroundColor: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: 11 }}>
                      ✓ Dispatched
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0' }}>No notification alerts have been dispatched yet.</p>
            )}
          </section>
        </>
      )}

      {tab === 4 && (
        <>
          <section className="sp-card">
            <header className="sp-card-head">
              <span className="sp-card-icon"><ShieldCheck size={18} /></span>
              <div>
                <h2>Data &amp; compliance</h2>
                <p>{complianceInfo.description}</p>
              </div>
            </header>
            <div className="sp-list">
              <div className="sp-list-row">
                <span className="sp-list-icon"><FileText size={16} /></span>
                <div><b>Clinical logs</b><p>Appointments and visit records as a spreadsheet (CSV).</p></div>
                <button type="button" className="sp-btn" onClick={handleExportLogs}><Download size={14} /> Export CSV</button>
              </div>
              <div className="sp-list-row">
                <span className="sp-list-icon"><FileJson size={16} /></span>
                <div><b>Full audit trail</b><p>Everything stored in the system, as a JSON file.</p></div>
                <button type="button" className="sp-btn" onClick={handleExportAuditTrail}><Download size={14} /> Export JSON</button>
              </div>
            </div>
          </section>

          <section className="sp-card sp-danger">
            <header className="sp-card-head">
              <span className="sp-card-icon"><TriangleAlert size={18} /></span>
              <div>
                <h2>Danger zone</h2>
                <p>{complianceInfo.dangerZoneNote}</p>
              </div>
            </header>
            <button type="button" className="sp-btn danger" onClick={() => toast.info('Branch decommissioning is disabled in this demo.')}>{complianceInfo.branchLabel}</button>
          </section>
        </>
      )}
    </div>
  );
}
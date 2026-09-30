export interface WardAllocationResult {
  wardName: string;
  wardCode: string;
  roomNumber: string;
  wing: string;
  floor: string;
  bedStation: string;
  displayLabel: string;
  features: string[];
  allocationReason: string;
}

export interface WardDefinition {
  code: string;
  name: string;
  wing: string;
  floor: string;
  specialties: string[];
  rooms: string[];
  type: 'general' | 'icu' | 'triage' | 'pediatric' | 'cardiac' | 'rehab';
  capacity: number;
}

export const WARDS_CATALOG: WardDefinition[] = [
  {
    code: 'WARD-EMG',
    name: 'Emergency & Acute Triage Ward',
    wing: 'Central Trauma Wing',
    floor: 'Ground Floor (Direct Ambulance Access)',
    specialties: ['Emergency', 'Urgent Expedited', 'Acute Care'],
    rooms: ['Triage Bay 1', 'Triage Bay 2', 'Resuscitation Suite 1', 'Observation Bay A'],
    type: 'triage',
    capacity: 8,
  },
  {
    code: 'WARD-A',
    name: 'Ward A • Pediatric & Maternal Health Wing',
    wing: 'Pavilion Wing A',
    floor: 'Ground Floor',
    specialties: ['Pediatrics', 'Pediatrics & Child Health', 'Dermatology', 'Dermatology & Skin Care'],
    rooms: ['Suite 201', 'Suite 112', 'Child Wellness Bay 1', 'Pediatric Room 102'],
    type: 'pediatric',
    capacity: 12,
  },
  {
    code: 'WARD-B',
    name: 'Ward B • General Medicine & Neurology Wing',
    wing: 'Medical Wing B',
    floor: 'Floor 1',
    specialties: ['General Medicine', 'Internal Medicine', 'General & Family Medicine', 'Neurology', 'Neurology & Neurosciences', 'Neurology & Brain Health'],
    rooms: ['Suite 105', 'Suite 304', 'Suite 204', 'Neuro Care Suite 103'],
    type: 'general',
    capacity: 16,
  },
  {
    code: 'WARD-C',
    name: 'Ward C • Cardiology & Critical Telemetry Suite',
    wing: 'Cardiovascular Wing C',
    floor: 'Floor 1',
    specialties: ['Cardiology', 'Cardiology & Vascular', 'CCU'],
    rooms: ['Cath Lab 2', 'Suite 205', 'Cardio Telemetry Suite 101', 'ECG Bay 3'],
    type: 'cardiac',
    capacity: 10,
  },
  {
    code: 'WARD-D',
    name: 'Ward D • Orthopedics & Physical Rehabilitation',
    wing: 'Orthopedic Pavilion D',
    floor: 'Floor 2',
    specialties: ['Orthopedics', 'Orthopedics & Sports', 'Sports Medicine'],
    rooms: ['Suite 408', 'Rehab Studio 1', 'Joint Assessment Suite 104', 'Physio Bay 2'],
    type: 'rehab',
    capacity: 14,
  },
];

/**
 * Intelligent Ward & Room allocation algorithm:
 * Determines which room/ward should be provided to the patient based on:
 * 1. Urgency / Priority (Urgent triage escalates to Emergency Trauma Ward)
 * 2. Doctor's assigned consultation room
 * 3. Medical specialty clinical mapping
 * 4. Patient demographics (e.g. child routing to pediatric safe ward)
 */
export function allocateWardAndRoom(params: {
  specialty?: string;
  doctorName?: string;
  priority?: string;
  doctorSuite?: string;
  patientAgeSex?: string;
}): WardAllocationResult {
  const { specialty = '', doctorName = '', priority = 'routine', doctorSuite = '', patientAgeSex = '' } = params;

  const isUrgent = priority.toLowerCase().includes('urgent');
  const specLower = specialty.toLowerCase();
  const docLower = doctorName.toLowerCase();

  // 1. High Priority / Urgent: Allocate to Emergency Triage Ward
  if (isUrgent) {
    const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-EMG')!;
    return {
      wardName: ward.name,
      wardCode: ward.code,
      roomNumber: 'Triage Bay 1 (Trauma Ground Floor)',
      wing: ward.wing,
      floor: ward.floor,
      bedStation: 'Bed 01 • Telemetry Active',
      displayLabel: 'Emergency Triage Bay 1 (Ground Floor)',
      features: ['24/7 Vital Telemetry', 'Oxygen Line', 'Nurse Call Assist'],
      allocationReason: 'Urgent Priority triage escalation: Routed to Emergency Acute Bay 1.',
    };
  }

  // 2. Pediatrics routing (or patient age under 16)
  const isPediatric =
    specLower.includes('pediatric') ||
    docLower.includes('marcus vale') ||
    patientAgeSex.toLowerCase().includes('child') ||
    /\b(0?[1-9]|1[0-5])\s*(yo|yrs|years)/i.test(patientAgeSex);

  if (isPediatric) {
    const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-A')!;
    return {
      wardName: ward.name,
      wardCode: ward.code,
      roomNumber: doctorSuite || 'Suite 201 (Child Care)',
      wing: ward.wing,
      floor: ward.floor,
      bedStation: 'Cubicle P-02 • Child Safe',
      displayLabel: `${doctorSuite || 'Suite 201'} (Ward A • Pediatric)`,
      features: ['Child-friendly decor', 'Parent Accommodating', 'Emergency Resuscitation Cart'],
      allocationReason: 'Allocated to Ward A: Pediatric & Child Health specialized safe wing.',
    };
  }

  // 3. Cardiology routing
  if (specLower.includes('cardio') || docLower.includes('patel')) {
    const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-C')!;
    const room = doctorSuite || 'Suite 205 (Cath Lab 2)';
    return {
      wardName: ward.name,
      wardCode: ward.code,
      roomNumber: room,
      wing: ward.wing,
      floor: ward.floor,
      bedStation: 'Telemetry Station C-04',
      displayLabel: `${room} (Ward C • Cardiology)`,
      features: ['12-Lead ECG Station', 'Cardiac Defibrillator Ready', 'Blood Gas Telemetry'],
      allocationReason: 'Allocated to Ward C: Cardiovascular center with continuous ECG monitoring.',
    };
  }

  // 4. Neurology routing
  if (specLower.includes('neuro') || docLower.includes('ahmed rahman')) {
    const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-B')!;
    const room = doctorSuite || 'Suite 304 (Neuro Care)';
    return {
      wardName: ward.name,
      wardCode: ward.code,
      roomNumber: room,
      wing: ward.wing,
      floor: ward.floor,
      bedStation: 'Station B-08 • EEG Ready',
      displayLabel: `${room} (Ward B • Neuro)`,
      features: ['EEG Diagnostic Interface', 'Low-Luminance Room Lighting', 'Acoustic Soundproofing'],
      allocationReason: 'Allocated to Ward B: Neurology care wing equipped with neurological screening.',
    };
  }

  // 5. Dermatology routing
  if (specLower.includes('derma') || docLower.includes('rostova')) {
    const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-A')!;
    const room = doctorSuite || 'Suite 112 (Derma Laser)';
    return {
      wardName: ward.name,
      wardCode: ward.code,
      roomNumber: room,
      wing: ward.wing,
      floor: ward.floor,
      bedStation: 'Station A-05',
      displayLabel: `${room} (Ward A • Dermatology)`,
      features: ['Dermoscopy Digital Setup', 'Biopsy Prep Station', 'HEPA Filtered Air'],
      allocationReason: 'Allocated to Ward A: Outpatient clinical dermatology suite.',
    };
  }

  // 6. Orthopedics routing
  if (specLower.includes('ortho') || docLower.includes('moore')) {
    const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-D')!;
    const room = doctorSuite || 'Suite 408 (Ortho Rehab)';
    return {
      wardName: ward.name,
      wardCode: ward.code,
      roomNumber: room,
      wing: ward.wing,
      floor: ward.floor,
      bedStation: 'Rehab Bay D-03',
      displayLabel: `${room} (Ward D • Orthopedics)`,
      features: ['Gait Analysis Track', 'Joint Motion Sensor', 'Accessible Stretcher Access'],
      allocationReason: 'Allocated to Ward D: Orthopedic pavilion with motorized examination couch.',
    };
  }

  // 7. General Medicine / Dr. XYZ / Default Outpatient
  const ward = WARDS_CATALOG.find((w) => w.code === 'WARD-B')!;
  const room = doctorSuite || (docLower.includes('xyz') ? 'Suite 105' : 'Suite 103');
  return {
    wardName: ward.name,
    wardCode: ward.code,
    roomNumber: room,
    wing: ward.wing,
    floor: ward.floor,
    bedStation: 'Station B-01 • General Consultation',
    displayLabel: `${room} (Ward B • General Medicine)`,
    features: ['Universal Examination Bed', 'Digital Biometrics Vitals', 'Air Conditioned'],
    allocationReason: `Allocated to ${ward.name} based on primary consultation room assignment (${room}).`,
  };
}

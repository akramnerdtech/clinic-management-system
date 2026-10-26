export interface LabTestItem {
  id: string;
  testName: string;
  testDate: string; // YYYY-MM-DD
  status?: 'Pending' | 'Sample Collected' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  result?: string;
}

export const COMMON_LAB_TEST_SUGGESTIONS = [
  'X-Ray',
  'Chest X-Ray (PA View)',
  'Abdominal X-Ray',
  'Bone / Extremity X-Ray',
  'Blood Test',
  'Complete Blood Count (CBC)',
  'Comprehensive Metabolic Panel (CMP)',
  'Lipid Panel (Cholesterol)',
  'Blood Glucose (HbA1c)',
  'ECG',
  '12-Lead Electrocardiogram (ECG)',
  'ECG Rhythm Strip',
  'Ultrasound Abdomen',
  'Echocardiogram (2D Echo)',
  'Urinalysis Routine',
  'Thyroid Function Test (TSH)',
];

export const TEST_STATUS_OPTIONS: Array<NonNullable<LabTestItem['status']>> = [
  'Pending',
  'Sample Collected',
  'In Progress',
  'Completed',
  'Cancelled',
];

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLabTests(raw?: string | null): LabTestItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && (item.testName || item.name))
        .map((item, idx) => ({
          id: item.id || `lt-${idx}-${Date.now()}`,
          testName: String(item.testName || item.name).trim(),
          testDate: item.testDate || item.date || getTodayDateString(),
          status: item.status || 'Pending',
          notes: item.notes || '',
          result: item.result || '',
        }));
    }
  } catch {
    // If legacy string was stored (e.g. "X-ray" or "CBC, ECG")
    const cleaned = raw.trim();
    if (cleaned && cleaned !== '—' && cleaned !== 'None' && cleaned !== 'Clinical Review') {
      const parts = cleaned.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
      return parts.map((part, idx) => ({
        id: `lt-legacy-${idx}-${Date.now()}`,
        testName: part,
        testDate: getTodayDateString(),
        status: 'Pending',
      }));
    }
  }
  return [];
}

export function serializeLabTests(tests: LabTestItem[]): string {
  const valid = tests.filter((t) => t.testName && t.testName.trim().length > 0);
  return JSON.stringify(valid);
}

export type LabCategoryFilter = 'all' | 'xray' | 'blood-test' | 'ecg' | 'ultrasound' | 'other';

export function normalizeTestName(name: string): string {
  return (name || '').toLowerCase().replace(/[\s\-_]/g, '');
}

export function isXRayTest(name: string): boolean {
  const n = normalizeTestName(name);
  return n.includes('xray') || n.includes('radiograph') || n.includes('radiology') || n.includes('scan') || n.includes('ctscan');
}

export function isBloodTest(name: string): boolean {
  const n = normalizeTestName(name);
  return (
    n.includes('blood') ||
    n.includes('cbc') ||
    n.includes('hemoglobin') ||
    n.includes('lipid') ||
    n.includes('serum') ||
    n.includes('glucose') ||
    n.includes('platelet') ||
    n.includes('pathology') ||
    n.includes('metabolic') ||
    n.includes('tsh') ||
    n.includes('thyroid') ||
    n.includes('plasma')
  );
}

export function isEcgTest(name: string): boolean {
  const n = normalizeTestName(name);
  return (
    n.includes('ecg') ||
    n.includes('ekg') ||
    n.includes('electrocardio') ||
    n.includes('cardio') ||
    n.includes('holter') ||
    n.includes('arrhythmia')
  );
}

export function isUltrasoundTest(name: string): boolean {
  const n = normalizeTestName(name);
  return (
    n.includes('ultrasound') ||
    n.includes('sonography') ||
    n.includes('sonogram') ||
    n.includes('usg') ||
    n.includes('doppler') ||
    n.includes('echocardiogram') ||
    n.includes('echo')
  );
}

export function testMatchesCategory(testName: string, category: LabCategoryFilter): boolean {
  if (category === 'all') return true;
  if (category === 'xray') return isXRayTest(testName);
  if (category === 'blood-test') return isBloodTest(testName);
  if (category === 'ecg') return isEcgTest(testName);
  if (category === 'ultrasound') return isUltrasoundTest(testName);
  if (category === 'other') {
    return !isXRayTest(testName) && !isBloodTest(testName) && !isEcgTest(testName) && !isUltrasoundTest(testName);
  }
  return true;
}

export function patientMatchesCategory(patientTestsRaw?: string | null, category: LabCategoryFilter = 'all'): boolean {
  const tests = parseLabTests(patientTestsRaw);
  if (tests.length === 0) return false;
  if (category === 'all') return true;
  return tests.some((t) => testMatchesCategory(t.testName, category));
}

export function getPatientMatchingTests(patientTestsRaw?: string | null, category: LabCategoryFilter = 'all'): LabTestItem[] {
  const tests = parseLabTests(patientTestsRaw);
  if (category === 'all') return tests;
  return tests.filter((t) => testMatchesCategory(t.testName, category));
}

export function getTestBadgeTheme(testName: string): { bg: string; text: string; border: string; label: string } {
  if (isXRayTest(testName)) {
    return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'X-Ray' };
  }
  if (isBloodTest(testName)) {
    return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Blood' };
  }
  if (isEcgTest(testName)) {
    return { bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe', label: 'ECG' };
  }
  if (isUltrasoundTest(testName)) {
    return { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', label: 'Ultrasound' };
  }
  return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Lab' };
}

export function getStatusTheme(status?: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'Completed':
      return { bg: '#ecfdf5', text: '#047857', dot: '#10b981' };
    case 'In Progress':
      return { bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' };
    case 'Sample Collected':
      return { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' };
    case 'Cancelled':
      return { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' };
    case 'Pending':
    default:
      return { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' };
  }
}

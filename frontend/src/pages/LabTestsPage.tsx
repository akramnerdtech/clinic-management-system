import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Scan,
  Droplet,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  Calendar,
  Phone,
  AlertCircle,
  FileText,
  User,
  X,
  Plus,
  Waves,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { patientsService } from '@/services/patientsService';
import { useToast } from '@/utils/toast';
import {
  parseLabTests,
  serializeLabTests,
  isXRayTest,
  isBloodTest,
  isEcgTest,
  isUltrasoundTest,
  testMatchesCategory,
  getStatusTheme,
  getTestBadgeTheme,
  TEST_STATUS_OPTIONS,
  COMMON_LAB_TEST_SUGGESTIONS,
  getTodayDateString,
} from '@/utils/labTests';
import type { Patient, LabTestItem } from '@/types';
import type { LabCategoryFilter } from '@/utils/labTests';

interface LabTestsPageProps {
  filter?: LabCategoryFilter;
}

interface FlattenedTestRow {
  patient: Patient;
  test: LabTestItem;
  allTests: LabTestItem[];
}

export function LabTestsPage({ filter: routeFilter = 'all' }: LabTestsPageProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const [patients, setPatients] = useState<Patient[]>(() => patientsService.getPatients());
  const [activeCategory, setActiveCategory] = useState<LabCategoryFilter>(routeFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPatientRow, setSelectedPatientRow] = useState<FlattenedTestRow | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPatientForAssign, setSelectedPatientForAssign] = useState<string>('');
  const [newTestName, setNewTestName] = useState('Chest X-Ray');
  const [newTestDate, setNewTestDate] = useState(getTodayDateString());

  // Keep state synced with route prop changes
  useEffect(() => {
    setActiveCategory(routeFilter);
  }, [routeFilter]);

  // Listen to patients updates
  useEffect(() => {
    const handleUpdate = () => {
      setPatients(patientsService.getPatients());
    };
    window.addEventListener('clinic-patients-updated', handleUpdate);
    return () => window.removeEventListener('clinic-patients-updated', handleUpdate);
  }, []);

  const handleTabChange = (category: LabCategoryFilter) => {
    setActiveCategory(category);
    if (category === 'all') navigate('/lab-tests');
    else if (category === 'xray') navigate('/lab-tests/xray');
    else if (category === 'blood-test') navigate('/lab-tests/blood-test');
    else if (category === 'ecg') navigate('/lab-tests/ecg');
    else if (category === 'ultrasound') navigate('/lab-tests/ultrasound');
  };

  // Compute test rows filtered by active category
  const allFlattenedRows = useMemo<FlattenedTestRow[]>(() => {
    const rows: FlattenedTestRow[] = [];
    patients.forEach((patient) => {
      const tests = parseLabTests(patient[8]);
      tests.forEach((test) => {
        if (testMatchesCategory(test.testName, activeCategory)) {
          rows.push({
            patient,
            test,
            allTests: tests,
          });
        }
      });
    });
    return rows;
  }, [patients, activeCategory]);

  // Department counts for tabs
  const counts = useMemo(() => {
    let xray = 0;
    let blood = 0;
    let ecg = 0;
    let ultrasound = 0;
    let all = 0;

    patients.forEach((p) => {
      const tests = parseLabTests(p[8]);
      if (tests.length > 0) all += tests.length;
      tests.forEach((t) => {
        if (isXRayTest(t.testName)) xray++;
        if (isBloodTest(t.testName)) blood++;
        if (isEcgTest(t.testName)) ecg++;
        if (isUltrasoundTest(t.testName)) ultrasound++;
      });
    });

    return { all, xray, blood, ecg, ultrasound };
  }, [patients]);

  // Filter by search query and status filter
  const filteredRows = useMemo(() => {
    return allFlattenedRows.filter((row) => {
      const p = row.patient;
      const t = row.test;
      const q = searchQuery.trim().toLowerCase();

      if (statusFilter !== 'all' && (t.status || 'Pending').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (!q) return true;

      const target = `${p[0]} ${p[1]} ${p[3]} ${p[10] || ''} ${t.testName} ${t.testDate} ${t.status || ''}`.toLowerCase();
      return target.includes(q);
    });
  }, [allFlattenedRows, searchQuery, statusFilter]);

  // Update test status directly in the patient record
  const updateTestStatus = (patientId: string, testId: string, newStatus: LabTestItem['status']) => {
    const targetPatient = patients.find(([id]) => id === patientId);
    if (!targetPatient) return;

    const tests = parseLabTests(targetPatient[8]);
    const updatedTests = tests.map((t) => (t.id === testId ? { ...t, status: newStatus } : t));

    const updatedPatient: Patient = [...targetPatient];
    updatedPatient[8] = serializeLabTests(updatedTests);

    patientsService.updatePatient(updatedPatient);
    setPatients(patientsService.getPatients());
    toast.success(`Updated status to ${newStatus}`);

    if (selectedPatientRow && selectedPatientRow.patient[0] === patientId) {
      const updatedRowTest = updatedTests.find((t) => t.id === testId) || selectedPatientRow.test;
      setSelectedPatientRow({
        ...selectedPatientRow,
        patient: updatedPatient,
        test: updatedRowTest,
        allTests: updatedTests,
      });
    }
  };

  // Quick Assign Test to a Patient
  const handleAssignTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForAssign) {
      toast.error('Please select a patient.');
      return;
    }
    if (!newTestName.trim()) {
      toast.error('Please enter a test name.');
      return;
    }

    const targetPatient = patients.find(([id]) => id === selectedPatientForAssign);
    if (!targetPatient) return;

    const currentTests = parseLabTests(targetPatient[8]);
    const newTest: LabTestItem = {
      id: `lt-${Date.now()}`,
      testName: newTestName.trim(),
      testDate: newTestDate || getTodayDateString(),
      status: 'Pending',
    };

    const updatedTests = [...currentTests, newTest];
    const updatedPatient: Patient = [...targetPatient];
    updatedPatient[8] = serializeLabTests(updatedTests);

    patientsService.updatePatient(updatedPatient);
    setPatients(patientsService.getPatients());
    toast.success(`Assigned ${newTest.testName} to ${targetPatient[1]}`);
    setAssignModalOpen(false);
  };

  // Header content depending on active category
  const departmentInfo = useMemo(() => {
    switch (activeCategory) {
      case 'xray':
        return {
          eyebrow: 'RADIOLOGY & IMAGING WORKLIST',
          title: 'X-Ray Patient Listing',
          description: 'Showing only patients with active X-Ray and radiograph investigations.',
          icon: Scan,
          badgeColor: '#1d4ed8',
          badgeBg: '#eff6ff',
        };
      case 'blood-test':
        return {
          eyebrow: 'PATHOLOGY & HEMATOLOGY WORKLIST',
          title: 'Blood Test Patient Listing',
          description: 'Showing only patients with CBC, metabolic panels, and blood investigations.',
          icon: Droplet,
          badgeColor: '#b91c1c',
          badgeBg: '#fef2f2',
        };
      case 'ecg':
        return {
          eyebrow: 'CARDIOLOGY DIAGNOSTIC WORKLIST',
          title: 'ECG Patient Listing',
          description: 'Showing only patients scheduled for Electrocardiograms and rhythm tests.',
          icon: Activity,
          badgeColor: '#86198f',
          badgeBg: '#fdf4ff',
        };
      case 'ultrasound':
        return {
          eyebrow: 'ULTRASONOGRAPHY & SONOGRAM WORKLIST',
          title: 'Ultrasound Patient Listing',
          description: 'Showing only patients with ultrasound and sonography scan orders.',
          icon: Waves,
          badgeColor: '#0e7490',
          badgeBg: '#ecfeff',
        };
      case 'all':
      default:
        return {
          eyebrow: 'CENTRAL DIAGNOSTICS & LABORATORY',
          title: 'Diagnostic Lab Test Worklist',
          description: 'Comprehensive directory of all outpatient and inpatient lab tests.',
          icon: FlaskConical,
          badgeColor: '#078d81',
          badgeBg: '#e6f7f5',
        };
    }
  }, [activeCategory]);

  const DeptIcon = departmentInfo.icon;

  // Department Stats
  const stats = useMemo(() => {
    const total = allFlattenedRows.length;
    const pending = allFlattenedRows.filter((r) => !r.test.status || r.test.status === 'Pending').length;
    const inProgress = allFlattenedRows.filter((r) => r.test.status === 'In Progress' || r.test.status === 'Sample Collected').length;
    const completed = allFlattenedRows.filter((r) => r.test.status === 'Completed').length;
    return { total, pending, inProgress, completed };
  }, [allFlattenedRows]);

  return (
    <div className="lab-module-page">
      <PageHeader
        eyebrow={departmentInfo.eyebrow}
        title={departmentInfo.title}
        description={departmentInfo.description}
        actions={
          <div className="lab-header-actions">
            <IconButton
              className="white-button"
              onClick={() => window.print()}
            >
              <Printer size={14} /> Print Worklist
            </IconButton>
            <IconButton
              className="teal-button"
              onClick={() => {
                if (patients.length > 0) setSelectedPatientForAssign(patients[0][0]);
                setAssignModalOpen(true);
              }}
            >
              <Plus size={14} /> Assign New Lab Test
            </IconButton>
          </div>
        }
      />

      {/* Department Navigation Tabs */}
      <div className="lab-tabs-bar">
        <button
          type="button"
          className={`lab-tab-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <FlaskConical size={14} />
          <span>All Lab Tests</span>
          <span className="tab-count-badge">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`lab-tab-pill ${activeCategory === 'xray' ? 'active' : ''}`}
          onClick={() => handleTabChange('xray')}
        >
          <Scan size={14} />
          <span>X-Ray Listing</span>
          <span className="tab-count-badge count-xray">{counts.xray}</span>
        </button>

        <button
          type="button"
          className={`lab-tab-pill ${activeCategory === 'blood-test' ? 'active' : ''}`}
          onClick={() => handleTabChange('blood-test')}
        >
          <Droplet size={14} />
          <span>Blood Test Listing</span>
          <span className="tab-count-badge count-blood">{counts.blood}</span>
        </button>

        <button
          type="button"
          className={`lab-tab-pill ${activeCategory === 'ecg' ? 'active' : ''}`}
          onClick={() => handleTabChange('ecg')}
        >
          <Activity size={14} />
          <span>ECG Listing</span>
          <span className="tab-count-badge count-ecg">{counts.ecg}</span>
        </button>

        <button
          type="button"
          className={`lab-tab-pill ${activeCategory === 'ultrasound' ? 'active' : ''}`}
          onClick={() => handleTabChange('ultrasound')}
        >
          <Waves size={14} />
          <span>Ultrasound Listing</span>
          <span className="tab-count-badge count-ultrasound">{counts.ultrasound}</span>
        </button>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="lab-stats-grid">
        <div className="lab-stat-card">
          <div className="stat-icon-wrap" style={{ background: departmentInfo.badgeBg, color: departmentInfo.badgeColor }}>
            <DeptIcon size={18} />
          </div>
          <div>
            <span className="stat-label">TOTAL {departmentInfo.title.toUpperCase()}</span>
            <strong className="stat-value">{stats.total}</strong>
            <small className="stat-hint">{activeCategory === 'all' ? 'All tests' : `Only ${departmentInfo.title}`}</small>
          </div>
        </div>

        <div className="lab-stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fffbeb', color: '#b45309' }}>
            <Clock size={18} />
          </div>
          <div>
            <span className="stat-label">PENDING INVESTIGATION</span>
            <strong className="stat-value">{stats.pending}</strong>
            <small className="stat-hint">Awaiting scan / collection</small>
          </div>
        </div>

        <div className="lab-stat-card">
          <div className="stat-icon-wrap" style={{ background: '#faf5ff', color: '#7e22ce' }}>
            <Activity size={18} />
          </div>
          <div>
            <span className="stat-label">IN PROGRESS / COLLECTED</span>
            <strong className="stat-value">{stats.inProgress}</strong>
            <small className="stat-hint">Being processed in laboratory</small>
          </div>
        </div>

        <div className="lab-stat-card">
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#047857' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="stat-label">COMPLETED REPORTS</span>
            <strong className="stat-value">{stats.completed}</strong>
            <small className="stat-hint">Results finalized</small>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="lab-filter-row">
        <div className="lab-search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder={`Search ${departmentInfo.title} by patient name, ID, mobile, or test...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="lab-status-select-wrap">
          <Filter size={13} />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-dropdown"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Sample Collected">Sample Collected</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="results-count">
          Showing <b>{filteredRows.length}</b> {filteredRows.length === 1 ? 'patient' : 'patients'}
        </div>
      </div>

      {/* Main Table Worklist */}
      <div className="content-card lab-table-card">
        <div className="table-header-title">
          <div className="table-title-left">
            <DeptIcon size={16} style={{ color: departmentInfo.badgeColor }} />
            <h3>{departmentInfo.title} Worklist</h3>
          </div>
          <span className="badge-scope">
            Filter: <b>{activeCategory.toUpperCase()}</b>
          </span>
        </div>

        <div className="registry-table-wrap">
          <table>
            <thead>
              <tr>
                <th>PATIENT ID</th>
                <th>PATIENT NAME &amp; CONTACT</th>
                <th>AGE / SEX</th>
                <th>ASSIGNED TEST NAME</th>
                <th>TEST DATE</th>
                <th>CLINICAL REASON</th>
                <th>LAB STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const p = row.patient;
                const t = row.test;
                const badgeTheme = getTestBadgeTheme(t.testName);
                const statusTheme = getStatusTheme(t.status);

                return (
                  <tr key={`${p[0]}-${t.id}`}>
                    <td>
                      <span className="patient-id">{p[0]}</span>
                    </td>
                    <td>
                      <b>{p[1]}</b>
                      <small>
                        {p[10] ? `${p[10]} • ` : ''}
                        {p[6] || 'Outpatient'}
                      </small>
                    </td>
                    <td>{p[2]}</td>
                    <td>
                      <span
                        className="test-name-tag"
                        style={{
                          background: badgeTheme.bg,
                          color: badgeTheme.text,
                          borderColor: badgeTheme.border,
                        }}
                      >
                        {t.testName}
                      </span>
                    </td>
                    <td>
                      <div className="test-date-badge">
                        <Calendar size={11} />
                        <span>{t.testDate || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="condition-chip" title={p[3]}>
                        {p[3] || 'Clinical Review'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={t.status || 'Pending'}
                        onChange={(e) =>
                          updateTestStatus(p[0], t.id, e.target.value as LabTestItem['status'])
                        }
                        className="status-pill-select"
                        style={{
                          background: statusTheme.bg,
                          color: statusTheme.text,
                        }}
                      >
                        {TEST_STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="patient-row-actions">
                      <button
                        type="button"
                        className="patient-action-icon"
                        title="View Patient Requisition"
                        onClick={() => setSelectedPatientRow(row)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="lab-empty-cell">
                    <div className="empty-message-box">
                      <DeptIcon size={32} style={{ color: departmentInfo.badgeColor, opacity: 0.6 }} />
                      <h4>No patients found in {departmentInfo.title}</h4>
                      <p>
                        {searchQuery
                          ? 'No patients matched your current search and filter settings.'
                          : `When a doctor or receptionist registers or edits a patient and assigns a test matching "${departmentInfo.title}", they will appear here automatically.`}
                      </p>
                      <button
                        type="button"
                        className="lab-assign-cta"
                        onClick={() => {
                          if (patients.length > 0) setSelectedPatientForAssign(patients[0][0]);
                          if (activeCategory === 'xray') setNewTestName('Chest X-Ray');
                          else if (activeCategory === 'blood-test') setNewTestName('Complete Blood Count (CBC)');
                          else if (activeCategory === 'ecg') setNewTestName('12-Lead ECG');
                          else if (activeCategory === 'ultrasound') setNewTestName('Ultrasound Abdomen');
                          setAssignModalOpen(true);
                        }}
                      >
                        <Plus size={13} /> Assign {departmentInfo.title.replace('Listing', 'Test')} to a Patient
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Requisition & Details Modal */}
      {selectedPatientRow && (
        <div className="lab-modal-backdrop" onClick={() => setSelectedPatientRow(null)}>
          <div className="lab-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div className="modal-header-left">
                <FileText size={18} className="text-teal" />
                <div>
                  <h3>Laboratory Diagnostic Requisition</h3>
                  <span>Official Diagnostic Work Order • CuraClinic Diagnostics</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedPatientRow(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="lab-modal-body">
              <div className="requisition-banner">
                <div>
                  <span className="req-label">PATIENT MRN / ID</span>
                  <strong>{selectedPatientRow.patient[0]}</strong>
                </div>
                <div>
                  <span className="req-label">REGISTRATION DATE</span>
                  <span>{selectedPatientRow.patient[9] || 'Active EHR'}</span>
                </div>
                <div>
                  <span className="req-label">ATTENDING SPECIALIST</span>
                  <span>{selectedPatientRow.patient[4] || 'Dr. Linda Gomez (Chief Attending)'}</span>
                </div>
              </div>

              <div className="requisition-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Patient Full Name</span>
                  <strong className="detail-value">{selectedPatientRow.patient[1]}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Age &amp; Biological Sex</span>
                  <span className="detail-value">{selectedPatientRow.patient[2]}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Blood Group</span>
                  <span className="detail-value">{selectedPatientRow.patient[7] || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact / Phone</span>
                  <span className="detail-value">{selectedPatientRow.patient[10] || '—'}</span>
                </div>
                <div className="detail-item wide-item">
                  <span className="detail-label">Chief Complaint / Clinical Indication</span>
                  <span className="detail-value text-complaint">{selectedPatientRow.patient[3]}</span>
                </div>
              </div>

              <div className="requisition-tests-section">
                <h4>All Assigned Diagnostic Investigations</h4>
                <div className="requisition-tests-table">
                  {selectedPatientRow.allTests.map((t, i) => {
                    const bTheme = getTestBadgeTheme(t.testName);
                    const sTheme = getStatusTheme(t.status);
                    return (
                      <div key={t.id || i} className="req-test-item">
                        <div className="req-test-left">
                          <span
                            className="test-category-pill"
                            style={{ background: bTheme.bg, color: bTheme.text, borderColor: bTheme.border }}
                          >
                            {bTheme.label}
                          </span>
                          <div>
                            <strong>{t.testName}</strong>
                            <small>Date Assigned: {t.testDate}</small>
                          </div>
                        </div>

                        <div className="req-test-right">
                          <select
                            value={t.status || 'Pending'}
                            onChange={(e) =>
                              updateTestStatus(
                                selectedPatientRow.patient[0],
                                t.id,
                                e.target.value as LabTestItem['status']
                              )
                            }
                            className="status-pill-select"
                            style={{ background: sTheme.bg, color: sTheme.text }}
                          >
                            {TEST_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lab-modal-footer">
              <button
                type="button"
                className="lab-modal-secondary-btn"
                onClick={() => setSelectedPatientRow(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="lab-modal-primary-btn"
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print Requisition Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign Test Modal */}
      {assignModalOpen && (
        <div className="lab-modal-backdrop" onClick={() => setAssignModalOpen(false)}>
          <div className="lab-modal-card assign-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div className="modal-header-left">
                <Plus size={18} className="text-teal" />
                <div>
                  <h3>Assign Lab Test to Patient</h3>
                  <span>Route patient to X-Ray, Blood Test, or ECG departments</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAssignModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignTest}>
              <div className="lab-modal-body">
                <label className="assign-form-label">
                  <span>Select Registered Patient *</span>
                  <select
                    value={selectedPatientForAssign}
                    onChange={(e) => setSelectedPatientForAssign(e.target.value)}
                    required
                    className="assign-select"
                  >
                    {patients.map((p) => (
                      <option key={p[0]} value={p[0]}>
                        {p[0]} — {p[1]} ({p[2]})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="assign-form-label">
                  <span>Investigation / Test Name *</span>
                  <input
                    type="text"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    list="lab-assign-suggestions"
                    placeholder="e.g. Chest X-Ray, Complete Blood Count, 12-Lead ECG"
                    required
                    className="assign-input"
                  />
                  <datalist id="lab-assign-suggestions">
                    {COMMON_LAB_TEST_SUGGESTIONS.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                <div className="quick-select-buttons">
                  <button
                    type="button"
                    onClick={() => setNewTestName('Chest X-Ray')}
                    className="mini-chip"
                  >
                    X-Ray
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTestName('Complete Blood Count (CBC)')}
                    className="mini-chip"
                  >
                    Blood Test
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTestName('12-Lead ECG')}
                    className="mini-chip"
                  >
                    ECG
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTestName('Ultrasound Abdomen')}
                    className="mini-chip"
                  >
                    Ultrasound
                  </button>
                </div>

                <label className="assign-form-label">
                  <span>Scheduled Date *</span>
                  <input
                    type="date"
                    value={newTestDate}
                    onChange={(e) => setNewTestDate(e.target.value)}
                    required
                    className="assign-input"
                  />
                </label>
              </div>

              <div className="lab-modal-footer">
                <button
                  type="button"
                  className="lab-modal-secondary-btn"
                  onClick={() => setAssignModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="lab-modal-primary-btn">
                  Assign Investigation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

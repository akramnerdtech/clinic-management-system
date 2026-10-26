import React from 'react';
import { Plus, Trash2, FlaskConical, Scan, Droplet, Activity, Calendar, Waves } from 'lucide-react';
import {
  COMMON_LAB_TEST_SUGGESTIONS,
  TEST_STATUS_OPTIONS,
  getTodayDateString,
  getTestBadgeTheme,
} from '@/utils/labTests';
import type { LabTestItem } from '@/types';

interface LabTestsInputProps {
  tests: LabTestItem[];
  onChange: (tests: LabTestItem[]) => void;
  title?: string;
  subtitle?: string;
}

export function LabTestsInput({
  tests,
  onChange,
  title = 'Lab Tests & Diagnostic Investigations',
  subtitle = 'Assign diagnostic tests. Patients assigned X-Ray, Blood Test, or ECG will automatically route to the corresponding Laboratory department.',
}: LabTestsInputProps) {
  const addTest = (defaultName = '') => {
    const newTest: LabTestItem = {
      id: `lt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      testName: defaultName,
      testDate: getTodayDateString(),
      status: 'Pending',
      notes: '',
    };
    onChange([...tests, newTest]);
  };

  const removeTest = (id: string) => {
    onChange(tests.filter((t) => t.id !== id));
  };

  const updateTest = (id: string, field: keyof LabTestItem, value: string) => {
    onChange(
      tests.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  return (
    <div className="lab-tests-input-container wide">
      <div className="lab-tests-header">
        <div className="lab-tests-title-group">
          <div className="lab-tests-icon-wrap">
            <FlaskConical size={16} />
          </div>
          <div>
            <label className="lab-tests-label">{title}</label>
            <p className="lab-tests-subtext">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          className="lab-add-btn"
          onClick={() => addTest()}
        >
          <Plus size={14} /> Add Lab Test
        </button>
      </div>

      {/* Quick Add Pill Suggestions */}
      <div className="lab-quick-pills">
        <span className="quick-pill-label">Quick Add:</span>
        <button
          type="button"
          className="quick-pill quick-pill-xray"
          onClick={() => addTest('Chest X-Ray')}
        >
          <Scan size={12} /> + X-Ray
        </button>
        <button
          type="button"
          className="quick-pill quick-pill-blood"
          onClick={() => addTest('Complete Blood Count (CBC)')}
        >
          <Droplet size={12} /> + Blood Test
        </button>
        <button
          type="button"
          className="quick-pill quick-pill-ecg"
          onClick={() => addTest('12-Lead ECG')}
        >
          <Activity size={12} /> + ECG
        </button>
        <button
          type="button"
          className="quick-pill quick-pill-ultrasound"
          onClick={() => addTest('Ultrasound Abdomen')}
        >
          <Waves size={12} /> + Ultrasound
        </button>
      </div>

      {/* Test List Rows */}
      {tests.length === 0 ? (
        <div className="lab-empty-state">
          <FlaskConical size={22} className="lab-empty-icon" />
          <p>No lab tests assigned to this patient.</p>
          <span>
            Click <b>"+ X-Ray"</b>, <b>"+ Blood Test"</b>, <b>"+ ECG"</b> above or <b>"+ Add Lab Test"</b> to assign investigations.
          </span>
        </div>
      ) : (
        <div className="lab-tests-list">
          {tests.map((test, index) => {
            const badgeTheme = getTestBadgeTheme(test.testName);
            return (
              <div key={test.id} className="lab-test-row">
                <div className="lab-test-index">
                  <span
                    className="dept-tag"
                    style={{
                      background: badgeTheme.bg,
                      color: badgeTheme.text,
                      borderColor: badgeTheme.border,
                    }}
                  >
                    {badgeTheme.label} #{index + 1}
                  </span>
                </div>

                <div className="lab-test-fields">
                  <div className="lab-field-group test-name-field">
                    <span className="field-hint">Test Name *</span>
                    <input
                      type="text"
                      placeholder="e.g. Chest X-Ray, Blood Test (CBC), 12-Lead ECG"
                      value={test.testName}
                      onChange={(e) => updateTest(test.id, 'testName', e.target.value)}
                      list="lab-test-suggestions-list"
                      className="lab-input"
                      required
                    />
                  </div>

                  <div className="lab-field-group test-date-field">
                    <span className="field-hint">Test Date</span>
                    <div className="date-input-wrap">
                      <Calendar size={13} className="date-icon" />
                      <input
                        type="date"
                        value={test.testDate || getTodayDateString()}
                        onChange={(e) => updateTest(test.id, 'testDate', e.target.value)}
                        className="lab-input lab-date-input"
                      />
                    </div>
                  </div>

                  <div className="lab-field-group test-status-field">
                    <span className="field-hint">Status</span>
                    <select
                      value={test.status || 'Pending'}
                      onChange={(e) => updateTest(test.id, 'status', e.target.value)}
                      className="lab-select"
                    >
                      {TEST_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="lab-remove-btn"
                  title="Remove this test"
                  aria-label="Remove this test"
                  onClick={() => removeTest(test.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Datalist for autocomplete */}
      <datalist id="lab-test-suggestions-list">
        {COMMON_LAB_TEST_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
}

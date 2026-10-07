import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  AlertTriangle,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Metric } from "@/components/ui/Metric";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { usePatients } from "@/hooks/usePatients";
import { useToast } from "@/utils/toast";
import { ReportModal } from "@/components/reports/ReportModal";
import type { Patient } from "@/types";

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayDate(): string {
  return dateKey(new Date());
}

export function PatientsPage() {
  const { patients, metrics, removePatient, clearAllPatients } = usePatients();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "today">("all");
  const [reportOpen, setReportOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const todayDateKey = todayDate();
  const todayPatients = patients.filter(
    (patient) => patient[9] === todayDateKey,
  );

  const currentList = activeTab === "today" ? todayPatients : patients;

  const filtered = currentList.filter((p) =>
    `${p[0]} ${p[1]} ${p[3]}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const confirmDeletePatient = () => {
    if (!patientToDelete) return;
    const name = patientToDelete[1];
    removePatient(patientToDelete[0]);
    toast.success(`${name} was deleted from the patient registry.`);
    setPatientToDelete(null);
  };

  const confirmClearAll = () => {
    clearAllPatients();
    toast.success("All patient records have been permanently cleared.");
    setClearAllModalOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="CLINICAL REGISTRY / OUTPATIENT RECORDS"
        title="Patients Registry"
        description="Search, manage and view all registered patients with comprehensive medical records and active appointment history."
        actions={
          <>
            <IconButton
              className="white-button"
              onClick={() => setReportOpen(true)}
            >
              <Download size={14} /> Export by Date
            </IconButton>
            {patients.length > 0 && (
              <IconButton
                className="white-button"
                onClick={() => setClearAllModalOpen(true)}
                style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              >
                <Trash2 size={14} /> Clear All Patients
              </IconButton>
            )}
            <IconButton
              className="teal-button"
              onClick={() => navigate("/patients/new")}
            >
              <Plus size={14} /> Add Patient
            </IconButton>
          </>
        }
      />

      <div className="metrics-grid">
        {metrics.map((m) => (
          <Metric key={m.label} {...m} />
        ))}
      </div>

      <div className="filter-row patient-filters">
        <div className="small-search">
          <Search size={14} />
          <input
            placeholder="Search patient by name, MRN, phone number, national ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select>
          <option>Gender: All</option>
        </select>
        <select>
          <option>Age: All Groups</option>
        </select>
        <select>
          <option>Department: All</option>
        </select>
        <select>
          <option>Status: All</option>
        </select>
      </div>

      <div className="filter-tabs">
        <b
          role="button"
          tabIndex={0}
          style={{ cursor: "pointer", opacity: activeTab === "all" ? 1 : 0.6 }}
          onClick={() => setActiveTab("all")}
        >
          All Directory ({patients.length})
        </b>
        <span
          role="button"
          tabIndex={0}
          style={{
            cursor: "pointer",
            fontWeight: activeTab === "today" ? 700 : 400,
            color: activeTab === "today" ? "#0f766e" : undefined,
          }}
          onClick={() => setActiveTab("today")}
        >
          Registered Today ({todayPatients.length})
        </span>
      </div>

      <div className="patients-layout patient-list-layout">
        <section className="content-card patient-table">
          <div className="card-title">
            <h2>PATIENT MASTER INDEX</h2>
            <span>
              {filtered.length} of {currentList.length} patients displayed
            </span>
          </div>

          <div className="registry-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>PATIENT NAME</th>
                  <th>AGE / SEX</th>
                  <th>CONDITION</th>
                  <th>RECOMMENDED TEST</th>
                  <th>REGISTRATION DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p[0]}>
                    <td>
                      <span className="patient-id">{p[0]}</span>
                    </td>
                    <td>
                      <b>
                        {p[1]}{" "}
                        {i === 0 && (
                          <AlertTriangle size={12} className="text-red" />
                        )}
                      </b>
                      <small>{p[6]}</small>
                    </td>
                    <td>{p[2]}</td>
                    <td>
                      <span className="condition-chip">{p[3]}</span>
                    </td>
                    <td>{p[8] || "Clinical Review"}</td>
                    <td>{p[9] || "Registered in EHR"}</td>
                    <td className="patient-row-actions">
                      <button
                        type="button"
                        className="patient-action-icon"
                        title={`Edit ${p[1]}`}
                        aria-label={`Edit ${p[1]}`}
                        onClick={() =>
                          navigate(`/patients/${encodeURIComponent(p[0])}/edit`)
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="patient-action-icon delete-patient-icon"
                        title={`Delete ${p[1]}`}
                        aria-label={`Delete ${p[1]}`}
                        onClick={() => setPatientToDelete(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "48px 16px",
                        color: "#64748b",
                      }}
                    >
                      <b
                        style={{
                          display: "block",
                          fontSize: 15,
                          color: "#1e293b",
                        }}
                      >
                        {patients.length === 0
                          ? "No patients registered in the directory"
                          : "No patients match this search"}
                      </b>
                      <p style={{ marginTop: 6, fontSize: 13 }}>
                        {patients.length === 0
                          ? 'Click "+ Add Patient" above to register a new outpatient record.'
                          : "Try changing search query or switching to All Directory."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            Showing {filtered.length} of {currentList.length} patients in view
            <div>
              <button
                onClick={() => toast.info("You're already on the first page.")}
              >
                Prev
              </button>
              <b>1</b>
              <button
                onClick={() =>
                  toast.info("All matching patients are shown on this page.")
                }
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Patient Confirmation Modal */}
      {patientToDelete && (
        <Modal
          title="Delete Patient Record"
          subtitle={`Are you sure you want to remove ${patientToDelete[1]}?`}
          onClose={() => setPatientToDelete(null)}
          footer={
            <>
              <IconButton
                className="white-button"
                onClick={() => setPatientToDelete(null)}
              >
                Cancel
              </IconButton>
              <IconButton
                className="teal-button auto-width"
                style={{ backgroundColor: "#dc2626", borderColor: "#b91c1c" }}
                onClick={confirmDeletePatient}
              >
                <Trash2 size={14} /> Confirm Delete
              </IconButton>
            </>
          }
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  color: "#1e293b",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                This will delete {patientToDelete[1]} ({patientToDelete[0]})
                from the directory.
              </p>
              <p
                style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0 0" }}
              >
                Condition: {patientToDelete[3]}. This operation cannot be
                undone.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Patients Modal */}
      {clearAllModalOpen && (
        <Modal
          title="Clear All Patient Records"
          subtitle="Are you sure you want to delete every registered patient?"
          onClose={() => setClearAllModalOpen(false)}
          footer={
            <>
              <IconButton
                className="white-button"
                onClick={() => setClearAllModalOpen(false)}
              >
                Cancel
              </IconButton>
              <IconButton
                className="teal-button auto-width"
                style={{ backgroundColor: "#dc2626", borderColor: "#b91c1c" }}
                onClick={confirmClearAll}
              >
                <Trash2 size={14} /> Clear All Patients
              </IconButton>
            </>
          }
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  color: "#1e293b",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                This will delete all {patients.length} patient records
                permanently.
              </p>
              <p
                style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0 0" }}
              >
                New patients can be registered anytime via &ldquo;+ Add
                Patient&rdquo;.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {reportOpen && (
        <ReportModal module="patients" onClose={() => setReportOpen(false)} />
      )}
    </>
  );
}

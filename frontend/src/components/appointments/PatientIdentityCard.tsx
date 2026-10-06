import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, UserRound, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { Patient } from "@/types";
import "../../index.css";

interface Props {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
}

export function PatientIdentityCard({
  patients,
  selectedPatientId,
  onSelectPatient,
}: Props) {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [removedPatientIds, setRemovedPatientIds] = useState<string[]>([]);

  const filteredPatients = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    return patients.filter((patient) => {
      const patientId = patient[0];

      // Remove deleted patients from the current listing
      if (removedPatientIds.includes(patientId)) {
        return false;
      }

      const searchableText = `
        ${patient[0]}
        ${patient[1]}
        ${patient[3]}
      `.toLowerCase();

      return searchableText.includes(searchValue);
    });
  }, [patients, query, removedPatientIds]);

  const selectedPatient = patients.find(([id]) => id === selectedPatientId);

  const handleDeletePatient = (
    event: React.MouseEvent<HTMLButtonElement>,
    patientId: string,
    patientName: string,
  ) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to remove ${patientName}?`,
    );

    if (!confirmed) {
      return;
    }

    setRemovedPatientIds((currentIds) => [...currentIds, patientId]);

    // Clear selected patient if the deleted patient was selected
    if (selectedPatientId === patientId) {
      onSelectPatient("");
    }
  };

  return (
    <section className="content-card appointment-form-card patient-select-card">
      {/* Header */}
      <div className="card-title icon-title">
        <div className="form-icon">
          <UserRound size={17} />
        </div>

        <div>
          <h2>1. Select Patient</h2>
          <p>Choose a patient already registered in the clinic.</p>
        </div>

        <IconButton
          className="soft-button"
          onClick={() => navigate("/patients/new")}
        >
          <UserPlus size={15} />
          Add Patient
        </IconButton>
      </div>

      {/* Search */}
      <label className="registered-patient-search">
        <Search size={17} />

        <input
          type="search"
          placeholder="Search by patient name, ID, or condition"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search registered patients"
        />
      </label>

      {/* Patient List */}
      {filteredPatients.length > 0 ? (
        <div
          className="registered-patient-list"
          role="group"
          aria-label="Registered patients"
        >
          {filteredPatients.map((patient) => {
            const patientId = patient[0];
            const patientName = patient[1];
            const patientAge = patient[2];
            const patientCondition = patient[3];

            const isSelected = selectedPatientId === patientId;

            const initials = patientName
              .split(/\s+/)
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={patientId}
                className={`registered-patient-option ${
                  isSelected ? "selected" : ""
                }`}
              >
                {/* Patient Select Button */}
                <button
                  type="button"
                  id={`appointment-patient-${patientId}`}
                  aria-pressed={isSelected}
                  className="registered-patient-select"
                  onClick={() => onSelectPatient(patientId)}
                >
                  <span className="registered-patient-avatar">{initials}</span>

                  <span className="registered-patient-name">
                    <b>{patientName}</b>

                    <small>
                      {patientId} · {patientCondition}
                    </small>
                  </span>

                  <span className="registered-patient-age">{patientAge}</span>
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  className="patient-delete-button"
                  title={`Delete ${patientName}`}
                  aria-label={`Delete ${patientName}`}
                  onClick={(event) =>
                    handleDeletePatient(event, patientId, patientName)
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="patient-selector-empty-state">
          <UserRound size={24} />

          <p>
            {query.trim()
              ? "No registered patients match your search."
              : "No registered patients yet."}
          </p>

          <IconButton
            className="teal-button"
            onClick={() => navigate("/patients/new")}
          >
            <UserPlus size={14} />
            Register Patient
          </IconButton>
        </div>
      )}

      {/* Selected Patient Summary */}
      {selectedPatient && !removedPatientIds.includes(selectedPatient[0]) && (
        <div className="selected-patient-summary">
          <span>Selected patient</span>

          <b>{selectedPatient[1]}</b>

          <small>
            {selectedPatient[0]} · {selectedPatient[2]}
          </small>
        </div>
      )}
    </section>
  );
}

import { notificationSyncService } from "@/services/notificationSyncService";
import { doctorsMetrics, doctorProfile } from "@/data/doctors";
import { loadFromStorage, saveToStorage } from "@/utils/storage";
import { Stethoscope, Clock3, CheckCircle2, Building2 } from "lucide-react";
import type { Doctor, MetricConfig } from "@/types";

const KEYS = {
  doctors: "curaclinic.doctors.doctors",
  metrics: "curaclinic.doctors.metrics",
  profile: "curaclinic.doctors.profile",
};

/**
 * Stable ID for doctors saved before IDs were stored.
 */
function doctorIdFromName(name: string): string {
  return `doc-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export const doctorsService = {
  getDoctors(): Doctor[] {
    const loaded = loadFromStorage<Doctor[]>(KEYS.doctors, []);

    return loaded.map(
      (doctor) =>
        [
          doctor[0],
          doctor[1],
          doctor[2],
          doctor[3],
          doctor[4] === "OFF DUTY" ? "OFF DUTY" : "ON DUTY",
          doctor[5],
          doctor[6],
          doctor[7],
          doctor[8],
          doctor[9],
          doctor[10] || doctorIdFromName(doctor[0]),
        ] as Doctor,
    );
  },

  getOnDutyCount(): number {
    return this.getDoctors().filter((doctor) => doctor[4] === "ON DUTY").length;
  },

  findDoctor(doctorName: string): Doctor | undefined {
    if (!doctorName) return undefined;
    const clean = (s: string) =>
      s
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.)\s*/i, "")
        .trim()
        .toLowerCase();
    const target = clean(doctorName);
    return this.getDoctors().find(
      (d) =>
        clean(d[0]) === target ||
        d[0].toLowerCase().includes(target) ||
        target.includes(clean(d[0])),
    );
  },

  getDoctorMobile(doctorName: string): string {
    const doc = this.findDoctor(doctorName);
    if (doc?.[9]) return doc[9];
    const clean = doctorName
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.)\s*/i, "")
      .toLowerCase()
      .trim();
    const fallbacks: Record<string, string> = {
      "eleanor vance": "+91 98765 43210",
      xyz: "+91 98765 43211",
      "elena rostova": "+91 98765 43212",
      "marcus vale": "+91 98765 43213",
      "priya patel": "+91 98765 43214",
      "ahmed rahman": "+91 98765 43215",
    };
    for (const [key, val] of Object.entries(fallbacks)) {
      if (clean.includes(key) || key.includes(clean)) return val;
    }
    return "";
  },

  updateDoctorMobile(doctorName: string, mobile: string): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);
    const clean = (s: string) =>
      s
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.)\s*/i, "")
        .trim()
        .toLowerCase();
    const target = clean(doctorName);
    const updated = current.map((doctor) => {
      if (clean(doctor[0]) === target) {
        return [
          doctor[0],
          doctor[1],
          doctor[2],
          doctor[3],
          doctor[4],
          doctor[5],
          doctor[6],
          doctor[7],
          doctor[8],
          mobile.trim(),
          doctor[10],
        ] as Doctor;
      }
      return doctor;
    });
    saveToStorage(KEYS.doctors, updated);
    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));
    return this.getDoctors();
  },

  getDoctorFee(doctorName: string, specialtyName?: string): string {
    if (!doctorName) return "₹500.00";

    const cleanTarget = doctorName
      .replace(/\s*\([^)]*\)/g, "")
      .trim()
      .toLowerCase();

    const doctor = this.getDoctors().find(
      (d) =>
        d[0]
          .replace(/\s*\([^)]*\)/g, "")
          .trim()
          .toLowerCase() === cleanTarget,
    );

    if (doctor?.[8]) {
      return doctor[8];
    }

    const spec = (doctor?.[1] || specialtyName || "").toLowerCase();

    if (spec.includes("cardio")) return "₹950.00";
    if (spec.includes("neuro")) return "₹900.00";
    if (spec.includes("ortho")) return "₹850.00";
    if (spec.includes("pediatric")) return "₹750.00";
    if (spec.includes("derma")) return "₹700.00";

    return "₹800.00";
  },

  updateDoctorFee(doctorName: string, fee: string): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);

    const cleanTarget = doctorName
      .replace(/\s*\([^)]*\)/g, "")
      .trim()
      .toLowerCase();

    const numericFee = fee.replace(/[^0-9.]/g, "");
    const formattedFee = fee.startsWith("₹") ? fee : `₹${numericFee}`;

    const updated = current.map((doctor) => {
      const cleanName = doctor[0]
        .replace(/\s*\([^)]*\)/g, "")
        .trim()
        .toLowerCase();

      if (cleanName === cleanTarget) {
        const updatedDoctor = [...doctor];
        updatedDoctor[8] = formattedFee;

        return updatedDoctor as Doctor;
      }

      return doctor;
    });

    saveToStorage(KEYS.doctors, updated);

    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));

    return this.getDoctors();
  },

  getMetrics(): MetricConfig[] {
    const roster = this.getDoctors();

    const onDuty = roster.filter((doctor) => doctor[4] === "ON DUTY").length;

    const available = onDuty;
    const specialties = new Set(roster.map((doctor) => doctor[1])).size;

    return [
      {
        label: "TOTAL DOCTORS",
        value: String(roster.length),
        note: roster.length ? "100% capacity" : "No doctors registered",
        icon: Stethoscope,
      },
      {
        label: "ON DUTY TODAY",
        value: String(onDuty),
        note: `of ${roster.length} scheduled`,
        color: "blue",
        icon: Clock3,
      },
      {
        label: "AVAILABLE NOW",
        value: String(available),
        note: `${available} on floor`,
        icon: CheckCircle2,
      },
      {
        label: "MEDICAL SPECIALTIES",
        value: String(specialties),
        note: "Active units",
        icon: Building2,
      },
    ];
  },

  getFeaturedProfile() {
    return loadFromStorage(KEYS.profile, doctorProfile);
  },

  /**
   * Adds a doctor to the roster and persists the changes.
   */
  addDoctor(doctor: Doctor): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);

    // Prevent duplicate entries by name.
    const filtered = current.filter(
      (d) => d[0].toLowerCase() !== doctor[0].toLowerCase(),
    );

    const updated = [doctor, ...filtered];

    saveToStorage(KEYS.doctors, updated);

    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));

    window.dispatchEvent(new CustomEvent("clinic-calendar-updated"));

    return this.getDoctors();
  },

  updateDoctor(previousName: string, updatedDoctor: Doctor): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);

    const updated = current.map((doctor) =>
      doctor[0] === previousName ? updatedDoctor : doctor,
    );

    saveToStorage(KEYS.doctors, updated);

    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));

    window.dispatchEvent(new CustomEvent("clinic-calendar-updated"));

    return this.getDoctors();
  },

  removeDoctor(name: string): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);

    const updated = current.filter((doctor) => doctor[0] !== name);

    saveToStorage(KEYS.doctors, updated);

    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));

    window.dispatchEvent(new CustomEvent("clinic-calendar-updated"));

    return this.getDoctors();
  },

  clearAllDoctors(): Doctor[] {
    saveToStorage(KEYS.doctors, []);

    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));

    window.dispatchEvent(new CustomEvent("clinic-calendar-updated"));

    return [];
  },

  setDutyStatus(name: string, onDuty: boolean): Doctor[] {
    const current = loadFromStorage<Doctor[]>(KEYS.doctors, []);

    const updated = current.map((doctor) =>
      doctor[0] === name
        ? ([
            ...doctor.slice(0, 4),
            onDuty ? "ON DUTY" : "OFF DUTY",
            ...doctor.slice(5),
          ] as Doctor)
        : doctor,
    );

    saveToStorage(KEYS.doctors, updated);

    window.dispatchEvent(new CustomEvent("clinic-doctors-updated"));

    window.dispatchEvent(new CustomEvent("clinic-calendar-updated"));

    return this.getDoctors();
  },
};

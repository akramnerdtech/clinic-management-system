import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Stethoscope,
  Trash2,
  Users,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { patientsService } from "@/services/patientsService";
import { doctorsService } from "@/services/doctorsService";
import { serializeLabTests } from "@/utils/labTests";
import { useToast } from "@/utils/toast";
import type { Patient, Doctor } from "@/types";

interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: string;
  options?: { label: string; value: string; action?: string }[];
  patientCard?: {
    id: string;
    name: string;
    ageGender: string;
    condition: string;
    doctorName: string;
    doctorSpecialty: string;
    doctorRoom: string;
    doctorShifts: string;
    doctorFee: string;
    registrationDate: string;
  };
  faqCard?: {
    title: string;
    answer: string;
    category?: string;
  };
}

type RegistrationStep =
  | "idle"
  | "awaiting_name"
  | "awaiting_age"
  | "awaiting_gender"
  | "awaiting_disease"
  | "completed";

interface PatientDraft {
  name?: string;
  age?: string;
  gender?: string;
  disease?: string;
}

function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Medical disease to specialty & doctor matcher
interface DoctorMatchResult {
  specialtyName: string;
  doctorName: string;
  room: string;
  shifts: string;
  fee: string;
}

function matchDoctorForDisease(
  diseaseInput: string,
  doctorsList: Doctor[],
): DoctorMatchResult {
  const lower = diseaseInput.toLowerCase();

  // 1. Skin / Dermatology
  if (
    lower.includes("skin") ||
    lower.includes("derma") ||
    lower.includes("rash") ||
    lower.includes("acne") ||
    lower.includes("eczema") ||
    lower.includes("itching") ||
    lower.includes("allergy") ||
    lower.includes("hair") ||
    lower.includes("psoriasis")
  ) {
    const skinDoc = doctorsList.find(
      (d) =>
        d[1].toLowerCase().includes("derma") ||
        d[1].toLowerCase().includes("skin"),
    );
    return {
      specialtyName: "Dermatology & Skin Care",
      doctorName: skinDoc ? skinDoc[0] : "Dr. Elena Rostova",
      room: skinDoc ? skinDoc[2] : "Suite 204 • Wing A",
      shifts: "Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM",
      fee: skinDoc && skinDoc[8] ? skinDoc[8] : "₹750.00",
    };
  }

  // 2. Heart / Cardiology
  if (
    lower.includes("heart") ||
    lower.includes("cardio") ||
    lower.includes("chest") ||
    lower.includes("palpitation") ||
    lower.includes("bp") ||
    lower.includes("hypertension") ||
    lower.includes("pressure")
  ) {
    const cardioDoc = doctorsList.find((d) =>
      d[1].toLowerCase().includes("cardio"),
    );
    return {
      specialtyName: "Cardiology & Vascular",
      doctorName: cardioDoc ? cardioDoc[0] : "Dr. Ahmed Rahman",
      room: cardioDoc ? cardioDoc[2] : "Suite 102 • Wing B",
      shifts: "Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM",
      fee: cardioDoc && cardioDoc[8] ? cardioDoc[8] : "₹950.00",
    };
  }

  // 3. Bones / Orthopedics
  if (
    lower.includes("bone") ||
    lower.includes("ortho") ||
    lower.includes("joint") ||
    lower.includes("knee") ||
    lower.includes("fracture") ||
    lower.includes("spine") ||
    lower.includes("back pain") ||
    lower.includes("sprain")
  ) {
    const orthoDoc = doctorsList.find((d) =>
      d[1].toLowerCase().includes("ortho"),
    );
    return {
      specialtyName: "Orthopedics & Sports",
      doctorName: orthoDoc ? orthoDoc[0] : "Dr. Robert Henderson",
      room: orthoDoc ? orthoDoc[2] : "Suite 108 • Wing C",
      shifts: "Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM",
      fee: orthoDoc && orthoDoc[8] ? orthoDoc[8] : "₹900.00",
    };
  }

  // 4. Children / Pediatrics
  if (
    lower.includes("child") ||
    lower.includes("pediatric") ||
    lower.includes("baby") ||
    lower.includes("infant") ||
    lower.includes("kid")
  ) {
    const pediaDoc = doctorsList.find((d) =>
      d[1].toLowerCase().includes("pediatric"),
    );
    return {
      specialtyName: "Pediatrics & Child Health",
      doctorName: pediaDoc ? pediaDoc[0] : "Dr. Maya Lin",
      room: pediaDoc ? pediaDoc[2] : "Suite 105 • Wing A",
      shifts: "Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM",
      fee: pediaDoc && pediaDoc[8] ? pediaDoc[8] : "₹700.00",
    };
  }

  // 5. Brain / Neurology
  if (
    lower.includes("neuro") ||
    lower.includes("brain") ||
    lower.includes("headache") ||
    lower.includes("migraine") ||
    lower.includes("nerve") ||
    lower.includes("paralysis") ||
    lower.includes("seizure")
  ) {
    const neuroDoc = doctorsList.find((d) =>
      d[1].toLowerCase().includes("neuro"),
    );
    return {
      specialtyName: "Neurology & Brain Health",
      doctorName: neuroDoc ? neuroDoc[0] : "Dr. Eleanor Vance",
      room: neuroDoc ? neuroDoc[2] : "Suite 304 • East Wing",
      shifts: "Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM",
      fee: neuroDoc && neuroDoc[8] ? neuroDoc[8] : "₹850.00",
    };
  }

  // 6. Default / General Medicine
  const genDoc = doctorsList.find(
    (d) =>
      d[1].toLowerCase().includes("general") ||
      d[1].toLowerCase().includes("family"),
  );
  return {
    specialtyName: "General & Family Medicine",
    doctorName: genDoc ? genDoc[0] : "Dr. Sarah Wilson",
    room: genDoc ? genDoc[2] : "Suite 101 • Wing A",
    shifts: "Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM",
    fee: genDoc && genDoc[8] ? genDoc[8] : "₹600.00",
  };
}

export function HelpAssistantPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState<RegistrationStep>("idle");
  const [draft, setDraft] = useState<PatientDraft>({});
  const [recentRegistered, setRecentRegistered] = useState<Patient[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Hello! 👋 I am your CuraClinic AI Assistant. How can I help you today?\n\nI can answer common clinic questions, guide you to the right department, or **register a new patient and assign the appropriate specialist doctor** automatically.\n\nWhat would you like to do?",
      timestamp: formatCurrentTime(),
      options: [
        { label: "📝 Register a Patient", value: "register", action: "start_registration" },
        { label: "🕒 Visiting Hours", value: "hours", action: "faq_hours" },
        { label: "🩺 Find Skin / Derma Doctor", value: "skin_doc", action: "faq_skin" },
        { label: "🏥 Clinic Specialties", value: "specialties", action: "faq_specialties" },
        { label: "🧪 Lab Test Facilities", value: "lab_tests", action: "faq_lab" },
        { label: "🚨 Emergency Contact", value: "emergency", action: "faq_emergency" },
      ],
    },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    // Load existing registered patients
    const all = patientsService.getPatients();
    setRecentRegistered(all.slice(0, 5));

    const handleUpdate = () => {
      setRecentRegistered(patientsService.getPatients().slice(0, 5));
    };
    window.addEventListener("clinic-patients-updated", handleUpdate);
    return () => window.removeEventListener("clinic-patients-updated", handleUpdate);
  }, []);

  const resetChat = () => {
    setStep("idle");
    setDraft({});
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: "assistant",
        text: "Conversation refreshed. How can I assist you right now? You can ask a question or start registering a patient for consultation.",
        timestamp: formatCurrentTime(),
        options: [
          { label: "📝 Register a Patient", value: "register", action: "start_registration" },
          { label: "🕒 Visiting Hours", value: "hours", action: "faq_hours" },
          { label: "🩺 Find Skin / Derma Doctor", value: "skin_doc", action: "faq_skin" },
          { label: "🏥 Available Specialties", value: "specialties", action: "faq_specialties" },
          { label: "🚨 Emergency Contact", value: "emergency", action: "faq_emergency" },
        ],
      },
    ]);
  };

  const handleStartRegistration = () => {
    setStep("awaiting_name");
    setDraft({});
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: "Let's register the patient! 📋\n\nFirst, what is the **patient's full name**?",
          timestamp: formatCurrentTime(),
        },
      ]);
    }, 450);
  };

  const handleFAQ = (type: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      if (type === "hours") {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "🕒 **CuraClinic Visiting & Consultation Hours:**\n\n• **Morning Session**: 10:00 AM – 12:00 PM (Mon – Sat)\n• **Evening Session**: 06:00 PM – 08:00 PM (Mon – Sat)\n• **Diagnostic Laboratory**: 07:30 AM – 09:00 PM\n• **Emergency & Acute Triage**: Available 24 Hours / 7 Days a week",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register a Patient", value: "register", action: "start_registration" },
              { label: "🩺 Find Skin Doctor", value: "skin_doc", action: "faq_skin" },
              { label: "🏥 Other Questions", value: "faq", action: "faq_menu" },
            ],
          },
        ]);
      } else if (type === "skin") {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "🩺 **Dermatology & Skin Care Specialists at CuraClinic:**\n\n• **Dr. Elena Rostova** — Consultant Dermatologist (Suite 204 • Wing A, Fee: ₹750.00)\n• **Dr. Marcus Vale** — Senior Dermatosurgeon (Suite 205 • Wing A, Fee: ₹800.00)\n\nWe diagnose and treat skin rashes, acne, dermatitis, eczema, fungal infections, mole mapping, and biopsies.",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register for Skin Doctor", value: "register_skin", action: "start_registration" },
              { label: "🕒 Check Consultation Hours", value: "hours", action: "faq_hours" },
            ],
          },
        ]);
      } else if (type === "specialties") {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "🏥 **Our Medical Specialties & Centers of Excellence:**\n\n1. **Dermatology & Skin Care** (Suite 204 & 205)\n2. **Cardiology & Vascular Medicine** (Suite 102 & 103)\n3. **Orthopedics & Sports Medicine** (Suite 108)\n4. **Pediatrics & Child Health** (Suite 105)\n5. **Neurology & Brain Health** (Suite 304)\n6. **General & Family Medicine** (Suite 101)\n7. **Diagnostic Laboratory** (X-Ray, Blood, ECG, Ultrasound)",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register a Patient", value: "register", action: "start_registration" },
              { label: "🕒 Visiting Hours", value: "hours", action: "faq_hours" },
            ],
          },
        ]);
      } else if (type === "lab") {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "🧪 **CuraClinic Diagnostic Laboratory Services:**\n\n• **Digital X-Ray**: Chest, Abdomen, Bone fractures\n• **Pathology & Blood Tests**: Complete Blood Count (CBC), Lipid profile, Blood Sugar, Liver & Kidney panels\n• **12-Lead ECG**: Instant cardiac rhythm and telemetry\n• **Ultrasound (USG)**: Abdomen, Pelvic, and Soft-tissue sonography\n\nReports are generated with digital verification.",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register a Patient", value: "register", action: "start_registration" },
              { label: "🚨 Emergency Contact", value: "emergency", action: "faq_emergency" },
            ],
          },
        ]);
      } else if (type === "emergency") {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "🚨 **CuraClinic Emergency & Rapid Response:**\n\n• **24/7 Acute Triage Unit**: East Wing Ground Floor (Bay 1 – 4)\n• **Direct Hotline**: +1 (555) 019-382 / Ext: 911\n• **Ambulance Dispatch**: Available 24 hours with onboard life support\n• **Emergency Medical Officer On Duty**: Dr. Linda Gomez & Trauma Team",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register a Patient", value: "register", action: "start_registration" },
              { label: "🕒 Clinic Hours", value: "hours", action: "faq_hours" },
            ],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "Here are some common topics I can help you with:",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register a Patient", value: "register", action: "start_registration" },
              { label: "🕒 Visiting Hours", value: "hours", action: "faq_hours" },
              { label: "🩺 Find Skin Doctor", value: "skin_doc", action: "faq_skin" },
              { label: "🏥 Available Specialties", value: "specialties", action: "faq_specialties" },
              { label: "🧪 Lab Tests", value: "lab_tests", action: "faq_lab" },
              { label: "🚨 Emergency Contact", value: "emergency", action: "faq_emergency" },
            ],
          },
        ]);
      }
    }, 400);
  };

  const handleOptionClick = (option: { label: string; value: string; action?: string }) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "user",
        text: option.label,
        timestamp: formatCurrentTime(),
      },
    ]);

    if (option.action === "start_registration") {
      handleStartRegistration();
      return;
    }

    if (option.action === "faq_hours") {
      handleFAQ("hours");
      return;
    }
    if (option.action === "faq_skin") {
      handleFAQ("skin");
      return;
    }
    if (option.action === "faq_specialties") {
      handleFAQ("specialties");
      return;
    }
    if (option.action === "faq_lab") {
      handleFAQ("lab");
      return;
    }
    if (option.action === "faq_emergency") {
      handleFAQ("emergency");
      return;
    }
    if (option.action === "faq_menu") {
      handleFAQ("menu");
      return;
    }

    // Step-specific options (e.g. Gender or Disease chips)
    if (step === "awaiting_gender") {
      processGenderInput(option.value);
      return;
    }
    if (step === "awaiting_disease") {
      processDiseaseInput(option.value);
      return;
    }
  };

  const processNameInput = (text: string) => {
    const cleanName = text.trim();
    if (cleanName.length < 2) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "Please provide a valid full name for the patient (at least 2 letters).",
            timestamp: formatCurrentTime(),
          },
        ]);
      }, 350);
      return;
    }

    setDraft((prev) => ({ ...prev, name: cleanName }));
    setStep("awaiting_age");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: `Nice to meet you, **${cleanName}**! 👋\n\nWhat is the patient's **age**? (e.g., 28, 45, 12)`,
          timestamp: formatCurrentTime(),
        },
      ]);
    }, 450);
  };

  const processAgeInput = (text: string) => {
    const match = text.match(/\d+/);
    const ageNum = match ? parseInt(match[0], 10) : NaN;

    if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "Please enter a valid age in numbers (for example: 25, 34, 60).",
            timestamp: formatCurrentTime(),
          },
        ]);
      }, 350);
      return;
    }

    const ageStr = String(ageNum);
    setDraft((prev) => ({ ...prev, age: ageStr }));
    setStep("awaiting_gender");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: `Got it, **${ageStr} years old**.\n\nWhat is the patient's **gender**?`,
          timestamp: formatCurrentTime(),
          options: [
            { label: "Male", value: "Male" },
            { label: "Female", value: "Female" },
            { label: "Other", value: "Other" },
          ],
        },
      ]);
    }, 450);
  };

  const processGenderInput = (text: string) => {
    let gender = "Other";
    const lower = text.toLowerCase();
    if (lower.startsWith("m")) gender = "Male";
    else if (lower.startsWith("f")) gender = "Female";

    setDraft((prev) => ({ ...prev, gender }));
    setStep("awaiting_disease");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: `Thank you. Now, **what disease, health issue, or symptoms** does the patient have?\n\n*(For example: **Skin rash / itching**, **Heart palpitations**, **Knee pain**, **Fever & flu**, **Headache**...)*`,
          timestamp: formatCurrentTime(),
          options: [
            { label: "🩺 Skin / Dermatology", value: "skin" },
            { label: "❤️ Heart / Cardiology", value: "heart" },
            { label: "🦴 Bones / Orthopedics", value: "bone" },
            { label: "👶 Child / Pediatrics", value: "child" },
            { label: "🧠 Brain / Neurology", value: "neuro" },
            { label: "🌡️ Fever / General Care", value: "fever" },
          ],
        },
      ]);
    }, 450);
  };

  const processDiseaseInput = (text: string) => {
    const diseaseClean = text.trim();
    if (!diseaseClean) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "Please tell me the disease or symptoms you are experiencing so I can assign the best specialist doctor.",
            timestamp: formatCurrentTime(),
          },
        ]);
      }, 350);
      return;
    }

    const doctorsList = doctorsService.getDoctors();
    const match = matchDoctorForDisease(diseaseClean, doctorsList);

    const patientName = draft.name || "Patient";
    const patientAge = draft.age || "30";
    const patientGender = draft.gender || "Other";
    const genderAbbr = patientGender === "Male" ? "M" : patientGender === "Female" ? "F" : "O";
    const ageSexStr = `${patientAge} / ${genderAbbr}`;

    // Generate unique ID
    const existingPatients = patientsService.getPatients();
    const nextNumber = existingPatients.length + 1;
    const patientId = `PT-${String(nextNumber).padStart(5, "0")}`;

    const now = new Date();
    const todayDateKey = formatDateKey(now);
    const todayDisplayDate = formatDisplayDate(now);

    const conditionLabel =
      diseaseClean.toLowerCase() === "skin"
        ? "Skin problem / Dermatitis"
        : diseaseClean.length < 40
        ? `${diseaseClean} (${match.specialtyName})`
        : diseaseClean;

    // Create and save patient
    const newPatient: Patient = [
      patientId,
      patientName,
      ageSexStr,
      conditionLabel,
      match.doctorName,
      todayDisplayDate,
      `${patientName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
      "O+",
      serializeLabTests([]),
      todayDateKey,
      "+1 (555) 019-4820",
    ];

    patientsService.addPatient(newPatient);
    toast.success(`Patient ${patientName} successfully registered and assigned to ${match.doctorName}!`);

    setStep("completed");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: `🎉 **Registration Completed Successfully!**\n\nI have registered **${patientName}** in the CuraClinic EHR directory and assigned **${match.doctorName}** (${match.specialtyName}) for consultation.`,
          timestamp: formatCurrentTime(),
          patientCard: {
            id: patientId,
            name: patientName,
            ageGender: `${patientAge} yrs • ${patientGender}`,
            condition: conditionLabel,
            doctorName: match.doctorName,
            doctorSpecialty: match.specialtyName,
            doctorRoom: match.room,
            doctorShifts: match.shifts,
            doctorFee: match.fee,
            registrationDate: todayDisplayDate,
          },
          options: [
            { label: "📋 View in Patients Page", value: "goto_patients" },
            { label: "📅 Schedule in Calendar", value: "goto_calendar" },
            { label: "🔄 Register Another Patient", value: "register_again", action: "start_registration" },
            { label: "❓ Ask Another Question", value: "ask_faq", action: "faq_menu" },
          ],
        },
      ]);
    }, 600);
  };

  const handleGeneralQuery = (query: string) => {
    const q = query.toLowerCase();

    // Check for registration intents
    if (
      q.includes("register") ||
      q.includes("new patient") ||
      q.includes("add patient") ||
      q.includes("book doctor") ||
      q.includes("consult") ||
      q.includes("appointment")
    ) {
      handleStartRegistration();
      return;
    }

    // Check for hours
    if (q.includes("hour") || q.includes("timing") || q.includes("time") || q.includes("when are you open")) {
      handleFAQ("hours");
      return;
    }

    // Check for skin / derma
    if (
      q.includes("skin") ||
      q.includes("derma") ||
      q.includes("rash") ||
      q.includes("acne") ||
      q.includes("eczema") ||
      q.includes("itching")
    ) {
      handleFAQ("skin");
      return;
    }

    // Check for emergency
    if (q.includes("emergency") || q.includes("ambulance") || q.includes("urgent") || q.includes("trauma")) {
      handleFAQ("emergency");
      return;
    }

    // Check for lab
    if (
      q.includes("lab") ||
      q.includes("test") ||
      q.includes("xray") ||
      q.includes("blood") ||
      q.includes("ecg") ||
      q.includes("ultrasound")
    ) {
      handleFAQ("lab");
      return;
    }

    // Check for specialties
    if (q.includes("specialt") || q.includes("department") || q.includes("doctors list") || q.includes("service")) {
      handleFAQ("specialties");
      return;
    }

    // Greetings
    if (q === "hi" || q === "hello" || q === "hey" || q.includes("good morning") || q.includes("good evening")) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            text: "Hello there! 😊 How can I help you today? Would you like to register a patient, find a doctor for a specific health issue, or learn about our clinic services?",
            timestamp: formatCurrentTime(),
            options: [
              { label: "📝 Register a Patient", value: "register", action: "start_registration" },
              { label: "🩺 Find Skin Doctor", value: "skin_doc", action: "faq_skin" },
              { label: "🕒 Visiting Hours", value: "hours", action: "faq_hours" },
              { label: "🏥 Specialties", value: "specialties", action: "faq_specialties" },
            ],
          },
        ]);
      }, 350);
      return;
    }

    // General fallback
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "assistant",
          text: `I understand you are asking about "${query}".\n\nI am designed to guide you through clinic services, answers FAQs, and **register new patients with specialist doctor assignments** (such as assigning Skin/Dermatology doctors for skin conditions, Cardiologists for heart issues, etc.).\n\nHow would you like to proceed?`,
          timestamp: formatCurrentTime(),
          options: [
            { label: "📝 Register a Patient", value: "register", action: "start_registration" },
            { label: "🩺 Find Skin Doctor", value: "skin_doc", action: "faq_skin" },
            { label: "🕒 Clinic Hours", value: "hours", action: "faq_hours" },
            { label: "🏥 Available Specialties", value: "specialties", action: "faq_specialties" },
          ],
        },
      ]);
    }, 450);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText("");

    // Add user message to conversation
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "user",
        text,
        timestamp: formatCurrentTime(),
      },
    ]);

    // Handle button actions inside text
    if (text === "📋 View in Patients Page") {
      navigate("/patients");
      return;
    }
    if (text === "📅 Schedule in Calendar") {
      navigate("/calendar");
      return;
    }

    // Dispatch depending on active state
    if (step === "awaiting_name") {
      processNameInput(text);
    } else if (step === "awaiting_age") {
      processAgeInput(text);
    } else if (step === "awaiting_gender") {
      processGenderInput(text);
    } else if (step === "awaiting_disease") {
      processDiseaseInput(text);
    } else {
      handleGeneralQuery(text);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="How can I help you"
        subtitle="AI Clinical Triage, Common Q&A & Intelligent Patient Registration"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={resetChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            title="Reset Conversation"
          >
            <RefreshCw size={13} className="text-slate-500" />
            <span>Reset Chat</span>
          </button>
          <button
            onClick={handleStartRegistration}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            <Sparkles size={13} />
            <span>Register Patient</span>
          </button>
        </div>
      </PageHeader>

      {/* Main Grid: Chat Stream on Left, Quick Info & EHR Activity on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Window */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[640px] h-[78vh]">
          {/* Chat Header Banner */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
                  <Bot size={22} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-wide">CuraClinic AI Assistant</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md">
                    24/7 Online
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {step === "awaiting_name" && "Step 1 of 4: Collecting Patient Name"}
                  {step === "awaiting_age" && "Step 2 of 4: Collecting Patient Age"}
                  {step === "awaiting_gender" && "Step 3 of 4: Selecting Patient Gender"}
                  {step === "awaiting_disease" && "Step 4 of 4: Disease & Specialist Assignment"}
                  {step === "completed" && "Patient Registered & Doctor Assigned"}
                  {step === "idle" && "Ready to assist or register patients"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Assistant Avatar */}
                {msg.sender === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                {/* Message Bubble Content */}
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-teal-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                  }`}
                >
                  {/* Message Text with simple markdown formatting */}
                  <div className="whitespace-pre-wrap font-normal">
                    {msg.text.split("\n").map((line, lIdx) => {
                      if (!line) return <div key={lIdx} className="h-2" />;
                      return (
                        <p key={lIdx} className="my-0.5">
                          {line.split(/(\*\*.*?\*\*)/g).map((chunk, cIdx) => {
                            if (chunk.startsWith("**") && chunk.endsWith("**")) {
                              return (
                                <strong
                                  key={cIdx}
                                  className={
                                    msg.sender === "user"
                                      ? "font-bold text-white"
                                      : "font-semibold text-slate-900"
                                  }
                                >
                                  {chunk.slice(2, -2)}
                                </strong>
                              );
                            }
                            return chunk;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Registered Patient Card if present */}
                  {msg.patientCard && (
                    <div className="mt-3.5 pt-3.5 border-t border-emerald-100 bg-emerald-50/70 -mx-1 p-3.5 rounded-xl border border-emerald-200/80 text-slate-800">
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-emerald-200/60">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>OFFICIAL CLINIC EHR ADMISSION</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold rounded-full">
                          {msg.patientCard.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Patient Name</span>
                          <strong className="text-slate-900 font-semibold text-xs">
                            {msg.patientCard.name}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Demographics</span>
                          <span className="font-medium text-slate-800">
                            {msg.patientCard.ageGender}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[10px]">Reported Condition / Disease</span>
                          <span className="font-medium text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-emerald-200/50 inline-block">
                            {msg.patientCard.condition}
                          </span>
                        </div>
                      </div>

                      {/* Doctor Assignment Box */}
                      <div className="bg-white rounded-lg p-2.5 border border-emerald-200/90 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                            Assigned Specialist Doctor
                          </span>
                          <span className="text-[10px] font-bold text-slate-700">
                            {msg.patientCard.doctorFee}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            <Stethoscope size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {msg.patientCard.doctorName}
                            </div>
                            <div className="text-[10px] text-teal-700 font-medium">
                              {msg.patientCard.doctorSpecialty} • {msg.patientCard.doctorRoom}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-1 flex items-center gap-1 border-t border-slate-100">
                          <Clock size={11} className="text-slate-400" />
                          <span>{msg.patientCard.doctorShifts}</span>
                        </div>
                      </div>

                      {/* Quick Navigation Action Buttons */}
                      <div className="mt-3 flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => navigate("/patients")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
                        >
                          <Users size={12} />
                          <span>View in Patients Directory</span>
                        </button>
                        <button
                          onClick={() => navigate("/calendar")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Calendar size={12} />
                          <span>View in Calendar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Suggestion Options / Quick Chips */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleOptionClick(opt)}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200/80 rounded-lg text-slate-700 transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <span>{opt.label}</span>
                          <ChevronRight size={10} className="text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-1.5 text-[10px] ${
                      msg.sender === "user" ? "text-teal-200 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Suggestions Bar */}
          <div className="px-4 py-2 bg-slate-100/80 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <Sparkles size={11} className="text-teal-600" /> Quick actions:
            </span>
            <button
              onClick={() => handleFAQ("skin")}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 whitespace-nowrap shadow-2xs transition-colors"
            >
              🩺 Skin / Derma Doctor
            </button>
            <button
              onClick={handleStartRegistration}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 whitespace-nowrap shadow-2xs transition-colors"
            >
              📝 Register Patient
            </button>
            <button
              onClick={() => handleFAQ("hours")}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 whitespace-nowrap shadow-2xs transition-colors"
            >
              🕒 Clinic Hours
            </button>
            <button
              onClick={() => handleFAQ("lab")}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 whitespace-nowrap shadow-2xs transition-colors"
            >
              🧪 Lab Tests
            </button>
            <button
              onClick={() => handleFAQ("emergency")}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 whitespace-nowrap shadow-2xs transition-colors"
            >
              🚨 Emergency
            </button>
          </div>

          {/* Input Box Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                step === "awaiting_name"
                  ? "Enter patient full name..."
                  : step === "awaiting_age"
                  ? "Enter patient age in years (e.g. 28)..."
                  : step === "awaiting_gender"
                  ? "Type Male, Female, or Other..."
                  : step === "awaiting_disease"
                  ? "Type disease or symptom (e.g. skin rash, heart, knee pain)..."
                  : "Type message or question (e.g. 'I have skin rash', 'visiting hours')..."
              }
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all font-semibold flex items-center gap-1.5 text-xs shadow-sm"
            >
              <span>Send</span>
              <Send size={13} />
            </button>
          </form>
        </div>

        {/* Right Column: Intelligent Triage Shortcuts, FAQ Directory & Live EHR Activity */}
        <div className="lg:col-span-4 space-y-5">
          {/* Conversational Triage Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Stethoscope size={16} className="text-teal-600" />
              <h4>Instant Doctor Matching</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tell the assistant about any medical symptoms or condition. It automatically identifies the appropriate specialty and assigns an on-duty specialist.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  handleStartRegistration();
                  setInputText("Sarah Jenkins");
                }}
                className="w-full text-left p-2.5 rounded-xl border border-teal-100 bg-teal-50/60 hover:bg-teal-100/70 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-teal-950 flex items-center gap-1.5">
                    <span>Skin / Dermatology Triage</span>
                  </div>
                  <div className="text-[11px] text-teal-700">Assigns Dr. Elena Rostova</div>
                </div>
                <ArrowRight size={14} className="text-teal-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => {
                  handleStartRegistration();
                  setInputText("Michael Chang");
                }}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">Cardiology & Heart Care</div>
                  <div className="text-[11px] text-slate-500">Assigns Dr. Ahmed Rahman</div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => {
                  handleStartRegistration();
                  setInputText("David Miller");
                }}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">Orthopedics & Joint Triage</div>
                  <div className="text-[11px] text-slate-500">Assigns Dr. Robert Henderson</div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Quick FAQ Directory */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <HelpCircle size={16} className="text-teal-600" />
              <h4>Frequently Asked Questions</h4>
            </div>

            <div className="space-y-2 text-xs">
              <div
                onClick={() => handleFAQ("hours")}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-white cursor-pointer transition-all space-y-1"
              >
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>What are the clinic visiting hours?</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Morning: 10:00 AM – 12:00 PM • Evening: 06:00 PM – 08:00 PM
                </p>
              </div>

              <div
                onClick={() => handleFAQ("skin")}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-white cursor-pointer transition-all space-y-1"
              >
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Who is available for Skin diseases?</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Dr. Elena Rostova & Dr. Marcus Vale (Dermatology • Suite 204)
                </p>
              </div>

              <div
                onClick={() => handleFAQ("lab")}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-white cursor-pointer transition-all space-y-1"
              >
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Which diagnostic lab tests are available?</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Digital X-Ray, Blood CBC, 12-Lead ECG, and Ultrasound.
                </p>
              </div>

              <div
                onClick={() => handleFAQ("emergency")}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-white cursor-pointer transition-all space-y-1"
              >
                <div className="font-semibold text-rose-800 flex items-center justify-between">
                  <span>What is the emergency helpline?</span>
                  <ChevronRight size={12} className="text-rose-400" />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Direct Triage Line: +1 (555) 019-382 (24/7 Rapid Response)
                </p>
              </div>
            </div>
          </div>

          {/* Live Recent Registered Patients Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Users size={16} className="text-teal-600" />
                <h4>Recent Patients Directory</h4>
              </div>
              <button
                onClick={() => navigate("/patients")}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
              >
                <span>View all</span>
                <ExternalLink size={10} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentRegistered.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No patients registered yet. Start a chat to register one!
                </div>
              ) : (
                recentRegistered.map((p, idx) => (
                  <div key={idx} className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{p[1]}</span>
                        <span className="font-mono text-[10px] text-slate-400">{p[0]}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {p[3]} • <span className="text-teal-700 font-medium">{p[4]}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                      {p[2]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

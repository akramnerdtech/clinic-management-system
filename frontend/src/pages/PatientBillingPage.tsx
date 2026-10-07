import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Banknote,
  BedDouble,
  CheckCircle2,
  CreditCard,
  Download,
  FilePlus2,
  ReceiptText,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { billingService } from "@/services/billingService";
import { inpatientService } from "@/services/inpatientService";
import { patientsService } from "@/services/patientsService";
import { doctorsService } from "@/services/doctorsService";
import { WARD_LABELS } from "@/data/rooms";
import { useToast } from "@/utils/toast";
import { ReportModal } from "@/components/reports/ReportModal";
import type {
  Invoice,
  PatientBill,
  PatientChargeCategory,
  PaymentMethod,
} from "@/types/billing";
import type { RoomBillingPolicy, WardRate, RoomStay } from "@/types/rooms";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
const amount = (paise: number) => INR.format(paise / 100);
const fieldClass =
  "h-10 w-full rounded border border-[#dfe5e7] bg-white px-3 text-sm text-[#182236] outline-none focus:border-[#007d72]";
const labelClass = "grid gap-1.5 text-xs font-semibold text-[#465166]";
const chargeCategories: PatientChargeCategory[] = [
  "CONSULTATION",
  "DOCTOR_VISIT",
  "PROCEDURE",
  "MEDICINE",
  "GLUCOSE_IV",
  "CONSUMABLE",
  "LAB",
  "DIAGNOSTIC",
  "INJECTION",
  "NURSING",
  "OTHER",
];

function currentLocalDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function rupeesToPaise(value: string): number {
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim()))
    throw new Error("Enter an amount with no more than two decimal places.");
  const [rupees, fraction = ""] = value.trim().split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise))
    throw new Error("Amount exceeds the supported range.");
  return paise;
}

function AddChargeDialog({
  bill,
  onClose,
  onSaved,
}: {
  bill: PatientBill;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] =
    useState<PatientChargeCategory>("CONSULTATION");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [chargeDate, setChargeDate] = useState(currentLocalDateTime);
  const [source, setSource] = useState("Manual clinical entry");
  const [sourceId, setSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const toast = useToast();

  const save = () => {
    if (pending || lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      billingService.addPatientCharge({
        patientId: bill.patient[0],
        admissionId: bill.billingType === "IPD" ? bill.admissionId : undefined,
        emergencyCaseId:
          bill.billingType === "EMERGENCY" ? bill.emergencyCaseId : undefined,
        appointmentId:
          bill.billingType === "OPD" ? bill.encounterId : undefined,
        category,
        description,
        quantity: Number(quantity),
        unitPricePaise: rupeesToPaise(unitPrice),
        chargeDate,
        source,
        sourceId: sourceId.trim() || undefined,
        notes,
      });
      toast.success("Patient charge recorded.");
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Charge could not be recorded.",
      );
      lock.current = false;
      setPending(false);
    }
  };

  return (
    <Modal
      title="Add Patient Charge"
      subtitle={`${bill.patient[1]} · ${bill.billingType}`}
      onClose={onClose}
      className="!max-w-[620px]"
      footer={
        <>
          <IconButton className="white-button" onClick={onClose}>
            Cancel
          </IconButton>
          <IconButton className="teal-button" onClick={save}>
            <FilePlus2 size={14} /> {pending ? "Saving…" : "Add charge"}
          </IconButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Category
          <select
            className={fieldClass}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as PatientChargeCategory)
            }
          >
            {chargeCategories.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Service date and time
          <input
            className={fieldClass}
            type="datetime-local"
            value={chargeDate}
            onChange={(event) => setChargeDate(event.target.value)}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Description
          <input
            className={fieldClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Glucose 5% 500ml"
          />
        </label>
        <label className={labelClass}>
          Quantity
          <input
            className={fieldClass}
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Unit price (INR)
          <input
            className={fieldClass}
            inputMode="decimal"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            placeholder="0.00"
          />
        </label>
        <label className={labelClass}>
          Source
          <input
            className={fieldClass}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Treatment record, pharmacy issue, lab order"
          />
        </label>
        <label className={labelClass}>
          Source reference (optional)
          <input
            className={fieldClass}
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            placeholder="Unique issue/order ID prevents duplicate imports"
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Notes (optional)
          <textarea
            className="min-h-20 rounded border border-[#dfe5e7] bg-white p-3 text-sm outline-none focus:border-[#007d72]"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      <p className="mb-0 mt-3 text-xs text-[#687285]">
        Only record services actually performed or items actually dispensed.
        Prescriptions alone are not billable.
      </p>
    </Modal>
  );
}

function PaymentDialog({
  invoice,
  onClose,
  onPay,
}: {
  invoice: Invoice;
  onClose: () => void;
  onPay: (params: {
    amountPaise: number;
    method: PaymentMethod;
    paidAt: string;
    reference: string;
    notes: string;
    idempotencyKey: string;
  }) => void;
}) {
  const [amountValue, setAmountValue] = useState(
    (invoice.balancePaise / 100).toFixed(2),
  );
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paidAt, setPaidAt] = useState(currentLocalDateTime);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const idempotencyKey = useRef(
    `payment-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`,
  );
  const toast = useToast();

  const submit = () => {
    if (lock.current || pending) return;
    lock.current = true;
    setPending(true);
    try {
      onPay({
        amountPaise: rupeesToPaise(amountValue),
        method,
        paidAt,
        reference,
        notes,
        idempotencyKey: idempotencyKey.current,
      });
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment could not be recorded.",
      );
      lock.current = false;
      setPending(false);
      idempotencyKey.current = `payment-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
    }
  };

  return (
    <Modal
      title="Record Payment"
      subtitle={`${invoice.invoiceNumber} · Balance ${amount(invoice.balancePaise)}`}
      onClose={onClose}
      footer={
        <>
          <IconButton className="white-button" onClick={onClose}>
            Cancel
          </IconButton>
          <IconButton className="teal-button" onClick={submit}>
            <CreditCard size={14} /> {pending ? "Recording…" : "Record payment"}
          </IconButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Amount (INR)
          <input
            className={fieldClass}
            inputMode="decimal"
            value={amountValue}
            onChange={(event) => setAmountValue(event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Payment method
          <select
            className={fieldClass}
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
          </select>
        </label>
        <label className={labelClass}>
          Payment date
          <input
            className={fieldClass}
            type="datetime-local"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Reference
          <input
            className={fieldClass}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Transaction reference"
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Notes
          <textarea
            className="min-h-16 rounded border border-[#dfe5e7] bg-white p-3 text-sm outline-none focus:border-[#007d72]"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}

function FinalizeDialog({
  bill,
  onClose,
  onConfirm,
}: {
  bill: PatientBill;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const active = bill.currentStay;
  return (
    <Modal
      title={
        active
          ? "Finalize Bill & Discharge"
          : bill.billingType === "IPD"
            ? "Finalize IPD Bill"
            : bill.billingType === "EMERGENCY"
              ? "Finalize Emergency Bill"
              : "Finalize OPD Bill"
      }
      subtitle={bill.patient[1]}
      onClose={onClose}
      footer={
        <>
          <IconButton className="white-button" onClick={onClose}>
            Cancel
          </IconButton>
          <IconButton className="teal-button" onClick={onConfirm}>
            <CheckCircle2 size={14} /> Confirm and finalize
          </IconButton>
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-[#687285]">Patient</dt>
        <dd className="m-0 text-right font-semibold">
          {bill.patient[1]} · {bill.patient[0]}
        </dd>
        <dt className="text-[#687285]">Admission date</dt>
        <dd className="m-0 text-right">
          {bill.admissionAt
            ? new Date(bill.admissionAt).toLocaleString()
            : "Outpatient visit"}
        </dd>
        <dt className="text-[#687285]">Current room</dt>
        <dd className="m-0 text-right">
          {active
            ? `${WARD_LABELS[active.wardType]} · ${active.roomNumber} · Bed ${active.bedNumber}`
            : "No inpatient room"}
        </dd>
        <dt className="text-[#687285]">Current bill</dt>
        <dd className="m-0 text-right font-semibold">
          {amount(bill.totalPaise)}
        </dd>
        <dt className="text-[#687285]">Paid</dt>
        <dd className="m-0 text-right">{amount(bill.paidPaise)}</dd>
        <dt className="text-[#687285]">Balance</dt>
        <dd className="m-0 text-right font-semibold">
          {amount(bill.balancePaise)}
        </dd>
      </dl>
      <p className="mb-0 mt-4 text-xs text-[#8a5b12]">
        {active
          ? "The active stay will close at the current time, the bill will be snapshotted, and the bed will be released. This cannot be undone from Billing."
          : bill.billingType === "EMERGENCY"
            ? "This closes the emergency case and snapshots actual recorded services. No room rent is added unless the patient is admitted."
            : bill.billingType === "IPD"
              ? "This saves a final snapshot of the completed admission stay segments."
              : "This saves a final snapshot of the current outpatient visit charges."}
      </p>
    </Modal>
  );
}

export function PatientBillingPage() {
  const { pathname } = useLocation();
  const location = useLocation();
  const { user } = useAuth();
  const [patients, setPatients] = useState(() => patientsService.getPatients());
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [invoices, setInvoices] = useState(() => billingService.getInvoices());
  const [payments, setPayments] = useState(() => billingService.getPayments());
  const [stays, setStays] = useState(() => inpatientService.getRoomStays());
  const [rates, setRates] = useState(() => inpatientService.getRates());
  const [policy, setPolicy] = useState(() => billingService.getPolicy());
  const [rateDraft, setRateDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      inpatientService
        .getRates()
        .map((rate) => [rate.ward, String(rate.perDay)]),
    ),
  );
  const [minimumDaysDraft, setMinimumDaysDraft] = useState(
    String(billingService.getPolicy().minimumBillableDaysPerStay),
  );
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const toast = useToast();
  const isHistoryRoute =
    pathname.endsWith("/history") || pathname.endsWith("/invoices");

  const refresh = useCallback(() => {
    setPatients(patientsService.getPatients());
    setInvoices(billingService.getInvoices());
    setPayments(billingService.getPayments());
    setStays(inpatientService.getRoomStays());
    setRates(inpatientService.getRates());
    setPolicy(billingService.getPolicy());
    setRateDraft(
      Object.fromEntries(
        inpatientService
          .getRates()
          .map((rate) => [rate.ward, String(rate.perDay)]),
      ),
    );
    setMinimumDaysDraft(
      String(billingService.getPolicy().minimumBillableDaysPerStay),
    );
  }, []);
  useEffect(() => {
    window.addEventListener("clinic-billing-updated", refresh);
    window.addEventListener("clinic-room-stays-updated", refresh);
    window.addEventListener("clinic-patients-updated", refresh);
    window.addEventListener("clinic-appointments-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("clinic-billing-updated", refresh);
      window.removeEventListener("clinic-room-stays-updated", refresh);
      window.removeEventListener("clinic-patients-updated", refresh);
      window.removeEventListener("clinic-appointments-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const selectedPatient = patients.find(([id]) => id === patientId);
  const emergencyCaseId =
    new URLSearchParams(location.search).get("emergencyCaseId") ?? undefined;
  const requestedPatientId = new URLSearchParams(location.search).get(
    "patientId",
  );
  useEffect(() => {
    if (
      !requestedPatientId ||
      !patients.some(([id]) => id === requestedPatientId)
    )
      return;
    setPatientId(requestedPatientId);
    const patient = patients.find(([id]) => id === requestedPatientId);
    if (patient) setPatientQuery(`${patient[1]} · ${patient[0]}`);
  }, [requestedPatientId, patients]);
  const bill = useMemo(
    () =>
      patientId
        ? billingService.calculatePatientBill(
            patientId,
            undefined,
            emergencyCaseId,
          )
        : null,
    [patientId, emergencyCaseId, invoices, payments, stays, patients],
  );
  const matches = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    if (!query || selectedPatient) return [];
    return patients
      .filter((patient) =>
        `${patient[1]} ${patient[0]} ${patient[10] ?? ""}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [patients, patientQuery, selectedPatient]);
  const activeInvoices = bill
    ? invoices.filter(
        (invoice) =>
          invoice.patientId === bill.patient[0] &&
          invoice.status !== "CANCELLED" &&
          (bill.admissionId
            ? invoice.admissionId === bill.admissionId
            : bill.emergencyCaseId
              ? invoice.emergencyCaseId === bill.emergencyCaseId
              : invoice.encounterId === bill.encounterId),
      )
    : [];
  const patientInvoiceIds = new Set(
    activeInvoices.map((invoice) => invoice.id),
  );
  const patientPayments = payments
    .filter((payment) => patientInvoiceIds.has(payment.invoiceId))
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const activeStay = bill?.currentStay
    ? stays.find(
        (stay) =>
          stay.patientId === patientId &&
          stay.status === "ACTIVE" &&
          stay.admissionId === bill.admissionId,
      )
    : undefined;
  const relatedHistory = bill
    ? invoices
        .filter((invoice) => invoice.patientId === bill.patient[0])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const billStatusLabel = bill?.status.replaceAll("_", " ") ?? "";
  const statementNumber =
    bill?.invoice?.invoiceNumber ??
    (bill?.billingType === "IPD"
      ? `IPD-${bill.admissionId ?? bill.patient[0]}`
      : `OPD-${bill?.encounterId ?? bill?.patient[0]}`);
  const consultant = bill?.emergencyDoctorId
    ? (doctorsService
        .getDoctors()
        .find((doctor) => doctor[10] === bill.emergencyDoctorId)?.[0] ??
      "Not recorded")
    : bill?.visits[0]?.[7] || "Not recorded";

  const saveRatesAndPolicy = () => {
    try {
      const updatedRates: WardRate[] = rates.map((rate) => {
        const value = rateDraft[rate.ward];
        if (!/^\d+(\.\d{1,2})?$/.test(value ?? ""))
          throw new Error(
            `Enter a valid daily rate for ${WARD_LABELS[rate.ward]}.`,
          );
        return { ...rate, perDay: Number(value) };
      });
      billingService.saveConfiguration(updatedRates, {
        ...policy,
        minimumBillableDaysPerStay: Number(minimumDaysDraft),
      });
      toast.success(
        "Billing policy saved. New rates do not change existing room-stay snapshots.",
      );
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Billing configuration could not be saved.",
      );
    }
  };

  const handlePaymentOpen = () => {
    if (!bill) return;
    try {
      const invoice =
        (bill.billingType === "IPD" && bill.currentStay) ||
        (bill.billingType === "EMERGENCY" && bill.emergencyActive)
          ? billingService.saveRunningBill(patientId, bill.admissionId)
          : bill.invoice;
      if (!invoice)
        throw new Error("Finalize the bill before recording a payment.");
      if (invoice.status === "DRAFT")
        throw new Error("Finalize this OPD bill before recording a payment.");
      if (invoice.balancePaise <= 0)
        throw new Error("There is no outstanding balance.");
      setPaymentInvoice(invoice);
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment could not be started.",
      );
    }
  };

  const recordPayment = (params: {
    amountPaise: number;
    method: PaymentMethod;
    paidAt: string;
    reference: string;
    notes: string;
    idempotencyKey: string;
  }) => {
    if (!paymentInvoice) return;
    billingService.recordPayment({
      invoiceId: paymentInvoice.id,
      amountPaise: params.amountPaise,
      method: params.method,
      paidAt: params.paidAt,
      reference: params.reference,
      notes: params.notes,
      idempotencyKey: params.idempotencyKey,
      createdBy: user?.email ?? "Authenticated user",
    });
    toast.success("Payment recorded.");
    refresh();
  };

  const finalize = () => {
    if (!bill) return;
    try {
      if (activeStay) {
        billingService.finalizeBillAndDischarge(
          patientId,
          activeStay.id,
          new Date().toISOString(),
        );
        toast.success(
          `${bill.patient[1]}'s bill was finalized and the bed released.`,
        );
      } else if (
        bill.billingType === "EMERGENCY" &&
        bill.emergencyActive &&
        bill.emergencyCaseId
      ) {
        billingService.finalizeEmergencyBill(
          patientId,
          bill.emergencyCaseId,
          new Date().toISOString(),
        );
        toast.success(
          `${bill.patient[1]}'s emergency visit was completed and billed.`,
        );
      } else {
        const invoice = billingService.finalizePatientBill(
          patientId,
          bill.admissionId,
          bill.emergencyCaseId,
        );
        toast.success(`Bill ${invoice.invoiceNumber} finalized.`);
      }
      setFinalizeOpen(false);
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Bill finalization failed; the active room stay was retained.",
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="PATIENT SERVICES / BILLING"
        title={
          bill
            ? bill.billingType === "IPD"
              ? "Inpatient Billing Invoice"
              : "Outpatient Billing Statement"
            : isHistoryRoute
              ? "Bills / History"
              : "Billing"
        }
        description={
          bill
            ? `${isHistoryRoute ? "Bills / History" : "Summary statement"} · ${statementNumber}`
            : "Review a patient’s visits, admission, room-stay history, services, and payments in one bill."
        }
        actions={
          <>
            {bill ? (
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded border border-[#dfe5e7] bg-white px-3 text-xs font-semibold text-[#253148]"
                  onClick={() => window.print()}
                >
                  <ReceiptText size={13} /> Print
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded bg-[#007d72] px-3 text-xs font-semibold text-white"
                  onClick={() => window.print()}
                >
                  <ReceiptText size={13} /> Save as PDF
                </button>
              </div>
            ) : (
              <span className="autosaved">
                <ReceiptText size={13} /> INR · 24-hour stay policy
              </span>
            )}
            <IconButton
              className="white-button print:hidden"
              onClick={() => setReportOpen(true)}
            >
              <Download size={14} /> Export Report
            </IconButton>
          </>
        }
      />
      <div className="mb-4 flex gap-1 border-b border-[#e8ebef] print:hidden">
        <Link
          className={`px-3 py-2 text-sm font-semibold ${isHistoryRoute ? "text-[#687285]" : "border-b-2 border-[#007d72] text-[#007d72]"}`}
          to="/billing"
        >
          Billing
        </Link>
        <Link
          className={`px-3 py-2 text-sm font-semibold ${isHistoryRoute ? "border-b-2 border-[#007d72] text-[#007d72]" : "text-[#687285]"}`}
          to="/billing/history"
        >
          Bills / History
        </Link>
      </div>

      <section className="content-card mb-4 p-4 sm:p-5 print:hidden">
        <label className={`${labelClass} max-w-2xl`}>
          Search patient
          <span className="flex h-11 items-center gap-2 rounded border border-[#dfe5e7] bg-white px-3 focus-within:border-[#007d72]">
            <Search size={15} className="text-[#687285]" />
            <input
              className="w-full bg-transparent text-sm font-normal outline-none"
              value={patientQuery}
              onChange={(event) => {
                setPatientQuery(event.target.value);
                if (selectedPatient) setPatientId("");
              }}
              placeholder="Patient name, ID, or mobile number"
            />
            {selectedPatient && (
              <button
                type="button"
                className="text-xs text-[#007d72]"
                onClick={() => {
                  setPatientId("");
                  setPatientQuery("");
                }}
              >
                Clear
              </button>
            )}
          </span>
        </label>
        {matches.length > 0 && (
          <div className="mt-2 grid max-w-2xl gap-1 rounded border border-[#e8ebef] bg-white p-1">
            {matches.map((patient) => (
              <button
                type="button"
                key={patient[0]}
                className="flex items-center justify-between gap-3 rounded px-3 py-2 text-left hover:bg-[#f4fbf9]"
                onClick={() => {
                  setPatientId(patient[0]);
                  setPatientQuery(`${patient[1]} · ${patient[0]}`);
                }}
              >
                <span>
                  <b className="block text-sm text-[#182236]">{patient[1]}</b>
                  <small className="text-xs text-[#687285]">
                    {patient[0]} · {patient[10] || "Mobile not on file"}
                  </small>
                </span>
                <UserRound size={15} className="text-[#687285]" />
              </button>
            ))}
          </div>
        )}
        {patientQuery.trim() && !selectedPatient && !matches.length && (
          <p className="mb-0 mt-2 text-xs text-[#687285]">
            No patient matches that name, ID, or mobile number.
          </p>
        )}
      </section>

      {!bill && (
        <div className="content-card px-4 py-14 text-center text-sm text-[#687285]">
          Search for a patient to view billing details.
        </div>
      )}

      {bill && (
        <>
          <section className="content-card invoice-patient-strip mb-4 overflow-hidden">
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
              <div>
                <small className="text-[9px] font-bold tracking-wide text-[#687285]">
                  PATIENT
                </small>
                <b className="mt-1 block text-sm text-[#182236]">
                  {bill.patient[1]}
                </b>
                <small className="text-xs text-[#687285]">
                  {bill.patient[2]} · ID {bill.patient[0]} ·{" "}
                  {bill.patient[10] || "Mobile not on file"}
                </small>
              </div>
              <div>
                <small className="text-[9px] font-bold tracking-wide text-[#687285]">
                  {bill.billingType === "EMERGENCY"
                    ? "EMERGENCY ARRIVAL"
                    : "ADMITTED"}
                </small>
                <b className="mt-1 block text-sm text-[#182236]">
                  {bill.admissionAt
                    ? new Date(bill.admissionAt).toLocaleString()
                    : "Outpatient visit"}
                </b>
                <small className="text-xs text-[#687285]">
                  {bill.billingType === "EMERGENCY"
                    ? `${bill.emergencyPriority ?? "Emergency"} · ${bill.emergencyStatus ?? "Case"}`
                    : bill.billingType}
                </small>
              </div>
              <div>
                <small className="text-[9px] font-bold tracking-wide text-[#687285]">
                  DISCHARGED
                </small>
                <b className="mt-1 block text-sm text-[#182236]">
                  {bill.dischargeAt
                    ? new Date(bill.dischargeAt).toLocaleString()
                    : "Not discharged"}
                </b>
                <small className="text-xs text-[#687285]">
                  {bill.currentStay
                    ? "Admission in progress"
                    : bill.emergencyActive
                      ? "Emergency treatment in progress"
                      : bill.billingType === "IPD"
                        ? "Completed admission"
                        : (bill.visits[0]?.[10] ?? "Same-day care")}
                </small>
              </div>
              <div>
                <small className="text-[9px] font-bold tracking-wide text-[#687285]">
                  WARD / BED
                </small>
                <b className="mt-1 block text-sm text-[#182236]">
                  {bill.currentStay
                    ? `${WARD_LABELS[bill.currentStay.wardType]} (${bill.currentStay.roomNumber} / ${bill.currentStay.bedNumber})`
                    : bill.roomSegments[0]
                      ? `${WARD_LABELS[bill.roomSegments[0].wardType!]} (${bill.roomSegments[0].roomNumber} / ${bill.roomSegments[0].bedNumber})`
                      : "No room allocated"}
                </b>
                <small className="text-xs text-[#687285]">
                  {bill.roomSegments.length} room segments
                </small>
              </div>
              <div>
                <small className="text-[9px] font-bold tracking-wide text-[#687285]">
                  CONSULTANT
                </small>
                <b className="mt-1 block text-sm text-[#182236]">
                  {consultant}
                </b>
                <small className="text-xs text-[#687285]">
                  From recorded appointments
                </small>
              </div>
            </div>
          </section>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid min-w-0 gap-4">
              <section className="content-card overflow-hidden">
                <div className="border-b border-[#edf0f5] px-4 py-3 sm:px-5">
                  <h2 className="m-0 text-base font-semibold text-[#182236]">
                    Visit and admission
                  </h2>
                  <p className="mb-0 mt-1 text-xs text-[#687285]">
                    From the patient's actual appointment and Appoint Room
                    records.
                  </p>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <div>
                    <small className="text-[10px] font-bold text-[#687285]">
                      ADMISSION
                    </small>
                    <p className="mb-0 mt-1 text-sm font-semibold text-[#182236]">
                      {bill.admissionAt
                        ? new Date(bill.admissionAt).toLocaleString()
                        : "No inpatient admission record"}
                    </p>
                    <small className="text-xs text-[#687285]">
                      {bill.dischargeAt
                        ? `Discharged ${new Date(bill.dischargeAt).toLocaleString()}`
                        : bill.currentStay
                          ? "Discharge pending"
                          : "No discharge timestamp"}
                    </small>
                  </div>
                  <div>
                    <small className="text-[10px] font-bold text-[#687285]">
                      CURRENT STAY
                    </small>
                    {bill.currentStay ? (
                      <p className="mb-0 mt-1 text-sm font-semibold text-[#182236]">
                        {WARD_LABELS[bill.currentStay.wardType]} · Room{" "}
                        {bill.currentStay.roomNumber} · Bed{" "}
                        {bill.currentStay.bedNumber}
                        <small className="mt-1 block font-normal text-[#687285]">
                          Since{" "}
                          {new Date(bill.currentStay.startAt).toLocaleString()}{" "}
                          · {amount(bill.currentStay.ratePerDayPaise)}/day
                        </small>
                      </p>
                    ) : (
                      <p className="mb-0 mt-1 text-sm text-[#687285]">
                        No active room
                      </p>
                    )}
                  </div>
                </div>
                {bill.visits.length > 0 && (
                  <div className="border-t border-[#edf0f5] px-4 py-3 sm:px-5">
                    <h3 className="m-0 text-xs font-bold uppercase text-[#687285]">
                      Appointments / visits
                    </h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {bill.visits.slice(0, 4).map((visit) => (
                        <div
                          className="rounded border border-[#e8ebef] p-2.5 text-xs"
                          key={visit[2]}
                        >
                          <b>{visit[7] || "Doctor not recorded"}</b>
                          <span className="ml-2 text-[#687285]">
                            {visit[11]
                              ? new Date(visit[11]).toLocaleDateString()
                              : visit[0]}
                          </span>
                          <small className="mt-1 block text-[#687285]">
                            {visit[5]} · {visit[10]}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="content-card overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-[#edf0f5] px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="m-0 text-base font-semibold text-[#182236]">
                      Billing Breakdown
                    </h2>
                    <p className="mb-0 mt-1 text-xs text-[#687285]">
                      Room segments and documented services · Policy:{" "}
                      {policy.basis.replaceAll("_", " ")} /{" "}
                      {policy.partialDayRule.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    {![
                      "FINALIZED",
                      "UNPAID",
                      "PARTIALLY_PAID",
                      "PAID",
                    ].includes(bill.invoice?.status ?? "") && (
                      <IconButton
                        className="white-button"
                        onClick={() => setAddChargeOpen(true)}
                      >
                        <FilePlus2 size={14} /> Add charge
                      </IconButton>
                    )}
                    <BedDouble size={17} className="text-[#007d72]" />
                  </div>
                </div>
                {bill.roomSegments.length || bill.serviceChargeItems.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-[#f0f4fc] text-[10px] font-bold uppercase text-[#687285]">
                        <tr>
                          <th className="px-4 py-3">Charge category</th>
                          <th className="px-4 py-3">Description & dates</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.roomSegments.map((segment) => (
                          <tr
                            className="border-t border-[#edf0f5]"
                            key={segment.roomStayId ?? segment.id}
                          >
                            <td className="px-4 py-3 font-semibold text-[#253148]">
                              Room & Nursing Charges
                            </td>
                            <td className="px-4 py-3">
                              <b className="text-[#182236]">
                                {segment.wardType
                                  ? WARD_LABELS[segment.wardType]
                                  : "Room stay"}{" "}
                                · {segment.roomNumber} / {segment.bedNumber}
                              </b>
                              <small className="mt-1 block text-xs text-[#687285]">
                                {segment.startAt
                                  ? new Date(segment.startAt).toLocaleString()
                                  : "—"}{" "}
                                →{" "}
                                {segment.endAt
                                  ? new Date(segment.endAt).toLocaleString()
                                  : "Now"}{" "}
                                · {segment.billableDays ?? 0} billable days ·{" "}
                                {amount(segment.ratePerDayPaise ?? 0)}/day
                              </small>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {amount(segment.totalPaise)}
                            </td>
                          </tr>
                        ))}
                        {bill.serviceChargeItems.map((charge) => (
                          <tr
                            className="border-t border-[#edf0f5]"
                            key={charge.patientChargeId ?? charge.id}
                          >
                            <td className="px-4 py-3 font-semibold text-[#253148]">
                              {charge.category?.replaceAll("_", " ") ??
                                "Service"}
                            </td>
                            <td className="px-4 py-3">
                              <b className="text-[#182236]">
                                {charge.description}
                              </b>
                              <small className="mt-1 block text-xs text-[#687285]">
                                {charge.quantity} ×{" "}
                                {amount(charge.unitAmountPaise)} ·{" "}
                                {charge.source ?? "Recorded service"}
                              </small>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {amount(charge.totalPaise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#f6f8fc]">
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-3 text-sm font-semibold text-[#465166]"
                          >
                            Room Charges Total
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {amount(
                              bill.roomSegments.reduce(
                                (sum, line) => sum + line.totalPaise,
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                        <tr className="border-t border-[#e8ebef]">
                          <td
                            colSpan={2}
                            className="px-4 py-3 text-sm font-bold text-[#182236]"
                          >
                            Total Gross Hospital Charges
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-[#182236]">
                            {amount(bill.subtotalPaise)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-7 text-sm text-[#687285]">
                    No room allocation or charge records. Outpatient billing
                    does not include room rent.
                  </div>
                )}
              </section>

              {isHistoryRoute && (
                <section className="content-card overflow-hidden">
                  <div className="border-b border-[#edf0f5] px-4 py-3 sm:px-5">
                    <h2 className="m-0 text-base font-semibold text-[#182236]">
                      Bills / History
                    </h2>
                    <p className="mb-0 mt-1 text-xs text-[#687285]">
                      Finalized snapshots are not recalculated when charges or
                      rates change.
                    </p>
                  </div>
                  {relatedHistory.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-[#f8fafb] text-xs text-[#687285]">
                          <tr>
                            <th className="px-4 py-2.5">Invoice</th>
                            <th className="px-4 py-2.5">Created</th>
                            <th className="px-4 py-2.5">Type / Status</th>
                            <th className="px-4 py-2.5">Total</th>
                            <th className="px-4 py-2.5">Paid</th>
                            <th className="px-4 py-2.5">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatedHistory.map((invoice) => (
                            <tr
                              className="border-t border-[#edf0f5]"
                              key={invoice.id}
                            >
                              <td className="px-4 py-2.5 font-semibold">
                                {invoice.invoiceNumber}
                              </td>
                              <td className="px-4 py-2.5">
                                {new Date(invoice.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5">
                                {invoice.billingType ?? "IPD"} ·{" "}
                                {invoice.status.replaceAll("_", " ")}
                              </td>
                              <td className="px-4 py-2.5">
                                {amount(invoice.totalPaise)}
                              </td>
                              <td className="px-4 py-2.5">
                                {amount(invoice.paidPaise)}
                              </td>
                              <td className="px-4 py-2.5">
                                {amount(invoice.balancePaise)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="m-0 px-4 py-7 text-sm text-[#687285]">
                      No bill history for this patient.
                    </p>
                  )}
                </section>
              )}
            </div>

            <aside className="grid gap-4 xl:sticky xl:top-4">
              <section className="content-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="m-0 text-base font-semibold text-[#182236]">
                      Payment Summary
                    </h2>
                    <p className="mb-0 mt-1 text-xs text-[#687285]">
                      {bill.billingType} · {policy.basis.replaceAll("_", " ")} ·{" "}
                      {policy.partialDayRule.replaceAll("_", " ")} · minimum{" "}
                      {policy.minimumBillableDaysPerStay} day/stay
                    </p>
                  </div>
                  <ReceiptText size={18} className="text-[#007d72]" />
                </div>
                <dl className="mb-0 mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-[#687285]">Room charges</dt>
                  <dd className="m-0 text-right">
                    {amount(
                      bill.roomSegments.reduce(
                        (sum, line) => sum + line.totalPaise,
                        0,
                      ),
                    )}
                  </dd>
                  <dt className="text-[#687285]">Services</dt>
                  <dd className="m-0 text-right">
                    {amount(
                      bill.serviceChargeItems.reduce(
                        (sum, line) => sum + line.totalPaise,
                        0,
                      ),
                    )}
                  </dd>
                  <dt className="text-[#687285]">Subtotal</dt>
                  <dd className="m-0 text-right">
                    {amount(bill.subtotalPaise)}
                  </dd>
                  <dt className="text-[#687285]">Discount</dt>
                  <dd className="m-0 text-right">
                    {amount(bill.discountPaise)}
                  </dd>
                  <dt className="text-[#687285]">Tax</dt>
                  <dd className="m-0 text-right">{amount(bill.taxPaise)}</dd>
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-[#edf0f5] pt-3 text-sm font-bold">
                  <span>Total bill amount</span>
                  <span>{amount(bill.totalPaise)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-[#687285]">Payments received</span>
                  <span>{amount(bill.paidPaise)}</span>
                </div>
                <div className="mt-3 rounded-lg bg-[#eaf3ff] p-3.5">
                  <small className="text-[9px] font-bold tracking-wide text-[#687285]">
                    NET BALANCE DUE
                  </small>
                  <b className="mt-1 block text-3xl text-[#007d72]">
                    {amount(bill.balancePaise)}
                  </b>
                  <small className="text-xs text-[#687285]">
                    {bill.currentStay
                      ? "Provisional running balance"
                      : "Payable against this statement"}
                  </small>
                </div>
                <p className="mb-0 mt-3 rounded border border-[#e8ebef] bg-[#f8fafb] px-2.5 py-2 text-xs text-[#687285]">
                  Status: <b className="text-[#182236]">{billStatusLabel}</b>
                  {bill.currentStay ? " · Running estimate" : ""}
                </p>
                {bill.invalidChargeIds.length > 0 && (
                  <p className="mb-0 mt-2 flex items-start gap-1.5 text-xs text-[#b42318]">
                    <ShieldAlert size={14} /> Invalid charge or stay values need
                    review before finalization.
                  </p>
                )}
                <div className="mt-4 grid gap-2">
                  {((bill.billingType === "IPD" && bill.currentStay) ||
                    (bill.billingType === "EMERGENCY" &&
                      bill.emergencyActive)) && (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#007d72] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bill.invalidChargeIds.length > 0}
                      onClick={() => {
                        try {
                          billingService.saveRunningBill(
                            patientId,
                            bill.admissionId,
                          );
                          refresh();
                          toast.success("Running bill saved.");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Running bill could not be saved.",
                          );
                        }
                      }}
                    >
                      <ReceiptText size={14} /> Save running bill
                    </button>
                  )}
                  {bill.balancePaise > 0 &&
                    bill.invoice &&
                    bill.invoice.status !== "DRAFT" && (
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#dfe5e7] bg-white px-3 text-sm font-semibold text-[#007d72]"
                        onClick={handlePaymentOpen}
                      >
                        <Banknote size={14} /> Record payment
                      </button>
                    )}
                  {!bill.invoice &&
                    ((bill.billingType === "IPD" && bill.currentStay) ||
                      (bill.billingType === "EMERGENCY" &&
                        bill.emergencyActive)) &&
                    bill.balancePaise > 0 && (
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#dfe5e7] bg-white px-3 text-sm font-semibold text-[#007d72]"
                        onClick={handlePaymentOpen}
                      >
                        <Banknote size={14} /> Record payment
                      </button>
                    )}
                  {bill.billingType === "IPD" && bill.currentStay && (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#007d72] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bill.invalidChargeIds.length > 0}
                      onClick={() => setFinalizeOpen(true)}
                    >
                      <CheckCircle2 size={14} /> Clear & Discharge Patient
                    </button>
                  )}
                  {bill.billingType === "EMERGENCY" && bill.emergencyActive && (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#007d72] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={bill.invalidChargeIds.length > 0}
                      onClick={() => setFinalizeOpen(true)}
                    >
                      <CheckCircle2 size={14} /> Treat & Discharge
                    </button>
                  )}
                  {bill.billingType === "IPD" &&
                    !bill.currentStay &&
                    bill.status === "DRAFT" && (
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#007d72] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={bill.invalidChargeIds.length > 0}
                        onClick={() => setFinalizeOpen(true)}
                      >
                        <CheckCircle2 size={14} /> Finalize IPD Bill
                      </button>
                    )}
                  {bill.billingType === "EMERGENCY" &&
                    !bill.emergencyActive &&
                    bill.status === "DRAFT" && (
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#007d72] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={bill.invalidChargeIds.length > 0}
                        onClick={() => setFinalizeOpen(true)}
                      >
                        <CheckCircle2 size={14} /> Finalize Emergency Bill
                      </button>
                    )}
                  {bill.billingType === "OPD" &&
                    bill.status !== "FINALIZED" &&
                    bill.status !== "PAID" &&
                    bill.status !== "PARTIALLY_PAID" && (
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#007d72] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={
                          bill.invalidChargeIds.length > 0 ||
                          !bill.serviceChargeItems.length
                        }
                        onClick={() => setFinalizeOpen(true)}
                      >
                        <CheckCircle2 size={14} /> Finalize OPD Bill
                      </button>
                    )}
                </div>
              </section>

              <section className="content-card p-4 sm:p-5">
                <h2 className="m-0 text-base font-semibold text-[#182236]">
                  Payments
                </h2>
                {patientPayments.length ? (
                  <div className="mt-3 divide-y divide-[#edf0f5]">
                    {patientPayments.map((payment) => (
                      <div
                        className="flex items-start justify-between gap-3 py-2 text-xs"
                        key={payment.id}
                      >
                        <span>
                          <b className="block text-[#182236]">
                            {payment.method.replaceAll("_", " ")} ·{" "}
                            {new Date(payment.paidAt).toLocaleString()}
                          </b>
                          <small className="text-[#687285]">
                            {payment.reference ||
                              payment.notes ||
                              "Successful payment"}
                          </small>
                        </span>
                        <strong>{amount(payment.amountPaise)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-0 mt-3 text-sm text-[#687285]">
                    No payments recorded for this bill.
                  </p>
                )}
              </section>

              <details className="content-card p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#182236]">
                  Rates and billing policy
                </summary>
                <p className="mb-3 mt-2 text-xs text-[#687285]">
                  Rates are snapshotted at admission. Policy changes do not
                  alter finalized invoices.
                </p>
                <div className="grid gap-2">
                  {rates.map((rate) => (
                    <label className={labelClass} key={rate.ward}>
                      {WARD_LABELS[rate.ward]} · INR/day
                      <input
                        className={fieldClass}
                        inputMode="decimal"
                        value={rateDraft[rate.ward] ?? String(rate.perDay)}
                        onChange={(event) =>
                          setRateDraft((current) => ({
                            ...current,
                            [rate.ward]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                  <label className={labelClass}>
                    Minimum billable days
                    <input
                      className={fieldClass}
                      type="number"
                      min="0"
                      step="1"
                      value={minimumDaysDraft}
                      onChange={(event) =>
                        setMinimumDaysDraft(event.target.value)
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    Partial day rule
                    <select
                      className={fieldClass}
                      value={policy.partialDayRule}
                      onChange={(event) =>
                        setPolicy((current) => ({
                          ...current,
                          partialDayRule: event.target
                            .value as RoomBillingPolicy["partialDayRule"],
                        }))
                      }
                    >
                      <option value="ROUND_UP">
                        Round up each 24-hour block
                      </option>
                      <option value="ROUND_DOWN">
                        Round down complete 24-hour blocks
                      </option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="min-h-9 rounded border border-[#dfe5e7] px-3 text-xs font-semibold text-[#007d72]"
                    onClick={saveRatesAndPolicy}
                  >
                    Save configuration
                  </button>
                </div>
                <small className="mt-2 block text-[11px] text-[#8a5b12]">
                  No role-based permission system is configured in this app.
                </small>
              </details>
            </aside>
          </div>
        </>
      )}

      {bill && addChargeOpen && (
        <AddChargeDialog
          bill={bill}
          onClose={() => setAddChargeOpen(false)}
          onSaved={() => {
            setAddChargeOpen(false);
            refresh();
          }}
        />
      )}
      {bill && finalizeOpen && (
        <FinalizeDialog
          bill={bill}
          onClose={() => setFinalizeOpen(false)}
          onConfirm={finalize}
        />
      )}
      {paymentInvoice && (
        <PaymentDialog
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onPay={recordPayment}
        />
      )}
      {reportOpen && (
        <ReportModal module="billing" onClose={() => setReportOpen(false)} />
      )}
    </>
  );
}

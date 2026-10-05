import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { inpatientService } from '@/services/inpatientService';
import { patientsService } from '@/services/patientsService';
import { appointmentsService } from '@/services/appointmentsService';
import { emergencyService } from '@/services/emergencyService';
import { admissionService } from '@/services/admissionService';
import type { BillingType, Invoice, InvoiceLineItem, PatientBill, PatientCharge, PatientChargeCategory, Payment } from '@/types/billing';
import type { RoomBillingPolicy, RoomStay, WardRate } from '@/types/rooms';

const KEYS = {
  policy: 'curaclinic.billing.roomPolicy.v1',
  invoices: 'curaclinic.billing.invoices.v1',
  payments: 'curaclinic.billing.payments.v1',
  charges: 'curaclinic.billing.patientCharges.v1',
};

export const defaultRoomBillingPolicy: RoomBillingPolicy = {
  basis: 'HOUR_BLOCKS_24',
  partialDayRule: 'ROUND_UP',
  minimumBillableDaysPerStay: 1,
  transferPolicy: 'PER_STAY_SEGMENT',
};

export interface RoomChargeCalculation {
  items: InvoiceLineItem[];
  totalPaise: number;
  invalidStayIds: string[];
}

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function persistBillingValue<T>(key: string, value: T): void {
  saveToStorage(key, value);
  const saved = loadFromStorage<T | null>(key, null);
  if (JSON.stringify(saved) !== JSON.stringify(value)) {
    throw new Error('Billing data could not be saved. Check browser storage availability.');
  }
}

function getBillableDays(stay: RoomStay, policy: RoomBillingPolicy, now: Date): number | null {
  if (stay.legacyBillingExempt) return null;
  const start = new Date(stay.startAt).getTime();
  const end = stay.endAt ? new Date(stay.endAt).getTime() : stay.status === 'ACTIVE' ? now.getTime() : Number.NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const durationMs = end - start;
  const durationHours = durationMs / (60 * 60 * 1000);
  const rawBillableDays = policy.partialDayRule === 'ROUND_UP'
    ? Math.ceil(durationHours / 24)
    : Math.floor(durationHours / 24);
  return Math.max(policy.minimumBillableDaysPerStay, rawBillableDays);
}

export function calculateRoomCharges(
  stays: RoomStay[],
  policy: RoomBillingPolicy = defaultRoomBillingPolicy,
  now: Date = new Date(),
): RoomChargeCalculation {
  const items: InvoiceLineItem[] = [];
  const invalidStayIds: string[] = [];
  const seen = new Set<string>();

  for (const stay of stays) {
    if (stay.legacyBillingExempt || seen.has(stay.id)) continue;
    seen.add(stay.id);
    const billableDays = getBillableDays(stay, policy, now);
    if (billableDays === null || !Number.isSafeInteger(stay.ratePerDayPaise) || stay.ratePerDayPaise < 0) {
      invalidStayIds.push(stay.id);
      continue;
    }
    const totalPaise = billableDays * stay.ratePerDayPaise;
    if (!Number.isSafeInteger(totalPaise)) {
      invalidStayIds.push(stay.id);
      continue;
    }
    items.push({
      id: `room-charge-${stay.id}`,
      type: 'ROOM_CHARGE',
      description: `${stay.wardType.toUpperCase()} · Room ${stay.roomNumberSnapshot}, Bed ${stay.bedNumberSnapshot} · ${billableDays} ${billableDays === 1 ? 'day' : 'days'}`,
      roomStayId: stay.id,
      wardType: stay.wardType,
      roomNumber: stay.roomNumberSnapshot,
      bedNumber: stay.bedNumberSnapshot,
      startAt: stay.startAt,
      endAt: stay.endAt ?? now.toISOString(),
      ratePerDayPaise: stay.ratePerDayPaise,
      billableDays,
      quantity: billableDays,
      unitAmountPaise: stay.ratePerDayPaise,
      totalPaise,
    });
  }

  return {
    items,
    totalPaise: items.reduce((total, item) => total + item.totalPaise, 0),
    invalidStayIds,
  };
}

function paymentAdjustedInvoice(invoice: Invoice, paidPaise: number): Invoice {
  const status = invoice.status === 'DRAFT' || invoice.status === 'RUNNING' || invoice.status === 'CANCELLED'
    ? invoice.status
    : paidPaise === 0
      ? invoice.status === 'FINALIZED' ? 'FINALIZED' : 'UNPAID'
      : paidPaise < invoice.totalPaise
        ? 'PARTIALLY_PAID'
        : 'PAID';
  return {
    ...invoice,
    paidPaise,
    balancePaise: Math.max(0, invoice.totalPaise - paidPaise),
    status,
  };
}

export const billingService = {
  getPolicy(): RoomBillingPolicy {
    const policy = loadFromStorage<RoomBillingPolicy>(KEYS.policy, defaultRoomBillingPolicy);
    if (!policy || policy.basis !== 'HOUR_BLOCKS_24'
      || !['ROUND_UP', 'ROUND_DOWN'].includes(policy.partialDayRule)
      || policy.transferPolicy !== 'PER_STAY_SEGMENT'
      || !Number.isInteger(policy.minimumBillableDaysPerStay)
      || policy.minimumBillableDaysPerStay < 0) {
      return defaultRoomBillingPolicy;
    }
    return { ...policy };
  },

  savePolicy(policy: RoomBillingPolicy): void {
    if (!Number.isInteger(policy.minimumBillableDaysPerStay) || policy.minimumBillableDaysPerStay < 0) {
      throw new Error('Minimum billable days must be a non-negative whole number.');
    }
    persistBillingValue(KEYS.policy, policy);
  },

  saveConfiguration(rates: WardRate[], policy: RoomBillingPolicy): void {
    const previousRates = inpatientService.getRates();
    const previousPolicy = this.getPolicy();
    try {
      inpatientService.saveRates(rates);
      this.savePolicy(policy);
    } catch (error) {
      try {
        inpatientService.saveRates(previousRates);
        this.savePolicy(previousPolicy);
      } catch {
        // The active configuration remains locally recoverable from its persisted values.
      }
      throw error;
    }
  },

  getInvoices(): Invoice[] {
    const invoices = loadFromStorage<Invoice[]>(KEYS.invoices, []);
    if (!Array.isArray(invoices)) return [];
    const payments = this.getPayments();
    return invoices.map((invoice) => {
      const paidPaise = payments
        .filter((payment) => payment.invoiceId === invoice.id)
        .reduce((total, payment) => total + payment.amountPaise, 0);
      return paymentAdjustedInvoice(invoice, paidPaise);
    });
  },

  getPayments(): Payment[] {
    const payments = loadFromStorage<Payment[]>(KEYS.payments, []);
    return Array.isArray(payments) ? payments.filter((payment) => payment.status !== 'VOID') : [];
  },

  getPatientCharges(patientId?: string): PatientCharge[] {
    const charges = loadFromStorage<PatientCharge[]>(KEYS.charges, []);
    if (!Array.isArray(charges)) return [];
    return patientId ? charges.filter((charge) => charge.patientId === patientId) : charges;
  },

  addPatientCharge(params: {
    patientId: string;
    admissionId?: string;
    emergencyCaseId?: string;
    appointmentId?: string;
    category: PatientChargeCategory;
    description: string;
    quantity: number;
    unitPricePaise: number;
    chargeDate: string;
    source?: string;
    sourceId?: string;
    notes?: string;
  }): PatientCharge {
    const patient = patientsService.getPatients().find(([id]) => id === params.patientId);
    if (!patient) throw new Error('Select an existing patient.');
    if (!params.description.trim()) throw new Error('Charge description is required.');
    if (!Number.isSafeInteger(params.quantity) || params.quantity <= 0) throw new Error('Charge quantity must be a positive whole number.');
    if (!Number.isSafeInteger(params.unitPricePaise) || params.unitPricePaise < 0) throw new Error('Charge unit price must be a valid non-negative amount.');
    const chargeDate = new Date(params.chargeDate);
    if (Number.isNaN(chargeDate.getTime())) throw new Error('Enter a valid charge date.');
    const amountPaise = params.quantity * params.unitPricePaise;
    if (!Number.isSafeInteger(amountPaise)) throw new Error('Charge amount is outside the supported range.');
    if (params.emergencyCaseId && !emergencyService.getCasesForPatient(params.patientId).some((item) => item.id === params.emergencyCaseId)) {
      throw new Error('Charge emergency case does not belong to this patient.');
    }
    const existing = this.getPatientCharges(params.patientId);
    if (params.sourceId && existing.some((charge) => charge.sourceId === params.sourceId && charge.source === params.source)) {
      return existing.find((charge) => charge.sourceId === params.sourceId && charge.source === params.source)!;
    }
    const finalized = this.getInvoices().some((invoice) => invoice.patientId === params.patientId
      && invoice.status !== 'CANCELLED'
      && ['FINALIZED', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].includes(invoice.status)
      && (params.admissionId ? invoice.admissionId === params.admissionId
        : params.emergencyCaseId ? invoice.emergencyCaseId === params.emergencyCaseId
          : invoice.encounterId === params.appointmentId));
    if (finalized) throw new Error('This bill is finalized. Record later services through an approved adjustment workflow.');
    const charge: PatientCharge = {
      id: makeId('charge'),
      patientId: params.patientId,
      admissionId: params.admissionId,
      emergencyCaseId: params.emergencyCaseId,
      appointmentId: params.appointmentId,
      category: params.category,
      description: params.description.trim(),
      quantity: params.quantity,
      unitPricePaise: params.unitPricePaise,
      amountPaise,
      chargeDate: chargeDate.toISOString(),
      source: params.source?.trim() || 'Manual clinical entry',
      sourceId: params.sourceId?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    persistBillingValue(KEYS.charges, [...this.getPatientCharges(), charge]);
    window.dispatchEvent(new CustomEvent('clinic-billing-updated'));
    return charge;
  },

  calculatePatientBill(patientId: string, admissionId?: string, emergencyCaseId?: string): PatientBill {
    const patient = patientsService.getPatients().find(([id]) => id === patientId);
    if (!patient) throw new Error('The selected patient is no longer in the directory.');
    const patientStays = inpatientService.getRoomStays().filter((stay) => stay.patientId === patientId);
    const activeStay = patientStays.filter((stay) => stay.status === 'ACTIVE').sort((a, b) => b.startAt.localeCompare(a.startAt))[0];
    const latestStay = patientStays.slice().sort((a, b) => b.startAt.localeCompare(a.startAt))[0];
    const visits = appointmentsService.getEntries()
      .filter((entry) => entry[13] === patientId || (!entry[13] && entry[3].trim().toLowerCase() === patient[1].trim().toLowerCase()))
      .sort((left, right) => (right[11] ?? '').localeCompare(left[11] ?? ''));
    const emergencyCases = emergencyService.getCasesForPatient(patientId);
    const activeEmergency = emergencyCases.find((item) => ['WAITING_FOR_DOCTOR', 'ASSESSING', 'TREATING'].includes(item.status));
    const latestEmergency = emergencyCases[0];
    const latestVisitTime = visits[0]?.[11] ? new Date(visits[0][11]).getTime() : 0;
    const latestStayTime = latestStay ? new Date(latestStay.endAt ?? latestStay.startAt).getTime() : 0;
    const selectedType: BillingType = admissionId || activeStay || (!emergencyCaseId && !activeEmergency && latestStay && latestStayTime >= latestVisitTime)
      ? 'IPD'
      : emergencyCaseId || activeEmergency || (latestEmergency && new Date(latestEmergency.arrivedAt).getTime() > latestVisitTime && latestEmergency.status !== 'CLOSED')
        ? 'EMERGENCY'
        : 'OPD';
    const selectedAdmissionId = admissionId ?? (selectedType === 'IPD' ? activeStay?.admissionId ?? latestStay?.admissionId : undefined);
    const selectedAdmission = selectedAdmissionId ? admissionService.getAdmission(selectedAdmissionId) : undefined;
    const selectedEmergencyCaseId = emergencyCaseId
      ?? selectedAdmission?.emergencyCaseId
      ?? (selectedType === 'EMERGENCY' ? activeEmergency?.id ?? latestEmergency?.id : undefined);
    const stays = selectedAdmissionId
      ? patientStays.filter((stay) => stay.admissionId === selectedAdmissionId)
      : selectedType === 'IPD' ? patientStays : [];
    const billingType = selectedType;
    const encounterId = billingType === 'OPD'
      ? visits[0]?.[2] ?? `OPD-${patientId}-${new Date().toISOString().slice(0, 10)}`
      : undefined;
    const charges = this.getPatientCharges(patientId).filter((charge) => billingType === 'OPD'
      ? !charge.admissionId && (!charge.appointmentId || charge.appointmentId === encounterId)
      : billingType === 'EMERGENCY'
        ? charge.emergencyCaseId === selectedEmergencyCaseId
        : !charge.admissionId || charge.admissionId === selectedAdmissionId || Boolean(selectedEmergencyCaseId && charge.emergencyCaseId === selectedEmergencyCaseId));
    const roomCalculation = calculateRoomCharges(stays, this.getPolicy());
    const seenCharges = new Set<string>();
    const invalidChargeIds: string[] = [];
    const validCharges: PatientCharge[] = [];
    const serviceChargeItems: InvoiceLineItem[] = [];
    for (const charge of charges) {
      if (seenCharges.has(charge.id)) continue;
      seenCharges.add(charge.id);
      const amountPaise = charge.quantity * charge.unitPricePaise;
      if (!Number.isSafeInteger(charge.quantity) || charge.quantity <= 0
        || !Number.isSafeInteger(charge.unitPricePaise) || charge.unitPricePaise < 0
        || !Number.isSafeInteger(amountPaise) || amountPaise !== charge.amountPaise) {
        invalidChargeIds.push(charge.id);
        continue;
      }
      validCharges.push(charge);
      serviceChargeItems.push({
        id: `service-${charge.id}`,
        type: 'SERVICE_CHARGE',
        patientChargeId: charge.id,
        category: charge.category,
        source: charge.source,
        description: charge.description,
        quantity: charge.quantity,
        unitAmountPaise: charge.unitPricePaise,
        totalPaise: amountPaise,
        startAt: charge.chargeDate,
      });
    }
    const roomSegments = roomCalculation.items;
    const subtotalPaise = roomCalculation.totalPaise + serviceChargeItems.reduce((sum, item) => sum + item.totalPaise, 0);
    const relatedInvoices = this.getInvoices().filter((invoice) => invoice.patientId === patientId
      && invoice.status !== 'CANCELLED'
      && (selectedAdmissionId
        ? invoice.admissionId === selectedAdmissionId
        : selectedEmergencyCaseId ? invoice.emergencyCaseId === selectedEmergencyCaseId
          : !invoice.admissionId && !invoice.emergencyCaseId && (!invoice.encounterId || invoice.encounterId === encounterId)));
    const invoice = relatedInvoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const payments = this.getPayments().filter((payment) => relatedInvoices.some((related) => related.id === payment.invoiceId));
    const paidPaise = payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    const currentSnapshotIsFinal = Boolean(invoice && ['FINALIZED', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].includes(invoice.status));
    const totalPaise = currentSnapshotIsFinal ? invoice!.totalPaise : subtotalPaise;
    const discountPaise = currentSnapshotIsFinal ? invoice!.discountPaise : 0;
    const taxPaise = currentSnapshotIsFinal ? invoice!.taxPaise : 0;
    const emergencyCase = selectedEmergencyCaseId ? emergencyCases.find((item) => item.id === selectedEmergencyCaseId) : undefined;
    const admissionAt = stays.length ? stays.reduce((earliest, stay) => stay.startAt < earliest ? stay.startAt : earliest, stays[0].startAt) : emergencyCase?.arrivedAt;
    const dischargeAt = activeStay && stays.some((stay) => stay.id === activeStay.id)
      ? null
      : stays.length ? stays.reduce((latest, stay) => stay.endAt && stay.endAt > latest ? stay.endAt : latest, '') || emergencyCase?.dischargedAt || null : emergencyCase?.dischargedAt ?? null;
    const emergencyActive = Boolean(emergencyCase && ['WAITING_FOR_DOCTOR', 'ASSESSING', 'TREATING'].includes(emergencyCase.status));
    const status = activeStay && stays.some((stay) => stay.id === activeStay.id) || emergencyActive
      ? 'RUNNING'
      : currentSnapshotIsFinal
        ? paidPaise >= totalPaise && totalPaise > 0 ? 'PAID' : paidPaise > 0 ? 'PARTIALLY_PAID' : 'FINALIZED'
        : 'DRAFT';
    return {
      patient,
      billingType,
      admissionId: selectedAdmissionId,
      emergencyCaseId: selectedEmergencyCaseId,
      encounterId,
      emergencyPriority: emergencyCase?.priority,
      emergencyStatus: emergencyCase?.status,
      emergencyDoctorId: emergencyCase?.assignedDoctorId,
      emergencyActive,
      admissionAt,
      dischargeAt,
      currentStay: activeStay && stays.some((stay) => stay.id === activeStay.id) ? {
        wardType: activeStay.wardType,
        roomNumber: activeStay.roomNumberSnapshot,
        bedNumber: activeStay.bedNumberSnapshot,
        startAt: activeStay.startAt,
        ratePerDayPaise: activeStay.ratePerDayPaise,
      } : undefined,
      visits,
      roomSegments: currentSnapshotIsFinal ? invoice!.items.filter((item) => item.type === 'ROOM_CHARGE') : roomSegments,
      serviceCharges: currentSnapshotIsFinal ? validCharges.filter((charge) => invoice!.items.some((item) => item.patientChargeId === charge.id)) : validCharges,
      serviceChargeItems: currentSnapshotIsFinal ? invoice!.items.filter((item) => item.type !== 'ROOM_CHARGE') : serviceChargeItems,
      subtotalPaise: currentSnapshotIsFinal ? invoice!.subtotalPaise : subtotalPaise,
      discountPaise,
      taxPaise,
      totalPaise,
      paidPaise,
      balancePaise: Math.max(0, totalPaise - paidPaise),
      status,
      invalidChargeIds: [...invalidChargeIds, ...roomCalculation.invalidStayIds],
      invoice,
    };
  },

  saveRunningBill(patientId: string, admissionId?: string): Invoice {
    const bill = this.calculatePatientBill(patientId, admissionId);
    if (!bill.currentStay && !(bill.billingType === 'EMERGENCY' && bill.emergencyActive)) throw new Error('Only an active inpatient admission or emergency case can have a running bill.');
    if (bill.invalidChargeIds.length) throw new Error('Fix invalid room or service charges before saving the running bill.');
    return this.saveBillSnapshot(bill, false);
  },

  finalizePatientBill(patientId: string, admissionId?: string, emergencyCaseId?: string): Invoice {
    const bill = this.calculatePatientBill(patientId, admissionId, emergencyCaseId);
    if (bill.currentStay || bill.emergencyActive) throw new Error('Close the active admission or emergency case before finalizing this bill.');
    if (bill.invalidChargeIds.length) throw new Error('Fix invalid room or service charges before finalizing.');
    return this.saveBillSnapshot(bill, true);
  },

  finalizeBillAndDischarge(patientId: string, stayId: string, dischargedAt: string): Invoice {
    const activeStay = inpatientService.getActiveStays().find((stay) => stay.id === stayId && stay.patientId === patientId);
    if (!activeStay) throw new Error('This patient no longer has the selected active admission. Refresh and try again.');
    const admissionId = activeStay.admissionId;
    const { result } = inpatientService.dischargeStayWith(stayId, dischargedAt, () => this.finalizePatientBill(patientId, admissionId));
    return result;
  },

  finalizeEmergencyBill(patientId: string, emergencyCaseId: string, dischargedAt: string): Invoice {
    const emergencyCase = emergencyService.getCasesForPatient(patientId).find((item) => item.id === emergencyCaseId);
    if (!emergencyCase || !['ASSESSING', 'TREATING', 'WAITING_FOR_DOCTOR'].includes(emergencyCase.status)) {
      throw new Error('This patient no longer has the selected active emergency case.');
    }
    emergencyService.transition(emergencyCaseId, 'DISCHARGED', { dischargedAt });
    try {
      return this.finalizePatientBill(patientId, undefined, emergencyCaseId);
    } catch (error) {
      emergencyService.restoreCase(emergencyCase);
      throw error;
    }
  },

  saveBillSnapshot(bill: PatientBill, finalize: boolean): Invoice {
    const invoices = this.getInvoices();
    const related = invoices.filter((invoice) => invoice.patientId === bill.patient[0]
      && invoice.admissionId === bill.admissionId
      && invoice.encounterId === bill.encounterId
      && invoice.status !== 'CANCELLED');
    const finalized = related.find((invoice) => ['FINALIZED', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].includes(invoice.status));
    if (finalized) {
      if (!finalize) return finalized;
      return finalized;
    }
    const existing = related.find((invoice) => invoice.status === 'RUNNING' || invoice.status === 'DRAFT');
    const paidPaise = existing ? this.getPayments()
      .filter((payment) => payment.invoiceId === existing.id)
      .reduce((sum, payment) => sum + payment.amountPaise, 0) : 0;
    const totalPaise = bill.totalPaise;
    const status = !finalize
      ? bill.billingType === 'IPD' ? 'RUNNING' : 'DRAFT'
      : paidPaise >= totalPaise && totalPaise > 0
        ? 'PAID'
        : paidPaise > 0 ? 'PARTIALLY_PAID' : 'FINALIZED';
    const now = new Date().toISOString();
    const invoice: Invoice = {
      id: existing?.id ?? makeId('invoice'),
      invoiceNumber: existing?.invoiceNumber ?? `INV-${Date.now().toString().slice(-8)}`,
      patientId: bill.patient[0],
      admissionId: bill.admissionId,
      encounterId: bill.encounterId,
      billingType: bill.billingType,
      patientNameSnapshot: bill.patient[1],
      status,
      items: [...bill.roomSegments, ...bill.serviceChargeItems],
      subtotalPaise: bill.subtotalPaise,
      discountPaise: bill.discountPaise,
      taxPaise: bill.taxPaise,
      totalPaise,
      paidPaise,
      balancePaise: Math.max(0, totalPaise - paidPaise),
      createdAt: existing?.createdAt ?? now,
      finalizedAt: finalize ? now : null,
    };
    persistBillingValue(KEYS.invoices, existing
      ? invoices.map((item) => item.id === existing.id ? invoice : item)
      : [...invoices, invoice]);
    window.dispatchEvent(new CustomEvent('clinic-billing-updated'));
    return invoice;
  },

  recordPayment(params: {
    invoiceId: string;
    amountPaise: number;
    method: Payment['method'];
    paidAt: string;
    reference?: string;
    notes?: string;
    createdBy: string;
    idempotencyKey: string;
  }): Payment {
    const payments = this.getPayments();
    const existing = payments.find((payment) => payment.id === params.idempotencyKey);
    if (existing) return existing;
    const invoices = this.getInvoices();
    const invoice = invoices.find((item) => item.id === params.invoiceId);
    if (!invoice || invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      throw new Error('Only running or finalized bills can receive payments.');
    }
    if (!Number.isSafeInteger(params.amountPaise) || params.amountPaise <= 0) throw new Error('Payment amount must be greater than zero.');
    const paidAt = new Date(params.paidAt);
    if (Number.isNaN(paidAt.getTime())) throw new Error('Enter a valid payment date and time.');
    const priorPayments = payments.filter((payment) => payment.invoiceId === invoice.id).reduce((sum, payment) => sum + payment.amountPaise, 0);
    const balancePaise = invoice.totalPaise - priorPayments;
    if (params.amountPaise > balancePaise) throw new Error('Payment cannot exceed the outstanding balance.');
    const payment: Payment = {
      id: params.idempotencyKey || makeId('payment'),
      invoiceId: invoice.id,
      patientId: invoice.patientId,
      amountPaise: params.amountPaise,
      paidAt: paidAt.toISOString(),
      method: params.method,
      reference: params.reference?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      status: 'SUCCESS',
      createdBy: params.createdBy,
    };
    persistBillingValue(KEYS.payments, [...payments, payment]);
    window.dispatchEvent(new CustomEvent('clinic-billing-updated'));
    return payment;
  },
};

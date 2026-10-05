import type { WardType } from '@/types/rooms';
import type { Patient } from '@/types';
import type { AppointmentEntry } from '@/types';

export type InvoiceStatus = 'DRAFT' | 'RUNNING' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'FINALIZED' | 'CANCELLED';
export type BillingType = 'OPD' | 'EMERGENCY' | 'IPD';
export type InvoiceLineType = 'ROOM_CHARGE' | 'SERVICE_CHARGE' | 'OTHER';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
export type PatientChargeCategory =
  | 'CONSULTATION'
  | 'DOCTOR_VISIT'
  | 'PROCEDURE'
  | 'MEDICINE'
  | 'GLUCOSE_IV'
  | 'CONSUMABLE'
  | 'LAB'
  | 'DIAGNOSTIC'
  | 'INJECTION'
  | 'NURSING'
  | 'OTHER';

export interface PatientCharge {
  id: string;
  patientId: string;
  admissionId?: string;
  emergencyCaseId?: string;
  appointmentId?: string;
  category: PatientChargeCategory;
  description: string;
  quantity: number;
  unitPricePaise: number;
  amountPaise: number;
  chargeDate: string;
  source?: string;
  sourceId?: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  type: InvoiceLineType;
  description: string;
  roomStayId?: string;
  patientChargeId?: string;
  category?: PatientChargeCategory;
  source?: string;
  wardType?: WardType;
  roomNumber?: string;
  bedNumber?: string;
  startAt?: string;
  endAt?: string;
  ratePerDayPaise?: number;
  billableDays?: number;
  quantity: number;
  unitAmountPaise: number;
  totalPaise: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  admissionId?: string;
  emergencyCaseId?: string;
  encounterId?: string;
  billingType?: BillingType;
  patientNameSnapshot: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
  createdAt: string;
  finalizedAt: string | null;
}

export interface PatientBill {
  patient: Patient;
  billingType: BillingType;
  admissionId?: string;
  emergencyCaseId?: string;
  encounterId?: string;
  emergencyPriority?: string;
  emergencyStatus?: string;
  emergencyDoctorId?: string;
  emergencyActive: boolean;
  admissionAt?: string;
  dischargeAt: string | null;
  currentStay?: {
    wardType: WardType;
    roomNumber: string;
    bedNumber: string;
    startAt: string;
    ratePerDayPaise: number;
  };
  visits: AppointmentEntry[];
  roomSegments: InvoiceLineItem[];
  serviceCharges: PatientCharge[];
  serviceChargeItems: InvoiceLineItem[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
  status: InvoiceStatus;
  invalidChargeIds: string[];
  invoice?: Invoice;
}

export interface Payment {
  id: string;
  invoiceId: string;
  patientId: string;
  amountPaise: number;
  paidAt: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  status?: 'SUCCESS' | 'VOID';
  createdBy: string;
}
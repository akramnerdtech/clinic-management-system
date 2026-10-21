import { doctorsService } from '@/services/doctorsService';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

export interface AppointmentNotificationParams {
  doctorName: string;
  doctorMobile?: string;
  patientName: string;
  patientAgeSex?: string;
  date: string;
  timeSlot: string;
  roomSuite?: string;
  opdUnit?: string;
  reason?: string;
  token?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  doctorName: string;
  doctorMobile: string;
  patientName: string;
  date: string;
  timeSlot: string;
  message: string;
  status: 'sent' | 'pending';
}

const STORAGE_KEYS = {
  autoLaunch: 'curaclinic.whatsapp.autoLaunch',
  countryCode: 'curaclinic.whatsapp.countryCode',
  history: 'curaclinic.whatsapp.history',
};

/** Normalizes phone digits for wa.me/ format */
export function cleanPhoneNumber(phone: string, defaultCountry = '91'): string {
  if (!phone) return '';
  // Remove spaces, dashes, parentheses
  let digits = phone.replace(/[^0-9+]/g, '');

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.length === 10) {
    // 10 digits without country code -> attach default country code
    const cc = defaultCountry.replace(/[^0-9]/g, '') || '91';
    digits = `${cc}${digits}`;
  }

  return digits;
}

/** Formats a date string (YYYY-MM-DD or other) to a user-friendly label */
function formatNotificationDate(dateStr?: string): string {
  if (!dateStr) return 'Today';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

export const whatsappService = {
  getAutoLaunch(): boolean {
    return loadFromStorage<boolean>(STORAGE_KEYS.autoLaunch, true);
  },

  setAutoLaunch(enabled: boolean): void {
    saveToStorage(STORAGE_KEYS.autoLaunch, enabled);
  },

  getDefaultCountryCode(): string {
    return loadFromStorage<string>(STORAGE_KEYS.countryCode, '+91');
  },

  setDefaultCountryCode(code: string): void {
    saveToStorage(STORAGE_KEYS.countryCode, code);
  },

  /** Builds the human-friendly push alert message */
  formatMessage(params: AppointmentNotificationParams): string {
    const {
      doctorName,
      patientName,
      patientAgeSex,
      date,
      timeSlot,
      roomSuite,
      opdUnit,
      reason,
      token,
    } = params;

    const formattedDate = formatNotificationDate(date);
    const locationPart = roomSuite
      ? `${roomSuite}${opdUnit ? ` (${opdUnit})` : ''}`
      : 'Consultation Suite';

    return (
      `🏥 *CuraClinic — New Appointment Alert*\n\n` +
      `Dear *${doctorName}*,\n` +
      `A new patient consultation has been confirmed for your schedule:\n\n` +
      `👤 *Patient:* ${patientName}${patientAgeSex ? ` (${patientAgeSex})` : ''}\n` +
      `📅 *Date:* ${formattedDate}\n` +
      `⏰ *Time Slot:* ${timeSlot}\n` +
      `🏥 *Location:* ${locationPart}\n` +
      `📋 *Chief Complaint:* ${reason || 'Outpatient Consultation'}\n` +
      (token ? `🔖 *Token ID:* ${token}\n\n` : '\n') +
      `_Please open your CuraClinic Doctor Portal for EHR history and triage details._`
    );
  },

  /** Resolves the doctor's phone from parameters or the doctors registry */
  getDoctorPhone(doctorName: string, explicitMobile?: string): string {
    if (explicitMobile && explicitMobile.trim()) {
      return explicitMobile.trim();
    }
    return doctorsService.getDoctorMobile(doctorName);
  },

  /** Generates the wa.me deep-link */
  createWhatsAppUrl(rawPhone: string, message: string): string {
    const cleaned = cleanPhoneNumber(rawPhone, this.getDefaultCountryCode());
    const encoded = encodeURIComponent(message);
    if (!cleaned) {
      return `https://wa.me/?text=${encoded}`;
    }
    return `https://wa.me/${cleaned}?text=${encoded}`;
  },

  /** Dispatches or prepares a WhatsApp push */
  prepareNotification(params: AppointmentNotificationParams): {
    phone: string;
    cleanedPhone: string;
    message: string;
    url: string;
    hasPhone: boolean;
  } {
    const phone = this.getDoctorPhone(params.doctorName, params.doctorMobile);
    const message = this.formatMessage(params);
    const cleanedPhone = cleanPhoneNumber(phone, this.getDefaultCountryCode());
    const url = this.createWhatsAppUrl(phone, message);

    return {
      phone,
      cleanedPhone,
      message,
      url,
      hasPhone: Boolean(cleanedPhone && cleanedPhone.length >= 7),
    };
  },

  /** Logs an alert to storage history */
  logNotification(entry: Omit<NotificationLog, 'id' | 'timestamp'>): void {
    const current = loadFromStorage<NotificationLog[]>(STORAGE_KEYS.history, []);
    const logItem: NotificationLog = {
      ...entry,
      id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.history, [logItem, ...current.slice(0, 99)]);
  },

  getHistory(): NotificationLog[] {
    return loadFromStorage<NotificationLog[]>(STORAGE_KEYS.history, []);
  },

  clearHistory(): void {
    saveToStorage(STORAGE_KEYS.history, []);
  },

  /** Sends the WhatsApp alert via browser deep-link */
  openWhatsApp(url: string): Window | null {
    return window.open(url, '_blank', 'noopener,noreferrer');
  },
};

import {
  accountTabs, securityToggles,
  notificationToggles, sessions, accountDangerZone,
} from '@/data/account';
import { apiClient } from '@/config/api';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { AuthUser } from '@/utils/authStorage';
import type { ToggleSetting, SessionEntry } from '@/types';

const KEYS = {
  tabs: 'curaclinic.account.tabs',
  securityToggles: 'curaclinic.account.securityToggles',
  notificationToggles: 'curaclinic.account.notificationToggles',
  sessions: 'curaclinic.account.sessions',
  dangerZone: 'curaclinic.account.dangerZone',
};

export interface ProfileUpdate {
  fullName: string;
  phone: string;
  extension: string;
  about: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Error from the account API; `field` (when set) names the input the message belongs to. */
export class AccountApiError extends Error {
  field?: string;
  status?: number;
  constructor(message: string, field?: string, status?: number) {
    super(message);
    this.field = field;
    this.status = status;
  }
}

function toApiError(err: unknown, fallback: string): AccountApiError {
  const e = err as { response?: { status?: number; data?: { message?: string; field?: string } }; code?: string };
  if (!e?.response) {
    return new AccountApiError('Could not reach the server. Check your connection and try again.');
  }
  return new AccountApiError(e.response.data?.message || fallback, e.response.data?.field, e.response.status);
}

async function request<T>(fn: () => Promise<{ data: T }>, fallback: string): Promise<T> {
  try {
    return (await fn()).data;
  } catch (err) {
    throw toApiError(err, fallback);
  }
}

export const accountService = {
  // ---- Server-backed account data (profile, photo, password) ----
  async getMe(): Promise<AuthUser> {
    const data = await request<{ user: AuthUser }>(() => apiClient.get('/account/me'), 'Could not load your account.');
    return data.user;
  },
  async updateProfile(payload: ProfileUpdate): Promise<AuthUser> {
    const data = await request<{ user: AuthUser }>(() => apiClient.patch('/account/profile', payload), 'Could not save your profile.');
    return data.user;
  },
  async uploadAvatar(image: Blob): Promise<AuthUser> {
    const data = await request<{ user: AuthUser }>(
      () => apiClient.post('/account/avatar', image, { headers: { 'Content-Type': image.type } }),
      'Could not upload your photo.',
    );
    return data.user;
  },
  async removeAvatar(): Promise<AuthUser> {
    const data = await request<{ user: AuthUser }>(() => apiClient.delete('/account/avatar'), 'Could not remove your photo.');
    return data.user;
  },
  async changePassword(payload: PasswordChange): Promise<void> {
    await request(() => apiClient.post('/account/password', payload), 'Could not change your password.');
  },

  // ---- Preferences that are still stored in this browser ----
  getTabs() {
    return loadFromStorage<string[]>(KEYS.tabs, accountTabs).filter((tab) => !tab.includes('Active Sessions'));
  },
  getSecurityToggles(): ToggleSetting[] {
    return loadFromStorage(KEYS.securityToggles, securityToggles);
  },
  saveSecurityToggles(toggles: ToggleSetting[]): void {
    saveToStorage(KEYS.securityToggles, toggles);
  },
  getNotificationToggles(): ToggleSetting[] {
    return loadFromStorage(KEYS.notificationToggles, notificationToggles);
  },
  saveNotificationToggles(toggles: ToggleSetting[]): void {
    saveToStorage(KEYS.notificationToggles, toggles);
  },
  getSessions(): SessionEntry[] {
    return loadFromStorage(KEYS.sessions, sessions);
  },
  saveSessions(list: SessionEntry[]): void {
    saveToStorage(KEYS.sessions, list);
  },
  getDangerZone() {
    return loadFromStorage(KEYS.dangerZone, accountDangerZone);
  },
};
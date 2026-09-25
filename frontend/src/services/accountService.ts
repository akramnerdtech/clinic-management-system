import {
  accountTabs, accountAvatar, profileFields, securityToggles,
  notificationToggles, sessions, accountDangerZone,
} from '@/data/account';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import type { AccountProfileField, ToggleSetting, SessionEntry } from '@/types';

const KEYS = {
  tabs: 'curaclinic.account.tabs',
  avatar: 'curaclinic.account.avatar',
  profileFields: 'curaclinic.account.profileFields',
  securityToggles: 'curaclinic.account.securityToggles',
  notificationToggles: 'curaclinic.account.notificationToggles',
  sessions: 'curaclinic.account.sessions',
  dangerZone: 'curaclinic.account.dangerZone',
};

export const accountService = {
  getTabs() {
    return loadFromStorage(KEYS.tabs, accountTabs);
  },
  getAvatar(): string {
    return loadFromStorage(KEYS.avatar, accountAvatar);
  },
  getProfileFields(): AccountProfileField[] {
    return loadFromStorage(KEYS.profileFields, profileFields);
  },
  saveProfileFields(fields: AccountProfileField[]): void {
    saveToStorage(KEYS.profileFields, fields);
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

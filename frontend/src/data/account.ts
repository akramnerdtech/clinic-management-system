import type { AccountProfileField, ToggleSetting, SessionEntry } from '@/types';

export const accountTabs = [
  '◍ Profile & Identity',
  '⚿ Security & Password',
  '♪ Notifications',
  '▥ Active Sessions',
];

export const accountAvatar = 'https://i.pravatar.cc/120?img=47';

export const profileFields: AccountProfileField[] = [
  { label: 'FULL NAME', value: 'Sarah Jenkins' },
  { label: 'STAFF ID', value: 'REC-4092', readOnly: true },
  { label: 'ROLE / DESIGNATION', value: 'Head Receptionist', readOnly: true },
  { label: 'WORK EMAIL', value: 'sarah.jenkins@curaclinic.health' },
  { label: 'DIRECT PHONE', value: '+1 (212) 555-0142' },
  { label: 'DESK EXTENSION', value: 'Ext. 204' },
  {
    label: 'ABOUT / INTERNAL NOTE',
    value: 'Manages front-desk operations, walk-in triage routing, and daily appointment reconciliation for the Midtown East Pavilion.',
    wide: true,
  },
];

export const securityToggles: ToggleSetting[] = [
  {
    key: 'twoFactor',
    label: 'Two-Factor Authentication',
    description: 'Require a one-time verification code from your phone in addition to your password at every sign-in.',
    enabled: true,
  },
  {
    key: 'loginAlerts',
    label: 'Email Alerts on New Sign-In',
    description: 'Get notified by email whenever your account is accessed from an unrecognized device or location.',
    enabled: true,
  },
];

export const notificationToggles: ToggleSetting[] = [
  {
    key: 'emailNotifications',
    label: 'Email Notifications',
    description: 'Daily digest of appointment changes, doctor roster updates, and system announcements.',
    enabled: true,
  },
  {
    key: 'smsAlerts',
    label: 'SMS Alerts',
    description: 'Critical alerts only — urgent triage escalations and same-day schedule conflicts.',
    enabled: false,
  },
  {
    key: 'pushNotifications',
    label: 'Desktop Push Notifications',
    description: 'Real-time browser notifications while you are signed in to the front-desk console.',
    enabled: true,
  },
  {
    key: 'appointmentReminders',
    label: 'Appointment Reminder Digest',
    description: 'A rundown of the next day\u2019s bookings delivered each evening at 6:00 PM.',
    enabled: true,
  },
];

export const sessions: SessionEntry[] = [
  { id: 'sess-1', device: 'Chrome on Windows · Front Desk Kiosk', location: 'Midtown East Pavilion, NY', lastActive: 'Active now', current: true },
  { id: 'sess-2', device: 'Safari on iPhone 15', location: 'New York, NY', lastActive: '2 hours ago' },
  { id: 'sess-3', device: 'Chrome on MacBook Pro', location: 'Brooklyn, NY', lastActive: 'Yesterday, 6:48 PM' },
];

export const accountDangerZone = {
  description: 'Deactivating your account revokes console access immediately and reassigns your pending front-desk queue to the on-duty receptionist.',
  actionLabel: 'Deactivate My Account',
};

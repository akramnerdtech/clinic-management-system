import { useState } from 'react';
import { accountService } from '@/services/accountService';
import { useToast } from '@/utils/toast';

export function useAccountSettings() {
  const [tabs] = useState(() => accountService.getTabs());
  const [avatar] = useState(() => accountService.getAvatar());
  const [profileFields, setProfileFields] = useState(() => accountService.getProfileFields());
  const [securityToggles, setSecurityToggles] = useState(() => accountService.getSecurityToggles());
  const [notificationToggles, setNotificationToggles] = useState(() => accountService.getNotificationToggles());
  const [sessions, setSessions] = useState(() => accountService.getSessions());
  const [dangerZone] = useState(() => accountService.getDangerZone());
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();

  const updateProfileField = (index: number, value: string) => {
    setProfileFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  };

  const toggleSecurity = (key: string) => {
    setSecurityToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
  };

  const toggleNotification = (key: string) => {
    setNotificationToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
  };

  const revokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.info('Session revoked.');
  };

  const signOutOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.current));
    toast.success('All other sessions have been signed out.');
  };

  const saveChanges = () => {
    accountService.saveProfileFields(profileFields);
    accountService.saveSecurityToggles(securityToggles);
    accountService.saveNotificationToggles(notificationToggles);
    accountService.saveSessions(sessions);
    setStatus('Account settings saved.');
    toast.success('Account settings saved.');
  };

  const discardChanges = () => {
    setProfileFields(accountService.getProfileFields());
    setSecurityToggles(accountService.getSecurityToggles());
    setNotificationToggles(accountService.getNotificationToggles());
    setSessions(accountService.getSessions());
    setStatus('Changes discarded.');
    toast.info('Changes discarded.');
  };

  const deactivateAccount = () => {
    toast.info('Account deactivation requires admin confirmation — not available in this demo.');
  };

  return {
    tabs,
    avatar,
    profileFields, updateProfileField,
    securityToggles, toggleSecurity,
    notificationToggles, toggleNotification,
    sessions, revokeSession, signOutOtherSessions,
    dangerZone, deactivateAccount,
    status, saveChanges, discardChanges,
  };
}

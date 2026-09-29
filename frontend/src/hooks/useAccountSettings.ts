import { useState } from 'react';
import { accountService } from '@/services/accountService';
import { accountAvatar } from '@/data/account';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/utils/toast';

export function useAccountSettings() {
  const { user } = useAuth();
  const getInitialProfileFields = () => {
    const savedFields = accountService.getProfileFields();
    const fullNameField = savedFields.findIndex((field) => field.label === 'FULL NAME');
    if (user?.fullName && fullNameField >= 0) {
      return savedFields.map((field, index) => index === fullNameField
        ? { ...field, value: user.fullName, readOnly: true }
        : field);
    }
    return savedFields;
  };
  const [tabs] = useState(() => accountService.getTabs());
  const [avatar, setAvatar] = useState(() => accountService.getAvatar());
  const [profileFields, setProfileFields] = useState(getInitialProfileFields);
  const [securityToggles, setSecurityToggles] = useState(() => accountService.getSecurityToggles());
  const [notificationToggles, setNotificationToggles] = useState(() => accountService.getNotificationToggles());
  const [dangerZone] = useState(() => accountService.getDangerZone());
  const [status, setStatus] = useState<string | null>(null);
  const toast = useToast();

  const updateProfileField = (index: number, value: string) => {
    setProfileFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  };

  const changeAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file for your profile photo.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Choose an image smaller than 8 MB.');
      return;
    }

    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not process this image.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const resized = canvas.toDataURL('image/jpeg', 0.82);
      accountService.saveAvatar(resized);
      setAvatar(resized);
      toast.success('Profile photo updated.');
    } catch {
      toast.error('This photo could not be loaded. Try another image.');
    }
  };

  const removeAvatar = () => {
    accountService.saveAvatar(accountAvatar);
    setAvatar(accountAvatar);
    toast.success('Profile photo reset.');
  };

  const toggleSecurity = (key: string) => {
    setSecurityToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
  };

  const toggleNotification = (key: string) => {
    setNotificationToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
  };

  const saveChanges = () => {
    accountService.saveProfileFields(profileFields);
    accountService.saveSecurityToggles(securityToggles);
    accountService.saveNotificationToggles(notificationToggles);
    setStatus('Account settings saved.');
    toast.success('Account settings saved.');
  };

  const discardChanges = () => {
    setProfileFields(getInitialProfileFields());
    setSecurityToggles(accountService.getSecurityToggles());
    setNotificationToggles(accountService.getNotificationToggles());
    setStatus('Changes discarded.');
    toast.info('Changes discarded.');
  };

  const deactivateAccount = () => {
    toast.info('Account deactivation requires admin confirmation — not available in this demo.');
  };

  return {
    tabs,
    avatar,
    profileFields, updateProfileField, changeAvatar, removeAvatar,
    securityToggles, toggleSecurity,
    notificationToggles, toggleNotification,
    dangerZone, deactivateAccount,
    status, saveChanges, discardChanges,
  };
}

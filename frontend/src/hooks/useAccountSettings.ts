import { useEffect, useMemo, useRef, useState } from 'react';
import { accountService } from '@/services/accountService';
import type { ProfileUpdate } from '@/services/accountService';
import { accountAvatar, profileFields as profileFieldTemplate } from '@/data/account';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/utils/toast';
import type { AccountProfileField } from '@/types';

type EditableKey = keyof ProfileUpdate;

/** Which backend field each editable form field maps to. Everything else is read-only. */
const FIELD_KEYS: Record<string, EditableKey> = {
  'FULL NAME': 'fullName',
  'DIRECT PHONE': 'phone',
  'DESK EXTENSION': 'extension',
  'ABOUT / INTERNAL NOTE': 'about',
};

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024;
const PHONE_RE = /^[0-9+()\-.\s]{5,30}$/;

type PendingAvatar = { kind: 'upload'; blob: Blob; previewUrl: string } | { kind: 'remove' } | null;

/** Downscales to max 512px and re-encodes as JPEG (also strips metadata) so uploads stay small. */
async function prepareAvatarImage(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process this image.');
  context.fillStyle = '#ffffff'; // flatten transparency (PNG/WebP) for JPEG output
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Could not process this image.');
  return blob;
}

export function useAccountSettings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [tabs] = useState(() => accountService.getTabs());
  const [dangerZone] = useState(() => accountService.getDangerZone());

  // ---- Profile: server-saved values + local, unsaved edits ----
  const saved = useMemo<ProfileUpdate>(() => ({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    extension: user?.extension ?? '',
    about: user?.about ?? '',
  }), [user?.fullName, user?.phone, user?.extension, user?.about]);

  const [edits, setEdits] = useState<Partial<ProfileUpdate>>({});
  const draft: ProfileUpdate = { ...saved, ...edits };
  const profileDirty = (Object.keys(edits) as EditableKey[]).some((k) => edits[k] !== saved[k]);

  const profileFields = useMemo<AccountProfileField[]>(() => profileFieldTemplate.map((f) => {
    const key = FIELD_KEYS[f.label];
    if (key) return { ...f, value: draft[key], readOnly: false };
    if (f.label === 'WORK EMAIL') return { ...f, value: user?.email ?? f.value, readOnly: true }; // login identity — not editable
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [draft.fullName, draft.phone, draft.extension, draft.about, user?.email]);

  const updateProfileField = (index: number, value: string) => {
    const key = FIELD_KEYS[profileFieldTemplate[index]?.label];
    if (key) setEdits((prev) => ({ ...prev, [key]: value }));
  };

  // ---- Browser-only preference toggles (unchanged behaviour, now explicit-save) ----
  const [savedSecurity, setSavedSecurity] = useState(() => accountService.getSecurityToggles());
  const [savedNotifications, setSavedNotifications] = useState(() => accountService.getNotificationToggles());
  const [securityToggles, setSecurityToggles] = useState(savedSecurity);
  const [notificationToggles, setNotificationToggles] = useState(savedNotifications);
  const togglesDirty =
    JSON.stringify(securityToggles) !== JSON.stringify(savedSecurity) ||
    JSON.stringify(notificationToggles) !== JSON.stringify(savedNotifications);

  const toggleSecurity = (key: string) => setSecurityToggles((p) => p.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
  const toggleNotification = (key: string) => setNotificationToggles((p) => p.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous guard against duplicate requests
  const dirty = profileDirty || togglesDirty;

  const saveChanges = async () => {
    if (savingRef.current || !dirty) return;

    if (profileDirty) {
      const next = { fullName: draft.fullName.trim(), phone: draft.phone.trim(), extension: draft.extension.trim(), about: draft.about.trim() };
      if (!next.fullName) { toast.error('Full name is required.'); return; }
      if (next.phone && !PHONE_RE.test(next.phone)) { toast.error('Enter a valid phone number.'); return; }
    }

    savingRef.current = true;
    setSaving(true);
    try {
      if (profileDirty) {
        const updated = await accountService.updateProfile({
          fullName: draft.fullName.trim(),
          phone: draft.phone.trim(),
          extension: draft.extension.trim(),
          about: draft.about.trim(),
        });
        updateUser(updated); // sidebar, dashboard greeting, etc. update immediately
        setEdits({});
      }
      if (togglesDirty) {
        accountService.saveSecurityToggles(securityToggles);
        accountService.saveNotificationToggles(notificationToggles);
        setSavedSecurity(securityToggles);
        setSavedNotifications(notificationToggles);
      }
      toast.success('Account settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your changes.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // ---- Profile photo: preview locally, persist only on Save ----
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarSavingRef = useRef(false);
  const previewRef = useRef<string | null>(null);

  const discardPreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  };
  useEffect(() => discardPreview, []);

  const savedAvatar = user?.avatarUrl || accountAvatar;
  const avatar = pendingAvatar?.kind === 'upload' ? pendingAvatar.previewUrl : pendingAvatar?.kind === 'remove' ? accountAvatar : savedAvatar;
  const avatarDirty = pendingAvatar !== null;

  const changeAvatar = async (file: File) => {
    if (avatarSavingRef.current) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > AVATAR_MAX_INPUT_BYTES) {
      toast.error('Choose an image smaller than 5 MB.');
      return;
    }
    try {
      const blob = await prepareAvatarImage(file);
      discardPreview();
      const previewUrl = URL.createObjectURL(blob);
      previewRef.current = previewUrl;
      setPendingAvatar({ kind: 'upload', blob, previewUrl });
    } catch {
      toast.error('This photo could not be loaded. Try another image.');
    }
  };

  const removeAvatar = () => {
    if (avatarSavingRef.current) return;
    if (!user?.avatarUrl && pendingAvatar?.kind !== 'upload') {
      toast.info('You are already using the default photo.');
      return;
    }
    discardPreview();
    setPendingAvatar(user?.avatarUrl ? { kind: 'remove' } : null);
  };

  const cancelAvatar = () => {
    if (avatarSavingRef.current) return;
    discardPreview();
    setPendingAvatar(null);
  };

  const saveAvatar = async () => {
    if (avatarSavingRef.current || !pendingAvatar) return;
    avatarSavingRef.current = true;
    setAvatarSaving(true);
    try {
      const updated = pendingAvatar.kind === 'upload'
        ? await accountService.uploadAvatar(pendingAvatar.blob)
        : await accountService.removeAvatar();
      updateUser(updated);
      discardPreview();
      setPendingAvatar(null);
      toast.success(pendingAvatar.kind === 'upload' ? 'Profile photo updated.' : 'Profile photo removed.');
    } catch (err) {
      // The saved photo is untouched; the preview stays so the user can retry or cancel.
      toast.error(err instanceof Error ? err.message : 'Could not save your photo.');
    } finally {
      avatarSavingRef.current = false;
      setAvatarSaving(false);
    }
  };

  const discardChanges = () => {
    if (savingRef.current) return;
    setEdits({});
    setSecurityToggles(savedSecurity);
    setNotificationToggles(savedNotifications);
    cancelAvatar();
    toast.info('Changes discarded.');
  };

  // Refresh from the server on open so the page always shows what is really saved.
  const updateUserRef = useRef(updateUser);
  updateUserRef.current = updateUser;
  useEffect(() => {
    let active = true;
    accountService.getMe().then((fresh) => { if (active) updateUserRef.current(fresh); }).catch(() => { /* cached session data stays; 401s are handled globally */ });
    return () => { active = false; };
  }, []);

  // Warn before closing/refreshing the tab with unsaved edits (they are never persisted).
  const anyUnsaved = dirty || avatarDirty;
  useEffect(() => {
    if (!anyUnsaved) return undefined;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyUnsaved]);

  const deactivateAccount = () => {
    toast.info('Account deactivation requires admin confirmation — not available in this demo.');
  };

  return {
    tabs,
    avatar, avatarDirty, avatarSaving, saveAvatar, cancelAvatar,
    profileFields, updateProfileField, changeAvatar, removeAvatar,
    securityToggles, toggleSecurity,
    notificationToggles, toggleNotification,
    dangerZone, deactivateAccount,
    dirty, anyUnsaved, saving, saveChanges, discardChanges,
  };
}
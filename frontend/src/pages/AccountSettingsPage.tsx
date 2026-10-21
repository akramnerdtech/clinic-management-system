import { CheckCircle2, ShieldAlert, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { AccountProfileCard } from '@/components/settings/AccountProfileCard';
import { ThemeToggleCard } from '@/components/settings/ThemeToggleCard';
import { SecurityCard } from '@/components/settings/SecurityCard';
import { NotificationPreferencesCard } from '@/components/settings/NotificationPreferencesCard';
import { useAccountSettings } from '@/hooks/useAccountSettings';
import { downloadCsv } from '@/utils/exportFile';
import { useToast } from '@/utils/toast';

export function AccountSettingsPage() {
  const {
    tabs, avatar, avatarDirty, avatarSaving, saveAvatar, cancelAvatar,
    profileFields, updateProfileField, changeAvatar, removeAvatar,
    securityToggles, toggleSecurity,
    notificationToggles, toggleNotification,
    dangerZone, deactivateAccount,
    dirty, anyUnsaved, saving, saveChanges, discardChanges,
  } = useAccountSettings();

  const toast = useToast();

  const handleExportAccountData = () => {
    downloadCsv(
      'curaclinic-account-profile',
      ['Field', 'Value'],
      profileFields.map((f) => [f.label, f.value || 'Not provided']),
    );
    toast.success('Account profile data exported.');
  };

  return (
    <>
      <PageHeader
        eyebrow="MY ACCOUNT / PERSONAL PREFERENCES"
        title="Account Settings"
        description="Manage your profile, theme mode, security, and notification preferences."
        actions={<>
          <span className="autosaved"><i /> {saving ? 'Saving…' : anyUnsaved ? 'Unsaved changes' : 'All changes saved'}</span>
          <IconButton className="white-button" onClick={handleExportAccountData}>
            <Download size={14} /> Export Profile
          </IconButton>
          <IconButton className="white-button" disabled={saving || !anyUnsaved} onClick={discardChanges}>Discard Changes</IconButton>
          <IconButton className="teal-button" disabled={saving || !dirty} onClick={saveChanges}>{saving ? 'Saving…' : <><CheckCircle2 size={14} /> Save Changes</>}</IconButton>
        </>}
      />
      <div className="settings-tabs">
        {tabs.map((t, i) => (i === 0 ? <b key={t}>{t}</b> : <span key={t}>{t}</span>))}
      </div>
      <div className="account-settings-layout">
        <div>
          <ThemeToggleCard />
          <AccountProfileCard
            avatar={avatar}
            avatarDirty={avatarDirty}
            avatarSaving={avatarSaving}
            onSaveAvatar={saveAvatar}
            onCancelAvatar={cancelAvatar}
            profileFields={profileFields}
            onChangeField={updateProfileField}
            onChangeAvatar={changeAvatar}
            onRemoveAvatar={removeAvatar}
          />
          <SecurityCard toggles={securityToggles} onToggle={toggleSecurity} />
          <NotificationPreferencesCard toggles={notificationToggles} onToggle={toggleNotification} />
          <section className="content-card rail-card danger-card">
            <h2><ShieldAlert size={15} /> Danger Zone</h2>
            <div className="danger-box">
              <b>⚠ Deactivate Account</b>
              <p>{dangerZone.description}</p>
              <strong role="button" tabIndex={0} onClick={deactivateAccount}>{dangerZone.actionLabel}</strong>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
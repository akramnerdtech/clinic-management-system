import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { AccountProfileCard } from '@/components/settings/AccountProfileCard';
import { SecurityCard } from '@/components/settings/SecurityCard';
import { NotificationPreferencesCard } from '@/components/settings/NotificationPreferencesCard';
import { SessionsCard } from '@/components/settings/SessionsCard';
import { useAccountSettings } from '@/hooks/useAccountSettings';

export function AccountSettingsPage() {
  const {
    tabs, avatar,
    profileFields, updateProfileField,
    securityToggles, toggleSecurity,
    notificationToggles, toggleNotification,
    sessions, revokeSession, signOutOtherSessions,
    dangerZone, deactivateAccount,
    status, saveChanges, discardChanges,
  } = useAccountSettings();

  return (
    <>
      <PageHeader
        eyebrow="MY ACCOUNT / PERSONAL PREFERENCES"
        title="Account Settings"
        description="Manage your profile, password, notification preferences, and active sign-ins for this CuraClinic console."
        actions={<>
          <span className="autosaved"><i /> {status ?? 'Autosaved 2 mins ago'}</span>
          <IconButton className="white-button" onClick={discardChanges}>Discard Changes</IconButton>
          <IconButton className="teal-button" onClick={saveChanges}><CheckCircle2 size={14} /> Save Changes</IconButton>
        </>}
      />
      <div className="settings-tabs">
        {tabs.map((t, i) => (i === 0 ? <b key={t}>{t}</b> : <span key={t}>{t}</span>))}
      </div>
      <div className="settings-layout">
        <div>
          <AccountProfileCard avatar={avatar} profileFields={profileFields} onChangeField={updateProfileField} />
          <SecurityCard toggles={securityToggles} onToggle={toggleSecurity} />
          <NotificationPreferencesCard toggles={notificationToggles} onToggle={toggleNotification} />
        </div>
        <div className="settings-rail">
          <SessionsCard sessions={sessions} onRevoke={revokeSession} onSignOutOthers={signOutOtherSessions} />
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

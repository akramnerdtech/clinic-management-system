import { useState } from 'react';
import type { ToggleSetting } from '@/types';
import { Field } from './Field';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/utils/toast';

interface Props {
  toggles: ToggleSetting[];
  onToggle: (key: string) => void;
}

export function SecurityCard({ toggles, onToggle }: Props) {
  const [passwordFields, setPasswordFields] = useState({ current: '', next: '', confirm: '' });
  const toast = useToast();

  const updatePasswordField = (key: keyof typeof passwordFields, value: string) => {
    setPasswordFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdatePassword = () => {
    if (!passwordFields.current || !passwordFields.next || !passwordFields.confirm) {
      toast.error('Fill in all three password fields.');
      return;
    }
    if (passwordFields.next !== passwordFields.confirm) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    toast.success('Password updated.');
    setPasswordFields({ current: '', next: '', confirm: '' });
  };

  return (
    <section className="content-card security-card">
      <h2>⚿ Security & Password</h2>
      <p>Update your sign-in password and manage account-level protection.</p>
      <div className="form-grid">
        <Field type="password" label="CURRENT PASSWORD" value={passwordFields.current} onChange={(v) => updatePasswordField('current', v)} />
        <Field type="password" label="NEW PASSWORD" value={passwordFields.next} onChange={(v) => updatePasswordField('next', v)} />
        <Field type="password" label="CONFIRM NEW PASSWORD" value={passwordFields.confirm} onChange={(v) => updatePasswordField('confirm', v)} wide />
      </div>
      <IconButton className="teal-button update-password-btn" onClick={handleUpdatePassword}>Update Password</IconButton>
      <div className="toggle-list">
        {toggles.map((t) => (
          <article key={t.key}>
            <div>
              <b>{t.label}</b>
              <p>{t.description}</p>
            </div>
            <button
              type="button"
              className={`toggle-switch ${t.enabled ? 'on' : ''}`}
              onClick={() => onToggle(t.key)}
              aria-label={`Toggle ${t.label}`}
            >
              {t.enabled ? 'ON' : 'OFF'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

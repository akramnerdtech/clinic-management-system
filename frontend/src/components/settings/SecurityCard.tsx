import { useRef, useState } from 'react';
import type { ToggleSetting } from '@/types';
import { Field } from './Field';
import { IconButton } from '@/components/ui/IconButton';
import { accountService, AccountApiError } from '@/services/accountService';
import { useToast } from '@/utils/toast';

interface Props {
  toggles: ToggleSetting[];
  onToggle: (key: string) => void;
}

type PasswordKey = 'current' | 'next' | 'confirm';
const EMPTY = { current: '', next: '', confirm: '' };
const SERVER_FIELD: Record<string, PasswordKey> = { currentPassword: 'current', newPassword: 'next', confirmPassword: 'confirm' };

function validate(f: typeof EMPTY): Partial<Record<PasswordKey, string>> {
  const errors: Partial<Record<PasswordKey, string>> = {};
  if (!f.current) errors.current = 'Enter your current password.';
  if (!f.next) errors.next = 'Enter a new password.';
  else if (f.next.length < 8) errors.next = 'Password must be at least 8 characters.';
  else if (new TextEncoder().encode(f.next).length > 72) errors.next = 'Password must be at most 72 characters.';
  else if (f.current && f.next === f.current) errors.next = 'New password must be different from your current password.';
  if (!f.confirm) errors.confirm = 'Confirm your new password.';
  else if (f.next !== f.confirm) errors.confirm = 'Passwords do not match.';
  return errors;
}

export function SecurityCard({ toggles, onToggle }: Props) {
  const [passwordFields, setPasswordFields] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<PasswordKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const toast = useToast();

  const updatePasswordField = (key: PasswordKey, value: string) => {
    setPasswordFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, ...(key === 'next' || key === 'confirm' ? { confirm: undefined } : {}) }));
  };

  const hasInput = !!(passwordFields.current || passwordFields.next || passwordFields.confirm);
  // Live feedback for the one mismatch case the user can see while typing.
  const liveMismatch = passwordFields.confirm && passwordFields.next !== passwordFields.confirm ? 'Passwords do not match.' : undefined;

  const handleUpdatePassword = async () => {
    if (submittingRef.current) return;
    const found = validate(passwordFields);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await accountService.changePassword({
        currentPassword: passwordFields.current,
        newPassword: passwordFields.next,
        confirmPassword: passwordFields.confirm,
      });
      toast.success('Password changed successfully.');
      setPasswordFields(EMPTY);
      setErrors({});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not change your password.';
      const field = err instanceof AccountApiError && err.field ? SERVER_FIELD[err.field] : undefined;
      if (field) setErrors({ [field]: message });
      else toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section className="content-card security-card">
      <h2>⚿ Security & Password</h2>
      <p>Update your sign-in password and manage account-level protection.</p>
      <div className="form-grid">
        <Field type="password" label="CURRENT PASSWORD" autoComplete="current-password" value={passwordFields.current} error={errors.current} disabled={submitting} onChange={(v) => updatePasswordField('current', v)} />
        <Field type="password" label="NEW PASSWORD" autoComplete="new-password" value={passwordFields.next} error={errors.next} disabled={submitting} onChange={(v) => updatePasswordField('next', v)} />
        <Field type="password" label="CONFIRM NEW PASSWORD" autoComplete="new-password" value={passwordFields.confirm} error={errors.confirm ?? liveMismatch} disabled={submitting} onChange={(v) => updatePasswordField('confirm', v)} wide />
      </div>
      <IconButton className="teal-button update-password-btn" disabled={submitting || !hasInput || !!liveMismatch} onClick={handleUpdatePassword}>
        {submitting ? 'Changing…' : 'Change Password'}
      </IconButton>
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
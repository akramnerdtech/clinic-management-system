import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OtpInput } from '@/components/auth/OtpInput';
import { authService } from '@/services/authService';
import { useToast } from '@/utils/toast';

type Step = 'details' | 'otp' | 'password';

// Must match backend/src/utils/passwordPolicy.js (the backend is the source of truth).
const PASSWORD_MIN_LENGTH = 8;

export function SignupPage() {
  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  // Step 1 — Full Name + Email → email a verification code (account is NOT created yet).
  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await authService.requestSignupOtp(fullName.trim(), email.trim());
      setOtp('');
      setStep('otp');
      toast.success('Verification code sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify the emailed code.
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const token = await authService.verifySignupOtp(email.trim(), otp);
      setSignupToken(token);
      setStep('password');
      toast.success('Email verified. Now set your password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.requestSignupOtp(fullName.trim(), email.trim());
      toast.info('A new code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — set password → account is created → on to Login.
  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.setPassword(signupToken, password, confirmPassword);
      setDone(true);
      toast.success('Account created. You can now log in.');
      window.setTimeout(() => navigate('/login', { state: { prefillEmail: email.trim() } }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <AuthLayout>
        <button className="auth-back-row" onClick={() => { setError(''); setStep('details'); }}>
          <ArrowLeft size={13} /> Back
        </button>
        <h2>Enter verification code</h2>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in a few minutes.
        </p>

        {error && (
          <div className="auth-error">
            <ShieldCheck size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleVerifyOtp}>
          <OtpInput value={otp} onChange={setOtp} />
          <div className="auth-otp-meta">
            <span>Didn&apos;t get it?</span>
            <button type="button" className="auth-secondary-link" onClick={handleResend} disabled={loading}>
              Resend code
            </button>
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Verify &amp; continue
          </button>
        </form>
      </AuthLayout>
    );
  }

  if (step === 'password') {
    return (
      <AuthLayout>
        <button
          className="auth-back-row"
          disabled={done}
          onClick={() => {
            setError('');
            setPassword('');
            setConfirmPassword('');
            setSignupToken('');
            setStep('details');
          }}
        >
          <ArrowLeft size={13} /> Start over
        </button>
        <h2>Set your password</h2>
        <p className="auth-subtitle">
          Your email is verified. Choose a password of at least {PASSWORD_MIN_LENGTH} characters to finish creating your account.
        </p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {done && (
          <div className="auth-success">
            <CheckCircle2 size={14} /> Account created — redirecting you to log in…
          </div>
        )}

        <form onSubmit={handleSetPassword}>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button className="auth-submit" type="submit" disabled={loading || done}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Create account
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2>Create your account</h2>
      <p className="auth-subtitle">Sign up with your name and email — we&apos;ll verify it with a one-time code.</p>

      {error && (
        <div className="auth-error">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleDetailsSubmit}>
        <label className="auth-field">
          <span>Full name</span>
          <input
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Create account
        </button>
      </form>

      <p className="auth-footnote">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OtpInput } from '@/components/auth/OtpInput';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/utils/toast';

type Step = 'email' | 'otp';

export function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await authService.requestOtp(email.trim());
      setStep('otp');
      toast.success('Verification code sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const session = await authService.verifyOtp(email.trim(), otp);
      login(session);
      toast.success(`Welcome back, ${session.user.fullName || session.user.email}.`);
      navigate(redirectTo, { replace: true });
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
      await authService.requestOtp(email.trim());
      toast.info('A new code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <AuthLayout>
        <button className="auth-back-row" onClick={() => setStep('email')}>
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
            Verify &amp; log in
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2>Welcome back</h2>
      <p className="auth-subtitle">Log in with your email to continue to CuraClinic.</p>

      {error && (
        <div className="auth-error">
          <Mail size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleRequestOtp}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </label>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          Send verification code
        </button>
      </form>

      <p className="auth-footnote">
        New to CuraClinic? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { authService } from '@/services/authService';
import { useToast } from '@/utils/toast';

export function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
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
      await authService.signup(fullName.trim(), email.trim());
      setDone(true);
      toast.success('Account created. You can now log in.');
      window.setTimeout(() => navigate('/login', { state: { prefillEmail: email.trim() } }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Create your account</h2>
      <p className="auth-subtitle">Sign up with your name and email — no password needed.</p>

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

      <form onSubmit={handleSubmit}>
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
        <button className="auth-submit" type="submit" disabled={loading || done}>
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

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogIn, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/utils/toast";

export function LoginPage() {
  const location = useLocation();
  const locationState = location.state as {
    from?: { pathname?: string };
    prefillEmail?: string;
  } | null;
  const redirectTo = locationState?.from?.pathname || "/";

  // Signup redirects here with the email the user just registered.
  const [email, setEmail] = useState(locationState?.prefillEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    try {
      const session = await authService.login(email.trim(), password);
      login(session);
      toast.success(
        `Welcome back, ${session.user.fullName || session.user.email}.`,
      );
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Welcome back</h2>
      <p className="auth-subtitle">
        Log in with your email and password to continue to CuraClinic.
      </p>

      {error && (
        <div className="auth-error">
          <Mail size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus={!email}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={!!email}
            autoComplete="current-password"
          />
        </label>
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogIn size={14} />
          )}
          Log in
        </button>
      </form>

      <p className="auth-footnote">
        New to CuraClinic? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

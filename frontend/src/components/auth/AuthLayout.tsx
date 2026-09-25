import type { ReactNode } from 'react';
import { HeartPulse, ShieldCheck, Clock3, Users } from 'lucide-react';
import '@/styles/auth.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <aside className="auth-brand-pane">
        <div className="auth-brand-mark">
          <div className="auth-brand-icon">
            <HeartPulse size={16} />
          </div>
          <div>
            <strong>CuraClinic</strong>
            <span>Central Clinic &amp; Specialty Suites</span>
          </div>
        </div>

        <div className="auth-brand-copy">
          <h1>Run your clinic from one calm workspace.</h1>
          <p>
            Appointments, patients, doctors and daily operations — all in one place, built for
            front-desk teams who need things to just work.
          </p>
          <div className="auth-brand-points">
            <div className="auth-brand-point">
              <span><Clock3 size={11} /></span>
              Real-time scheduling across every suite
            </div>
            <div className="auth-brand-point">
              <span><Users size={11} /></span>
              A single, organized view of every patient
            </div>
            <div className="auth-brand-point">
              <span><ShieldCheck size={11} /></span>
              Secure sign-in, verified by email
            </div>
          </div>
        </div>

        <p className="auth-brand-foot">© {new Date().getFullYear()} CuraClinic. All rights reserved.</p>
      </aside>

      <section className="auth-form-pane">
        <div className="auth-form-card">
          <div className="auth-form-mobile-brand">
            <div className="auth-brand-icon">
              <HeartPulse size={13} />
            </div>
            <strong>CuraClinic</strong>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

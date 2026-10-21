import { useEffect, useState } from 'react';
import { Sun, Moon, Check, Sparkles } from 'lucide-react';
import { getStoredTheme, setStoredTheme, type Theme } from '@/utils/theme';
import { useToast } from '@/utils/toast';

export function ThemeToggleCard() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getStoredTheme());
  const toast = useToast();

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: Theme }>;
      if (customEvent.detail?.theme) {
        setCurrentTheme(customEvent.detail.theme);
      } else {
        setCurrentTheme(getStoredTheme());
      }
    };

    window.addEventListener('clinic-theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    return () => {
      window.removeEventListener('clinic-theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const handleSelect = (theme: Theme) => {
    if (theme === currentTheme) return;
    setStoredTheme(theme);
    setCurrentTheme(theme);
    toast.success(`Theme switched to ${theme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`);
  };

  return (
    <section className="content-card rail-card theme-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: '#007d72' }} />
            Interface Theme & Appearance
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted, #687285)' }}>
            Switch between Daylight Light Mode and Midnight Dark Mode. Preference is saved to your account.
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 12,
            background: currentTheme === 'dark' ? '#1e293b' : '#f0fdfa',
            color: currentTheme === 'dark' ? '#38bdf8' : '#007d72',
            border: currentTheme === 'dark' ? '1px solid #334155' : '1px solid #99f6e4',
          }}
        >
          {currentTheme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {/* Light Mode Option Card */}
        <button
          type="button"
          onClick={() => handleSelect('light')}
          style={{
            position: 'relative',
            textAlign: 'left',
            padding: 16,
            borderRadius: 10,
            border: currentTheme === 'light' ? '2px solid #007d72' : currentTheme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            background: currentTheme === 'light' ? '#f0fdfa' : currentTheme === 'dark' ? '#1e293b' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentTheme === 'light' ? '0 4px 12px rgba(0, 125, 114, 0.12)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: currentTheme === 'dark' ? '#78350f' : '#fef3c7',
                  color: currentTheme === 'dark' ? '#fbbf24' : '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sun size={17} />
              </div>
              <div>
                <b style={{ fontSize: 13, color: currentTheme === 'dark' ? '#f8fafc' : '#182236', display: 'block' }}>Light Mode</b>
                <small style={{ fontSize: 10, color: currentTheme === 'dark' ? '#94a3b8' : '#687285' }}>Daylight Clinical High-Contrast</small>
              </div>
            </div>
            {currentTheme === 'light' && (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#007d72',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={13} />
              </span>
            )}
          </div>

          {/* Mini Preview Box */}
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: currentTheme === 'dark' ? '#0f172a' : '#f8fafc',
              border: currentTheme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#007d72' }} />
              <div style={{ width: 60, height: 8, borderRadius: 2, background: currentTheme === 'dark' ? '#475569' : '#cbd5e1' }} />
            </div>
            <div style={{ width: '85%', height: 6, borderRadius: 2, background: currentTheme === 'dark' ? '#334155' : '#e2e8f0' }} />
            <div style={{ width: '60%', height: 6, borderRadius: 2, background: currentTheme === 'dark' ? '#334155' : '#e2e8f0' }} />
          </div>

          <p style={{ margin: '10px 0 0 0', fontSize: 11, color: currentTheme === 'dark' ? '#94a3b8' : '#687285', lineHeight: 1.4 }}>
            Crisp white surfaces and hospital teal accents. Ideal for well-lit clinical desks and day consultations.
          </p>
        </button>

        {/* Dark Mode Option Card */}
        <button
          type="button"
          onClick={() => handleSelect('dark')}
          style={{
            position: 'relative',
            textAlign: 'left',
            padding: 16,
            borderRadius: 10,
            border: currentTheme === 'dark' ? '2px solid #38bdf8' : '1px solid var(--border-color, #e2e8f0)',
            background: currentTheme === 'dark' ? '#0f172a' : 'var(--card-bg, #ffffff)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: currentTheme === 'dark' ? '0 4px 14px rgba(56, 189, 248, 0.16)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1e293b',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Moon size={17} />
              </div>
              <div>
                <b style={{ fontSize: 13, color: currentTheme === 'dark' ? '#f8fafc' : '#182236', display: 'block' }}>
                  Dark Mode
                </b>
                <small style={{ fontSize: 10, color: currentTheme === 'dark' ? '#94a3b8' : '#687285' }}>
                  Midnight Deep Slate & Neon Cyan
                </small>
              </div>
            </div>
            {currentTheme === 'dark' && (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#38bdf8',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={13} />
              </span>
            )}
          </div>

          {/* Mini Preview Box */}
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: '#090d16',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#38bdf8' }} />
              <div style={{ width: 60, height: 8, borderRadius: 2, background: '#334155' }} />
            </div>
            <div style={{ width: '85%', height: 6, borderRadius: 2, background: '#1e293b' }} />
            <div style={{ width: '60%', height: 6, borderRadius: 2, background: '#1e293b' }} />
          </div>

          <p
            style={{
              margin: '10px 0 0 0',
              fontSize: 11,
              color: currentTheme === 'dark' ? '#94a3b8' : '#687285',
              lineHeight: 1.4,
            }}
          >
            Deep slate background with reduced glare. Tailored for night-shift rounds, emergency triage, and long hours.
          </p>
        </button>
      </div>
    </section>
  );
}

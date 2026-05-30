'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', inviteToken: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">⚽</span>
          Predictor
        </div>
        <h1 className="auth-title">Join the League</h1>
        <p className="auth-subtitle">Create your account with an invite code</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="toast-error" style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="inviteToken">Invite Code</label>
            <input id="inviteToken" className="input" type="text" placeholder="Enter your invite code"
              value={form.inviteToken} onChange={(e) => updateField('inviteToken', e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="displayName">Display Name</label>
            <input id="displayName" className="input" type="text" placeholder="How friends will see you"
              value={form.displayName} onChange={(e) => updateField('displayName', e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" className="input" type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => updateField('email', e.target.value)} required autoComplete="email" />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" className="input" type="password" placeholder="Min 8 characters"
              value={form.password} onChange={(e) => updateField('password', e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <div style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</div>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-lg" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            onClick={() => {
              import('next-auth/react').then(({ signIn }) => signIn('google', { callbackUrl: '/dashboard' }));
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.504 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.504 53.529 C -21.754 52.799 -21.894 52.039 -21.894 51.239 C -21.894 50.439 -21.754 49.679 -21.504 48.949 L -21.504 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.504 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.504 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}

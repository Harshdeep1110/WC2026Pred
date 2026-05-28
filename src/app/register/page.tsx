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
        </form>

        <p className="auth-footer">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}

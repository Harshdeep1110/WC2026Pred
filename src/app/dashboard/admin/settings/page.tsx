'use client';

import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const [leagueLocked, setLeagueLocked] = useState(false);
  const [preTournamentLocked, setPreTournamentLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPreTourney, setSavingPreTourney] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data.LEAGUE_LOCKED === 'true') {
        setLeagueLocked(true);
      }
      if (data.PRE_TOURNAMENT_LOCKED === 'true') {
        setPreTournamentLocked(true);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function toggleLeagueLock() {
    setSaving(true);
    const newValue = !leagueLocked;
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'LEAGUE_LOCKED', value: newValue.toString() })
    });
    
    if (res.ok) {
      setLeagueLocked(newValue);
    }
    setSaving(false);
  }

  async function togglePreTournamentLock() {
    setSavingPreTourney(true);
    const newValue = !preTournamentLocked;
    const res = await fetch('/api/admin/settings/pre-tournament-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: newValue })
    });
    
    if (res.ok) {
      setPreTournamentLocked(newValue);
    }
    setSavingPreTourney(false);
  }

  if (loading) return <div className="loading-spinner" />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Manage global tournament settings</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Lock League Registration</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              When enabled, no new users can join the league, even if they possess a valid invite token.
            </p>
          </div>
          <button 
            className={`btn ${leagueLocked ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleLeagueLock}
            disabled={saving}
          >
            {saving ? 'Saving...' : leagueLocked ? 'Unlock League' : 'Lock League'}
          </button>
        </div>
        
        {leagueLocked && (
          <div style={{ padding: '12px', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, color: 'var(--accent-red)', fontSize: '0.85rem' }}>
            🔒 Registration is currently locked. No new members can join.
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Lock Pre-Tournament & Group Standings</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              When enabled, users can no longer edit their award predictions or group standings.
            </p>
          </div>
          <button 
            className={`btn ${preTournamentLocked ? 'btn-danger' : 'btn-primary'}`}
            onClick={togglePreTournamentLock}
            disabled={savingPreTourney}
          >
            {savingPreTourney ? 'Saving...' : preTournamentLocked ? 'Unlock Predictions' : 'Lock Predictions'}
          </button>
        </div>
        
        {preTournamentLocked && (
          <div style={{ padding: '12px', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, color: 'var(--accent-red)', fontSize: '0.85rem' }}>
            🔒 Pre-Tournament predictions are currently locked.
          </div>
        )}
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface Fixture {
  id: number; homeTeam: string; awayTeam: string; group: string; stage: string;
  status: string; homeScore: number | null; awayScore: number | null;
  kickoffTimeUtc: string;
}

export default function AdminFixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreInputs, setScoreInputs] = useState<Record<number, { home: string; away: string }>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/fixtures?stage=')
      .then(r => r.json())
      .then(data => {
        setFixtures(data);
        setLoading(false);
      });
  }, []);

  async function submitResult(fixtureId: number) {
    const input = scoreInputs[fixtureId];
    if (!input || input.home === '' || input.away === '') return;
    setSubmitting(fixtureId);
    setMessage('');

    const res = await fetch(`/api/admin/fixtures/${fixtureId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: parseInt(input.home), awayScore: parseInt(input.away) }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessage(`✅ Result entered & ${data.scored} predictions scored`);
      // Refresh
      const updated = await fetch('/api/fixtures?stage=').then(r => r.json());
      setFixtures(updated);
    } else {
      setMessage('❌ Failed to enter result');
    }
    setSubmitting(null);
  }

  async function updateStatus(fixtureId: number, status: string) {
    await fetch(`/api/admin/fixtures/${fixtureId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const updated = await fetch('/api/fixtures?stage=').then(r => r.json());
    setFixtures(updated);
  }

  const statusColors: Record<string, string> = {
    upcoming: 'var(--text-muted)',
    live: 'var(--accent-green)',
    halftime: 'var(--accent-gold)',
    full_time: 'var(--accent-blue)',
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Manage Fixtures</h1>
        <p className="page-subtitle">Enter results and manage match status</p>
      </div>

      {message && (
        <div className="toast-success" style={{ padding: '12px 20px', borderRadius: 12, marginBottom: 24 }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fixtures.map(f => (
            <div key={f.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Match info */}
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    #{f.id} {f.homeTeam} vs {f.awayTeam}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {f.stage === 'group' ? `Group ${f.group}` : f.stage} • {new Date(f.kickoffTimeUtc).toLocaleDateString()}
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: statusColors[f.status], fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    {f.status.replace('_', ' ')}
                  </span>
                  {f.status !== 'full_time' && (
                    <select
                      style={{
                        background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                        borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                      }}
                      value={f.status}
                      onChange={e => updateStatus(f.id, e.target.value)}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="halftime">Halftime</option>
                    </select>
                  )}
                </div>

                {/* Score result */}
                {f.status === 'full_time' ? (
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem' }}>
                    {f.homeScore} – {f.awayScore}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      className="input score-input"
                      type="number" min="0" max="20"
                      style={{ width: 48, height: 40, fontSize: '1rem' }}
                      placeholder="H"
                      value={scoreInputs[f.id]?.home || ''}
                      onChange={e => setScoreInputs(prev => ({
                        ...prev, [f.id]: { ...prev[f.id], home: e.target.value },
                      }))}
                    />
                    <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>–</span>
                    <input
                      className="input score-input"
                      type="number" min="0" max="20"
                      style={{ width: 48, height: 40, fontSize: '1rem' }}
                      placeholder="A"
                      value={scoreInputs[f.id]?.away || ''}
                      onChange={e => setScoreInputs(prev => ({
                        ...prev, [f.id]: { ...prev[f.id], away: e.target.value },
                      }))}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => submitResult(f.id)}
                      disabled={submitting === f.id}
                    >
                      {submitting === f.id ? '...' : 'Score'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

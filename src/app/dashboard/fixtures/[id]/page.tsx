'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFlag } from '@/lib/flags';

interface Fixture {
  id: number; homeTeam: string; awayTeam: string; group: string; stage: string;
  venue: string; city: string; kickoffTimeUtc: string; lockTimeUtc: string;
  status: string; homeScore: number | null; awayScore: number | null;
}

interface Prediction {
  id: string; homeScorePred: number | null; awayScorePred: number | null;
  pointsAwarded: number | null; scoringTier: string | null; isLocked: boolean; halftimeSubUsed: boolean;
}

interface Chip {
  id: string; type: string; status: string; fixtureId: number | null; targetUserId: string | null;
}

interface User {
  id: string; displayName: string;
}

export default function FixtureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fixtureId = Number(params.id);

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [homePred, setHomePred] = useState('');
  const [awayPred, setAwayPred] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  
  const [showChipModal, setShowChipModal] = useState(false);
  const [selectedChipType, setSelectedChipType] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [playingChip, setPlayingChip] = useState(false);

  useEffect(() => {
    async function load() {
      const [fRes, pRes, cRes, lRes] = await Promise.all([
        fetch(`/api/fixtures?stage=`),
        fetch(`/api/predictions?fixtureId=${fixtureId}`),
        fetch(`/api/chips`),
        fetch(`/api/leaderboard`),
      ]);
      
      const fixtures = await fRes.json();
      const f = fixtures.find((x: Fixture) => x.id === fixtureId);
      setFixture(f || null);

      const predictions = await pRes.json();
      if (predictions.length > 0) {
        const p = predictions[0];
        setPrediction(p);
        if (p.homeScorePred !== null) setHomePred(String(p.homeScorePred));
        if (p.awayScorePred !== null) setAwayPred(String(p.awayScorePred));
      }

      setChips(await cRes.json());
      setUsers(await lRes.json());
    }
    load();
  }, [fixtureId]);

  useEffect(() => {
    if (!fixture) return;
    const interval = setInterval(() => {
      const diff = new Date(fixture.lockTimeUtc).getTime() - Date.now();
      if (diff <= 0) { setCountdown('Locked'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [fixture]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMessage('');
    if (homePred === '' || awayPred === '') {
      setError('Please enter both scores'); return;
    }
    setSaving(true);
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixtureId,
        homeScorePred: parseInt(homePred),
        awayScorePred: parseInt(awayPred),
      }),
    });
    if (res.status === 423) {
      setError('Prediction window closed');
    } else if (res.ok) {
      const data = await res.json();
      setPrediction(data);
      setMessage('Prediction saved! ✅');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setError('Failed to save prediction');
    }
    setSaving(false);
  }

  async function handlePlayChip() {
    setError(''); setMessage('');
    setPlayingChip(true);
    
    const res = await fetch('/api/chips/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chipType: selectedChipType,
        fixtureId,
        targetUserId: selectedChipType === 'rival_block' ? targetUserId : undefined,
      }),
    });
    
    if (res.ok) {
      setMessage('Chip played successfully! 🃏');
      setShowChipModal(false);
      
      // Reload chips and prediction
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/chips`),
        fetch(`/api/predictions?fixtureId=${fixtureId}`),
      ]);
      setChips(await cRes.json());
      const preds = await pRes.json();
      if (preds.length > 0) setPrediction(preds[0]);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to play chip');
    }
    setPlayingChip(false);
  }

  if (!fixture) return <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />;

  const isLocked = countdown === 'Locked' || new Date() >= new Date(fixture.lockTimeUtc);
  const chipsPlayedHere = chips.filter(c => c.fixtureId === fixtureId);
  const availableChips = chips.filter(c => c.status === 'available');

  const chipLabels: Record<string, string> = {
    banker: '🏦 Banker',
    rival_block: '🚨 Rival Block',
    halftime_sub: '⏱️ Halftime Sub',
    goalfest: '🎯 Goal-Fest'
  };

  async function unplayChip(chipId: string) {
    if (!confirm('Are you sure you want to unplay this chip?')) return;
    
    setPlayingChip(true);
    const res = await fetch(`/api/chips/play?chipId=${chipId}`, {
      method: 'DELETE',
    });
    
    if (res.ok) {
      setMessage('Chip unplayed successfully!');
      router.refresh();
      // Reload chips
      fetch('/api/chips').then(r => r.json()).then(setChips);
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to unplay chip');
    }
    setPlayingChip(false);
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => router.back()} style={{ marginBottom: 24 }}>
        ← Back to Fixtures
      </button>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
          background: message.includes('Failed') ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 255, 135, 0.1)',
          border: `1px solid ${message.includes('Failed') ? 'var(--danger)' : 'var(--accent-green)'}`,
          color: message.includes('Failed') ? 'var(--danger)' : 'var(--accent-green)',
        }}>
          {message}
        </div>
      )}

      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Match header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            {fixture.stage === 'group' ? `Group ${fixture.group}` : fixture.stage.replace('_', ' ').toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{getFlag(fixture.homeTeam)}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fixture.homeTeam}</div>
            </div>

            {fixture.status === 'full_time' || fixture.status === 'halftime' ? (
              <div className="fixture-score" style={{ flex: '0 0 auto', fontSize: '2.5rem', textAlign: 'center' }}>
                {fixture.homeScore ?? 0} – {fixture.awayScore ?? 0}
              </div>
            ) : (
              <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>VS</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {new Date(fixture.kickoffTimeUtc).toLocaleString()}
                </div>
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{getFlag(fixture.awayTeam)}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fixture.awayTeam}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            📍 {fixture.venue}, {fixture.city}
          </div>

          {/* Countdown */}
          <div style={{ marginTop: 16 }}>
            {isLocked ? (
              <span className="fixture-locked">
                {fixture.status === 'upcoming' ? '🔒 Predictions Locked' : fixture.status === 'full_time' ? '✅ Match Finished' : '▶️ Match Live'}
              </span>
            ) : (
              <span className="fixture-countdown">🔓 Locks in {countdown}</span>
            )}
          </div>
          
          {/* Played Chips Badges */}
          {chipsPlayedHere.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {chipsPlayedHere.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className={`chip-badge ${c.type.replace('_', '-')}`} title={chipLabels[c.type]}>
                    {chipLabels[c.type]} {c.type === 'rival_block' && users.find(u => u.id === c.targetUserId) ? ` on ${users.find(u => u.id === c.targetUserId)?.displayName}` : ''}
                  </span>
                  {(!isLocked || (c.type === 'halftime_sub' && fixture.status === 'halftime')) && (
                    <button 
                      onClick={() => unplayChip(c.id)}
                      style={{ 
                        background: 'none', border: 'none', color: 'var(--text-muted)', 
                        cursor: 'pointer', fontSize: '1rem', padding: '0 4px' 
                      }}
                      title="Unplay Chip"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prediction form */}
        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 24, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)' }}>Your Prediction</h3>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowChipModal(true)}
            >
              🃏 Play Chip
            </button>
          </div>

          {prediction?.scoringTier && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span className={`tier-badge tier-${prediction.scoringTier}`}>{prediction.scoringTier}</span>
              <span className="points-display" style={{ marginLeft: 12 }}>+{prediction.pointsAwarded || 0} pts</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="prediction-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{fixture.homeTeam}</div>
              
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  className="input score-input"
                  type="number" min="0" max="20"
                  value={homePred}
                  onChange={e => setHomePred(e.target.value)}
                  disabled={isLocked && !(fixture.status === 'halftime' && prediction?.halftimeSubUsed === true) || !!prediction?.scoringTier}
                  placeholder="–"
                />
                <span className="score-separator">:</span>
                <input
                  className="input score-input"
                  type="number" min="0" max="20"
                  value={awayPred}
                  onChange={e => setAwayPred(e.target.value)}
                  disabled={isLocked && !(fixture.status === 'halftime' && prediction?.halftimeSubUsed === true) || !!prediction?.scoringTier}
                  placeholder="–"
                />
              </div>

              <div style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>{fixture.awayTeam}</div>
            </div>

            {error && <div className="toast-error" style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, textAlign: 'center' }}>{error}</div>}
            {message && <div className="toast-success" style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, textAlign: 'center' }}>{message}</div>}

            {(!isLocked || (fixture.status === 'halftime' && prediction?.halftimeSubUsed === true)) && !prediction?.scoringTier && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : prediction ? 'Update Prediction' : 'Submit Prediction'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* Chip Play Modal */}
      {showChipModal && (
        <div className="modal-overlay" onClick={() => setShowChipModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🃏 Play a Chip</h2>
            
            {availableChips.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>You don't have any chips left to play.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Select Chip</label>
                  <select 
                    className="form-input" 
                    value={selectedChipType} 
                    onChange={e => { setSelectedChipType(e.target.value); setTargetUserId(''); }}
                  >
                    <option value="">-- Choose a chip --</option>
                    {availableChips.map(c => (
                      <option key={c.id} value={c.type}>{chipLabels[c.type]}</option>
                    ))}
                  </select>
                </div>
                
                {selectedChipType === 'rival_block' && (
                  <div className="form-group">
                    <label className="form-label">Target Player</label>
                    <select 
                      className="form-input" 
                      value={targetUserId} 
                      onChange={e => setTargetUserId(e.target.value)}
                    >
                      <option value="">-- Select a player --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setShowChipModal(false)}>Cancel</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handlePlayChip} 
                    disabled={!selectedChipType || (selectedChipType === 'rival_block' && !targetUserId) || playingChip}
                  >
                    {playingChip ? 'Playing...' : 'Play Chip'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

  const [communityPredictions, setCommunityPredictions] = useState<any[]>([]);

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

  const isLocked = countdown === 'Locked' || (fixture && new Date() >= new Date(fixture.lockTimeUtc));

  useEffect(() => {
    if (isLocked && communityPredictions.length === 0) {
      fetch(`/api/fixtures/${fixtureId}/predictions`).then(res => {
        if (res.ok) res.json().then(setCommunityPredictions);
      });
    }
  }, [fixtureId, isLocked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMessage('');
    if (homePred === '' || awayPred === '') {
      setError('Please enter both scores'); return;
    }
    
    const prevPrediction = prediction;
    const optimisticPrediction = {
      id: prediction?.id || 'temp',
      homeScorePred: parseInt(homePred),
      awayScorePred: parseInt(awayPred),
      pointsAwarded: prediction?.pointsAwarded ?? null,
      scoringTier: prediction?.scoringTier ?? null,
      isLocked: false,
      halftimeSubUsed: prediction?.halftimeSubUsed || false,
    };
    
    setPrediction(optimisticPrediction as Prediction);
    setMessage('Prediction saved! ✅');
    setSaving(true);

    try {
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
        setPrediction(prevPrediction);
        setMessage('');
      } else if (res.ok) {
        const data = await res.json();
        setPrediction(data);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to save prediction');
        setPrediction(prevPrediction);
        setMessage('');
      }
    } catch {
      setError('Network error saving prediction');
      setPrediction(prevPrediction);
      setMessage('');
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

  const chipsPlayedHere = chips.filter(c => c.fixtureId === fixtureId);
  const availableChips = chips.filter(c => c.status === 'available');

  const chipLabels: Record<string, string> = {
    banker: '🏦 Banker',
    rival_block: '🚨 Rival Block',
    halftime_sub: '⏱️ Halftime Sub',
    goalfest: '🎯 Goal-Fest',
    defensive_masterclass: '🛡️ Defensive Masterclass'
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
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
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: 24, border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>📊 Points Breakdown</h4>
                <span className={`tier-badge tier-${prediction.scoringTier}`}>{prediction.scoringTier.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Base Points {['r32','r16','qf','sf','third_place','final'].includes(fixture.stage) ? '(Knockout)' : '(Group)'}</span>
                <span style={{ fontWeight: 600 }}>+{prediction.scoringTier === 'exact' ? (['r32','r16','qf','sf','third_place','final'].includes(fixture.stage) ? 20 : 10) : prediction.scoringTier === 'goal_diff' ? (['r32','r16','qf','sf','third_place','final'].includes(fixture.stage) ? 10 : 5) : prediction.scoringTier === 'result' ? (['r32','r16','qf','sf','third_place','final'].includes(fixture.stage) ? 5 : 3) : 0}</span>
              </div>
              {chipsPlayedHere.map(c => {
                if (c.type === 'banker') return <div key="banker" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--accent-gold)' }}><span>Banker Chip</span><span style={{ fontWeight: 600 }}>x2</span></div>;
                if (c.type === 'halftime_sub') return <div key="ht" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--accent-green)' }}><span>Halftime Sub</span><span style={{ fontWeight: 600 }}>-50%</span></div>;
                if (c.type === 'goalfest') {
                  const totalGoals = (fixture.homeScore || 0) + (fixture.awayScore || 0);
                  return <div key="gf" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#A020F0' }}><span>Goal-Fest ({totalGoals} goals)</span><span style={{ fontWeight: 600 }}>+{totalGoals * 3} pts</span></div>;
                }
                if (c.type === 'defensive_masterclass') {
                  const hasCleanSheet = fixture.homeScore === 0 || fixture.awayScore === 0;
                  if (hasCleanSheet) return <div key="dm" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--accent-green)' }}><span>Defensive Masterclass Success</span><span style={{ fontWeight: 600 }}>+15 pts</span></div>;
                  else return <div key="dm-fail" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--danger)' }}><span>Defensive Masterclass Failed</span><span style={{ fontWeight: 600 }}>-8 pts</span></div>;
                }
                return null;
              })}
              {prediction.pointsAwarded === 0 && prediction.scoringTier === 'exact' && !chipsPlayedHere.some(c => c.type === 'goalfest') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--danger)' }}>
                  <span>💥 Rival Blocked!</span>
                  <span style={{ fontWeight: 600 }}>0 pts</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontWeight: 800 }}>
                <span>Total Points</span>
                <span className="points-display">{prediction.pointsAwarded} pts</span>
              </div>
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

      {/* Community Predictions */}
      {isLocked && communityPredictions.length > 0 && (
        <div className="card" style={{ maxWidth: 700, margin: '24px auto' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 20 }}>🕵️‍♂️ Community Predictions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {communityPredictions.map(cp => (
              <div key={cp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem', overflow: 'hidden' }}>
                    {cp.user.avatarUrl ? (
                      <img src={cp.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      cp.user.displayName[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cp.user.displayName}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {cp.chips.includes('banker') && <span title="Banker" style={{ fontSize: '0.8rem' }}>🏦</span>}
                      {cp.chips.includes('halftime_sub') && <span title="Halftime Sub" style={{ fontSize: '0.8rem' }}>⏱️</span>}
                      {cp.chips.includes('goalfest') && <span title="Goal-Fest" style={{ fontSize: '0.8rem' }}>🎯</span>}
                      {cp.chips.includes('defensive_masterclass') && <span title="Defensive Masterclass" style={{ fontSize: '0.8rem' }}>🛡️</span>}
                      {cp.chips.includes('rival_block') && <span title="Rival Block Played" style={{ fontSize: '0.8rem' }}>🚨</span>}
                      {cp.isRivalBlocked && <span title="Blocked by Rival!" style={{ fontSize: '0.8rem' }}>💥</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: cp.pointsAwarded !== null && cp.pointsAwarded > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                    {cp.homeScorePred} - {cp.awayScorePred}
                  </div>
                  {cp.pointsAwarded !== null && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      +{cp.pointsAwarded} pts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface PreTournamentPrediction {
  id?: string;
  goldenBootPlayer: string | null;
  mostAssistsPlayer: string | null;
  goldenGlovePlayer: string | null;
  isLocked: boolean;
}

const groups: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Congo DR', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

interface GroupPrediction {
  group: string;
  position1: string;
  position2: string;
  position3: string;
  position4: string;
  isLocked: boolean;
}

export default function PreTournamentPage() {
  const [awards, setAwards] = useState<PreTournamentPrediction>({
    goldenBootPlayer: '',
    mostAssistsPlayer: '',
    goldenGlovePlayer: '',
    isLocked: false,
  });
  const [groupPreds, setGroupPreds] = useState<Record<string, GroupPrediction>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'awards' | 'groups'>('awards');

  useEffect(() => {
    fetch('/api/pre-tournament').then(r => r.json()).then(data => {
      if (data) setAwards(data);
    });
    fetch('/api/group-predictions').then(r => r.json()).then((data: GroupPrediction[]) => {
      const map: Record<string, GroupPrediction> = {};
      data.forEach(p => { map[p.group] = p; });
      setGroupPreds(map);
    });
  }, []);

  async function saveAwards() {
    setSaving(true);
    const res = await fetch('/api/pre-tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(awards),
    });
    if (res.ok) setMessage('Awards predictions saved!');
    else setMessage('Error saving predictions');
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  async function saveGroupPrediction(group: string) {
    const teams = groups[group];
    const pred = groupPreds[group] || {
      group,
      position1: teams[0],
      position2: teams[1],
      position3: teams[2],
      position4: teams[3],
      isLocked: false,
    };

    const res = await fetch('/api/group-predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pred),
    });
    if (res.ok) {
      const data = await res.json();
      setGroupPreds({ ...groupPreds, [group]: data });
      setMessage(`Group ${group} prediction saved!`);
    }
    setTimeout(() => setMessage(''), 3000);
  }

  function setGroupPosition(group: string, position: string, value: string) {
    const teams = groups[group];
    const existing = groupPreds[group] || {
      group,
      position1: teams[0],
      position2: teams[1],
      position3: teams[2],
      position4: teams[3],
      isLocked: false,
    };
    setGroupPreds({
      ...groupPreds,
      [group]: { ...existing, [position]: value },
    });
  }

  const completedGroups = Object.keys(groupPreds).length;
  const totalGroups = Object.keys(groups).length;
  const awardsComplete = awards.goldenBootPlayer && awards.mostAssistsPlayer && awards.goldenGlovePlayer;
  const progressPct = Math.round(((completedGroups + (awardsComplete ? 1 : 0)) / (totalGroups + 1)) * 100);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🏆 Pre-Tournament Predictions</h1>
        <p className="page-subtitle">Complete before the tournament starts</p>
      </div>

      {/* Progress Bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Setup Progress</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>{progressPct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4 }}>
          <div style={{
            height: '100%', width: `${progressPct}%`, borderRadius: 4,
            background: 'linear-gradient(90deg, var(--accent-green), var(--accent-teal))',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Awards: {awardsComplete ? '✅' : '❌'} • Groups: {completedGroups}/{totalGroups}
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
          background: message.includes('Error') ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 255, 135, 0.1)',
          border: `1px solid ${message.includes('Error') ? 'var(--danger)' : 'var(--accent-green)'}`,
          color: message.includes('Error') ? 'var(--danger)' : 'var(--accent-green)',
          fontSize: '0.85rem',
        }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 24 }}>
        <button className={`filter-tab ${activeTab === 'awards' ? 'active' : ''}`} onClick={() => setActiveTab('awards')}>
          🏅 Award Winners
        </button>
        <button className={`filter-tab ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          📊 Group Standings
        </button>
      </div>

      {activeTab === 'awards' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 20 }}>Predict Award Winners (20 pts each)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">🥇 Golden Boot (Top Scorer)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kylian Mbappé"
                value={awards.goldenBootPlayer || ''}
                onChange={e => setAwards({ ...awards, goldenBootPlayer: e.target.value })}
                disabled={awards.isLocked}
              />
            </div>
            <div className="form-group">
              <label className="form-label">🎯 Most Assists</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kevin De Bruyne"
                value={awards.mostAssistsPlayer || ''}
                onChange={e => setAwards({ ...awards, mostAssistsPlayer: e.target.value })}
                disabled={awards.isLocked}
              />
            </div>
            <div className="form-group">
              <label className="form-label">🧤 Golden Glove (Best Goalkeeper)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Thibaut Courtois"
                value={awards.goldenGlovePlayer || ''}
                onChange={e => setAwards({ ...awards, goldenGlovePlayer: e.target.value })}
                disabled={awards.isLocked}
              />
            </div>
            {!awards.isLocked && (
              <button className="btn btn-primary" onClick={saveAwards} disabled={saving}>
                {saving ? 'Saving...' : 'Save Award Predictions'}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Object.entries(groups).map(([group, teams]) => {
            const pred = groupPreds[group];
            const isSaved = !!pred;
            return (
              <div key={group} className="card" style={{ position: 'relative' }}>
                {isSaved && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 255, 135, 0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)',
                  }}>
                    Saved
                  </span>
                )}
                <h4 style={{ marginBottom: 12, color: 'var(--accent-green)' }}>Group {group}</h4>
                {[1, 2, 3, 4].map(pos => (
                  <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{
                      width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%', fontSize: '0.7rem', fontWeight: 700,
                      background: pos === 1 ? 'var(--gold)' : pos === 2 ? 'var(--silver)' : 'var(--bg-secondary)',
                      color: pos <= 2 ? '#000' : 'var(--text-primary)',
                    }}>
                      {pos}
                    </span>
                    <select
                      className="form-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                      value={(pred as any)?.[`position${pos}`] || teams[pos - 1]}
                      onChange={e => setGroupPosition(group, `position${pos}`, e.target.value)}
                      disabled={pred?.isLocked}
                    >
                      {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
                {!pred?.isLocked && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => saveGroupPrediction(group)}
                  >
                    Save Group {group}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { SortableGroup } from '@/components/SortableGroup';

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

  async function saveAllGroupPredictions() {
    setSaving(true);
    try {
      const promises = Object.keys(groups).map(group => {
        const teams = groups[group];
        const pred = groupPreds[group] || {
          group,
          position1: teams[0],
          position2: teams[1],
          position3: teams[2],
          position4: teams[3],
          isLocked: false,
        };
        if (pred.isLocked) return Promise.resolve(null);

        return fetch('/api/group-predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pred),
        }).then(res => res.json());
      });

      const results = await Promise.all(promises);
      const newPreds = { ...groupPreds };
      results.forEach(res => {
        if (res && res.group) {
          newPreds[res.group] = res;
        }
      });
      setGroupPreds(newPreds);
      setMessage('All Group Standings saved successfully!');
    } catch (e) {
      setMessage('Error saving group predictions');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  function handleGroupOrderChange(group: string, newOrder: string[]) {
    const pred = groupPreds[group] || {
      group,
      position1: groups[group][0],
      position2: groups[group][1],
      position3: groups[group][2],
      position4: groups[group][3],
      isLocked: false,
    };
    
    setGroupPreds({
      ...groupPreds,
      [group]: {
        ...pred,
        position1: newOrder[0],
        position2: newOrder[1],
        position3: newOrder[2],
        position4: newOrder[3]
      }
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
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className="card-title">Group Standings</h3>
            <button className="btn btn-primary" onClick={saveAllGroupPredictions} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save All Groups'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {Object.entries(groups).map(([group, defaultTeams]) => {
              const pred = groupPreds[group];
              const isSaved = !!pred;
              
              // Determine the current order: either the saved prediction, or the default teams
              const currentOrder = pred 
                ? [pred.position1, pred.position2, pred.position3, pred.position4]
                : defaultTeams;

              return (
                <div key={group} className="card" style={{ position: 'relative', padding: '16px' }}>
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
                  
                  <SortableGroup 
                    groupName={group}
                    teams={currentOrder}
                    isLocked={pred?.isLocked || false}
                    onChange={(newOrder) => handleGroupOrderChange(group, newOrder)}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

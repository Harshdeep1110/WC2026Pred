'use client';

import { useState } from 'react';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function AdminPreTournamentPage() {
  const [goldenBoot, setGoldenBoot] = useState('');
  const [mostAssists, setMostAssists] = useState('');
  const [goldenGlove, setGoldenGlove] = useState('');
  
  // Track group standings input
  const [groupData, setGroupData] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const updateGroup = (group: string, posIndex: number, value: string) => {
    const current = groupData[group] || ['', '', '', ''];
    const newArray = [...current];
    newArray[posIndex] = value;
    setGroupData(prev => ({ ...prev, [group]: newArray }));
  };

  const handleScoreAwards = async () => {
    if (!goldenBoot || !mostAssists || !goldenGlove) {
      alert("Please fill in all award winners before scoring.");
      return;
    }
    setSaving(true);
    setMessage('');
    
    const res = await fetch('/api/admin/pre-tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goldenBoot, mostAssists, goldenGlove })
    });

    if (res.ok) {
      setMessage("✅ Awards scored successfully.");
    } else {
      setMessage("❌ Failed to score awards.");
    }
    setSaving(false);
  };

  const handleScoreGroup = async (group: string) => {
    const positions = groupData[group];
    if (!positions || positions.length !== 4 || positions.some(p => !p.trim())) {
      alert("Please fill all 4 positions for Group " + group);
      return;
    }

    setSaving(true);
    setMessage('');
    
    const payload = { groups: { [group]: positions } };
    const res = await fetch('/api/admin/pre-tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setMessage(`✅ Group ${group} scored successfully.`);
    } else {
      setMessage(`❌ Failed to score Group ${group}.`);
    }
    setSaving(false);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Score Pre-Tournament</h1>
        <p className="page-subtitle">Enter actual winners and final group standings to distribute points.</p>
      </div>

      {message && <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>{message}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Tournament Awards</h2>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <label className="form-label">Golden Boot Winner</label>
            <input type="text" className="form-input" value={goldenBoot} onChange={e => setGoldenBoot(e.target.value)} placeholder="e.g. Lionel Messi" />
          </div>
          <div>
            <label className="form-label">Most Assists Winner</label>
            <input type="text" className="form-input" value={mostAssists} onChange={e => setMostAssists(e.target.value)} placeholder="e.g. Kevin De Bruyne" />
          </div>
          <div>
            <label className="form-label">Golden Glove Winner</label>
            <input type="text" className="form-input" value={goldenGlove} onChange={e => setGoldenGlove(e.target.value)} placeholder="e.g. Emi Martinez" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleScoreAwards} disabled={saving} style={{ marginTop: 16 }}>
          {saving ? 'Processing...' : 'Score Awards'}
        </button>
      </div>

      <h2 style={{ marginBottom: 16, marginTop: 32 }}>Group Standings</h2>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {GROUPS.map(group => (
          <div key={group} className="card">
            <h3 style={{ marginBottom: 12 }}>Group {group}</h3>
            {[1, 2, 3, 4].map(pos => (
              <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, fontWeight: 'bold' }}>{pos}.</span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={`Position ${pos}`}
                  value={groupData[group]?.[pos-1] || ''}
                  onChange={e => updateGroup(group, pos-1, e.target.value)}
                />
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => handleScoreGroup(group)} disabled={saving} style={{ marginTop: 8, width: '100%' }}>
              Score Group {group}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

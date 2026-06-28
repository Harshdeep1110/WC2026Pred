'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  totalPoints: number;
  isActive: boolean;
  createdAt: string;
  _count: { predictions: number; chips: number };
}

interface ChipData {
  id: string;
  type: string;
  status: string;
  fixture: { id: number; homeTeam: string; awayTeam: string } | null;
  targetUser: { id: string; displayName: string } | null;
}

const CHIP_TYPES = ['banker', 'rival_block', 'halftime_sub', 'goalfest', 'defensive_masterclass'];
const CHIP_LABELS: Record<string, string> = {
  banker: '🏦 Banker',
  rival_block: '🎯 Rival Block',
  halftime_sub: '🔄 Halftime Sub',
  goalfest: '⚡ Goal-Fest',
  defensive_masterclass: '🛡️ Defensive Masterclass'
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newToken, setNewToken] = useState('');
  const [loading, setLoading] = useState(true);

  // Chip management modal state
  const [chipModalUser, setChipModalUser] = useState<User | null>(null);
  const [userChips, setUserChips] = useState<ChipData[]>([]);
  const [chipsLoading, setChipsLoading] = useState(false);

  // Point adjustment modal state
  const [pointsModalUser, setPointsModalUser] = useState<User | null>(null);
  const [pointAdjustment, setPointAdjustment] = useState<number | ''>('');
  const [pointReason, setPointReason] = useState('');

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers).finally(() => setLoading(false));
  }, []);

  async function createInvite() {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    setNewToken(data.token);
    setInviteEmail('');
  }

  async function toggleBan(userId: string, isActive: boolean) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: isActive ? 'ban' : 'unban' }),
    });
    setUsers(users.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
  }

  async function openChipModal(user: User) {
    setChipModalUser(user);
    setChipsLoading(true);
    const res = await fetch(`/api/admin/chips?userId=${user.id}`);
    const data = await res.json();
    setUserChips(data.chips || []);
    setChipsLoading(false);
  }

  async function handleChipAction(chipType: string, action: 'grant' | 'revoke') {
    if (!chipModalUser) return;
    const res = await fetch('/api/admin/chips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: chipModalUser.id, chipType, action }),
    });
    if (res.ok) {
      // Refresh chips list
      const refreshRes = await fetch(`/api/admin/chips?userId=${chipModalUser.id}`);
      const data = await refreshRes.json();
      setUserChips(data.chips || []);
    } else {
      const err = await res.json();
      alert(err.error || 'Operation failed');
    }
  }

  async function handlePointAdjustment() {
    if (!pointsModalUser || typeof pointAdjustment !== 'number' || pointAdjustment === 0) return;
    const res = await fetch(`/api/admin/users/${pointsModalUser.id}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: pointAdjustment, reason: pointReason }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(users.map(u => u.id === pointsModalUser.id ? { ...u, totalPoints: data.newTotal } : u));
      setPointsModalUser(null);
      setPointAdjustment('');
      setPointReason('');
    } else {
      const err = await res.json();
      alert(err.error || 'Adjustment failed');
    }
  }

  if (loading) return <div className="loading-spinner" />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Manage Users</h1>
        <p className="page-subtitle">{users.length} registered players</p>
      </div>

      {/* Invite Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>Generate Invite Code</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Email (optional)</label>
            <input
              type="email"
              className="form-input"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={createInvite}>
            Generate Code
          </button>
        </div>
        {newToken && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(0, 255, 135, 0.1)', border: '1px solid var(--accent-green)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>
              Invite code: <strong style={{ color: 'var(--accent-green)', fontSize: '1.1rem', letterSpacing: '0.1em' }}>{newToken}</strong>
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(newToken); }}>
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' }}>Points</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' }}>Predictions</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' }}>Role</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{u.displayName[0].toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-green)' }}>{u.totalPoints}</td>
                  <td style={{ textAlign: 'center' }}>{u._count.predictions}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-active'}`}>{u.role}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${u.isActive ? 'badge-active' : 'badge-burned'}`}>
                      {u.isActive ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setPointsModalUser(u)}
                      >
                        ± Points
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openChipModal(u)}
                      >
                        🃏 Chips
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => toggleBan(u.id, u.isActive)}
                        >
                          {u.isActive ? 'Ban' : 'Unban'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chip Management Modal */}
      {chipModalUser && (
        <div className="modal-overlay" onClick={() => setChipModalUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem' }}>🃏 Chips — {chipModalUser.displayName}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setChipModalUser(null)}>✕</button>
            </div>

            {chipsLoading ? (
              <div className="loading-spinner" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CHIP_TYPES.map(type => {
                  const available = userChips.find(c => c.type === type && c.status === 'available');
                  const burned = userChips.find(c => c.type === type && c.status === 'burned');
                  
                  return (
                    <div key={type} style={{
                      padding: 16,
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-primary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{CHIP_LABELS[type]}</div>
                        {available && (
                          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>Available</span>
                        )}
                        {burned && (
                          <span className="badge badge-burned" style={{ fontSize: '0.7rem' }}>
                            Burned{burned.fixture ? ` on ${burned.fixture.homeTeam} vs ${burned.fixture.awayTeam}` : ''}
                          </span>
                        )}
                        {!available && !burned && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not in inventory</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!available && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleChipAction(type, 'grant')}>
                            Grant
                          </button>
                        )}
                        {available && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleChipAction(type, 'revoke')}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Point Adjustment Modal */}
      {pointsModalUser && (
        <div className="modal-overlay" onClick={() => setPointsModalUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem' }}>± Adjust Points — {pointsModalUser.displayName}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setPointsModalUser(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Point Adjustment (+ or -)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 5 or -10"
                value={pointAdjustment}
                onChange={e => setPointAdjustment(e.target.value ? parseInt(e.target.value) : '')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reason (Audit Log)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Correction for spelling error"
                value={pointReason}
                onChange={e => setPointReason(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={handlePointAdjustment}
              disabled={typeof pointAdjustment !== 'number' || pointAdjustment === 0}
            >
              Apply Adjustment
            </button>
          </div>
        </div>
      )}
    </>
  );
}

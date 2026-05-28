'use client';

import { useEffect, useState } from 'react';

interface RivalBlock {
  id: string;
  type: string;
  status: string;
  burnedAt: string | null;
  user: { id: string; displayName: string; email: string };
  targetUser: { id: string; displayName: string; email: string } | null;
  fixture: { id: number; homeTeam: string; awayTeam: string; status: string; homeScore: number | null; awayScore: number | null } | null;
}

export default function AdminRivalBlocksPage() {
  const [blocks, setBlocks] = useState<RivalBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/rival-blocks')
      .then(r => r.json())
      .then(data => setBlocks(data.blocks || []))
      .finally(() => setLoading(false));
  }, []);

  function getOutcome(block: RivalBlock): { label: string; color: string } {
    if (!block.fixture || block.fixture.status !== 'full_time') {
      return { label: 'Pending', color: 'var(--text-muted)' };
    }
    // Block fires if target got exact score — we don't have that data here, 
    // so we just show the match outcome context
    return { label: 'Match Complete', color: 'var(--accent-green)' };
  }

  if (loading) return <div className="loading-spinner" />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🎯 Rival Blocks</h1>
        <p className="page-subtitle">View all active and completed rival block chips across the league.</p>
      </div>

      {blocks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h2 className="empty-state-title">No Rival Blocks Played</h2>
          <p className="empty-state-desc">No one has played a Rival Block chip yet.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Attacker</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Target</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Fixture</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Played At</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => {
                const outcome = getOutcome(block);
                return (
                  <tr key={block.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{block.user.displayName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{block.user.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {block.targetUser ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{block.targetUser.displayName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{block.targetUser.email}</div>
                        </>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {block.fixture ? (
                        <span>{block.fixture.homeTeam} vs {block.fixture.awayTeam}
                          {block.fixture.homeScore !== null && ` (${block.fixture.homeScore}-${block.fixture.awayScore})`}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-${block.status === 'burned' ? 'warning' : 'success'}`} style={{ color: outcome.color }}>
                        {outcome.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {block.burnedAt ? new Date(block.burnedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

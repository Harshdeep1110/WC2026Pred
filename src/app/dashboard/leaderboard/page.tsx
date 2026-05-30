'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number; id: string; displayName: string; totalPoints: number; avatarUrl: string | null;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false); });
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🏆 Leaderboard</h1>
        <p className="page-subtitle">Global rankings across all predictions</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-title">No scores yet</div>
          <div className="empty-state-desc">The leaderboard will populate once results are entered.</div>
        </div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Rank</th>
              <th>Player</th>
              <th style={{ textAlign: 'right' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className="leaderboard-row">
                <td>
                  <span className={`rank-badge ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}>
                    {entry.rank}
                  </span>
                </td>
                <td>
                  <div className="user-row">
                    <div className="avatar" style={{ overflow: 'hidden' }}>
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        entry.displayName[0].toUpperCase()
                      )}
                    </div>
                    <span className="user-name">{entry.displayName}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="points-display">{entry.totalPoints}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFlag } from '@/lib/flags';

interface Fixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  group: string;
  stage: string;
  venue: string;
  city: string;
  kickoffTimeUtc: string;
  lockTimeUtc: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

const stageLabels: Record<string, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  third_place: 'Third Place',
  final: 'Final',
};

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [filter, setFilter] = useState('group');
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.set('stage', filter);
      if (groupFilter) params.set('group', groupFilter);
      const res = await fetch(`/api/fixtures?${params}`);
      const data = await res.json();
      setFixtures(data);
      setLoading(false);
    }
    load();
  }, [filter, groupFilter]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  function getCountdown(lockTime: string) {
    const diff = new Date(lockTime).getTime() - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${mins}m`;
  }

  // Group by date
  const grouped = fixtures.reduce((acc: Record<string, Fixture[]>, f) => {
    const date = f.kickoffTimeUtc.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(f);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">⚽ Fixtures</h1>
        <p className="page-subtitle">104 matches across the 2026 FIFA World Cup</p>
      </div>

      {/* Stage tabs */}
      <div className="tabs">
        {Object.entries(stageLabels).map(([key, label]) => (
          <button
            key={key}
            className={`tab ${filter === key ? 'active' : ''}`}
            onClick={() => { setFilter(key); setGroupFilter(''); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Group filter for group stage */}
      {filter === 'group' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${!groupFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setGroupFilter('')}
          >
            All Groups
          </button>
          {'ABCDEFGHIJKL'.split('').map(g => (
            <button
              key={g}
              className={`btn btn-sm ${groupFilter === g ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupFilter(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '80px', width: '100%' }} />
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([date, matches]) => (
          <div key={date} style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {formatDate(date + 'T12:00:00Z')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matches.map(f => {
                const countdown = getCountdown(f.lockTimeUtc);
                const isLocked = !countdown;
                const isUrgent = countdown && !countdown.includes('d') && parseInt(countdown) < 2;

                return (
                  <Link key={f.id} href={`/dashboard/fixtures/${f.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="fixture-card">
                      <div className="fixture-team">
                        <div className="fixture-team-flag">{getFlag(f.homeTeam)}</div>
                        <span>{f.homeTeam}</span>
                      </div>

                      <div className="fixture-center">
                        {f.status === 'full_time' ? (
                          <div className="fixture-score">
                            <span>{f.homeScore}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>–</span>
                            <span>{f.awayScore}</span>
                          </div>
                        ) : (
                          <div className="fixture-vs">{formatTime(f.kickoffTimeUtc)}</div>
                        )}
                        <div className="fixture-meta">
                          {f.group !== 'R32' && f.group !== 'R16' && f.group !== 'QF' && f.group !== 'SF' && f.group !== '3P' && f.group !== 'FIN'
                            ? `Group ${f.group}` : stageLabels[f.stage]}
                          {' • '}{f.venue}
                        </div>
                        {countdown ? (
                          <span className={`fixture-countdown ${isUrgent ? 'urgent' : ''}`}>
                            🔓 Locks in {countdown}
                          </span>
                        ) : f.status === 'upcoming' ? (
                          <span className="fixture-locked">🔒 Locked</span>
                        ) : null}
                      </div>

                      <div className="fixture-team away">
                        <span>{f.awayTeam}</span>
                        <div className="fixture-team-flag">{getFlag(f.awayTeam)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}

      {!loading && fixtures.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No fixtures found</div>
          <div className="empty-state-desc">Try a different filter.</div>
        </div>
      )}
    </>
  );
}

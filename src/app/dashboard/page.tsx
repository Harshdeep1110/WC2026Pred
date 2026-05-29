import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import Link from 'next/link';
import { getFlag } from '@/lib/flags';
import { ClientDate } from '@/components/ClientDate';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [user, predictions, chips, upcomingFixtures, recentResults] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.prediction.findMany({ where: { userId }, include: { fixture: true } }),
    prisma.chip.findMany({ where: { userId } }),
    prisma.fixture.findMany({
      where: { status: 'upcoming' },
      orderBy: { kickoffTimeUtc: 'asc' },
      take: 5,
    }),
    prisma.fixture.findMany({
      where: { status: 'full_time' },
      orderBy: { kickoffTimeUtc: 'desc' },
      take: 5,
    }),
  ]);

  const totalPredictions = predictions.length;
  const scoredPredictions = predictions.filter(p => p.pointsAwarded !== null);
  const exactCount = scoredPredictions.filter(p => p.scoringTier === 'exact').length;
  const availableChips = chips.filter(c => c.status === 'available').length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.displayName} 👋</h1>
        <p className="page-subtitle">World Cup 2026 Prediction League</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Points</div>
          <div className="stat-value green">{user?.totalPoints || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Predictions Made</div>
          <div className="stat-value">{totalPredictions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Exact Scores</div>
          <div className="stat-value gold">{exactCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chips Available</div>
          <div className="stat-value">{availableChips}/4</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Upcoming Fixtures */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⚽ Upcoming Matches</h2>
            <Link href="/dashboard/fixtures" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {upcomingFixtures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No upcoming fixtures</div>
              <div className="empty-state-desc">Check back soon for the latest schedule.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingFixtures.map(f => {
                const hasPrediction = predictions.some(p => p.fixtureId === f.id);
                return (
                  <Link key={f.id} href={`/dashboard/fixtures/${f.id}`} className="fixture-card">
                    <div className="fixture-time-col">
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <ClientDate dateStr={f.kickoffTimeUtc} type="time" />
                      </div>
                      <div style={{ fontSize: '0.65rem', marginBottom: '6px' }}>
                        <ClientDate dateStr={f.kickoffTimeUtc} type="date" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {hasPrediction ? (
                          <span className="badge badge-active" style={{ fontSize: '0.6rem', padding: '3px 6px', display: 'inline-block' }}>✓ PREDICTED</span>
                        ) : (
                          <span className="badge badge-admin" style={{ fontSize: '0.6rem', padding: '3px 6px', display: 'inline-block' }}>PREDICT</span>
                        )}
                      </div>
                    </div>
                    <div className="fixture-teams-col">
                      <div className="fixture-team-row">
                        <div className="fixture-team-name">
                          <span className="fixture-team-flag">{getFlag(f.homeTeam)}</span>
                          {f.homeTeam}
                        </div>
                        <div className="fixture-score" style={{ color: 'var(--text-muted)' }}>-</div>
                      </div>
                      <div className="fixture-team-row">
                        <div className="fixture-team-name">
                          <span className="fixture-team-flag">{getFlag(f.awayTeam)}</span>
                          {f.awayTeam}
                        </div>
                        <div className="fixture-score" style={{ color: 'var(--text-muted)' }}>-</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Chip Inventory */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🃏 Your Chips</h2>
            <Link href="/dashboard/chips" className="btn btn-secondary btn-sm">Manage</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chips.map(chip => (
              <div key={chip.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)',
              }}>
                <span className={`chip-badge ${chip.type.replace('_', '-')} ${chip.status === 'burned' ? 'burned' : ''}`}>
                  {chip.type === 'banker' && '🏦 The Banker'}
                  {chip.type === 'rival_block' && '🚨 Rival Block'}
                  {chip.type === 'halftime_sub' && '⏱️ Halftime Sub'}
                  {chip.type === 'goalfest' && '🎯 Goal-Fest'}
                </span>
                <span style={{ fontSize: '0.8rem', color: chip.status === 'available' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {chip.status === 'available' ? 'Available' : 'Burned'}
                </span>
              </div>
            ))}
            {chips.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-desc">Chips will appear after registration.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">📊 Recent Results</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentResults.map(f => {
              const pred = predictions.find(p => p.fixtureId === f.id);
              return (
                <Link key={f.id} href={`/dashboard/fixtures/${f.id}`} className="fixture-card">
                  <div className="fixture-time-col">
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>FT</div>
                    <div style={{ fontSize: '0.65rem' }}>
                      <ClientDate dateStr={f.kickoffTimeUtc} type="date" />
                    </div>
                  </div>
                  <div className="fixture-teams-col">
                    <div className="fixture-team-row">
                      <div className="fixture-team-name">
                        <span className="fixture-team-flag">{getFlag(f.homeTeam)}</span>
                        <span style={{ fontWeight: f.homeScore! > f.awayScore! ? 700 : 500 }}>{f.homeTeam}</span>
                      </div>
                      <div className="fixture-score">{f.homeScore}</div>
                    </div>
                    <div className="fixture-team-row">
                      <div className="fixture-team-name">
                        <span className="fixture-team-flag">{getFlag(f.awayTeam)}</span>
                        <span style={{ fontWeight: f.awayScore! > f.homeScore! ? 700 : 500 }}>{f.awayTeam}</span>
                      </div>
                      <div className="fixture-score">{f.awayScore}</div>
                    </div>
                  </div>
                  {pred && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', minWidth: '60px' }}>
                      <span className={`tier-badge tier-${pred.scoringTier}`} style={{ fontSize: '0.55rem', padding: '2px 4px', marginBottom: '2px' }}>{pred.scoringTier}</span>
                      <span className="points-display" style={{ fontSize: '0.9rem' }}>+{pred.pointsAwarded || 0}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

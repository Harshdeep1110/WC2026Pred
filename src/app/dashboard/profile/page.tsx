import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { SignOutButton } from '@/components/SignOutButton';
import AvatarUploader from '@/components/AvatarUploader';

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user!.id! } });
  const chips = await prisma.chip.findMany({ where: { userId: user!.id } });
  const predictions = await prisma.prediction.findMany({
    where: { userId: user!.id, pointsAwarded: { not: null } },
    include: { fixture: true },
    orderBy: { fixture: { kickoffTimeUtc: 'desc' } },
    take: 10,
  });

  const exactCount = predictions.filter(p => p.scoringTier === 'exact').length;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Profile</h1>
        <SignOutButton className="btn btn-secondary btn-sm" />
      </div>

      <div className="profile-grid">
        {/* Profile card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <AvatarUploader currentAvatarUrl={user!.avatarUrl} displayName={user!.displayName || 'Player'} />
          <h2 style={{ marginBottom: 4 }}>{user!.displayName || 'Player'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>{user!.email}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="stat-card">
              <div className="stat-label">Points</div>
              <div className="stat-value green">{user!.totalPoints}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Exact Scores</div>
              <div className="stat-value gold">{exactCount}</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>Chips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chips.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{c.type.replace('_', ' ')}</span>
                  <span style={{ color: c.status === 'available' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent results */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Recent Scored Predictions</h3>
          {predictions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-desc">No scored predictions yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {predictions.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {p.fixture.homeTeam} {p.fixture.homeScore}–{p.fixture.awayScore} {p.fixture.awayTeam}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      You: {p.homeScorePred}–{p.awayScorePred}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`tier-badge tier-${p.scoringTier}`}>{p.scoringTier}</span>
                    <span className="points-display">+{p.pointsAwarded}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');

  const [userCount, fixtureCount, predictionCount, completedFixtures] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.fixture.count(),
    prisma.prediction.count(),
    prisma.fixture.count({ where: { status: 'full_time' } }),
  ]);

  const adminLinks = [
    { href: '/dashboard/admin/fixtures', icon: '📋', title: 'Manage Fixtures', desc: 'Enter results, update match status' },
    { href: '/dashboard/admin/users', icon: '👥', title: 'Manage Users', desc: 'Invite, ban, manage players' },
    { href: '/dashboard/admin/audit', icon: '📜', title: 'Audit Log', desc: 'View all admin actions' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">⚙️ Admin Dashboard</h1>
        <p className="page-subtitle">Tournament management panel</p>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">Players</div><div className="stat-value green">{userCount}</div></div>
        <div className="stat-card"><div className="stat-label">Fixtures</div><div className="stat-value">{fixtureCount}</div></div>
        <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value gold">{completedFixtures}</div></div>
        <div className="stat-card"><div className="stat-label">Predictions</div><div className="stat-value">{predictionCount}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {adminLinks.map(link => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{link.icon}</div>
              <h3 style={{ marginBottom: 4 }}>{link.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

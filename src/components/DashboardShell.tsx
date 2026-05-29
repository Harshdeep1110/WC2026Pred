'use client';

import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function DashboardShell({ user, children }: { user: any; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="landing-logo" style={{ fontSize: '1.2rem', marginBottom: 0 }}>⚽ Predictor</div>
        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
          {(user.name || '?')[0].toUpperCase()}
        </div>
      </div>

      <div className="app-layout">
        {/* Desktop Sidebar */}
        <Sidebar user={user} />
        
        <main className="main-content">{children}</main>

        {/* Mobile Bottom Navigation */}
        <nav className="bottom-nav">
          <Link href="/dashboard" className={`bottom-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">📊</span>
            <span>Home</span>
          </Link>
          <Link href="/dashboard/fixtures" className={`bottom-nav-item ${pathname?.startsWith('/dashboard/fixtures') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">⚽</span>
            <span>Matches</span>
          </Link>
          <Link href="/dashboard/pre-tournament" className={`bottom-nav-item ${pathname === '/dashboard/pre-tournament' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">📝</span>
            <span>Setup</span>
          </Link>
          <Link href="/dashboard/leaderboard" className={`bottom-nav-item ${pathname === '/dashboard/leaderboard' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">🏆</span>
            <span>Table</span>
          </Link>
          <Link href="/dashboard/profile" className={`bottom-nav-item ${pathname === '/dashboard/profile' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">👤</span>
            <span>Profile</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

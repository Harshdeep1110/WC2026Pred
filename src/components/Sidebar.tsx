'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  user: { name?: string | null; email?: string | null; role?: string };
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/fixtures', icon: '⚽', label: 'Fixtures' },
  { href: '/dashboard/predictions', icon: '🎯', label: 'My Predictions' },
  { href: '/dashboard/chips', icon: '🃏', label: 'Chips' },
  { href: '/dashboard/pre-tournament', icon: '🏆', label: 'Pre-Tournament' },
  { href: '/dashboard/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { href: '/dashboard/feed', icon: '📢', label: 'Activity Feed' },
  { href: '/dashboard/profile', icon: '👤', label: 'Profile' },
];

const adminItems = [
  { href: '/dashboard/admin', icon: '⚙️', label: 'Admin Panel' },
  { href: '/dashboard/admin/fixtures', icon: '📋', label: 'Manage Fixtures' },
  { href: '/dashboard/admin/users', icon: '👥', label: 'Manage Users' },
  { href: '/dashboard/admin/pre-tournament', icon: '🏆', label: 'Score Pre-Tournament' },
  { href: '/dashboard/admin/rival-blocks', icon: '🎯', label: 'Rival Blocks' },
  { href: '/dashboard/admin/audit', icon: '📜', label: 'Audit Log' },
  { href: '/dashboard/admin/settings', icon: '🔒', label: 'Settings' },
];

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === 'admin';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div className="sidebar-logo" style={{ marginBottom: 0 }}>
          ⚽ Predictor
          <span>World Cup 2026</span>
        </div>
        {isOpen && (
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            ✕
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="nav-section-label">Admin</div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '16px', marginTop: '16px' }}>
        <div className="user-row" style={{ marginBottom: '12px' }}>
          <div className="avatar">{(user.name || '?')[0].toUpperCase()}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '100%' }}
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';

export function DashboardShell({ user, children }: { user: any; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="landing-logo" style={{ fontSize: '1.2rem', marginBottom: 0 }}>⚽ Predictor</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setSidebarOpen(true)}>
          ☰ Menu
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        {/* Sidebar - passes close function to let links close it on click */}
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="main-content">{children}</main>
      </div>
    </>
  );
}

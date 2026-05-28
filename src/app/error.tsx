'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="empty-state" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="empty-state-icon">⚠️</div>
      <h2 className="empty-state-title">Something went wrong!</h2>
      <p className="empty-state-desc" style={{ marginBottom: 24 }}>
        We encountered an unexpected error while trying to process your request.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={() => reset()}>
          Try Again
        </button>
        <Link href="/dashboard" className="btn btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

export function ClientDate({ dateStr, type }: { dateStr: string | Date; type: 'time' | 'date' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span style={{ visibility: 'hidden' }}>{type === 'time' ? '00:00 PM' : 'Jan 1'}</span>;
  }

  const d = new Date(dateStr);
  if (type === 'time') {
    return <>{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>;
  }
  return <>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>;
}

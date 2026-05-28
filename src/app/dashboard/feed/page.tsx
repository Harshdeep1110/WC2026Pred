'use client';

import { useEffect, useState } from 'react';

interface FeedEvent { id: string; eventType: string; message: string; createdAt: string; }

export default function FeedPage() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feed').then(r => r.json()).then(data => { setEvents(data); setLoading(false); });
  }, []);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📢 Activity Feed</h1>
        <p className="page-subtitle">Latest events from the prediction league</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8 }} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-desc">Events will appear here as the tournament progresses.</div>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="feed-item">
              <div className="feed-content">
                <div className="feed-message">{event.message}</div>
                <div className="feed-time">{timeAgo(event.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

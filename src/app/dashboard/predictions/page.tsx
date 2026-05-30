'use client';

import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

interface Prediction {
  id: string; homeScorePred: number | null; awayScorePred: number | null;
  pointsAwarded: number | null; scoringTier: string | null; isLocked: boolean;
  fixture: { id: number; homeTeam: string; awayTeam: string; group: string; homeScore: number | null; awayScore: number | null; status: string; };
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PredictionsPage() {
  const { data: predictions, isLoading: loading } = useSWR<Prediction[]>('/api/predictions', fetcher, {
    refreshInterval: 60000,
  });

  const scored = (predictions || []).filter(p => p.pointsAwarded !== null);
  const total = scored.reduce((sum, p) => sum + (p.pointsAwarded || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <h1 className="page-title">My Predictions</h1>
        <p className="page-subtitle">{(predictions || []).length} predictions • {total} points earned</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : !predictions || predictions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No predictions yet</div>
          <div className="empty-state-desc">Head to Fixtures to start predicting match scores.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {predictions.map(p => (
              <motion.div 
                key={p.id} 
                className="card" 
                style={{ padding: '14px 20px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                layout
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {p.fixture.homeTeam} vs {p.fixture.awayTeam}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.fixture.status === 'full_time'
                        ? `Result: ${p.fixture.homeScore}–${p.fixture.awayScore}`
                        : `Group ${p.fixture.group}`}
                      {' • '}Your prediction: {p.homeScorePred ?? '–'}–{p.awayScorePred ?? '–'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.scoringTier && <span className={`tier-badge tier-${p.scoringTier}`}>{p.scoringTier}</span>}
                    {p.pointsAwarded !== null && <span className="points-display">+{p.pointsAwarded}</span>}
                    {!p.isLocked && <span className="badge badge-active">Editable</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

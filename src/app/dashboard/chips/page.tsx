'use client';

import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

interface Chip { id: string; type: string; status: string; fixtureId: number | null; }

const chipInfo: Record<string, { emoji: string; name: string; desc: string; cssClass: string }> = {
  banker: { emoji: '🏦', name: 'The Banker', desc: 'Doubles all points from a fixture', cssClass: 'banker' },
  rival_block: { emoji: '🚨', name: 'Rival Block', desc: 'Wipe a rival\'s exact score to 0', cssClass: 'rival-block' },
  halftime_sub: { emoji: '⏱️', name: 'Halftime Sub', desc: 'Change prediction at halftime (50% penalty)', cssClass: 'halftime-sub' },
  goalfest: { emoji: '🎯', name: 'Goal-Fest', desc: '+3 points for every goal scored in the match', cssClass: 'goalfest' },
  defensive_masterclass: { emoji: '🛡️', name: 'Defensive Masterclass', desc: 'Clean sheet = +15 pts, No clean sheet = -8 pts', cssClass: 'defensive-masterclass' },
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ChipsPage() {
  const { data: chips, isLoading: loading } = useSWR<Chip[]>('/api/chips', fetcher, {
    refreshInterval: 60000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <h1 className="page-title">Your Chips</h1>
        <p className="page-subtitle">Strategic power-ups — use them wisely, each can only be played once</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <AnimatePresence>
            {(chips || []).map(chip => {
              const info = chipInfo[chip.type];
              if (!info) return null;
              return (
                <motion.div 
                  key={chip.id} 
                  className="card" 
                  style={{
                    opacity: chip.status === 'burned' ? 0.5 : 1,
                    position: 'relative', overflow: 'hidden',
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: chip.status === 'burned' ? 0.5 : 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  {chip.status === 'burned' && (
                    <div style={{
                      position: 'absolute', top: 16, right: -28,
                      background: 'var(--accent-red)', color: '#fff',
                      padding: '4px 40px', fontSize: '0.7rem', fontWeight: 700,
                      transform: 'rotate(45deg)', textTransform: 'uppercase',
                    }}>
                      Used
                    </div>
                  )}
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{info.emoji}</div>
                  <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>{info.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
                    {info.desc}
                  </p>
                  <span className={`chip-badge ${info.cssClass} ${chip.status === 'burned' ? 'burned' : ''}`}>
                    {chip.status === 'available' ? '✨ Available' : `Burned on Match #${chip.fixtureId}`}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

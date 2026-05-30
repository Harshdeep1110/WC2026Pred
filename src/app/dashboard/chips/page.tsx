'use client';

import { useEffect, useState } from 'react';

interface Chip { id: string; type: string; status: string; fixtureId: number | null; }

const chipInfo: Record<string, { emoji: string; name: string; desc: string; cssClass: string }> = {
  banker: { emoji: '🏦', name: 'The Banker', desc: 'Doubles all points from a fixture', cssClass: 'banker' },
  rival_block: { emoji: '🚨', name: 'Rival Block', desc: 'Wipe a rival\'s exact score to 0', cssClass: 'rival-block' },
  halftime_sub: { emoji: '⏱️', name: 'Halftime Sub', desc: 'Change prediction at halftime (50% penalty)', cssClass: 'halftime-sub' },
  goalfest: { emoji: '🎯', name: 'Goal-Fest', desc: '4+ goals = ×2 points, ≤3 goals = 0', cssClass: 'goalfest' },
};

export default function ChipsPage() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chips')
      .then(r => r.json())
      .then(data => { setChips(data); setLoading(false); });
  }, []);

  return (
    <>
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
          {chips.map(chip => {
            const info = chipInfo[chip.type];
            if (!info) return null;
            return (
              <div key={chip.id} className="card" style={{
                opacity: chip.status === 'burned' ? 0.5 : 1,
                position: 'relative', overflow: 'hidden',
              }}>
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
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

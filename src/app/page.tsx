import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="landing-page">
      <div className="landing-bg">
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      <nav className="landing-nav">
        <div className="landing-logo">⚽ Predictor</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn btn-secondary btn-sm">Sign In</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Join Now</Link>
        </div>
      </nav>

      <main className="landing-hero">
        <div className="landing-badge">FIFA World Cup 2026</div>
        <h1 className="landing-title">
          Predict. <span className="landing-accent">Compete.</span> Conquer.
        </h1>
        <p className="landing-subtitle">
          Join the ultimate prediction league for the 2026 World Cup. 
          Predict scores across 104 matches, play strategic chips, and climb the leaderboard 
          to prove you know football better than your friends.
        </p>
        <div className="landing-cta">
          <Link href="/register" className="btn btn-primary btn-lg">
            Start Predicting →
          </Link>
          <Link href="/login" className="btn btn-glass btn-lg">
            Already a Member
          </Link>
        </div>

        <div className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🎯</div>
            <h3>Score Predictions</h3>
            <p>Predict exact scores for all 104 matches across group stages and knockouts</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🃏</div>
            <h3>Strategic Chips</h3>
            <p>Play 4 unique power-ups: The Banker, Rival Block, Halftime Sub, and Goal-Fest</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🏆</div>
            <h3>Live Leaderboard</h3>
            <p>Track your ranking in real-time and compete for bragging rights</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">📊</div>
            <h3>5-Tier Scoring</h3>
            <p>Earn points across 5 tiers: Exact, Goal Diff, Result, Incorrect, and Auto-Zero</p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>June 11 – July 19, 2026 • Private Invite-Only League</p>
      </footer>
    </div>
  );
}

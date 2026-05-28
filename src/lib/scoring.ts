// Scoring tier point values
export const TIER_POINTS = {
  exact: 10,
  goal_diff: 5,
  result: 3,
  incorrect: 0,
  auto_zero: 0,
} as const;

// Pre-tournament award points
export const PRE_TOURNAMENT_POINTS = 20;

// Group standing points per correct position
export const GROUP_POSITION_POINTS = 2;

export type ScoringTier = keyof typeof TIER_POINTS;

export interface ScoringInput {
  homeScorePred: number | null;
  awayScorePred: number | null;
  homeScoreActual: number;
  awayScoreActual: number;
}

export interface ChipModifiers {
  hasBanker: boolean;
  hasGoalFest: boolean;
  halftimeSubUsed: boolean;
  isRivalBlocked: boolean;
  totalGoals: number;
}

function getOutcome(home: number, away: number): 'home_win' | 'away_win' | 'draw' {
  if (home > away) return 'home_win';
  if (away > home) return 'away_win';
  return 'draw';
}

export function computeScoringTier(input: ScoringInput): ScoringTier {
  const { homeScorePred, awayScorePred, homeScoreActual, awayScoreActual } = input;

  // Auto-zero: no prediction submitted
  if (homeScorePred === null || awayScorePred === null) {
    return 'auto_zero';
  }

  // Exact score match
  if (homeScorePred === homeScoreActual && awayScorePred === awayScoreActual) {
    return 'exact';
  }

  const predictedOutcome = getOutcome(homeScorePred, awayScorePred);
  const actualOutcome = getOutcome(homeScoreActual, awayScoreActual);

  // Must have correct result (W/D/L) for goal_diff or result tiers
  if (predictedOutcome !== actualOutcome) {
    return 'incorrect';
  }

  // Correct goal difference (and correct result)
  const goalMarginPred = Math.abs(homeScorePred - awayScorePred);
  const goalMarginActual = Math.abs(homeScoreActual - awayScoreActual);

  if (goalMarginPred === goalMarginActual) {
    return 'goal_diff';
  }

  // Correct result only
  return 'result';
}

export function computeFinalPoints(tier: ScoringTier, modifiers: ChipModifiers): number {
  let points: number = TIER_POINTS[tier];

  // GoalFest check — if total goals <= 3 and GoalFest was played, zero out
  if (modifiers.hasGoalFest && modifiers.totalGoals <= 3) {
    return 0;
  }

  // Banker multiplier
  if (modifiers.hasBanker) {
    points *= 2;
  }

  // GoalFest multiplier (only fires if total_goals >= 4)
  if (modifiers.hasGoalFest && modifiers.totalGoals >= 4) {
    points *= 2;
  }

  // Halftime sub penalty
  if (modifiers.halftimeSubUsed) {
    points = Math.floor(points * 0.5);
  }

  // Rival Block wipe — overrides everything if target got exact score
  if (modifiers.isRivalBlocked && tier === 'exact') {
    return 0;
  }

  return points;
}

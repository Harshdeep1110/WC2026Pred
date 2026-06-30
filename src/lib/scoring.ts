// Scoring tier point values — group stage
export const TIER_POINTS = {
  exact: 10,
  goal_diff: 5,
  result: 3,
  incorrect: 0,
  auto_zero: 0,
} as const;

// Scoring tier point values — knockout rounds (R32 onwards)
export const KNOCKOUT_TIER_POINTS = {
  exact: 20,
  goal_diff: 10,
  result: 5,
  incorrect: 0,
  auto_zero: 0,
} as const;

const KNOCKOUT_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'third_place', 'final']);

export function isKnockoutStage(stage: string): boolean {
  return KNOCKOUT_STAGES.has(stage);
}

export function getTierPoints(stage: string): Record<string, number> {
  return isKnockoutStage(stage) ? KNOCKOUT_TIER_POINTS : TIER_POINTS;
}

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
  hasDefensiveMasterclass: boolean;
  halftimeSubUsed: boolean;
  isRivalBlocked: boolean;
  totalGoals: number;
  hasCleanSheet: boolean;
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

export function computeFinalPoints(tier: ScoringTier, modifiers: ChipModifiers, stage: string = 'group'): number {
  const tierTable = getTierPoints(stage);
  let points: number = tierTable[tier];

  // GoalFest: +3 points for every goal scored in the match
  if (modifiers.hasGoalFest) {
    points += modifiers.totalGoals * 3;
  }

  // Defensive Masterclass: +15 if clean sheet, -8 if no clean sheet
  if (modifiers.hasDefensiveMasterclass) {
    if (modifiers.hasCleanSheet) {
      points += 15;
    } else {
      points -= 8;
    }
  }

  // Banker multiplier (applies after GoalFest and Defensive Masterclass additions)
  if (modifiers.hasBanker) {
    points *= 2;
  }

  // Halftime sub penalty (applies to the whole total)
  if (modifiers.halftimeSubUsed) {
    points = Math.floor(points * 0.5);
  }

  // Rival Block wipe — overrides everything
  if (modifiers.isRivalBlocked) {
    return 0;
  }

  return points;
}

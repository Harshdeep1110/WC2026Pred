import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeScoringTier, computeFinalPoints, TIER_POINTS, KNOCKOUT_TIER_POINTS, getTierPoints } from './scoring';

describe('Scoring Engine', () => {
  describe('computeScoringTier', () => {
    test('exact score match', () => {
      const tier = computeScoringTier({ homeScorePred: 2, awayScorePred: 1, homeScoreActual: 2, awayScoreActual: 1 });
      assert.strictEqual(tier, 'exact');
    });

    test('goal difference match (home win)', () => {
      const tier = computeScoringTier({ homeScorePred: 3, awayScorePred: 1, homeScoreActual: 2, awayScoreActual: 0 });
      assert.strictEqual(tier, 'goal_diff');
    });

    test('goal difference match (draw)', () => {
      const tier = computeScoringTier({ homeScorePred: 1, awayScorePred: 1, homeScoreActual: 0, awayScoreActual: 0 });
      assert.strictEqual(tier, 'goal_diff');
    });

    test('result match', () => {
      const tier = computeScoringTier({ homeScorePred: 1, awayScorePred: 0, homeScoreActual: 3, awayScoreActual: 0 });
      assert.strictEqual(tier, 'result');
    });

    test('incorrect result', () => {
      const tier = computeScoringTier({ homeScorePred: 1, awayScorePred: 0, homeScoreActual: 0, awayScoreActual: 1 });
      assert.strictEqual(tier, 'incorrect');
    });

    test('auto zero (missing pred)', () => {
      const tier = computeScoringTier({ homeScorePred: null, awayScorePred: null, homeScoreActual: 1, awayScoreActual: 0 });
      assert.strictEqual(tier, 'auto_zero');
    });
  });

  describe('getTierPoints', () => {
    test('returns group points for group stage', () => {
      assert.strictEqual(getTierPoints('group'), TIER_POINTS);
    });

    test('returns knockout points for r32', () => {
      assert.strictEqual(getTierPoints('r32'), KNOCKOUT_TIER_POINTS);
    });

    test('returns knockout points for final', () => {
      assert.strictEqual(getTierPoints('final'), KNOCKOUT_TIER_POINTS);
    });
  });

  describe('computeFinalPoints — group stage', () => {
    const baseMods = { 
      hasBanker: false, 
      hasGoalFest: false, 
      hasDefensiveMasterclass: false,
      halftimeSubUsed: false, 
      isRivalBlocked: false, 
      totalGoals: 2,
      hasCleanSheet: false
    };

    test('base exact score', () => {
      const pts = computeFinalPoints('exact', baseMods);
      assert.strictEqual(pts, TIER_POINTS.exact);
    });

    test('banker doubles points', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true });
      assert.strictEqual(pts, TIER_POINTS.exact * 2);
    });

    test('goalfest adds 3 points per goal (e.g. 3 goals = +9)', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasGoalFest: true, totalGoals: 3 });
      assert.strictEqual(pts, TIER_POINTS.exact + (3 * 3));
    });

    test('goalfest adds 3 points per goal (e.g. 5 goals = +15)', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasGoalFest: true, totalGoals: 5 });
      assert.strictEqual(pts, TIER_POINTS.exact + (5 * 3));
    });

    test('banker + goalfest doubles base AND goalfest points', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true, hasGoalFest: true, totalGoals: 5 });
      // Exact (10) + GoalFest (15) = 25. Banker * 2 = 50.
      assert.strictEqual(pts, (TIER_POINTS.exact + 15) * 2);
    });

    test('defensive masterclass adds 15 points if clean sheet', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasDefensiveMasterclass: true, hasCleanSheet: true });
      assert.strictEqual(pts, TIER_POINTS.exact + 15);
    });

    test('defensive masterclass subtracts 8 points if no clean sheet', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasDefensiveMasterclass: true, hasCleanSheet: false });
      assert.strictEqual(pts, TIER_POINTS.exact - 8);
    });

    test('halftime sub halves points', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, halftimeSubUsed: true });
      assert.strictEqual(pts, Math.floor(TIER_POINTS.exact * 0.5));
    });
    
    test('halftime sub with banker', () => {
      // 10 * 2 = 20, half is 10
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true, halftimeSubUsed: true });
      assert.strictEqual(pts, Math.floor((TIER_POINTS.exact * 2) * 0.5));
    });

    test('rival block zeros points if target got exact score', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, isRivalBlocked: true });
      assert.strictEqual(pts, 0);
    });

    test('rival block zeros points if target did not get exact score', () => {
      const pts = computeFinalPoints('result', { ...baseMods, isRivalBlocked: true });
      assert.strictEqual(pts, 0); // Affects all tiers now
    });
  });

  describe('computeFinalPoints — knockout stage', () => {
    const baseMods = { 
      hasBanker: false, 
      hasGoalFest: false, 
      hasDefensiveMasterclass: false,
      halftimeSubUsed: false, 
      isRivalBlocked: false, 
      totalGoals: 2,
      hasCleanSheet: false
    };

    test('knockout exact score awards 20 points', () => {
      const pts = computeFinalPoints('exact', baseMods, 'r32');
      assert.strictEqual(pts, 20);
    });

    test('knockout goal_diff awards 10 points', () => {
      const pts = computeFinalPoints('goal_diff', baseMods, 'r16');
      assert.strictEqual(pts, 10);
    });

    test('knockout result awards 5 points', () => {
      const pts = computeFinalPoints('result', baseMods, 'qf');
      assert.strictEqual(pts, 5);
    });

    test('knockout incorrect awards 0 points', () => {
      const pts = computeFinalPoints('incorrect', baseMods, 'final');
      assert.strictEqual(pts, 0);
    });

    test('knockout banker doubles 20 to 40', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true }, 'sf');
      assert.strictEqual(pts, 40);
    });

    test('knockout goalfest + banker', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true, hasGoalFest: true, totalGoals: 5 }, 'r32');
      // Exact (20) + GoalFest (15) = 35. Banker * 2 = 70.
      assert.strictEqual(pts, 70);
    });

    test('knockout defensive masterclass + banker on failure (can go negative)', () => {
      const pts = computeFinalPoints('incorrect', { ...baseMods, hasBanker: true, hasDefensiveMasterclass: true, hasCleanSheet: false }, 'sf');
      // Incorrect (0) - DM (8) = -8. Banker * 2 = -16.
      assert.strictEqual(pts, -16);
    });
  });
});

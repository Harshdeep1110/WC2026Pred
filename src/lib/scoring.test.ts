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
    const baseMods = { hasBanker: false, hasGoalFest: false, halftimeSubUsed: false, isRivalBlocked: false, totalGoals: 2 };

    test('base exact score', () => {
      const pts = computeFinalPoints('exact', baseMods);
      assert.strictEqual(pts, TIER_POINTS.exact);
    });

    test('banker doubles points', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true });
      assert.strictEqual(pts, TIER_POINTS.exact * 2);
    });

    test('goalfest zeros points if total goals <= 3', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasGoalFest: true, totalGoals: 3 });
      assert.strictEqual(pts, 0);
    });

    test('goalfest doubles points if total goals >= 4', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasGoalFest: true, totalGoals: 4 });
      assert.strictEqual(pts, TIER_POINTS.exact * 2);
    });

    test('banker + goalfest (>=4 goals) quadruples points', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true, hasGoalFest: true, totalGoals: 5 });
      assert.strictEqual(pts, TIER_POINTS.exact * 4);
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

    test('rival block does NOT zero points if target did not get exact score', () => {
      // If the target didn't get exact, we don't pass isRivalBlocked=true down to computeFinalPoints, 
      // or we handle it at the caller level. The function itself zeros it out if the flag is true.
      // So this test is just verifying the function logic as implemented.
      const pts = computeFinalPoints('result', { ...baseMods, isRivalBlocked: true });
      assert.strictEqual(pts, TIER_POINTS.result); // Only affects 'exact' tier!
    });
  });

  describe('computeFinalPoints — knockout stage', () => {
    const baseMods = { hasBanker: false, hasGoalFest: false, halftimeSubUsed: false, isRivalBlocked: false, totalGoals: 2 };

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

    test('knockout goalfest + banker quadruples to 80', () => {
      const pts = computeFinalPoints('exact', { ...baseMods, hasBanker: true, hasGoalFest: true, totalGoals: 5 }, 'r32');
      assert.strictEqual(pts, 80);
    });
  });
});

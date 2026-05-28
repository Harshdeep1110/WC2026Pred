import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { computeScoringTier, computeFinalPoints } from '@/lib/scoring';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const fixtureId = parseInt(id);
  const { homeScore, awayScore } = await req.json();

  if (homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Scores required' }, { status: 400 });
  }

  const totalGoals = homeScore + awayScore;

  // Update fixture
  await prisma.fixture.update({
    where: { id: fixtureId },
    data: { homeScore, awayScore, totalGoals, status: 'full_time' },
  });

  // Get all locked predictions for this fixture
  const predictions = await prisma.prediction.findMany({
    where: { fixtureId, isLocked: true },
    include: { user: true },
  });

  // Get all chips played on this fixture
  const chips = await prisma.chip.findMany({
    where: { fixtureId, status: 'burned' },
  });

  // Score each prediction
  for (const pred of predictions) {
    const tier = computeScoringTier({
      homeScorePred: pred.homeScorePred,
      awayScorePred: pred.awayScorePred,
      homeScoreActual: homeScore,
      awayScoreActual: awayScore,
    });

    const userChips = chips.filter((c: any) => c.userId === pred.userId);
    const rivalBlock = chips.find((c: any) => c.type === 'rival_block' && c.targetUserId === pred.userId);

    const points = computeFinalPoints(tier, {
      hasBanker: userChips.some((c: any) => c.type === 'banker'),
      hasGoalFest: userChips.some((c: any) => c.type === 'goalfest'),
      halftimeSubUsed: pred.halftimeSubUsed,
      isRivalBlocked: !!rivalBlock,
      totalGoals,
    });

    await prisma.prediction.update({
      where: { id: pred.id },
      data: { scoringTier: tier, pointsAwarded: points },
    });

    // Update user total points
    const allPredictions = await prisma.prediction.findMany({
      where: { userId: pred.userId, pointsAwarded: { not: null } },
    });
    const total = allPredictions.reduce((sum, p) => sum + (p.pointsAwarded || 0), 0);
    await prisma.user.update({
      where: { id: pred.userId },
      data: { totalPoints: total },
    });

    // Handle rival block reveal
    if (rivalBlock) {
      if (tier === 'exact') {
        await prisma.activityFeedEvent.create({
          data: {
            eventType: 'rival_block_reveal',
            fixtureId,
            actorUserId: rivalBlock.userId,
            targetUserId: pred.userId,
            message: `💥 REVEAL: ${(await prisma.user.findUnique({ where: { id: rivalBlock.userId } }))?.displayName} blocked ${pred.user.displayName}'s perfect prediction!`,
            isVisible: true,
          },
        });
      } else {
        await prisma.activityFeedEvent.updateMany({
          where: { fixtureId, eventType: 'chip_used', actorUserId: rivalBlock.userId, isVisible: false },
          data: {
            isVisible: true,
            message: `${(await prisma.user.findUnique({ where: { id: rivalBlock.userId } }))?.displayName}'s Rival Block had no effect.`,
          },
        });
      }
    }
  }

  // Create result feed event
  const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } });
  await prisma.activityFeedEvent.create({
    data: {
      eventType: 'result_entered',
      fixtureId,
      message: `✅ Result: ${fixture!.homeTeam} ${homeScore}–${awayScore} ${fixture!.awayTeam}`,
      isVisible: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: 'RESULT_ENTERED',
      targetUserId: session.user.id!,
      notes: `${fixture!.homeTeam} ${homeScore}-${awayScore} ${fixture!.awayTeam}`,
    },
  });

  return NextResponse.json({ success: true, scored: predictions.length });
}

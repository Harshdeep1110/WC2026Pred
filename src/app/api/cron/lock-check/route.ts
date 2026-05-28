import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  // Security: validate CRON_SECRET header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Find all fixtures that are locked (lockTimeUtc <= now) and still upcoming or live
    // lockTimeUtc is stored as an ISO string, which sorts lexicographically
    const lockedFixtures = await prisma.fixture.findMany({
      where: {
        lockTimeUtc: { lte: now },
        status: { in: ['upcoming', 'live', 'halftime'] },
      },
      select: { id: true },
    });

    if (lockedFixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures to process', created: 0 });
    }

    const fixtureIds = lockedFixtures.map(f => f.id);

    // Get all active users
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let autoZeroCount = 0;

    for (const fixture of lockedFixtures) {
      // Find users who already have a prediction for this fixture
      const existingPredictions = await prisma.prediction.findMany({
        where: { fixtureId: fixture.id },
        select: { userId: true },
      });

      const usersWithPredictions = new Set(existingPredictions.map(p => p.userId));

      // Find users who are missing a prediction
      const missingUsers = activeUsers.filter(u => !usersWithPredictions.has(u.id));

      if (missingUsers.length > 0) {
        // Create auto_zero predictions for missing users
        await prisma.prediction.createMany({
          data: missingUsers.map(u => ({
            userId: u.id,
            fixtureId: fixture.id,
            homeScorePred: null,
            awayScorePred: null,
            isLocked: true,
            scoringTier: 'auto_zero',
            pointsAwarded: 0,
          })),
        });

        autoZeroCount += missingUsers.length;
      }

      // Lock all existing unlocked predictions for this fixture
      await prisma.prediction.updateMany({
        where: { fixtureId: fixture.id, isLocked: false },
        data: { isLocked: true },
      });
    }

    return NextResponse.json({
      message: `Processed ${fixtureIds.length} fixtures`,
      fixturesProcessed: fixtureIds.length,
      autoZeroCreated: autoZeroCount,
    });
  } catch (error) {
    console.error('Lock-check cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

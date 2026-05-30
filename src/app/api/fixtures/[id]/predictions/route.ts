import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const fixtureId = parseInt(id);

    const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } });
    if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

    // Check if match is locked
    const isLocked = new Date() >= new Date(fixture.lockTimeUtc);
    if (!isLocked) {
      return NextResponse.json({ error: 'Predictions are hidden until the match locks' }, { status: 403 });
    }

    // Fetch all predictions and chips for this fixture
    const [predictions, chips] = await Promise.all([
      prisma.prediction.findMany({
        where: { fixtureId },
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true }
          }
        },
        orderBy: [
          { pointsAwarded: 'desc' },
          { user: { displayName: 'asc' } }
        ]
      }),
      prisma.chip.findMany({
        where: { fixtureId, status: 'burned' }
      })
    ]);

    // Attach chips to their respective users' predictions
    const communityPredictions = predictions.map(pred => {
      const userChips = chips.filter(c => c.userId === pred.userId);
      const isRivalBlocked = chips.some(c => c.type === 'rival_block' && c.targetUserId === pred.userId);

      return {
        ...pred,
        chips: userChips.map(c => c.type),
        isRivalBlocked
      };
    });

    return NextResponse.json(communityPredictions);
  } catch (error) {
    console.error('Community predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

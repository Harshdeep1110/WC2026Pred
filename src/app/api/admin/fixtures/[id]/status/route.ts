import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();
  const validStatuses = ['upcoming', 'live', 'halftime', 'full_time'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const fixture = await prisma.fixture.update({
    where: { id: parseInt(id) },
    data: { status },
  });

  // If status is being set to 'live' or later, lock all predictions
  if (['live', 'halftime', 'full_time'].includes(status)) {
    await prisma.prediction.updateMany({
      where: { fixtureId: fixture.id, isLocked: false },
      data: { isLocked: true },
    });

    // Create auto-zero for users who didn't predict
    const allUsers = await prisma.user.findMany({ where: { isActive: true } });
    const existingPredictions = await prisma.prediction.findMany({
      where: { fixtureId: fixture.id },
      select: { userId: true },
    });
    const predictedUserIds = new Set(existingPredictions.map(p => p.userId));

    for (const user of allUsers) {
      if (!predictedUserIds.has(user.id)) {
        await prisma.prediction.create({
          data: {
            userId: user.id,
            fixtureId: fixture.id,
            homeScorePred: null,
            awayScorePred: null,
            isLocked: true,
            scoringTier: 'auto_zero',
            pointsAwarded: 0,
          },
        });
      }
    }
  }

  return NextResponse.json(fixture);
}

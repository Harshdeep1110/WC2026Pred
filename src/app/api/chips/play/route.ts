import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

// Play a chip on a fixture
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const { chipType, fixtureId, targetUserId } = await req.json();

  if (!chipType || !fixtureId) {
    return NextResponse.json({ error: 'chipType and fixtureId are required' }, { status: 400 });
  }

  const validTypes = ['banker', 'rival_block', 'halftime_sub', 'goalfest', 'defensive_masterclass'];
  if (!validTypes.includes(chipType)) {
    return NextResponse.json({ error: 'Invalid chip type' }, { status: 400 });
  }

  // Get the chip
  const chip = await prisma.chip.findFirst({
    where: { userId, type: chipType, status: 'available' },
  });
  if (!chip) {
    return NextResponse.json({ error: 'Chip not available' }, { status: 400 });
  }

  // Get the fixture
  const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } });
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  // Halftime Sub: can only be played during halftime
  if (chipType === 'halftime_sub') {
    if (fixture.status !== 'halftime') {
      return NextResponse.json({ error: 'Halftime Sub can only be played at halftime' }, { status: 400 });
    }
  } else {
    // All other chips: must be played before lock
    if (new Date() >= new Date(fixture.lockTimeUtc)) {
      return NextResponse.json({ error: 'Prediction window closed' }, { status: 423 });
    }
  }

  // Rival Block: requires targetUserId
  if (chipType === 'rival_block' && !targetUserId) {
    return NextResponse.json({ error: 'Target user required for Rival Block' }, { status: 400 });
  }

  // Rival Block: can't target yourself
  if (chipType === 'rival_block' && targetUserId === userId) {
    return NextResponse.json({ error: 'Cannot rival block yourself' }, { status: 400 });
  }

  // Execute chip play in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Burn the chip
    const updatedChip = await tx.chip.update({
      where: { id: chip.id },
      data: {
        status: 'burned',
        fixtureId,
        burnedAt: new Date(),
        targetUserId: chipType === 'rival_block' ? targetUserId : null,
      },
    });

    // Halftime Sub: unlock the prediction
    if (chipType === 'halftime_sub') {
      const prediction = await tx.prediction.findFirst({
        where: { userId, fixtureId },
      });
      if (prediction) {
        await tx.prediction.update({
          where: { id: prediction.id },
          data: { isLocked: false, halftimeSubUsed: true },
        });
      }
    }

    // Create activity feed event
    const chipNames: Record<string, string> = {
      banker: '🏦 The Banker',
      rival_block: '🚨 Rival Block',
      halftime_sub: '⏱️ Halftime Sub',
      goalfest: '🎯 Goal-Fest',
      defensive_masterclass: '🛡️ Defensive Masterclass'
    };

    const user = await tx.user.findUnique({ where: { id: userId } });

    await tx.activityFeedEvent.create({
      data: {
        eventType: 'chip_used',
        fixtureId,
        actorUserId: userId,
        targetUserId: chipType === 'rival_block' ? targetUserId : null,
        message: `${user!.displayName} played ${chipNames[chipType]} on ${fixture.homeTeam} vs ${fixture.awayTeam}`,
        // Rival Block events are hidden until match is scored
        isVisible: chipType !== 'rival_block',
      },
    });

    return updatedChip;
  });

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const { searchParams } = new URL(req.url);
  const chipId = searchParams.get('chipId');

  if (!chipId) return NextResponse.json({ error: 'chipId required' }, { status: 400 });

  const chip = await prisma.chip.findUnique({ where: { id: chipId } });
  if (!chip || chip.userId !== userId || chip.status !== 'burned') {
    return NextResponse.json({ error: 'Invalid chip' }, { status: 400 });
  }

  const fixture = await prisma.fixture.findUnique({ where: { id: chip.fixtureId! } });
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  if (chip.type === 'halftime_sub') {
    if (fixture.status !== 'halftime' && new Date() >= new Date(fixture.lockTimeUtc)) {
      return NextResponse.json({ error: 'Cannot unplay Halftime Sub outside of halftime or pre-match' }, { status: 400 });
    }
  } else {
    if (new Date() >= new Date(fixture.lockTimeUtc)) {
      return NextResponse.json({ error: 'Prediction window closed' }, { status: 423 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.chip.update({
      where: { id: chipId },
      data: { status: 'available', fixtureId: null, burnedAt: null, targetUserId: null },
    });

    if (chip.type === 'halftime_sub') {
      const prediction = await tx.prediction.findFirst({ where: { userId, fixtureId: fixture.id } });
      if (prediction) {
        await tx.prediction.update({
          where: { id: prediction.id },
          data: { isLocked: fixture.status !== 'upcoming', halftimeSubUsed: false },
        });
      }
    }

    await tx.activityFeedEvent.deleteMany({
      where: { eventType: 'chip_used', fixtureId: fixture.id, actorUserId: userId },
    });
  });

  return NextResponse.json({ success: true });
}

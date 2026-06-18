import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { locked } = await req.json();

  if (typeof locked !== 'boolean') {
    return NextResponse.json({ error: 'Locked status must be a boolean' }, { status: 400 });
  }

  try {
    // 1. Update all existing PreTournamentPredictions
    await prisma.preTournamentPrediction.updateMany({
      data: { isLocked: locked },
    });

    // 2. Update all existing GroupStandingPredictions
    await prisma.groupStandingPrediction.updateMany({
      data: { isLocked: locked },
    });

    // 3. Update the global setting so new ones can't be created
    await prisma.systemSetting.upsert({
      where: { key: 'PRE_TOURNAMENT_LOCKED' },
      update: { value: String(locked) },
      create: { key: 'PRE_TOURNAMENT_LOCKED', value: String(locked) },
    });

    // 4. Audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: locked ? 'LOCK_PRE_TOURNAMENT' : 'UNLOCK_PRE_TOURNAMENT',
        notes: `Pre-tournament predictions and group standings globally ${locked ? 'locked' : 'unlocked'}.`,
      },
    });

    return NextResponse.json({ success: true, locked });
  } catch (error) {
    console.error('Failed to update pre-tournament lock status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

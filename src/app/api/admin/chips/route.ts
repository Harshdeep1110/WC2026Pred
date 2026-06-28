import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

// GET: Fetch all chips for a specific user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const chips = await prisma.chip.findMany({
    where: { userId },
    include: {
      fixture: { select: { id: true, homeTeam: true, awayTeam: true } },
      targetUser: { select: { id: true, displayName: true } },
    },
    orderBy: { type: 'asc' },
  });

  return NextResponse.json({ chips });
}

// POST: Grant or revoke a chip for a user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, chipType, action } = await req.json();

  if (!userId || !chipType || !action) {
    return NextResponse.json({ error: 'userId, chipType, and action are required' }, { status: 400 });
  }

  const validTypes = ['banker', 'rival_block', 'halftime_sub', 'goalfest', 'defensive_masterclass'];
  if (!validTypes.includes(chipType)) {
    return NextResponse.json({ error: 'Invalid chip type' }, { status: 400 });
  }

  if (action === 'grant') {
    // Check if user already has an available chip of this type
    const existing = await prisma.chip.findFirst({
      where: { userId, type: chipType, status: 'available' },
    });
    if (existing) {
      return NextResponse.json({ error: 'User already has an available chip of this type' }, { status: 400 });
    }

    await prisma.chip.create({
      data: { userId, type: chipType, status: 'available' },
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: 'CHIP_GRANTED',
        targetUserId: userId,
        notes: `Granted ${chipType} chip`,
      },
    });

    return NextResponse.json({ success: true, message: `Granted ${chipType} to user` });

  } else if (action === 'revoke') {
    const chip = await prisma.chip.findFirst({
      where: { userId, type: chipType, status: 'available' },
    });
    if (!chip) {
      return NextResponse.json({ error: 'No available chip of this type found' }, { status: 404 });
    }

    await prisma.chip.delete({ where: { id: chip.id } });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: 'CHIP_REVOKED',
        targetUserId: userId,
        notes: `Revoked ${chipType} chip`,
      },
    });

    return NextResponse.json({ success: true, message: `Revoked ${chipType} from user` });

  } else {
    return NextResponse.json({ error: 'action must be "grant" or "revoke"' }, { status: 400 });
  }
}

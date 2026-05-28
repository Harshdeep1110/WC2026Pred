import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

// Manual point adjustment
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, delta, reason } = await req.json();

  if (!userId || delta === undefined || !reason) {
    return NextResponse.json({ error: 'userId, delta, and reason are required' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: delta } },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: 'MANUAL_POINT_ADJUSTMENT',
      targetUserId: userId,
      delta,
      notes: reason,
    },
  });

  // Activity feed
  await prisma.activityFeedEvent.create({
    data: {
      eventType: 'manual_adjustment',
      actorUserId: session.user.id!,
      targetUserId: userId,
      message: `📊 ${user.displayName} received ${delta > 0 ? '+' : ''}${delta} points: ${reason}`,
      isVisible: true,
    },
  });

  return NextResponse.json({ user, delta });
}

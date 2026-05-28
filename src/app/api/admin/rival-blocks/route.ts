import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const blocks = await prisma.chip.findMany({
    where: { type: 'rival_block', status: 'burned' },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
      targetUser: { select: { id: true, displayName: true, email: true } },
      fixture: { select: { id: true, homeTeam: true, awayTeam: true, status: true, homeScore: true, awayScore: true } },
    },
    orderBy: { burnedAt: 'desc' },
  });

  return NextResponse.json({ blocks });
}

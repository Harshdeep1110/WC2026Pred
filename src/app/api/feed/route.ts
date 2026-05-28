import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const events = await prisma.activityFeedEvent.findMany({
    where: { isVisible: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(events);
}

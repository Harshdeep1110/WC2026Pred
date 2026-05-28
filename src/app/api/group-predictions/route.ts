import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

// Get group standing predictions
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const predictions = await prisma.groupStandingPrediction.findMany({
    where: { userId: session.user.id! },
    orderBy: { group: 'asc' },
  });

  return NextResponse.json(predictions);
}

// Submit/update group standing prediction
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const { group, position1, position2, position3, position4 } = await req.json();

  if (!group || !position1 || !position2 || !position3 || !position4) {
    return NextResponse.json({ error: 'All positions required' }, { status: 400 });
  }

  // Check if locked
  const existing = await prisma.groupStandingPrediction.findUnique({
    where: { userId_group: { userId, group } },
  });
  if (existing?.isLocked) {
    return NextResponse.json({ error: 'Group standing prediction is locked' }, { status: 423 });
  }

  const prediction = await prisma.groupStandingPrediction.upsert({
    where: { userId_group: { userId, group } },
    create: { userId, group, position1, position2, position3, position4 },
    update: { position1, position2, position3, position4 },
  });

  return NextResponse.json(prediction);
}

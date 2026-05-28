import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

// Get or upsert pre-tournament predictions
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prediction = await prisma.preTournamentPrediction.findUnique({
    where: { userId: session.user.id! },
  });

  return NextResponse.json(prediction || null);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id!;
  const { goldenBootPlayer, mostAssistsPlayer, goldenGlovePlayer } = await req.json();

  // Check if already locked
  const existing = await prisma.preTournamentPrediction.findUnique({
    where: { userId },
  });
  if (existing?.isLocked) {
    return NextResponse.json({ error: 'Pre-tournament predictions are locked' }, { status: 423 });
  }

  const prediction = await prisma.preTournamentPrediction.upsert({
    where: { userId },
    create: { userId, goldenBootPlayer, mostAssistsPlayer, goldenGlovePlayer },
    update: { goldenBootPlayer, mostAssistsPlayer, goldenGlovePlayer },
  });

  return NextResponse.json(prediction);
}

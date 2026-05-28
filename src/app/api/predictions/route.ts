import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fixtureId, homeScorePred, awayScorePred } = await req.json();
  const userId = session.user.id!;

  // Get fixture and check lock
  const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } });
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  if (new Date() >= new Date(fixture.lockTimeUtc)) {
    return NextResponse.json({ error: 'Prediction window closed' }, { status: 423 });
  }

  // Check for existing prediction
  const existing = await prisma.prediction.findUnique({
    where: { userId_fixtureId: { userId, fixtureId } },
  });

  if (existing) {
    // Update existing prediction
    const updated = await prisma.prediction.update({
      where: { id: existing.id },
      data: { homeScorePred, awayScorePred, lastEditedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  // Create new prediction
  const prediction = await prisma.prediction.create({
    data: { userId, fixtureId, homeScorePred, awayScorePred },
  });

  return NextResponse.json(prediction, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fixtureId = searchParams.get('fixtureId');

  const predictions = await prisma.prediction.findMany({
    where: {
      userId: session.user.id!,
      ...(fixtureId ? { fixtureId: parseInt(fixtureId) } : {}),
    },
    include: { fixture: true },
    orderBy: { fixture: { kickoffTimeUtc: 'asc' } },
  });

  return NextResponse.json(predictions);
}

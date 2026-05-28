import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const group = searchParams.get('group');
  const status = searchParams.get('status');

  const where: any = {};
  if (stage) where.stage = stage;
  if (group) where.group = group;
  if (status) where.status = status;

  const fixtures = await prisma.fixture.findMany({
    where,
    orderBy: { kickoffTimeUtc: 'asc' },
  });

  return NextResponse.json(fixtures);
}

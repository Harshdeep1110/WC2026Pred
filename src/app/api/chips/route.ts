import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const chips = await prisma.chip.findMany({
    where: { userId: session.user.id! },
    include: { fixture: true },
  });

  return NextResponse.json(chips);
}

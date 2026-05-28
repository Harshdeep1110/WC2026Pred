import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      displayName: true,
      totalPoints: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { totalPoints: 'desc' },
  });

  const leaderboard = users.map((user, idx) => ({
    rank: idx + 1,
    ...user,
  }));

  return NextResponse.json(leaderboard);
}

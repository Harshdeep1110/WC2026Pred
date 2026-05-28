import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { randomUUID } from 'crypto';

// List all users
export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      totalPoints: true,
      isActive: true,
      createdAt: true,
      _count: { select: { predictions: true, chips: { where: { status: 'burned' } } } },
    },
    orderBy: { totalPoints: 'desc' },
  });

  return NextResponse.json(users);
}

// Create invite token
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email } = await req.json();
  const token = randomUUID().slice(0, 8).toUpperCase();

  const invite = await prisma.inviteToken.create({
    data: {
      token,
      email: email || null,
      createdBy: session.user.id!,
      expiresAt: new Date('2026-07-20T00:00:00Z'),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: 'INVITE_CREATED',
      targetUserId: session.user.id!,
      notes: `Token: ${token}${email ? ` for ${email}` : ''}`,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}

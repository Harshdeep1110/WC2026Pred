import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

// Toggle user ban status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json(); // 'ban' or 'unban'

  if (!['ban', 'unban'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: action === 'unban' },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: action === 'ban' ? 'USER_BANNED' : 'USER_UNBANNED',
      targetUserId: id,
      notes: `${user.displayName} (${user.email})`,
    },
  });

  return NextResponse.json(user);
}

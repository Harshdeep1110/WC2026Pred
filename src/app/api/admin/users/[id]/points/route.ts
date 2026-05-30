import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await req.json();
    const { amount, reason } = body;

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: amount } }
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: 'MANUAL_POINT_ADJUSTMENT',
        notes: `Adjusted points for ${updatedUser.displayName} by ${amount > 0 ? '+' : ''}${amount}. Reason: ${reason || 'Manual correction'}`,
      },
    });

    return NextResponse.json({ success: true, newTotal: updatedUser.totalPoints });
  } catch (error) {
    console.error('Point adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

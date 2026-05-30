import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { avatarUrl } = await req.json();

    if (avatarUrl && !avatarUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid avatar format. Expected base64 image.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

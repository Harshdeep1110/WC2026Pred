import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.toLowerCase();
    const { password, displayName, inviteToken } = body;

    if (!email || !password || !displayName || !inviteToken) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if league is locked
    const lockSetting = await prisma.systemSetting.findUnique({ where: { key: 'LEAGUE_LOCKED' } });
    if (lockSetting?.value === 'true') {
      return NextResponse.json({ error: 'Registration is currently locked by the admin' }, { status: 403 });
    }

    // Validate invite token
    const invite = await prisma.inviteToken.findUnique({ where: { token: inviteToken } });
    if (!invite || invite.usedBy || (invite.expiresAt && new Date(invite.expiresAt) < new Date())) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    // Create user + mark invite as used in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, passwordHash, displayName, role: 'player' },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedBy: newUser.id, usedAt: new Date() },
      });

      // Create 4 chips for the new user
      await tx.chip.createMany({
        data: [
          { userId: newUser.id, type: 'banker', status: 'available' },
          { userId: newUser.id, type: 'rival_block', status: 'available' },
          { userId: newUser.id, type: 'halftime_sub', status: 'available' },
          { userId: newUser.id, type: 'goalfest', status: 'available' },
          { userId: newUser.id, type: 'defensive_masterclass', status: 'available' },
        ],
      });

      return newUser;
    });

    return NextResponse.json({ id: user.id, email: user.email, displayName: user.displayName }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

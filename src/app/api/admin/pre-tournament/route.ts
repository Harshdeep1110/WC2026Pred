import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@/lib/auth';
import { PRE_TOURNAMENT_POINTS, GROUP_POSITION_POINTS } from '@/lib/scoring';
import { isMatch } from '@/lib/stringMatch';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { goldenBoot, mostAssists, goldenGlove, groups } = body;
    
    // Process awards
    if (goldenBoot || mostAssists || goldenGlove) {
      const awardPreds = await prisma.preTournamentPrediction.findMany({
        where: { pointsAwarded: null } // Only score unscored ones
      });

      for (const pred of awardPreds) {
        let pts = 0;
        if (goldenBoot && isMatch(pred.goldenBootPlayer, goldenBoot)) pts += PRE_TOURNAMENT_POINTS;
        if (mostAssists && isMatch(pred.mostAssistsPlayer, mostAssists)) pts += PRE_TOURNAMENT_POINTS;
        if (goldenGlove && isMatch(pred.goldenGlovePlayer, goldenGlove)) pts += PRE_TOURNAMENT_POINTS;

        if (goldenBoot && mostAssists && goldenGlove) { // Only record if all are entered
          await prisma.preTournamentPrediction.update({
            where: { id: pred.id },
            data: { pointsAwarded: pts, isLocked: true }
          });
          
          if (pts > 0) {
            await prisma.user.update({
              where: { id: pred.userId },
              data: { totalPoints: { increment: pts } }
            });
          }
        }
      }
    }

    // Process group standings
    if (groups && typeof groups === 'object') {
      for (const [groupName, positions] of Object.entries(groups)) {
        const actualPositions = positions as string[]; // [pos1, pos2, pos3, pos4]
        if (actualPositions.length !== 4 || actualPositions.some(p => !p)) continue; // Must be complete

        const groupPreds = await prisma.groupStandingPrediction.findMany({
          where: { group: groupName, pointsAwarded: null }
        });

        for (const pred of groupPreds) {
          let pts = 0;
          if (pred.position1.toLowerCase() === actualPositions[0].toLowerCase()) pts += GROUP_POSITION_POINTS;
          if (pred.position2.toLowerCase() === actualPositions[1].toLowerCase()) pts += GROUP_POSITION_POINTS;
          if (pred.position3.toLowerCase() === actualPositions[2].toLowerCase()) pts += GROUP_POSITION_POINTS;
          if (pred.position4.toLowerCase() === actualPositions[3].toLowerCase()) pts += GROUP_POSITION_POINTS;

          await prisma.groupStandingPrediction.update({
            where: { id: pred.id },
            data: { pointsAwarded: pts, isLocked: true }
          });

          if (pts > 0) {
            await prisma.user.update({
              where: { id: pred.userId },
              data: { totalPoints: { increment: pts } }
            });
          }
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: 'PRE_TOURNAMENT_SCORING',
        notes: `Scored pre-tournament data`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pre-tournament scoring error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL}`.split('?')[0];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: { action: 'MANUAL_POINT_ADJUSTMENT', delta: null }
  });

  console.log(`Found ${logs.length} manual adjustments missing a delta.`);

  for (const log of logs) {
    // Attempt to extract the amount and user from notes
    // Format: Adjusted points for User Name by +5. Reason: Manual correction
    const match = log.notes?.match(/by\s+([+-]?\d+)\./);
    if (match && match[1]) {
      const delta = parseInt(match[1]);
      
      // We also need the targetUserId. It might be missing.
      // If it's missing, we need to extract the user's name to find them.
      let targetUserId = log.targetUserId;
      if (!targetUserId) {
         const nameMatch = log.notes?.match(/Adjusted points for (.*?) by/);
         if (nameMatch && nameMatch[1]) {
            const displayName = nameMatch[1];
            const user = await prisma.user.findFirst({ where: { displayName } });
            if (user) targetUserId = user.id;
         }
      }

      if (targetUserId) {
        await prisma.auditLog.update({
          where: { id: log.id },
          data: { delta, targetUserId }
        });
        console.log(`Fixed log ${log.id}: User ${targetUserId}, Delta ${delta}`);
      } else {
        console.log(`Could not find targetUserId for log ${log.id}`);
      }
    } else {
      console.log(`Could not parse delta from log ${log.id}: ${log.notes}`);
    }
  }

  // Recalculate everyone's points now that logs are fixed
  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) {
    const allPredictionsForUser = await prisma.prediction.findMany({
      where: { userId: user.id, pointsAwarded: { not: null } },
    });
    const preTourney = await prisma.preTournamentPrediction.findUnique({
      where: { userId: user.id },
    });
    const groupStandings = await prisma.groupStandingPrediction.findMany({
      where: { userId: user.id, pointsAwarded: { not: null } },
    });
    const manualLogs = await prisma.auditLog.findMany({
      where: { targetUserId: user.id, action: 'MANUAL_POINT_ADJUSTMENT' },
    });

    let total = allPredictionsForUser.reduce((sum: number, p: any) => sum + (p.pointsAwarded || 0), 0);
    if (preTourney?.pointsAwarded) total += preTourney.pointsAwarded;
    total += groupStandings.reduce((sum: number, p: any) => sum + (p.pointsAwarded || 0), 0);
    total += manualLogs.reduce((sum: number, l: any) => sum + (l.delta || 0), 0);

    await prisma.user.update({
      where: { id: user.id },
      data: { totalPoints: total },
    });
    console.log(`Recalculated total points for user ${user.id} -> ${total}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

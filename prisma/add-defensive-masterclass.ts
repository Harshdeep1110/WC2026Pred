import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL}`.split('?')[0];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🛡️ Backfilling Defensive Masterclass chip to existing users...');
  
  // Find all users
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  
  let added = 0;
  for (const user of users) {
    // Check if they already have it
    const existing = await prisma.chip.findFirst({
      where: { userId: user.id, type: 'defensive_masterclass' }
    });
    
    if (!existing) {
      await prisma.chip.create({
        data: {
          userId: user.id,
          type: 'defensive_masterclass',
          status: 'available',
        }
      });
      added++;
    }
  }
  
  console.log(`✅ Granted 'defensive_masterclass' to ${added} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

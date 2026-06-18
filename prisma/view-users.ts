import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL}`.split('?')[0];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      totalPoints: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log('--- USER DATABASE EXPORT ---');
  console.table(users);
  console.log(`\nTotal Users: ${users.length}`);
  console.log('Note: Passwords are cryptographically hashed using bcrypt (cost factor 12) and cannot be decrypted or viewed in plaintext.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

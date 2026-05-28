import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const fixtures = await prisma.fixture.findMany({
    orderBy: { kickoffTimeUtc: 'asc' },
    take: 10,
  });

  console.log('=== First 10 fixtures (correct schedule) ===');
  fixtures.forEach(f => {
    const ist = new Date(f.kickoffTimeUtc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`#${f.id}: ${f.homeTeam} vs ${f.awayTeam} | Group ${f.group} | ${ist} IST | ${f.venue}, ${f.city}`);
  });

  const total = await prisma.fixture.count();
  console.log(`\nTotal fixtures: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

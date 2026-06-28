import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL}`.split('?')[0];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * IST to UTC conversion
 * IST = UTC + 5:30, so UTC = IST - 5:30
 */
function istToUtc(dateStr: string, istHour: number, istMin: number = 0): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const totalMinutes = istHour * 60 + istMin - 330; // subtract 5h30m
  let utcDay = day;
  let utcHour = Math.floor(totalMinutes / 60);
  let utcMin = totalMinutes % 60;
  if (utcMin < 0) { utcMin += 60; utcHour -= 1; }
  if (utcHour < 0) { utcHour += 24; utcDay -= 1; }
  const d = new Date(Date.UTC(year, month - 1, utcDay, utcHour, utcMin, 0));
  return d.toISOString();
}

function lockTime(kickoff: string): string {
  const d = new Date(kickoff);
  d.setMinutes(d.getMinutes() - 10);
  return d.toISOString();
}

/**
 * Round of 32 actual fixtures (from screenshots).
 * This script finds all R32 fixtures in the DB (by stage='r32'),
 * orders them by kickoffTimeUtc (the order they were seeded),
 * and updates each one with the real team names and corrected times.
 *
 * It does NOT delete/recreate fixtures, so predictions, chips, etc. remain intact.
 */
async function main() {
  // The 16 actual R32 fixtures in chronological order (IST times from screenshots)
  // Format: [IST date, IST hour, IST minute, homeTeam, awayTeam]
  const r32Actual: [string, number, number, string, string][] = [
    // Sunday, June 29
    ['2026-06-29', 0, 30, 'South Africa', 'Canada'],           // 12:30 AM IST
    ['2026-06-29', 22, 30, 'Brazil', 'Japan'],                  // 10:30 PM IST

    // Tuesday, June 30
    ['2026-06-30', 2, 0, 'Germany', 'Paraguay'],                // 2:00 AM IST
    ['2026-06-30', 6, 30, 'Netherlands', 'Morocco'],             // 6:30 AM IST
    ['2026-06-30', 22, 30, 'Ivory Coast', 'Norway'],             // 10:30 PM IST

    // Wednesday, July 1
    ['2026-07-01', 2, 30, 'France', 'Sweden'],                   // 2:30 AM IST
    ['2026-07-01', 6, 30, 'Mexico', 'Ecuador'],                  // 6:30 AM IST
    ['2026-07-01', 21, 30, 'England', 'DR Congo'],               // 9:30 PM IST

    // Thursday, July 2
    ['2026-07-02', 1, 30, 'Belgium', 'Senegal'],                 // 1:30 AM IST
    ['2026-07-02', 5, 30, 'USA', 'Bosnia and Herzegovina'],      // 5:30 AM IST

    // Friday, July 3
    ['2026-07-03', 0, 30, 'Spain', 'Austria'],                   // 12:30 AM IST
    ['2026-07-03', 4, 30, 'Portugal', 'Croatia'],                 // 4:30 AM IST
    ['2026-07-03', 8, 30, 'Switzerland', 'Algeria'],              // 8:30 AM IST
    ['2026-07-03', 23, 30, 'Australia', 'Egypt'],                 // 11:30 PM IST

    // Saturday, July 4
    ['2026-07-04', 3, 30, 'Argentina', 'Cape Verde'],            // 3:30 AM IST
    ['2026-07-04', 7, 0, 'Colombia', 'Ghana'],                   // 7:00 AM IST
  ];

  // Fetch all R32 fixtures ordered by their current kickoff time (chronological seed order)
  const existingR32 = await prisma.fixture.findMany({
    where: { stage: 'r32' },
    orderBy: { kickoffTimeUtc: 'asc' },
  });

  console.log(`📋 Found ${existingR32.length} existing R32 fixtures in the database.`);
  console.log(`📋 Have ${r32Actual.length} actual R32 fixtures to apply.\n`);

  if (existingR32.length !== r32Actual.length) {
    console.error(`❌ Mismatch! Expected ${r32Actual.length} R32 fixtures, found ${existingR32.length}.`);
    console.log('\nExisting R32 fixtures:');
    for (const f of existingR32) {
      console.log(`  ID ${f.id}: ${f.homeTeam} vs ${f.awayTeam} (${f.kickoffTimeUtc})`);
    }
    process.exit(1);
  }

  // Show what we're about to do
  console.log('📝 Planned updates (existing → new):');
  console.log('─'.repeat(80));

  for (let i = 0; i < existingR32.length; i++) {
    const old = existingR32[i];
    const [date, hour, min, home, away] = r32Actual[i];
    const kickoff = istToUtc(date, hour, min);

    // Convert to IST for display
    const istTime = `${date} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} IST`;
    console.log(`  ID ${old.id}: "${old.homeTeam} vs ${old.awayTeam}" → "${home} vs ${away}" @ ${istTime}`);
  }

  console.log('─'.repeat(80));
  console.log('');

  // Perform the updates
  let updated = 0;
  for (let i = 0; i < existingR32.length; i++) {
    const fixture = existingR32[i];
    const [date, hour, min, home, away] = r32Actual[i];
    const kickoff = istToUtc(date, hour, min);
    const lock = lockTime(kickoff);

    await prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        homeTeam: home,
        awayTeam: away,
        matchDate: date,
        kickoffTimeUtc: kickoff,
        lockTimeUtc: lock,
      },
    });
    updated++;
    console.log(`✅ Updated fixture ID ${fixture.id}: ${home} vs ${away}`);
  }

  console.log(`\n📊 Summary: ${updated} R32 fixtures updated with actual team names and times.`);
  console.log('🔒 Predictions, users, scores, chips, and all other data left UNTOUCHED.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

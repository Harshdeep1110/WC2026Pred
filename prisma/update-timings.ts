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

interface TimingUpdate {
  homeTeam: string;
  awayTeam: string;
  newKickoff: string;
}

/**
 * This script ONLY updates kickoffTimeUtc and lockTimeUtc for fixtures
 * AFTER Australia vs Turkey (fixture id > 8).
 * It does NOT touch predictions, users, scores, or any other data.
 */
async function main() {
  // First, find the Australia vs Turkey fixture to get its ID
  const ausTur = await prisma.fixture.findFirst({
    where: { homeTeam: 'Australia', awayTeam: 'Turkey' },
  });

  if (!ausTur) {
    console.error('❌ Could not find Australia vs Turkey fixture!');
    process.exit(1);
  }

  console.log(`✅ Found Australia vs Turkey: fixture ID ${ausTur.id}`);
  console.log(`   Only updating fixtures with ID > ${ausTur.id}\n`);

  // Define corrected IST timings for all fixtures AFTER Australia vs Turkey
  // Format: [homeTeam, awayTeam, IST date, IST hour, IST minute]
  const corrections: [string, string, string, number, number][] = [
    // === MATCHDAY 1 (continued after AUS-TUR) ===
    ['Germany', 'Curacao', '2026-06-14', 22, 30],
    ['Netherlands', 'Japan', '2026-06-15', 1, 30],
    ['Ivory Coast', 'Ecuador', '2026-06-15', 4, 30],
    ['Sweden', 'Tunisia', '2026-06-15', 7, 30],
    ['Spain', 'Cape Verde', '2026-06-15', 21, 30],
    ['Belgium', 'Egypt', '2026-06-16', 0, 30],
    ['Saudi Arabia', 'Uruguay', '2026-06-16', 3, 30],
    ['Iran', 'New Zealand', '2026-06-16', 6, 30],
    ['France', 'Senegal', '2026-06-17', 0, 30],
    ['Iraq', 'Norway', '2026-06-17', 3, 30],
    ['Argentina', 'Algeria', '2026-06-17', 6, 30],
    ['Austria', 'Jordan', '2026-06-17', 9, 30],
    ['Portugal', 'Congo DR', '2026-06-17', 22, 30],
    ['England', 'Croatia', '2026-06-18', 1, 30],
    ['Ghana', 'Panama', '2026-06-18', 4, 30],
    ['Uzbekistan', 'Colombia', '2026-06-18', 7, 30],

    // === MATCHDAY 2 ===
    ['Czech Republic', 'South Africa', '2026-06-18', 21, 30],
    ['Mexico', 'South Korea', '2026-06-19', 6, 30],
    ['Switzerland', 'Bosnia and Herzegovina', '2026-06-19', 0, 30],
    ['Canada', 'Qatar', '2026-06-19', 3, 30],
    ['United States', 'Australia', '2026-06-20', 0, 30],
    ['Turkey', 'Paraguay', '2026-06-20', 8, 30],
    ['Scotland', 'Morocco', '2026-06-20', 3, 30],
    ['Brazil', 'Haiti', '2026-06-20', 6, 0],
    ['Netherlands', 'Sweden', '2026-06-20', 22, 30],
    ['Germany', 'Ivory Coast', '2026-06-21', 1, 30],
    ['Ecuador', 'Curacao', '2026-06-21', 5, 30],
    ['Tunisia', 'Japan', '2026-06-21', 9, 30],
    ['Spain', 'Saudi Arabia', '2026-06-21', 21, 30],
    ['Belgium', 'Iran', '2026-06-22', 0, 30],
    ['Uruguay', 'Cape Verde', '2026-06-22', 3, 30],
    ['New Zealand', 'Egypt', '2026-06-22', 6, 30],
    ['Argentina', 'Austria', '2026-06-22', 22, 30],
    ['France', 'Iraq', '2026-06-23', 2, 30],
    ['Norway', 'Senegal', '2026-06-23', 5, 30],
    ['Jordan', 'Algeria', '2026-06-23', 8, 30],
    ['Portugal', 'Uzbekistan', '2026-06-23', 22, 30],
    ['England', 'Ghana', '2026-06-24', 1, 30],
    ['Panama', 'Croatia', '2026-06-24', 4, 30],
    ['Colombia', 'Congo DR', '2026-06-24', 7, 30],

    // === MATCHDAY 3 (simultaneous final group games) ===
    ['Switzerland', 'Canada', '2026-06-25', 0, 30],
    ['Bosnia and Herzegovina', 'Qatar', '2026-06-25', 0, 30],
    ['Scotland', 'Brazil', '2026-06-25', 3, 30],
    ['Morocco', 'Haiti', '2026-06-25', 3, 30],
    ['Czech Republic', 'Mexico', '2026-06-25', 6, 30],
    ['South Africa', 'South Korea', '2026-06-25', 6, 30],
    ['Curacao', 'Ivory Coast', '2026-06-26', 1, 30],
    ['Ecuador', 'Germany', '2026-06-26', 1, 30],
    ['Japan', 'Sweden', '2026-06-26', 4, 30],
    ['Tunisia', 'Netherlands', '2026-06-26', 4, 30],
    ['Turkey', 'United States', '2026-06-26', 7, 30],
    ['Paraguay', 'Australia', '2026-06-26', 7, 30],
    ['Norway', 'France', '2026-06-27', 0, 30],
    ['Senegal', 'Iraq', '2026-06-27', 0, 30],
    ['Cabo Verde', 'Saudi Arabia', '2026-06-27', 5, 30],
    ['Uruguay', 'Spain', '2026-06-27', 5, 30],
    ['Egypt', 'Iran', '2026-06-27', 8, 30],
    ['New Zealand', 'Belgium', '2026-06-27', 8, 30],
    ['Panama', 'England', '2026-06-28', 2, 30],
    ['Croatia', 'Ghana', '2026-06-28', 2, 30],
    ['Colombia', 'Portugal', '2026-06-28', 5, 0],
    ['Congo DR', 'Uzbekistan', '2026-06-28', 5, 0],
    ['Algeria', 'Austria', '2026-06-28', 7, 30],
    ['Jordan', 'Argentina', '2026-06-28', 7, 30],

    // === ROUND OF 32 (actual fixtures) ===
    ['South Africa', 'Canada', '2026-06-29', 0, 30],
    ['Brazil', 'Japan', '2026-06-29', 22, 30],
    ['Germany', 'Paraguay', '2026-06-30', 2, 0],
    ['Netherlands', 'Morocco', '2026-06-30', 6, 30],
    ['Ivory Coast', 'Norway', '2026-06-30', 22, 30],
    ['France', 'Sweden', '2026-07-01', 2, 30],
    ['Mexico', 'Ecuador', '2026-07-01', 6, 30],
    ['England', 'DR Congo', '2026-07-01', 21, 30],
    ['Belgium', 'Senegal', '2026-07-02', 1, 30],
    ['USA', 'Bosnia and Herzegovina', '2026-07-02', 5, 30],
    ['Spain', 'Austria', '2026-07-03', 0, 30],
    ['Portugal', 'Croatia', '2026-07-03', 4, 30],
    ['Switzerland', 'Algeria', '2026-07-03', 8, 30],
    ['Australia', 'Egypt', '2026-07-03', 23, 30],
    ['Argentina', 'Cape Verde', '2026-07-04', 3, 30],
    ['Colombia', 'Ghana', '2026-07-04', 7, 0],

    // === ROUND OF 16 ===
    ['R32 Winner 1', 'R32 Winner 2', '2026-07-05', 2, 30],
    ['R32 Winner 3', 'R32 Winner 4', '2026-07-06', 1, 30],
    ['R32 Winner 5', 'R32 Winner 6', '2026-07-06', 5, 30],
    ['R32 Winner 7', 'R32 Winner 8', '2026-07-04', 22, 30],
    ['R32 Winner 9', 'R32 Winner 10', '2026-07-07', 0, 30],
    ['R32 Winner 11', 'R32 Winner 12', '2026-07-07', 21, 30],
    ['R32 Winner 13', 'R32 Winner 14', '2026-07-08', 1, 30],
    ['R32 Winner 15', 'R32 Winner 16', '2026-07-12', 6, 30],

    // === QUARTER-FINALS ===
    ['R16 Winner 1', 'R16 Winner 2', '2026-07-10', 1, 30],
    ['R16 Winner 3', 'R16 Winner 4', '2026-07-11', 0, 30],
    ['R16 Winner 5', 'R16 Winner 6', '2026-07-12', 2, 30],
    ['R16 Winner 7', 'R16 Winner 8', '2026-07-12', 6, 30],

    // === SEMI-FINALS ===
    ['QF Winner 1', 'QF Winner 2', '2026-07-15', 0, 30],
    ['QF Winner 3', 'QF Winner 4', '2026-07-16', 0, 30],

    // === THIRD PLACE ===
    ['SF Loser 1', 'SF Loser 2', '2026-07-19', 2, 30],

    // === FINAL ===
    ['SF Winner 1', 'SF Winner 2', '2026-07-20', 0, 30],
  ];

  let updated = 0;
  let notFound = 0;

  for (const [home, away, date, hour, min] of corrections) {
    const kickoff = istToUtc(date, hour, min);
    const lock = lockTime(kickoff);

    // Find the fixture by home/away team names
    const fixture = await prisma.fixture.findFirst({
      where: { homeTeam: home, awayTeam: away, id: { gt: ausTur.id } },
    });

    if (!fixture) {
      // Try with swapped home/away for MD3 where teams may be swapped
      const fixtureAlt = await prisma.fixture.findFirst({
        where: { homeTeam: home, awayTeam: away },
      });
      if (fixtureAlt && fixtureAlt.id > ausTur.id) {
        await prisma.fixture.update({
          where: { id: fixtureAlt.id },
          data: { kickoffTimeUtc: kickoff, lockTimeUtc: lock, matchDate: date },
        });
        updated++;
        console.log(`✅ Updated: ${home} vs ${away} → ${date} ${hour}:${String(min).padStart(2, '0')} IST`);
      } else {
        console.log(`⚠️  Not found (id > ${ausTur.id}): ${home} vs ${away}`);
        notFound++;
      }
      continue;
    }

    await prisma.fixture.update({
      where: { id: fixture.id },
      data: { kickoffTimeUtc: kickoff, lockTimeUtc: lock, matchDate: date },
    });
    updated++;
    console.log(`✅ Updated: ${home} vs ${away} → ${date} ${hour}:${String(min).padStart(2, '0')} IST`);
  }

  console.log(`\n📊 Summary: ${updated} fixtures updated, ${notFound} not found.`);
  console.log('🔒 Predictions, users, scores, and all other data left UNTOUCHED.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

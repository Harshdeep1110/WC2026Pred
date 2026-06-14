import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const connectionString = `${process.env.DIRECT_URL}`.split('?')[0];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Correct FIFA World Cup 2026 Groups (confirmed draw Dec 5, 2025)
const groups: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Congo DR', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

const venues = [
  { venue: 'Estadio Azteca', city: 'Mexico City' },
  { venue: 'Estadio Akron', city: 'Guadalajara' },
  { venue: 'Estadio BBVA', city: 'Monterrey' },
  { venue: 'BC Place', city: 'Vancouver' },
  { venue: 'BMO Field', city: 'Toronto' },
  { venue: 'MetLife Stadium', city: 'East Rutherford' },
  { venue: 'SoFi Stadium', city: 'Los Angeles' },
  { venue: 'AT&T Stadium', city: 'Dallas' },
  { venue: 'Hard Rock Stadium', city: 'Miami' },
  { venue: 'NRG Stadium', city: 'Houston' },
  { venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { venue: 'Lumen Field', city: 'Seattle' },
  { venue: 'Arrowhead Stadium', city: 'Kansas City' },
  { venue: 'Lincoln Financial Field', city: 'Philadelphia' },
  { venue: "Levi's Stadium", city: 'San Francisco' },
  { venue: 'Gillette Stadium', city: 'Boston' },
];

function istToUtc(dateStr: string, istHour: number, istMin: number = 0): string {
  // IST is UTC+5:30
  // Build date in IST then shift to UTC by subtracting 5h30m
  const [year, month, day] = dateStr.split('-').map(Number);
  const totalMinutes = istHour * 60 + istMin - 330; // subtract 5h30m (330 min)
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

interface FixtureData {
  id: number;
  matchDate: string;
  kickoffTimeUtc: string;
  homeTeam: string;
  awayTeam: string;
  group: string;
  stage: string;
  venue: string;
  city: string;
  status: string;
  lockTimeUtc: string;
}

function generateFixtures(): FixtureData[] {
  const fixtures: FixtureData[] = [];
  let id = 1;

  // All times below are in IST (Indian Standard Time, UTC+5:30)
  function add(date: string, istHour: number, home: string, away: string, group: string, stage: string, venueIdx: number, istMin: number = 0) {
    const kickoff = istToUtc(date, istHour, istMin);
    fixtures.push({
      id: id++,
      matchDate: date,
      kickoffTimeUtc: kickoff,
      homeTeam: home,
      awayTeam: away,
      group,
      stage,
      venue: venues[venueIdx].venue,
      city: venues[venueIdx].city,
      status: 'upcoming',
      lockTimeUtc: lockTime(kickoff),
    });
  }

  // ============================================================
  // MATCHDAY 1 — June 11-17 (All times in IST)
  // ============================================================

  // June 12 IST — Group A
  add('2026-06-12', 0, 'Mexico', 'South Africa', 'A', 'group', 0, 30);          // 00:30 IST
  add('2026-06-12', 7, 'South Korea', 'Czech Republic', 'A', 'group', 1, 30);   // 07:30 IST

  // June 13 IST — Groups B, D
  add('2026-06-13', 0, 'Canada', 'Bosnia and Herzegovina', 'B', 'group', 4, 30); // 00:30 IST
  add('2026-06-13', 6, 'United States', 'Paraguay', 'D', 'group', 6, 30);        // 06:30 IST

  // June 14 IST — Groups B, C, D, E
  add('2026-06-14', 0, 'Qatar', 'Switzerland', 'B', 'group', 14, 30);            // 00:30 IST
  add('2026-06-14', 3, 'Brazil', 'Morocco', 'C', 'group', 5, 30);                // 03:30 IST
  add('2026-06-14', 6, 'Haiti', 'Scotland', 'C', 'group', 15, 30);               // 06:30 IST
  add('2026-06-14', 9, 'Australia', 'Turkey', 'D', 'group', 3, 30);              // 09:30 IST

  // After Australia vs Turkey — CORRECTED TIMES below
  add('2026-06-14', 22, 'Germany', 'Curacao', 'E', 'group', 13, 30);             // 22:30 IST

  // June 15 IST — Groups E, F, H
  add('2026-06-15', 1, 'Netherlands', 'Japan', 'F', 'group', 8, 30);             // 01:30 IST
  add('2026-06-15', 4, 'Ivory Coast', 'Ecuador', 'E', 'group', 7, 30);           // 04:30 IST
  add('2026-06-15', 7, 'Sweden', 'Tunisia', 'F', 'group', 12, 30);               // 07:30 IST
  add('2026-06-15', 21, 'Spain', 'Cape Verde', 'H', 'group', 9, 30);             // 21:30 IST

  // June 16 IST — Groups G, H
  add('2026-06-16', 0, 'Belgium', 'Egypt', 'G', 'group', 5, 30);                 // 00:30 IST
  add('2026-06-16', 3, 'Saudi Arabia', 'Uruguay', 'H', 'group', 11, 30);         // 03:30 IST
  add('2026-06-16', 6, 'Iran', 'New Zealand', 'G', 'group', 2, 30);              // 06:30 IST

  // June 17 IST — Groups I, J
  add('2026-06-17', 0, 'France', 'Senegal', 'I', 'group', 10, 30);               // 00:30 IST
  add('2026-06-17', 3, 'Iraq', 'Norway', 'I', 'group', 4, 30);                   // 03:30 IST
  add('2026-06-17', 6, 'Argentina', 'Algeria', 'J', 'group', 5, 30);             // 06:30 IST
  add('2026-06-17', 9, 'Austria', 'Jordan', 'J', 'group', 6, 30);                // 09:30 IST

  // June 17-18 IST — Groups K, L
  add('2026-06-17', 22, 'Portugal', 'Congo DR', 'K', 'group', 7, 30);            // 22:30 IST
  add('2026-06-18', 1, 'England', 'Croatia', 'L', 'group', 11, 30);              // 01:30 IST
  add('2026-06-18', 4, 'Ghana', 'Panama', 'L', 'group', 0, 30);                  // 04:30 IST
  add('2026-06-18', 7, 'Uzbekistan', 'Colombia', 'K', 'group', 8, 30);           // 07:30 IST

  // ============================================================
  // MATCHDAY 2 — June 18-24 IST (T1 vs T3, T2 vs T4)
  // ============================================================

  // Group A MD2
  add('2026-06-18', 21, 'Czech Republic', 'South Africa', 'A', 'group', 1, 30);  // 21:30 IST
  add('2026-06-19', 6, 'Mexico', 'South Korea', 'A', 'group', 9, 30);            // 06:30 IST

  // Group B MD2
  add('2026-06-19', 0, 'Switzerland', 'Bosnia and Herzegovina', 'B', 'group', 13, 30); // 00:30 IST
  add('2026-06-19', 3, 'Canada', 'Qatar', 'B', 'group', 3, 30);                  // 03:30 IST

  // Group D MD2
  add('2026-06-20', 0, 'United States', 'Australia', 'D', 'group', 13, 30);      // 00:30 IST
  add('2026-06-20', 8, 'Turkey', 'Paraguay', 'D', 'group', 6, 30);               // 08:30 IST

  // Group C MD2
  add('2026-06-20', 3, 'Scotland', 'Morocco', 'C', 'group', 15, 30);             // 03:30 IST
  add('2026-06-20', 6, 'Brazil', 'Haiti', 'C', 'group', 7, 0);                   // 06:00 IST

  // Group F MD2
  add('2026-06-20', 22, 'Netherlands', 'Sweden', 'F', 'group', 5, 30);           // 22:30 IST

  // Group E MD2
  add('2026-06-21', 1, 'Germany', 'Ivory Coast', 'E', 'group', 10, 30);          // 01:30 IST
  add('2026-06-21', 5, 'Ecuador', 'Curacao', 'E', 'group', 12, 30);              // 05:30 IST
  add('2026-06-21', 9, 'Tunisia', 'Japan', 'F', 'group', 8, 30);                 // 09:30 IST

  // Group H MD2
  add('2026-06-21', 21, 'Spain', 'Saudi Arabia', 'H', 'group', 7, 30);           // 21:30 IST

  // Group G MD2
  add('2026-06-22', 0, 'Belgium', 'Iran', 'G', 'group', 9, 30);                  // 00:30 IST
  add('2026-06-22', 3, 'Uruguay', 'Cape Verde', 'H', 'group', 11, 30);           // 03:30 IST
  add('2026-06-22', 6, 'New Zealand', 'Egypt', 'G', 'group', 2, 30);             // 06:30 IST

  // Group J MD2
  add('2026-06-22', 22, 'Argentina', 'Austria', 'J', 'group', 8, 30);            // 22:30 IST

  // Group I MD2
  add('2026-06-23', 2, 'France', 'Iraq', 'I', 'group', 5, 30);                   // 02:30 IST
  add('2026-06-23', 5, 'Norway', 'Senegal', 'I', 'group', 4, 30);                // 05:30 IST
  add('2026-06-23', 8, 'Jordan', 'Algeria', 'J', 'group', 6, 30);                // 08:30 IST

  // Group K MD2
  add('2026-06-23', 22, 'Portugal', 'Uzbekistan', 'K', 'group', 13, 30);         // 22:30 IST

  // Group L MD2
  add('2026-06-24', 1, 'England', 'Ghana', 'L', 'group', 12, 30);               // 01:30 IST
  add('2026-06-24', 4, 'Panama', 'Croatia', 'L', 'group', 0, 30);               // 04:30 IST
  add('2026-06-24', 7, 'Colombia', 'Congo DR', 'K', 'group', 10, 30);            // 07:30 IST

  // ============================================================
  // MATCHDAY 3 — June 24-28 IST (T1 vs T4, T2 vs T3, simultaneous)
  // ============================================================

  // Group B final matches
  add('2026-06-25', 0, 'Switzerland', 'Canada', 'B', 'group', 3, 30);            // 00:30 IST
  add('2026-06-25', 0, 'Bosnia and Herzegovina', 'Qatar', 'B', 'group', 14, 30); // 00:30 IST

  // Group C final matches
  add('2026-06-25', 3, 'Scotland', 'Brazil', 'C', 'group', 5, 30);              // 03:30 IST
  add('2026-06-25', 3, 'Morocco', 'Haiti', 'C', 'group', 15, 30);               // 03:30 IST

  // Group A final matches
  add('2026-06-25', 6, 'Czech Republic', 'Mexico', 'A', 'group', 0, 30);        // 06:30 IST
  add('2026-06-25', 6, 'South Africa', 'South Korea', 'A', 'group', 9, 30);     // 06:30 IST

  // Group E final matches
  add('2026-06-26', 1, 'Curacao', 'Ivory Coast', 'E', 'group', 10, 30);         // 01:30 IST
  add('2026-06-26', 1, 'Ecuador', 'Germany', 'E', 'group', 13, 30);             // 01:30 IST

  // Group F final matches
  add('2026-06-26', 4, 'Japan', 'Sweden', 'F', 'group', 12, 30);               // 04:30 IST
  add('2026-06-26', 4, 'Tunisia', 'Netherlands', 'F', 'group', 8, 30);          // 04:30 IST

  // Group D final matches
  add('2026-06-26', 7, 'Turkey', 'United States', 'D', 'group', 6, 30);         // 07:30 IST
  add('2026-06-26', 7, 'Paraguay', 'Australia', 'D', 'group', 7, 30);           // 07:30 IST

  // Group I final matches
  add('2026-06-27', 0, 'Norway', 'France', 'I', 'group', 5, 30);               // 00:30 IST
  add('2026-06-27', 0, 'Senegal', 'Iraq', 'I', 'group', 4, 30);                // 00:30 IST

  // Group H final matches
  add('2026-06-27', 5, 'Cabo Verde', 'Saudi Arabia', 'H', 'group', 7, 30);     // 05:30 IST
  add('2026-06-27', 5, 'Uruguay', 'Spain', 'H', 'group', 11, 30);              // 05:30 IST

  // Group G final matches
  add('2026-06-27', 8, 'Egypt', 'Iran', 'G', 'group', 9, 30);                  // 08:30 IST
  add('2026-06-27', 8, 'New Zealand', 'Belgium', 'G', 'group', 2, 30);          // 08:30 IST

  // Group L final matches
  add('2026-06-28', 2, 'Panama', 'England', 'L', 'group', 12, 30);             // 02:30 IST
  add('2026-06-28', 2, 'Croatia', 'Ghana', 'L', 'group', 0, 30);               // 02:30 IST

  // Group K final matches
  add('2026-06-28', 5, 'Colombia', 'Portugal', 'K', 'group', 10, 0);           // 05:00 IST
  add('2026-06-28', 5, 'Congo DR', 'Uzbekistan', 'K', 'group', 13, 0);         // 05:00 IST

  // Group J final matches
  add('2026-06-28', 7, 'Algeria', 'Austria', 'J', 'group', 6, 30);             // 07:30 IST
  add('2026-06-28', 7, 'Jordan', 'Argentina', 'J', 'group', 8, 30);            // 07:30 IST

  // ============================================================
  // ROUND OF 32 — Jun 29 - Jul 4 IST (from image schedule)
  // ============================================================
  const r32Matches: [string, number, number, string, string, number][] = [
    ['2026-06-29', 22, 30, 'Winner C', 'Runner-up F', 9],                        // 22:30 IST — Houston
    ['2026-06-30', 0, 30, 'Runner-up A', 'Runner-up B', 6],                      // 00:30 IST — SoFi
    ['2026-06-30', 2, 0, 'Winner E', 'Third Place A/B/C/D/F', 5],                // 02:00 IST — MetLife
    ['2026-06-30', 6, 30, 'Winner F', 'Runner-up C', 2],                         // 06:30 IST — Monterrey
    ['2026-06-30', 22, 30, 'Runner-up E', 'Runner-up I', 7],                     // 22:30 IST — Dallas
    ['2026-07-01', 2, 30, 'Winner I', 'Third Place C/D/F/G/H', 5],               // 02:30 IST — MetLife
    ['2026-07-01', 6, 30, 'Winner A', 'Third Place C/E/F/H/I', 0],               // 06:30 IST — Mexico City
    ['2026-07-01', 21, 30, 'Winner L', 'Third Place E/H/I/J/K', 10],             // 21:30 IST — Atlanta
    ['2026-07-02', 5, 30, 'Winner D', 'Third Place B/E/F/I/J', 6],               // 05:30 IST — SoFi
    ['2026-07-02', 5, 30, 'Winner H', 'Runner-up J', 11],                        // 05:30 IST — Seattle
    ['2026-07-03', 0, 0, 'Winner K', 'Runner-up L', 4],                          // 00:00 IST — Toronto (actually 00:30?)
    ['2026-07-03', 0, 0, 'Runner-up H', 'Runner-up J', 6],                       // 00:00 IST — SoFi
    ['2026-07-03', 3, 30, 'Winner J', 'Runner-up H', 8],                         // 03:30 IST — Miami
    ['2026-07-03', 8, 30, 'Winner B', 'Third Place E/F/G/J', 3],                 // 08:30 IST — Vancouver
    ['2026-07-03', 23, 30, 'Runner-up D', 'Runner-up G', 7],                     // 23:30 IST — Dallas
    ['2026-07-04', 7, 0, 'Winner K', 'Third Place D/E/I/J/L', 12],               // 07:00 IST — Kansas City
  ];

  for (const [date, hour, min, home, away, vi] of r32Matches) {
    add(date, hour, home, away, 'R32', 'r32', vi, min);
  }

  // ============================================================
  // ROUND OF 16 — Jul 5-8 IST (from image schedule)
  // ============================================================
  const r16Matches: [string, number, number, string, string, number][] = [
    ['2026-07-05', 2, 30, 'R32 Winner 1', 'R32 Winner 2', 13],                   // 02:30 IST — Philadelphia
    ['2026-07-06', 1, 30, 'R32 Winner 3', 'R32 Winner 4', 5],                    // 01:30 IST — NY/NJ
    ['2026-07-06', 5, 30, 'R32 Winner 5', 'R32 Winner 6', 0],                    // 05:30 IST — Mexico City
    ['2026-07-04', 22, 30, 'R32 Winner 7', 'R32 Winner 8', 9],                   // 22:30 IST — Houston
    ['2026-07-07', 0, 30, 'R32 Winner 9', 'R32 Winner 10', 7],                   // 00:30 IST — Dallas (AT&T)
    ['2026-07-07', 21, 30, 'R32 Winner 11', 'R32 Winner 12', 10],                // 21:30 IST — Atlanta
    ['2026-07-08', 1, 30, 'R32 Winner 13', 'R32 Winner 14', 3],                  // 01:30 IST — Vancouver
    ['2026-07-12', 6, 30, 'R32 Winner 15', 'R32 Winner 16', 12],                 // 06:30 IST — Kansas City
  ];

  for (const [date, hour, min, home, away, vi] of r16Matches) {
    add(date, hour, home, away, 'R16', 'r16', vi, min);
  }

  // ============================================================
  // QUARTER-FINALS — Jul 10-12 IST (from image schedule)
  // ============================================================
  add('2026-07-10', 1, 'R16 Winner 1', 'R16 Winner 2', 'QF', 'qf', 15, 30);    // 01:30 IST — Boston
  add('2026-07-11', 0, 'R16 Winner 3', 'R16 Winner 4', 'QF', 'qf', 6, 30);     // 00:30 IST — Dallas (SoFi? image says Dallas)
  add('2026-07-12', 2, 'R16 Winner 5', 'R16 Winner 6', 'QF', 'qf', 8, 30);     // 02:30 IST — Miami
  add('2026-07-12', 6, 'R16 Winner 7', 'R16 Winner 8', 'QF', 'qf', 0, 30);     // 06:30 IST — Mexico City

  // ============================================================
  // SEMI-FINALS — Jul 15-16 IST (from image schedule)
  // ============================================================
  add('2026-07-15', 0, 'QF Winner 1', 'QF Winner 2', 'SF', 'sf', 7, 30);       // 00:30 IST — Dallas
  add('2026-07-16', 0, 'QF Winner 3', 'QF Winner 4', 'SF', 'sf', 10, 30);      // 00:30 IST — Atlanta

  // ============================================================
  // THIRD PLACE — Jul 19 IST (from image schedule)
  // ============================================================
  add('2026-07-19', 2, 'SF Loser 1', 'SF Loser 2', '3P', 'third_place', 8, 30); // 02:30 IST — Miami

  // ============================================================
  // FINAL — Jul 20 IST (from image schedule)
  // ============================================================
  add('2026-07-20', 0, 'SF Winner 1', 'SF Winner 2', 'FIN', 'final', 5, 30);    // 00:30 IST — MetLife

  return fixtures;
}

async function main() {
  console.log('🗑️  Clearing existing data...');
  await prisma.activityFeedEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.groupStandingPrediction.deleteMany();
  await prisma.preTournamentPrediction.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.chip.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Seeding database...');

  // Create admin user
  const adminHash = await hash('admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@predictor.com',
      passwordHash: adminHash,
      displayName: 'Admin',
      role: 'admin',
    },
  });

  // Create admin chips
  await prisma.chip.createMany({
    data: [
      { userId: admin.id, type: 'banker', status: 'available' },
      { userId: admin.id, type: 'rival_block', status: 'available' },
      { userId: admin.id, type: 'halftime_sub', status: 'available' },
      { userId: admin.id, type: 'goalfest', status: 'available' },
    ],
  });

  // Create default invite token
  await prisma.inviteToken.create({
    data: {
      token: 'WORLDCUP2026',
      createdBy: admin.id,
      expiresAt: new Date('2026-07-20T00:00:00Z'),
    },
  });

  // Seed fixtures
  const fixtures = generateFixtures();
  console.log(`⚽ Inserting ${fixtures.length} fixtures...`);

  for (const f of fixtures) {
    await prisma.fixture.create({ data: f });
  }

  console.log(`✅ Seeded ${fixtures.length} fixtures, 1 admin user, 4 chips, 1 invite token.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

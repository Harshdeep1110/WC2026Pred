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

function etToUtc(dateStr: string, etHour: number, etMin: number = 0): string {
  // ET is UTC-4 during summer (EDT)
  // Build date in ET then shift to UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, etHour + 4, etMin, 0));
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

  function add(date: string, etHour: number, home: string, away: string, group: string, stage: string, venueIdx: number) {
    const kickoff = etToUtc(date, etHour);
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
  // MATCHDAY 1 — June 11-17 (confirmed schedule)
  // ============================================================

  // June 11 — Group A
  add('2026-06-11', 15, 'Mexico', 'South Africa', 'A', 'group', 0);           // Azteca
  add('2026-06-11', 22, 'South Korea', 'Czech Republic', 'A', 'group', 1);    // Guadalajara

  // June 12 — Groups B, D
  add('2026-06-12', 15, 'Canada', 'Bosnia and Herzegovina', 'B', 'group', 4); // Toronto
  add('2026-06-12', 21, 'United States', 'Paraguay', 'D', 'group', 6);        // SoFi

  // June 13 — Groups B, C, D
  add('2026-06-13', 15, 'Qatar', 'Switzerland', 'B', 'group', 14);            // Levi's
  add('2026-06-13', 18, 'Brazil', 'Morocco', 'C', 'group', 5);                // MetLife
  add('2026-06-13', 21, 'Haiti', 'Scotland', 'C', 'group', 15);               // Gillette

  // June 14 — Groups D, E, F (Australia vs Turkey kicks off at midnight ET = 4 AM UTC June 14)
  add('2026-06-14', 0, 'Australia', 'Turkey', 'D', 'group', 3);               // BC Place
  add('2026-06-14', 12, 'Germany', 'Curacao', 'E', 'group', 13);              // Philly
  add('2026-06-14', 15, 'Ivory Coast', 'Ecuador', 'E', 'group', 7);           // AT&T
  add('2026-06-14', 18, 'Netherlands', 'Japan', 'F', 'group', 8);             // Hard Rock
  add('2026-06-14', 21, 'Sweden', 'Tunisia', 'F', 'group', 12);               // Arrowhead

  // June 15 — Groups G, H
  add('2026-06-15', 12, 'Belgium', 'Egypt', 'G', 'group', 5);                 // MetLife
  add('2026-06-15', 15, 'Iran', 'New Zealand', 'G', 'group', 2);              // Monterrey
  add('2026-06-15', 18, 'Spain', 'Cape Verde', 'H', 'group', 9);              // NRG
  add('2026-06-15', 21, 'Saudi Arabia', 'Uruguay', 'H', 'group', 11);         // Lumen

  // June 16 — Groups I, J
  add('2026-06-16', 12, 'France', 'Senegal', 'I', 'group', 10);               // Mercedes
  add('2026-06-16', 15, 'Iraq', 'Norway', 'I', 'group', 4);                   // Toronto
  add('2026-06-16', 18, 'Argentina', 'Algeria', 'J', 'group', 5);             // MetLife
  add('2026-06-16', 21, 'Austria', 'Jordan', 'J', 'group', 6);                // SoFi

  // June 17 — Groups K, L
  add('2026-06-17', 12, 'Portugal', 'Congo DR', 'K', 'group', 7);             // AT&T
  add('2026-06-17', 15, 'Uzbekistan', 'Colombia', 'K', 'group', 8);           // Hard Rock
  add('2026-06-17', 18, 'England', 'Croatia', 'L', 'group', 11);              // Lumen
  add('2026-06-17', 21, 'Ghana', 'Panama', 'L', 'group', 0);                  // Azteca

  // ============================================================
  // MATCHDAY 2 — June 18-23 (T1 vs T3, T2 vs T4)
  // ============================================================

  // June 18 — Group A & B MD2
  add('2026-06-18', 12, 'Mexico', 'South Korea', 'A', 'group', 9);            // NRG
  add('2026-06-18', 15, 'South Africa', 'Czech Republic', 'A', 'group', 1);   // Guadalajara
  add('2026-06-18', 18, 'Canada', 'Qatar', 'B', 'group', 3);                  // BC Place
  add('2026-06-18', 21, 'Bosnia and Herzegovina', 'Switzerland', 'B', 'group', 13); // Philly

  // June 19 — Group C & D MD2
  add('2026-06-19', 12, 'Brazil', 'Haiti', 'C', 'group', 7);                  // AT&T
  add('2026-06-19', 15, 'Morocco', 'Scotland', 'C', 'group', 15);             // Gillette
  add('2026-06-19', 18, 'United States', 'Australia', 'D', 'group', 13);      // Philly
  add('2026-06-19', 21, 'Paraguay', 'Turkey', 'D', 'group', 6);               // SoFi

  // June 20 — Group E & F MD2
  add('2026-06-20', 12, 'Germany', 'Ivory Coast', 'E', 'group', 10);          // Mercedes
  add('2026-06-20', 15, 'Curacao', 'Ecuador', 'E', 'group', 12);              // Arrowhead
  add('2026-06-20', 18, 'Netherlands', 'Sweden', 'F', 'group', 5);            // MetLife
  add('2026-06-20', 21, 'Japan', 'Tunisia', 'F', 'group', 8);                 // Hard Rock

  // June 21 — Group G & H MD2
  add('2026-06-21', 12, 'Belgium', 'Iran', 'G', 'group', 9);                  // NRG
  add('2026-06-21', 15, 'Egypt', 'New Zealand', 'G', 'group', 2);             // Monterrey
  add('2026-06-21', 18, 'Spain', 'Saudi Arabia', 'H', 'group', 7);            // AT&T
  add('2026-06-21', 21, 'Cape Verde', 'Uruguay', 'H', 'group', 11);           // Lumen

  // June 22 — Group I & J MD2
  add('2026-06-22', 12, 'France', 'Iraq', 'I', 'group', 5);                   // MetLife
  add('2026-06-22', 15, 'Senegal', 'Norway', 'I', 'group', 4);                // Toronto
  add('2026-06-22', 18, 'Argentina', 'Austria', 'J', 'group', 8);             // Hard Rock
  add('2026-06-22', 21, 'Algeria', 'Jordan', 'J', 'group', 6);                // SoFi

  // June 23 — Group K & L MD2
  add('2026-06-23', 12, 'Portugal', 'Uzbekistan', 'K', 'group', 13);          // Philly
  add('2026-06-23', 15, 'Congo DR', 'Colombia', 'K', 'group', 10);            // Mercedes
  add('2026-06-23', 18, 'England', 'Ghana', 'L', 'group', 12);                // Arrowhead
  add('2026-06-23', 21, 'Croatia', 'Panama', 'L', 'group', 0);                // Azteca

  // ============================================================
  // MATCHDAY 3 — June 24-28 (T1 vs T4, T2 vs T3, simultaneous)
  // ============================================================

  // June 24 — Groups A & B final matches
  add('2026-06-24', 15, 'Mexico', 'Czech Republic', 'A', 'group', 0);         // Azteca
  add('2026-06-24', 15, 'South Africa', 'South Korea', 'A', 'group', 9);      // NRG
  add('2026-06-24', 21, 'Canada', 'Switzerland', 'B', 'group', 3);            // BC Place
  add('2026-06-24', 21, 'Bosnia and Herzegovina', 'Qatar', 'B', 'group', 14); // Levi's

  // June 25 — Groups C & D final matches
  add('2026-06-25', 15, 'Brazil', 'Scotland', 'C', 'group', 5);               // MetLife
  add('2026-06-25', 15, 'Morocco', 'Haiti', 'C', 'group', 15);                // Gillette
  add('2026-06-25', 21, 'United States', 'Turkey', 'D', 'group', 6);          // SoFi
  add('2026-06-25', 21, 'Paraguay', 'Australia', 'D', 'group', 7);            // AT&T

  // June 26 — Groups E & F final matches
  add('2026-06-26', 15, 'Germany', 'Ecuador', 'E', 'group', 13);              // Philly
  add('2026-06-26', 15, 'Curacao', 'Ivory Coast', 'E', 'group', 10);          // Mercedes
  add('2026-06-26', 21, 'Netherlands', 'Tunisia', 'F', 'group', 8);           // Hard Rock
  add('2026-06-26', 21, 'Japan', 'Sweden', 'F', 'group', 12);                 // Arrowhead

  // June 27 — Groups G & H & I final matches
  add('2026-06-27', 12, 'Belgium', 'New Zealand', 'G', 'group', 2);           // Monterrey
  add('2026-06-27', 12, 'Egypt', 'Iran', 'G', 'group', 9);                    // NRG
  add('2026-06-27', 15, 'Spain', 'Uruguay', 'H', 'group', 11);               // Lumen
  add('2026-06-27', 15, 'Cape Verde', 'Saudi Arabia', 'H', 'group', 7);       // AT&T
  add('2026-06-27', 21, 'France', 'Norway', 'I', 'group', 5);                 // MetLife
  add('2026-06-27', 21, 'Senegal', 'Iraq', 'I', 'group', 4);                  // Toronto

  // June 28 — Groups J & K & L final matches
  add('2026-06-28', 12, 'Argentina', 'Jordan', 'J', 'group', 8);              // Hard Rock
  add('2026-06-28', 12, 'Algeria', 'Austria', 'J', 'group', 6);               // SoFi
  add('2026-06-28', 15, 'Portugal', 'Colombia', 'K', 'group', 10);            // Mercedes
  add('2026-06-28', 15, 'Congo DR', 'Uzbekistan', 'K', 'group', 13);          // Philly
  add('2026-06-28', 21, 'England', 'Panama', 'L', 'group', 12);               // Arrowhead
  add('2026-06-28', 21, 'Croatia', 'Ghana', 'L', 'group', 0);                 // Azteca

  // ============================================================
  // ROUND OF 32 — July 1-4 (16 matches, 4/day)
  // ============================================================
  const r32Matches = [
    ['2026-07-01', 12, 'Winner A', 'Third Place C/D/E', 5],
    ['2026-07-01', 15, 'Runner-up A', 'Runner-up B', 7],
    ['2026-07-01', 18, 'Winner B', 'Third Place A/D/F', 14],
    ['2026-07-01', 21, 'Winner C', 'Third Place A/B/F', 8],
    ['2026-07-02', 12, 'Runner-up C', 'Runner-up D', 9],
    ['2026-07-02', 15, 'Winner D', 'Third Place B/E/F', 6],
    ['2026-07-02', 18, 'Winner E', 'Third Place G/H/I', 10],
    ['2026-07-02', 21, 'Runner-up E', 'Runner-up F', 0],
    ['2026-07-03', 12, 'Winner F', 'Third Place G/I/J', 11],
    ['2026-07-03', 15, 'Winner G', 'Third Place H/J/K', 4],
    ['2026-07-03', 18, 'Runner-up G', 'Runner-up H', 13],
    ['2026-07-03', 21, 'Winner H', 'Third Place I/K/L', 12],
    ['2026-07-04', 12, 'Winner I', 'Third Place J/K/L', 5],
    ['2026-07-04', 15, 'Runner-up I', 'Runner-up J', 3],
    ['2026-07-04', 18, 'Winner J', 'Third Place G/H/L', 2],
    ['2026-07-04', 21, 'Winner K', 'Runner-up L', 7],
  ] as const;

  for (const [date, hour, home, away, vi] of r32Matches) {
    add(date, hour, home, away, 'R32', 'r32', vi);
  }

  // ============================================================
  // ROUND OF 16 — July 5-8 (8 matches, 2/day)
  // ============================================================
  const r16Matches = [
    ['2026-07-05', 15, 'R32 Winner 1', 'R32 Winner 2', 5],
    ['2026-07-05', 21, 'R32 Winner 3', 'R32 Winner 4', 7],
    ['2026-07-06', 15, 'R32 Winner 5', 'R32 Winner 6', 6],
    ['2026-07-06', 21, 'R32 Winner 7', 'R32 Winner 8', 0],
    ['2026-07-07', 15, 'R32 Winner 9', 'R32 Winner 10', 8],
    ['2026-07-07', 21, 'R32 Winner 11', 'R32 Winner 12', 11],
    ['2026-07-08', 15, 'R32 Winner 13', 'R32 Winner 14', 9],
    ['2026-07-08', 21, 'R32 Winner 15', 'R32 Winner 16', 10],
  ] as const;

  for (const [date, hour, home, away, vi] of r16Matches) {
    add(date, hour, home, away, 'R16', 'r16', vi);
  }

  // ============================================================
  // QUARTER-FINALS — July 10-11
  // ============================================================
  add('2026-07-10', 15, 'R16 Winner 1', 'R16 Winner 2', 'QF', 'qf', 5);      // MetLife
  add('2026-07-10', 21, 'R16 Winner 3', 'R16 Winner 4', 'QF', 'qf', 6);      // SoFi
  add('2026-07-11', 15, 'R16 Winner 5', 'R16 Winner 6', 'QF', 'qf', 7);      // AT&T
  add('2026-07-11', 21, 'R16 Winner 7', 'R16 Winner 8', 'QF', 'qf', 9);      // NRG

  // ============================================================
  // SEMI-FINALS — July 14-15
  // ============================================================
  add('2026-07-14', 20, 'QF Winner 1', 'QF Winner 2', 'SF', 'sf', 5);        // MetLife
  add('2026-07-15', 20, 'QF Winner 3', 'QF Winner 4', 'SF', 'sf', 7);        // AT&T

  // ============================================================
  // THIRD PLACE — July 18
  // ============================================================
  add('2026-07-18', 15, 'SF Loser 1', 'SF Loser 2', '3P', 'third_place', 9); // NRG

  // ============================================================
  // FINAL — July 19
  // ============================================================
  add('2026-07-19', 15, 'SF Winner 1', 'SF Winner 2', 'FIN', 'final', 5);     // MetLife

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

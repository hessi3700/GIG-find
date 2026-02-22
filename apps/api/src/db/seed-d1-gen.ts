/**
 * Generate seed-d1.sql for seeding the D1 database (Worker).
 * All seed users have password: password123
 *
 * Run: npm run seed:d1:gen (from apps/api)
 * Then: npx wrangler d1 execute gigfind-db --remote --file=seed-d1.sql
 */
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  FIRST_NAMES,
  LAST_NAMES,
  GIG_TITLES,
  CATEGORIES,
  SAMPLE_DESCRIPTIONS,
  APPLICATION_MESSAGES,
  MESSAGE_BODIES,
} from './seed-data.js';

const SEED_PASSWORD = 'password123';
const NUM_USERS = 50;
const NUM_GIGS = 150;
const NUM_APPLICATIONS = 350;
const NUM_MESSAGES = 300;

// Seeded RNG for deterministic output
let seed = 12345;
function random(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

function getConversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

const FIXED_NOW = '2025-01-15T12:00:00.000Z';

function main() {
  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);
  const lines: string[] = ['-- Seed data for D1. All seed users have password: password123', ''];

  const userIds: string[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < NUM_USERS; i++) {
    let email: string;
    do {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      email = `seed.${first.toLowerCase()}.${last.toLowerCase()}.${i}@example.com`;
    } while (usedEmails.has(email));
    usedEmails.add(email);
    const id = `u${i}`;
    userIds.push(id);
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    lines.push(
      `INSERT INTO users (id, email, password_hash, name, created_at) VALUES ('${id}', '${escapeSql(email)}', '${escapeSql(passwordHash)}', '${escapeSql(name)}', '${FIXED_NOW}');`
    );
  }
  lines.push('');

  const gigRows: { id: string; created_by: string }[] = [];
  const usedTitles = new Set<string>();
  for (let i = 0; i < NUM_GIGS; i++) {
    let title: string;
    do {
      title = pick(GIG_TITLES) + (random() > 0.7 ? ` (${i + 1})` : '');
    } while (usedTitles.has(title));
    usedTitles.add(title);
    const id = `g${i}`;
    const createdBy = pick(userIds);
    gigRows.push({ id, created_by: createdBy });
    const category = pick(CATEGORIES);
    const payRate = (Math.round((25 + random() * 475) * 100) / 100).toFixed(2);
    const currency = random() > 0.1 ? 'USD' : pick(['EUR', 'GBP']);
    const description = pick(SAMPLE_DESCRIPTIONS);
    lines.push(
      `INSERT INTO gigs (id, title, description, category, pay_rate, currency, created_by, status, created_at, updated_at) VALUES ('${id}', '${escapeSql(title)}', '${escapeSql(description)}', '${escapeSql(category)}', ${payRate}, '${currency}', '${createdBy}', 'open', '${FIXED_NOW}', '${FIXED_NOW}');`
    );
  }
  lines.push('');

  const applicationPairs = new Set<string>();
  const statuses = ['pending', 'pending', 'pending', 'accepted', 'rejected'];
  let appsCreated = 0;
  let attempts = 0;
  const maxAttempts = NUM_APPLICATIONS * 20;
  const appRows: { id: string; gig_id: string; applicant_id: string }[] = [];
  while (appsCreated < NUM_APPLICATIONS && attempts < maxAttempts) {
    attempts++;
    const gig = pick(gigRows);
    const applicantId = pick(userIds);
    if (applicantId === gig.created_by) continue;
    const key = `${gig.id}:${applicantId}`;
    if (applicationPairs.has(key)) continue;
    applicationPairs.add(key);
    const id = `a${appsCreated}`;
    appRows.push({ id, gig_id: gig.id, applicant_id: applicantId });
    const msg = pick(APPLICATION_MESSAGES);
    const status = pick(statuses);
    lines.push(
      `INSERT INTO applications (id, gig_id, applicant_id, message, status, created_at) VALUES ('${id}', '${gig.id}', '${applicantId}', '${escapeSql(msg)}', '${status}', '${FIXED_NOW}');`
    );
    appsCreated++;
  }
  lines.push('');

  const appEntries = Array.from(applicationPairs);
  for (let i = 0; i < NUM_MESSAGES; i++) {
    const entry = pick(appEntries);
    const [gigId, applicantId] = entry.split(':');
    const gigRow = gigRows.find((g) => g.id === gigId);
    if (!gigRow) continue;
    const ownerId = gigRow.created_by;
    const senderId = random() > 0.5 ? ownerId : applicantId;
    const receiverId = senderId === ownerId ? applicantId : ownerId;
    const cid = getConversationId(ownerId, applicantId);
    const id = `m${i}`;
    const body = pick(MESSAGE_BODIES);
    lines.push(
      `INSERT INTO messages (id, gig_id, sender_id, receiver_id, body, conversation_id, created_at) VALUES ('${id}', '${gigId}', '${senderId}', '${receiverId}', '${escapeSql(body)}', '${cid}', '${FIXED_NOW}');`
    );
  }

  const outPath = join(process.cwd(), 'seed-d1.sql');
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`  Users: ${NUM_USERS}, Gigs: ${NUM_GIGS}, Applications: ${appsCreated}, Messages: ${NUM_MESSAGES}`);
  console.log(`  Run: npx wrangler d1 execute gigfind-db --remote --file=seed-d1.sql`);
  console.log(`  All seed users have password: ${SEED_PASSWORD}`);
}

main();

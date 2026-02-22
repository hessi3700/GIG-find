/**
 * Seed the database with a large amount of example data.
 * All seed users have password: password123
 *
 * Run: npx tsx src/db/seed.ts
 * Or:  npm run seed
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { connectDb, getDb } from '../config/db.js';
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function getConversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

async function main() {
  console.log('Connecting to database...');
  await connectDb();
  const db = getDb();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const userIds: string[] = [];
  const usedEmails = new Set<string>();

  console.log(`Creating ${NUM_USERS} users...`);
  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
  );
  for (let i = 0; i < NUM_USERS; i++) {
    let email: string;
    do {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      email = `seed.${first.toLowerCase()}.${last.toLowerCase()}.${i}@example.com`;
    } while (usedEmails.has(email));
    usedEmails.add(email);
    const id = randomUUID();
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    insertUser.run(id, email, passwordHash, name);
    userIds.push(id);
  }

  console.log(`Creating ${NUM_GIGS} gigs...`);
  const gigRows: { id: string; created_by: string }[] = [];
  const insertGig = db.prepare(
    `INSERT INTO gigs (id, title, description, category, pay_rate, currency, created_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'), datetime('now'))`
  );
  const usedTitles = new Set<string>();
  for (let i = 0; i < NUM_GIGS; i++) {
    let title: string;
    do {
      title = pick(GIG_TITLES) + (Math.random() > 0.7 ? ` (${i + 1})` : '');
    } while (usedTitles.has(title));
    usedTitles.add(title);
    const id = randomUUID();
    const createdBy = pick(userIds);
    const category = pick(CATEGORIES);
    const payRate = Math.round((25 + Math.random() * 475) * 100) / 100; // 25–500
    const currency = Math.random() > 0.1 ? 'USD' : pick(['EUR', 'GBP']);
    const description = pick(SAMPLE_DESCRIPTIONS);
    insertGig.run(id, title, description, category, payRate, currency, createdBy);
    gigRows.push({ id, created_by: createdBy });
  }

  console.log(`Creating ${NUM_APPLICATIONS} applications...`);
  const applicationPairs = new Set<string>(); // "gigId:applicantId"
  const insertApp = db.prepare(
    `INSERT INTO applications (id, gig_id, applicant_id, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  );
  const statuses = ['pending', 'pending', 'pending', 'accepted', 'rejected'];
  let appsCreated = 0;
  let attempts = 0;
  const maxAttempts = NUM_APPLICATIONS * 20;
  while (appsCreated < NUM_APPLICATIONS && attempts < maxAttempts) {
    attempts++;
    const gig = pick(gigRows);
    const applicantId = pick(userIds);
    if (applicantId === gig.created_by) continue;
    const key = `${gig.id}:${applicantId}`;
    if (applicationPairs.has(key)) continue;
    applicationPairs.add(key);
    const id = randomUUID();
    insertApp.run(id, gig.id, applicantId, pick(APPLICATION_MESSAGES), pick(statuses));
    appsCreated++;
  }
  console.log(`  Inserted ${appsCreated} applications.`);

  console.log(`Creating ${NUM_MESSAGES} messages...`);
  const insertMsg = db.prepare(
    `INSERT INTO messages (id, gig_id, sender_id, receiver_id, body, conversation_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  );
  const appEntries = Array.from(applicationPairs);
  let messagesCreated = 0;
  for (let i = 0; i < NUM_MESSAGES; i++) {
    const [gigId, applicantId] = pick(appEntries).split(':');
    const gigRow = gigRows.find((g) => g.id === gigId);
    if (!gigRow) continue;
    const ownerId = gigRow.created_by;
    const senderId = Math.random() > 0.5 ? ownerId : applicantId;
    const receiverId = senderId === ownerId ? applicantId : ownerId;
    const cid = getConversationId(ownerId, applicantId);
    const id = randomUUID();
    insertMsg.run(id, gigId, senderId, receiverId, pick(MESSAGE_BODIES), cid);
    messagesCreated++;
  }
  console.log(`  Inserted ${messagesCreated} messages.`);

  console.log('Done. Summary:');
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  const gigCount = db.prepare('SELECT COUNT(*) as c FROM gigs').get() as { c: number };
  const appCount = db.prepare('SELECT COUNT(*) as c FROM applications').get() as { c: number };
  const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages').get() as { c: number };
  console.log(`  Users: ${userCount.c}, Gigs: ${gigCount.c}, Applications: ${appCount.c}, Messages: ${msgCount.c}`);
  console.log(`  All seed users have password: ${SEED_PASSWORD}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

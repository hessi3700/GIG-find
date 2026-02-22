import { randomUUID } from 'crypto';
import { getDb } from '../config/db.js';

export function generateId(): string {
  return randomUUID();
}

// --- Users ---
export interface UserRow {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  created_at: string;
}

export function createUser(data: { email: string; passwordHash: string; name: string }): UserRow {
  const id = generateId();
  const db = getDb();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
  ).run(id, data.email.toLowerCase(), data.passwordHash, data.name);
  return getUserById(id)!;
}

export function getUserById(id: string, includePassword = false): UserRow | null {
  const row = getDb()
    .prepare('SELECT id, email, name, created_at' + (includePassword ? ', password_hash' : '') + ' FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;
  if (!row) return null;
  if (!includePassword) (row as UserRow & { password_hash?: string }).password_hash = undefined;
  return row as UserRow;
}

export function findUserByEmail(email: string, includePassword = false): UserRow | null {
  const row = getDb()
    .prepare('SELECT id, email, name, created_at' + (includePassword ? ', password_hash' : '') + ' FROM users WHERE email = ?')
    .get(email.toLowerCase()) as UserRow | undefined;
  if (!row) return null;
  if (!includePassword && row) (row as UserRow & { password_hash?: string }).password_hash = undefined;
  return row as UserRow;
}

// --- Gigs ---
export interface GigRow {
  id: string;
  title: string;
  description: string;
  category: string;
  pay_rate: number;
  currency: string;
  created_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function createGig(data: {
  title: string;
  description: string;
  category: string;
  payRate: number;
  currency?: string;
  createdBy: string;
}): GigRow {
  const id = generateId();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO gigs (id, title, description, category, pay_rate, currency, created_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
  ).run(
    id,
    data.title,
    data.description,
    data.category,
    data.payRate,
    data.currency ?? 'USD',
    data.createdBy,
    now,
    now
  );
  return getGigById(id)!;
}

export function getGigById(id: string): GigRow | null {
  return getDb().prepare('SELECT * FROM gigs WHERE id = ?').get(id) as GigRow | null ?? null;
}

export function listGigs(params: {
  category?: string;
  minPay?: number;
  maxPay?: number;
  search?: string;
  page: number;
  limit: number;
}): { gigs: (GigRow & { creator_name?: string; creator_email?: string })[]; total: number } {
  const db = getDb();
  const conditions: string[] = ["status = 'open'"];
  const args: (string | number)[] = [];
  if (params.category) {
    conditions.push('category = ?');
    args.push(params.category);
  }
  if (params.minPay != null) {
    conditions.push('pay_rate >= ?');
    args.push(params.minPay);
  }
  if (params.maxPay != null) {
    conditions.push('pay_rate <= ?');
    args.push(params.maxPay);
  }
  if (params.search?.trim()) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    const term = '%' + params.search.trim() + '%';
    args.push(term, term);
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare('SELECT COUNT(*) as total FROM gigs' + where).get(...args) as { total: number };
  const total = countRow.total;
  const offset = (params.page - 1) * params.limit;
  const gigs = db
    .prepare(
      `SELECT g.*, u.name as creator_name, u.email as creator_email
       FROM gigs g
       JOIN users u ON g.created_by = u.id
       ${where}
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...args, params.limit, offset) as (GigRow & { creator_name?: string; creator_email?: string })[];
  return { gigs, total };
}

export function listGigsByUser(createdBy: string): (GigRow & { creator_name?: string; creator_email?: string })[] {
  return getDb()
    .prepare(
      `SELECT g.*, u.name as creator_name, u.email as creator_email
       FROM gigs g JOIN users u ON g.created_by = u.id
       WHERE g.created_by = ?
       ORDER BY g.created_at DESC`
    )
    .all(createdBy) as (GigRow & { creator_name?: string; creator_email?: string })[];
}

export function updateGig(
  id: string,
  createdBy: string,
  data: Partial<{ title: string; description: string; category: string; payRate: number; currency: string }>
): GigRow | null {
  const gig = getGigById(id);
  if (!gig || gig.created_by !== createdBy) return null;
  const updates: string[] = [];
  const args: (string | number)[] = [];
  if (data.title !== undefined) {
    updates.push('title = ?');
    args.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    args.push(data.description);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    args.push(data.category);
  }
  if (data.payRate !== undefined) {
    updates.push('pay_rate = ?');
    args.push(data.payRate);
  }
  if (data.currency !== undefined) {
    updates.push('currency = ?');
    args.push(data.currency);
  }
  if (updates.length === 0) return gig;
  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  args.push(now, id);
  getDb().prepare('UPDATE gigs SET ' + updates.join(', ') + ' WHERE id = ?').run(...args);
  return getGigById(id);
}

export function deleteGig(id: string, createdBy: string): boolean {
  const r = getDb().prepare('DELETE FROM gigs WHERE id = ? AND created_by = ?').run(id, createdBy);
  return r.changes > 0;
}

// --- Applications ---
export interface ApplicationRow {
  id: string;
  gig_id: string;
  applicant_id: string;
  message: string;
  status: string;
  created_at: string;
}

export function createApplication(data: { gigId: string; applicantId: string; message: string }): ApplicationRow | null {
  const gig = getGigById(data.gigId);
  if (!gig || gig.status !== 'open') return null;
  const id = generateId();
  const db = getDb();
  try {
    db.prepare(
      'INSERT INTO applications (id, gig_id, applicant_id, message) VALUES (?, ?, ?, ?)'
    ).run(id, data.gigId, data.applicantId, data.message);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return null;
    throw e;
  }
  return getApplicationById(id);
}

export function getApplicationById(id: string): ApplicationRow | null {
  return getDb().prepare('SELECT * FROM applications WHERE id = ?').get(id) as ApplicationRow | null ?? null;
}

export function getApplicationWithDetails(id: string): (ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string }) | null {
  const row = getDb()
    .prepare(
      `SELECT a.*, u.name as applicant_name, u.email as applicant_email, g.title as gig_title
       FROM applications a
       JOIN users u ON a.applicant_id = u.id
       JOIN gigs g ON a.gig_id = g.id
       WHERE a.id = ?`
    )
    .get(id);
  return (row as (ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string }) | undefined) ?? null;
}

export function listApplicationsByGig(gigId: string): (ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string })[] {
  return getDb()
    .prepare(
      `SELECT a.*, u.name as applicant_name, u.email as applicant_email, g.title as gig_title
       FROM applications a
       JOIN users u ON a.applicant_id = u.id
       JOIN gigs g ON a.gig_id = g.id
       WHERE a.gig_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(gigId) as (ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string })[];
}

export function listApplicationsByApplicant(applicantId: string): (ApplicationRow & { gig_title?: string; gig_category?: string; gig_pay_rate?: number; gig_status?: string; gig_created_by?: string })[] {
  return getDb()
    .prepare(
      `SELECT a.*, g.title as gig_title, g.category as gig_category, g.pay_rate as gig_pay_rate, g.status as gig_status, g.created_by as gig_created_by
       FROM applications a
       JOIN gigs g ON a.gig_id = g.id
       WHERE a.applicant_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(applicantId) as (ApplicationRow & { gig_title?: string; gig_category?: string; gig_pay_rate?: number; gig_status?: string; gig_created_by?: string })[];
}

export function updateApplicationStatus(id: string, status: string, gigOwnerId: string): ApplicationRow | null {
  const app = getApplicationById(id);
  if (!app) return null;
  const gig = getGigById(app.gig_id);
  if (!gig || gig.created_by !== gigOwnerId) return null;
  getDb().prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
  return getApplicationById(id);
}

export function getGigOwnerId(gigId: string): string | null {
  const g = getGigById(gigId);
  return g ? g.created_by : null;
}

export function hasApplication(gigId: string, applicantId: string): boolean {
  const r = getDb().prepare('SELECT 1 FROM applications WHERE gig_id = ? AND applicant_id = ?').get(gigId, applicantId);
  return !!r;
}

// --- Messages ---
export interface MessageRow {
  id: string;
  gig_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  conversation_id: string | null;
  created_at: string;
}

export function createMessage(data: {
  gigId: string;
  senderId: string;
  receiverId: string;
  body: string;
  conversationId?: string;
}): MessageRow {
  const id = generateId();
  const db = getDb();
  db.prepare(
    'INSERT INTO messages (id, gig_id, sender_id, receiver_id, body, conversation_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.gigId, data.senderId, data.receiverId, data.body, data.conversationId ?? null);
  return getMessageById(id)!;
}

export function getMessageById(id: string): MessageRow | null {
  return getDb().prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | null ?? null;
}

export function getMessageWithDetails(id: string): (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string }) | null {
  const row = getDb()
    .prepare(
      `SELECT m.*, g.title as gig_title, s.name as sender_name, s.email as sender_email, r.name as receiver_name, r.email as receiver_email
       FROM messages m
       LEFT JOIN gigs g ON m.gig_id = g.id
       LEFT JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.receiver_id = r.id
       WHERE m.id = ?`
    )
    .get(id);
  return (row as (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string }) | undefined) ?? null;
}

export function listMessagesByUser(userId: string): (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[] {
  return getDb()
    .prepare(
      `SELECT m.*, g.title as gig_title,
              s.name as sender_name, s.email as sender_email,
              r.name as receiver_name, r.email as receiver_email
       FROM messages m
       LEFT JOIN gigs g ON m.gig_id = g.id
       LEFT JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.receiver_id = r.id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC`
    )
    .all(userId, userId) as (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[];
}

export function listMessagesByConversation(conversationId: string, userId: string): (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[] {
  return getDb()
    .prepare(
      `SELECT m.*, g.title as gig_title,
              s.name as sender_name, s.email as sender_email,
              r.name as receiver_name, r.email as receiver_email
       FROM messages m
       LEFT JOIN gigs g ON m.gig_id = g.id
       LEFT JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.receiver_id = r.id
       WHERE m.conversation_id = ? AND (m.sender_id = ? OR m.receiver_id = ?)
       ORDER BY m.created_at ASC`
    )
    .all(conversationId, userId, userId) as (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[];
}

/** Minimal D1 interface so we don't depend on @cloudflare/workers-types at build time. */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1ResultTyped<T>>;
}
interface D1Result {
  meta: { changes?: number };
}
interface D1ResultTyped<T> {
  results: T[] | null;
}

import type {
  ApplicationRow,
  GigRow,
  IRepo,
  MessageRow,
  UserRow,
} from './repo-types.js';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function rowToUser(row: Record<string, unknown>, includePassword: boolean): UserRow {
  const u: UserRow = {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    created_at: row.created_at as string,
  };
  if (includePassword && row.password_hash != null) u.password_hash = row.password_hash as string;
  return u;
}

function rowToGig(row: Record<string, unknown>): GigRow {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    pay_rate: Number(row.pay_rate),
    currency: row.currency as string,
    created_by: row.created_by as string,
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToApplication(row: Record<string, unknown>): ApplicationRow {
  return {
    id: row.id as string,
    gig_id: row.gig_id as string,
    applicant_id: row.applicant_id as string,
    message: row.message as string,
    status: row.status as string,
    created_at: row.created_at as string,
  };
}

function rowToMessage(row: Record<string, unknown>): MessageRow {
  return {
    id: row.id as string,
    gig_id: row.gig_id as string,
    sender_id: row.sender_id as string,
    receiver_id: row.receiver_id as string,
    body: row.body as string,
    conversation_id: (row.conversation_id as string) ?? null,
    created_at: row.created_at as string,
  };
}

export function createD1Repo(db: D1Database): IRepo {
  return {
    async createUser(data) {
      const id = generateId();
      await db
        .prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
        .bind(id, data.email.toLowerCase(), data.passwordHash, data.name)
        .run();
      const row = await db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').bind(id).first();
      return rowToUser(row as Record<string, unknown>, false);
    },

    async getUserById(id, includePassword = false) {
      const cols = 'id, email, name, created_at' + (includePassword ? ', password_hash' : '');
      const row = await db.prepare(`SELECT ${cols} FROM users WHERE id = ?`).bind(id).first();
      if (!row) return null;
      return rowToUser(row as Record<string, unknown>, includePassword ?? false);
    },

    async findUserByEmail(email, includePassword = false) {
      const cols = 'id, email, name, created_at' + (includePassword ? ', password_hash' : '');
      const row = await db.prepare(`SELECT ${cols} FROM users WHERE email = ?`).bind(email.toLowerCase()).first();
      if (!row) return null;
      return rowToUser(row as Record<string, unknown>, includePassword ?? false);
    },

    async createGig(data) {
      const id = generateId();
      const t = now();
      await db
        .prepare(
          `INSERT INTO gigs (id, title, description, category, pay_rate, currency, created_by, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
        )
        .bind(id, data.title, data.description, data.category, data.payRate, data.currency ?? 'USD', data.createdBy, t, t)
        .run();
      const row = await db.prepare('SELECT * FROM gigs WHERE id = ?').bind(id).first();
      return rowToGig(row as Record<string, unknown>);
    },

    async getGigById(id) {
      const row = await db.prepare('SELECT * FROM gigs WHERE id = ?').bind(id).first();
      if (!row) return null;
      return rowToGig(row as Record<string, unknown>);
    },

    async listGigs(params) {
      const conditions: string[] = ["status = 'open'"];
      const bindArgs: (string | number)[] = [];
      if (params.category) {
        conditions.push('category = ?');
        bindArgs.push(params.category);
      }
      if (params.minPay != null) {
        conditions.push('pay_rate >= ?');
        bindArgs.push(params.minPay);
      }
      if (params.maxPay != null) {
        conditions.push('pay_rate <= ?');
        bindArgs.push(params.maxPay);
      }
      if (params.search?.trim()) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        const term = '%' + params.search.trim() + '%';
        bindArgs.push(term, term);
      }
      const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
      const countResult = await db.prepare('SELECT COUNT(*) as total FROM gigs' + where).bind(...bindArgs).first();
      const total = Number((countResult as Record<string, unknown>)?.total ?? 0);
      const offset = (params.page - 1) * params.limit;
      const listStmt = db
        .prepare(
          `SELECT g.*, u.name as creator_name, u.email as creator_email
           FROM gigs g JOIN users u ON g.created_by = u.id
           ${where}
           ORDER BY g.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .bind(...bindArgs, params.limit, offset);
      const listResult = await listStmt.all();
      const gigs = (listResult.results ?? []).map((r) => ({ ...rowToGig(r as Record<string, unknown>), ...(r as Record<string, unknown>) })) as (GigRow & { creator_name?: string; creator_email?: string })[];
      return { gigs, total };
    },

    async listGigsByUser(createdBy) {
      const result = await db
        .prepare(
          `SELECT g.*, u.name as creator_name, u.email as creator_email
           FROM gigs g JOIN users u ON g.created_by = u.id
           WHERE g.created_by = ? ORDER BY g.created_at DESC`
        )
        .bind(createdBy)
        .all();
      return (result.results ?? []).map((r) => ({ ...rowToGig(r as Record<string, unknown>), ...(r as Record<string, unknown>) })) as (GigRow & { creator_name?: string; creator_email?: string })[];
    },

    async updateGig(id, createdBy, data) {
      const gig = await this.getGigById(id);
      if (!gig || gig.created_by !== createdBy) return null;
      const updates: string[] = [];
      const bindArgs: (string | number)[] = [];
      if (data.title !== undefined) {
        updates.push('title = ?');
        bindArgs.push(data.title);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        bindArgs.push(data.description);
      }
      if (data.category !== undefined) {
        updates.push('category = ?');
        bindArgs.push(data.category);
      }
      if (data.payRate !== undefined) {
        updates.push('pay_rate = ?');
        bindArgs.push(data.payRate);
      }
      if (data.currency !== undefined) {
        updates.push('currency = ?');
        bindArgs.push(data.currency);
      }
      if (updates.length === 0) return gig;
      const t = now();
      updates.push('updated_at = ?');
      bindArgs.push(t, id);
      await db.prepare('UPDATE gigs SET ' + updates.join(', ') + ' WHERE id = ?').bind(...bindArgs).run();
      return this.getGigById(id);
    },

    async deleteGig(id, createdBy) {
      const r = await db.prepare('DELETE FROM gigs WHERE id = ? AND created_by = ?').bind(id, createdBy).run();
      return (r.meta?.changes ?? 0) > 0;
    },

    async createApplication(data) {
      const gig = await this.getGigById(data.gigId);
      if (!gig || gig.status !== 'open') return null;
      const id = generateId();
      try {
        await db
          .prepare('INSERT INTO applications (id, gig_id, applicant_id, message) VALUES (?, ?, ?, ?)')
          .bind(id, data.gigId, data.applicantId, data.message)
          .run();
      } catch (e) {
        if (String(e).includes('UNIQUE')) return null;
        throw e;
      }
      return this.getApplicationById(id);
    },

    async getApplicationById(id) {
      const row = await db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
      if (!row) return null;
      return rowToApplication(row as Record<string, unknown>);
    },

    async getApplicationWithDetails(id) {
      const row = await db
        .prepare(
          `SELECT a.*, u.name as applicant_name, u.email as applicant_email, g.title as gig_title
           FROM applications a
           JOIN users u ON a.applicant_id = u.id
           JOIN gigs g ON a.gig_id = g.id
           WHERE a.id = ?`
        )
        .bind(id)
        .first();
      if (!row) return null;
      const r = row as Record<string, unknown>;
      return { ...rowToApplication(r), applicant_name: r.applicant_name as string, applicant_email: r.applicant_email as string, gig_title: r.gig_title as string };
    },

    async listApplicationsByGig(gigId) {
      const result = await db
        .prepare(
          `SELECT a.*, u.name as applicant_name, u.email as applicant_email, g.title as gig_title
           FROM applications a
           JOIN users u ON a.applicant_id = u.id
           JOIN gigs g ON a.gig_id = g.id
           WHERE a.gig_id = ? ORDER BY a.created_at DESC`
        )
        .bind(gigId)
        .all();
      return (result.results ?? []).map((r) => {
        const x = r as Record<string, unknown>;
        return { ...rowToApplication(x), applicant_name: x.applicant_name, applicant_email: x.applicant_email, gig_title: x.gig_title };
      }) as (ApplicationRow & { applicant_name?: string; applicant_email?: string; gig_title?: string })[];
    },

    async listApplicationsByApplicant(applicantId) {
      const result = await db
        .prepare(
          `SELECT a.*, g.title as gig_title, g.category as gig_category, g.pay_rate as gig_pay_rate, g.status as gig_status, g.created_by as gig_created_by
           FROM applications a JOIN gigs g ON a.gig_id = g.id
           WHERE a.applicant_id = ? ORDER BY a.created_at DESC`
        )
        .bind(applicantId)
        .all();
      return (result.results ?? []).map((r) => {
        const x = r as Record<string, unknown>;
        return {
          ...rowToApplication(x),
          gig_title: x.gig_title,
          gig_category: x.gig_category,
          gig_pay_rate: x.gig_pay_rate as number,
          gig_status: x.gig_status,
          gig_created_by: x.gig_created_by,
        };
      }) as (ApplicationRow & { gig_title?: string; gig_category?: string; gig_pay_rate?: number; gig_status?: string; gig_created_by?: string })[];
    },

    async updateApplicationStatus(id, status, gigOwnerId) {
      const app = await this.getApplicationById(id);
      if (!app) return null;
      const gig = await this.getGigById(app.gig_id);
      if (!gig || gig.created_by !== gigOwnerId) return null;
      await db.prepare('UPDATE applications SET status = ? WHERE id = ?').bind(status, id).run();
      return this.getApplicationById(id);
    },

    async getGigOwnerId(gigId) {
      const g = await this.getGigById(gigId);
      return g ? g.created_by : null;
    },

    async hasApplication(gigId, applicantId) {
      const row = await db.prepare('SELECT 1 FROM applications WHERE gig_id = ? AND applicant_id = ?').bind(gigId, applicantId).first();
      return !!row;
    },

    async createMessage(data) {
      const id = generateId();
      await db
        .prepare('INSERT INTO messages (id, gig_id, sender_id, receiver_id, body, conversation_id) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, data.gigId, data.senderId, data.receiverId, data.body, data.conversationId ?? null)
        .run();
      const row = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
      return rowToMessage(row as Record<string, unknown>);
    },

    async getMessageById(id) {
      const row = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
      if (!row) return null;
      return rowToMessage(row as Record<string, unknown>);
    },

    async getMessageWithDetails(id) {
      const row = await db
        .prepare(
          `SELECT m.*, g.title as gig_title, s.name as sender_name, s.email as sender_email, r.name as receiver_name, r.email as receiver_email
           FROM messages m
           LEFT JOIN gigs g ON m.gig_id = g.id
           LEFT JOIN users s ON m.sender_id = s.id
           LEFT JOIN users r ON m.receiver_id = r.id
           WHERE m.id = ?`
        )
        .bind(id)
        .first();
      if (!row) return null;
      const r = row as Record<string, unknown>;
      return {
        ...rowToMessage(r),
        gig_title: r.gig_title as string,
        sender_name: r.sender_name as string,
        sender_email: r.sender_email as string,
        receiver_name: r.receiver_name as string,
        receiver_email: r.receiver_email as string,
      };
    },

    async listMessagesByUser(userId) {
      const result = await db
        .prepare(
          `SELECT m.*, g.title as gig_title, s.name as sender_name, s.email as sender_email, r.name as receiver_name, r.email as receiver_email
           FROM messages m
           LEFT JOIN gigs g ON m.gig_id = g.id
           LEFT JOIN users s ON m.sender_id = s.id
           LEFT JOIN users r ON m.receiver_id = r.id
           WHERE m.sender_id = ? OR m.receiver_id = ?
           ORDER BY m.created_at DESC`
        )
        .bind(userId, userId)
        .all();
      return (result.results ?? []).map((r) => {
        const x = r as Record<string, unknown>;
        return {
          ...rowToMessage(x),
          gig_title: x.gig_title,
          sender_name: x.sender_name,
          sender_email: x.sender_email,
          receiver_name: x.receiver_name,
          receiver_email: x.receiver_email,
        };
      }) as (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[];
    },

    async listMessagesByConversation(conversationId, userId) {
      const result = await db
        .prepare(
          `SELECT m.*, g.title as gig_title, s.name as sender_name, s.email as sender_email, r.name as receiver_name, r.email as receiver_email
           FROM messages m
           LEFT JOIN gigs g ON m.gig_id = g.id
           LEFT JOIN users s ON m.sender_id = s.id
           LEFT JOIN users r ON m.receiver_id = r.id
           WHERE m.conversation_id = ? AND (m.sender_id = ? OR m.receiver_id = ?)
           ORDER BY m.created_at ASC`
        )
        .bind(conversationId, userId, userId)
        .all();
      return (result.results ?? []).map((r) => {
        const x = r as Record<string, unknown>;
        return {
          ...rowToMessage(x),
          gig_title: x.gig_title,
          sender_name: x.sender_name,
          sender_email: x.sender_email,
          receiver_name: x.receiver_name,
          receiver_email: x.receiver_email,
        };
      }) as (MessageRow & { gig_title?: string; sender_name?: string; sender_email?: string; receiver_name?: string; receiver_email?: string })[];
    },
  };
}

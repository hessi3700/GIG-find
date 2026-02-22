import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

const DEFAULT_PATH = join(process.cwd(), 'data', 'gigfind.db');

function getDbPath(): string {
  return process.env.DATABASE_PATH || DEFAULT_PATH;
}

function ensureDataDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export async function connectDb(_uri?: string): Promise<void> {
  if (db) return;
  const path = getDbPath();
  await ensureDataDir(path);
  db = new Database(path);
  const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

function ensureDb(): Database.Database {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return db;
}

export function getDb(): Database.Database {
  return ensureDb();
}

export function isConnected(): boolean {
  return db != null;
}

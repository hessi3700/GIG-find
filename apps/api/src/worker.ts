import http from 'node:http';
import { handleAsNodeRequest } from 'cloudflare:node';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

let server: http.Server | null = null;
let serverPort: number | null = null;

async function ensureServer(env: { DATABASE_PATH?: string; JWT_SECRET?: string }): Promise<number> {
  if (serverPort != null) return serverPort;
  if (env.DATABASE_PATH) process.env.DATABASE_PATH = env.DATABASE_PATH;
  if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;
  await connectDb();
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, () => resolve()));
  const a = server.address();
  serverPort = typeof a === 'object' && a?.port ? a.port : 8787;
  return serverPort;
}

export interface Env {
  DATABASE_PATH?: string;
  JWT_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const port = await ensureServer(env);
    return handleAsNodeRequest(port, request);
  },
};

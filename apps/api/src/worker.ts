import { createApp } from './app.js';
import { createD1Repo, setRepo } from './db/repo.js';
import type { D1Database } from './db/repo-d1.js';
import { fetchToExpress } from './fetch-to-express.js';

export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

let cachedApp: ReturnType<typeof createApp> | null = null;

function getApp(env: Env): ReturnType<typeof createApp> {
  if (cachedApp) return cachedApp;
  if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;
  setRepo(createD1Repo(env.DB));
  cachedApp = createApp();
  return cachedApp;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const app = getApp(env);
    return fetchToExpress(request, app);
  },
};

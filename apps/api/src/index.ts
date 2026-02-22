import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await connectDb();
  const app = createApp();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(PORT, host, () => {
    console.log(`API running at http://${host}:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gigRoutes from './routes/gigs.js';
import applicationRoutes from './routes/applications.js';
import messageRoutes from './routes/messages.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Gig Finder API' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/gigs', gigRoutes);
  app.use('/api', applicationRoutes);
  app.use('/api/messages', messageRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}

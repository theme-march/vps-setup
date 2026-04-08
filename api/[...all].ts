import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

import authRoutes from '../src/backend/routes/auth';
import projectRoutes from '../src/backend/routes/projects';
import webhookRoutes from '../src/backend/routes/webhooks';
import deploymentRoutes from '../src/backend/routes/deployments';
import systemRoutes from '../src/backend/routes/system';
import pm2Routes from '../src/backend/routes/pm2';
import serverRoutes from '../src/backend/routes/servers';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_URI_DIRECT = process.env.MONGODB_URI_DIRECT?.trim();

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected || mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
  } catch (err: any) {
    if (err.message.includes('querySrv') && MONGODB_URI_DIRECT) {
      await mongoose.connect(MONGODB_URI_DIRECT, {
        serverSelectionTimeoutMS: 10000,
      });
      isConnected = true;
      return;
    }
    throw err;
  }
};

app.use(cors());
app.use(express.json());

app.use(async (_req, _res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/pm2', pm2Routes);
app.use('/api/servers', serverRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;

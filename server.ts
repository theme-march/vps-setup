import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import dns from 'dns';
import dotenv from 'dotenv';

import authRoutes from './src/backend/routes/auth';
import projectRoutes from './src/backend/routes/projects';
import webhookRoutes from './src/backend/routes/webhooks';
import deploymentRoutes from './src/backend/routes/deployments';
import systemRoutes from './src/backend/routes/system';
import pm2Routes from './src/backend/routes/pm2';
import serverRoutes from './src/backend/routes/servers';

dotenv.config();

// Atlas uses DNS SRV lookups for mongodb+srv:// URIs.
// Some VPS/local DNS resolvers refuse SRV queries, so we force public resolvers.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_URI_DIRECT = process.env.MONGODB_URI_DIRECT?.trim();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  app.use(cors());
  app.use(express.json());

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in .env');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('Connected to MongoDB Atlas');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    if (err?.code) {
      console.error('MongoDB connection code:', err.code);
    }
    if (err.message.includes('querySrv')) {
      console.error('HINT: DNS SRV lookup is failing on this machine. Use MONGODB_URI_DIRECT with Atlas\'s standard mongodb:// connection string.');
      if (MONGODB_URI_DIRECT) {
        try {
          await mongoose.connect(MONGODB_URI_DIRECT, {
            serverSelectionTimeoutMS: 10000,
          });
          console.log('Connected to MongoDB Atlas using direct connection string');
        } catch (directErr: any) {
          console.error('MongoDB direct connection error:', directErr.message);
          if (directErr?.code) {
            console.error('MongoDB direct connection code:', directErr.code);
          }
        }
      }
    }
    if (err.message.includes('buffering timed out')) {
      console.error('HINT: Check if your MongoDB Atlas IP Access List allows connections from everywhere (0.0.0.0/0).');
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/deployments', deploymentRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/pm2', pm2Routes);
  app.use('/api/servers', serverRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Explicitly disable HMR
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Socket.io for real-time logs
  io.on('connection', (socket) => {
    console.log('Client connected for logs');
    socket.on('join-project-logs', (projectId) => {
      socket.join(`logs-${projectId}`);
    });
  });

  // Export io for use in services
  app.set('io', io);
}

startServer();

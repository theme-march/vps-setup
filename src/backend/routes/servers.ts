import express from 'express';
import { Server } from '../models/Server';
import { authMiddleware as auth } from '../middleware/auth';
import { Client } from 'ssh2';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const servers = await Server.find();
    res.json(servers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, ip, username, password, sshKey } = req.body;
    const server = new Server({ name, ip, username, password, sshKey });
    await server.save();
    res.status(201).json(server);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/test', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const conn = new Client();
    conn.on('ready', () => {
      conn.end();
      if (!res.headersSent) {
        res.json({ message: 'Connection successful' });
      }
    }).on('error', (err) => {
      if (!res.headersSent) {
        res.status(400).json({ error: `Connection failed: ${err.message}` });
      }
    }).connect({
      host: server.ip,
      port: 22,
      username: server.username,
      password: server.password,
      privateKey: server.sshKey
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

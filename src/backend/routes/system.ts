import express from 'express';
import fs from 'fs';
import path from 'path';
import { Client } from 'ssh2';
import { setSSHConfig, getSSHConfig, runRemoteCommand } from '../services/sshService';
import { authMiddleware as auth } from '../middleware/auth';

const router = express.Router();

router.post('/connect', auth, async (req, res) => {
  const { ip, username, password } = req.body;
  
  const conn = new Client();
  conn.on('ready', () => {
    setSSHConfig({ host: ip, username, password });
    conn.end();
    if (!res.headersSent) {
      res.json({ message: 'Connected to VPS successfully', ip });
    }
  }).on('error', (err) => {
    if (!res.headersSent) {
      res.status(400).json({ error: `Connection failed: ${err.message}` });
    }
  }).connect({
    host: ip,
    port: 22,
    username,
    password
  });
});

router.get('/status', auth, (req, res) => {
  const activeSSHConfig = getSSHConfig();
  if (activeSSHConfig) {
    res.json({ 
      connected: true, 
      ip: activeSSHConfig.host,
      username: activeSSHConfig.username
    });
  } else {
    res.json({ connected: false });
  }
});

router.post('/disconnect', auth, (req, res) => {
  setSSHConfig(null);
  res.json({ message: 'Disconnected from VPS' });
});

router.get('/health', auth, async (req, res) => {
  try {
    const cmd = `
      cpu=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}');
      mem=$(free -m | awk 'NR==2{printf "%.2f", $3*100/$2 }');
      disk=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//');
      echo "$cpu|$mem|$disk"
    `;
    
    const output = await runRemoteCommand(cmd);
    const parts = output.trim().split('|');
    if (parts.length === 3) {
      const [cpu, mem, disk] = parts;
      res.json({
        cpu: `${parseFloat(cpu || '0').toFixed(1)}%`,
        memory: `${parseFloat(mem || '0').toFixed(1)}%`,
        disk: `${disk || '0'}%`,
        connected: true
      });
    } else {
      res.status(500).json({ error: 'Invalid output from server' });
    }
  } catch (err: any) {
    res.status(500).json({ 
      cpu: '0%', 
      memory: '0%', 
      disk: '0%',
      connected: false,
      error: err.message
    });
  }
});

router.get('/files', auth, async (req, res) => {
  const dirPath = (req.query.path as string) || '/opt';
  const isRemote = req.query.remote === 'true';
  const activeSSHConfig = getSSHConfig();
  const escapedDirPath = `'${dirPath.replace(/'/g, `'\\''`)}'`;

  /** CHANGED: when remote files are requested, require active VPS connection */
  if (isRemote && !activeSSHConfig) {
    return res.status(400).json({ error: 'SSH not connected' });
  }

  if (isRemote && activeSSHConfig) {
    try {
      const output = await runRemoteCommand(`if [ -d ${escapedDirPath} ]; then ls -lA --time-style=long-iso ${escapedDirPath}; else echo "__DIR_NOT_FOUND__"; fi`);
      if (output.trim() === '__DIR_NOT_FOUND__') {
        return res.status(404).json({ error: 'Directory not found' });
      }
      const lines = output.split('\n').slice(1); // Skip 'total X'
      const files = lines.filter(line => line.trim()).map(line => {
        const parts = line.split(/\s+/);
        if (parts.length < 8) return null;
        
        const permissions = parts[0];
        const owner = parts[2];
        const group = parts[3];
        const size = parseInt(parts[4]);
        const date = parts[5];
        const time = parts[6];
        const name = parts.slice(7).join(' ');
        const isDirectory = permissions.startsWith('d');
        
        return {
          name,
          path: path.join(dirPath, name),
          isDirectory,
          size,
          mtime: `${date} ${time}`,
          permissions,
          owner,
          group
        };
      }).filter(f => f !== null);

      res.json({ currentPath: dirPath, files, isRemote: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Local fallback (existing logic)
    try {
      if (!fs.existsSync(dirPath)) {
        return res.status(404).json({ error: 'Directory not found' });
      }
      const files = fs.readdirSync(dirPath);
      const fileDetails = files.map(file => {
        try {
          const filePath = path.join(dirPath, file);
          const fileStats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            isDirectory: fileStats.isDirectory(),
            size: fileStats.size,
            mtime: fileStats.mtime,
            permissions: (fileStats.mode & 0o777).toString(8),
            owner: 'root',
            group: 'root'
          };
        } catch (e) {
          return { name: file, path: path.join(dirPath, file), isDirectory: false, error: 'Permission denied' };
        }
      });
      res.json({ currentPath: dirPath, files: fileDetails, isRemote: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;

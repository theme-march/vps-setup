import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import { authMiddleware as auth } from '../middleware/auth';
import { getSSHConfig, runRemoteCommand } from '../services/sshService';
import { Project } from '../models/Project';

const router = express.Router();

// Helper to run shell commands (Local or Remote)
const runCommand = async (command: string, cwd?: string): Promise<string> => {
  const activeSSHConfig = getSSHConfig();
  if (activeSSHConfig) {
    const fullCommand = cwd ? `cd "${cwd}" && ${command}` : command;
    return runRemoteCommand(fullCommand);
  }

  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      resolve(stdout);
    });
  });
};

router.get('/list', auth, async (req, res) => {
  try {
    const activeSSHConfig = getSSHConfig();
    if (!activeSSHConfig) {
      return res.json([]);
    }
    
    // Use sudo to ensure we get full metrics if pm2 is running as root
    const output = await runCommand('sudo pm2 jlist');
    const processes = JSON.parse(output);

    // Enrich with Git info
    const enrichedProcesses = await Promise.all(processes.map(async (proc: any) => {
      const cwd = proc.pm2_env?.pm_cwd;
      if (!cwd) return { ...proc, git: null };

      try {
        // Check if it's a git repo in cwd or parent (useful for pm2 serve)
        const checkPath = async (p: string) => {
          const isGit = await runCommand(`[ -d "${p}/.git" ] && echo "true" || echo "false"`);
          return isGit.trim() === 'true';
        };

        let gitPath = '';
        if (await checkPath(cwd)) {
          gitPath = cwd;
        } else {
          // Try parent directory
          const parentDir = cwd.split('/').slice(0, -1).join('/');
          if (parentDir && await checkPath(parentDir)) {
            gitPath = parentDir;
          }
        }

        if (gitPath) {
          const remoteUrl = await runCommand(`git -C "${gitPath}" remote get-url origin`).catch(() => 'N/A');
          const branch = await runCommand(`git -C "${gitPath}" rev-parse --abbrev-ref HEAD`).catch(() => 'N/A');
          const lastCommit = await runCommand(`git -C "${gitPath}" log -1 --format=%s`).catch(() => 'N/A');
          
          return {
            ...proc,
            git: {
              isRepo: true,
              remoteUrl: remoteUrl.trim(),
              branch: branch.trim(),
              lastCommit: lastCommit.trim(),
              cwd: gitPath
            }
          };
        }
      } catch (e) {
        // Ignore errors for individual processes
      }
      
      return { ...proc, git: { isRepo: false, cwd: cwd } };
    }));

    res.json(enrichedProcesses);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch PM2 list' });
  }
});

router.post('/restart/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    // PM2 restart can take a name or id
    await runCommand(`pm2 restart "${id}"`);
    res.json({ message: `Process ${id} restarted successfully` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/connect', auth, async (req, res) => {
  try {
    const { cwd, repoUrl } = req.body;
    if (!cwd || !repoUrl) {
      return res.status(400).json({ error: 'cwd and repoUrl are required' });
    }

    // Initialize git if not already, add remote, and pull
    await runCommand(`git -C "${cwd}" init`);
    await runCommand(`git -C "${cwd}" remote add origin "${repoUrl}"`).catch(() => {
      // If remote already exists, update it
      return runCommand(`git -C "${cwd}" remote set-url origin "${repoUrl}"`);
    });
    await runCommand(`git -C "${cwd}" fetch origin`);
    
    res.json({ message: 'Git connected successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reset/:projectName', auth, async (req, res) => {
  try {
    const { projectName } = req.params;
    const { branch = 'main', shouldBuild = false } = req.body;
    const activeSSHConfig = getSSHConfig();
    
    let targetPath = '';
    if (activeSSHConfig) {
      targetPath = `/opt/${projectName}`;
      await runRemoteCommand(`git -C ${targetPath} fetch --all`);
      await runRemoteCommand(`git -C ${targetPath} reset --hard origin/${branch}`);
      await runRemoteCommand(`git -C ${targetPath} clean -fd`);
    } else {
      const localPath = `./deployed_apps/${projectName}`;
      const projectPath = `/opt/${projectName}`;
      targetPath = fs.existsSync(localPath) ? localPath : projectPath;
      await runCommand(`git -C ${targetPath} fetch --all`);
      await runCommand(`git -C ${targetPath} reset --hard origin/${branch}`);
      await runCommand(`git -C ${targetPath} clean -fd`);
    }

    if (shouldBuild) {
      const project = await Project.findOne({ name: projectName });
      if (project && project.buildCommand) {
        await runCommand(project.buildCommand, targetPath);
      }
    }
    
    res.json({ message: 'Git reset successful' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/pull/:projectName', auth, async (req, res) => {
  try {
    const { projectName } = req.params;
    const { shouldBuild = false } = req.body;
    const activeSSHConfig = getSSHConfig();
    
    let targetPath = '';
    if (activeSSHConfig) {
      targetPath = `/opt/${projectName}`;
      await runRemoteCommand(`git -C ${targetPath} pull`);
    } else {
      const localPath = `./deployed_apps/${projectName}`;
      const projectPath = `/opt/${projectName}`;
      targetPath = fs.existsSync(localPath) ? localPath : projectPath;
      await runCommand(`git -C ${targetPath} pull`);
    }

    if (shouldBuild) {
      const project = await Project.findOne({ name: projectName });
      if (project && project.buildCommand) {
        await runCommand(project.buildCommand, targetPath);
      }
    }
    
    res.json({ message: 'Git pull successful' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/build/:projectName', auth, async (req, res) => {
  try {
    const { projectName } = req.params;
    const activeSSHConfig = getSSHConfig();
    
    let targetPath = '';
    if (activeSSHConfig) {
      targetPath = `/opt/${projectName}`;
    } else {
      const localPath = `./deployed_apps/${projectName}`;
      const projectPath = `/opt/${projectName}`;
      targetPath = fs.existsSync(localPath) ? localPath : projectPath;
    }

    const project = await Project.findOne({ name: projectName });
    if (!project) {
      return res.status(404).json({ error: 'Project not found in database' });
    }

    if (!project.buildCommand) {
      return res.status(400).json({ error: 'No build command defined for this project' });
    }

    await runCommand(project.buildCommand, targetPath);
    res.json({ message: 'Build successful' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

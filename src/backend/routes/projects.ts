import express from 'express';
import { Project } from '../models/Project';
import { DeploymentService } from '../services/DeploymentService';
import { authMiddleware as auth } from '../middleware/auth';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find().populate('lastDeployment').populate('serverId');
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, repoUrl, branch, buildCommand, outputDir, customDomain, serverId, internalPort, port, framework } = req.body;
    const project = new Project({
      name,
      repoUrl,
      branch,
      buildCommand,
      outputDir,
      customDomain,
      serverId,
      internalPort,
      port,
      framework,
      webhookSecret: Math.random().toString(36).substring(2, 15),
    });
    await project.save();
    res.status(201).json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/deploy', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const deploymentService = new DeploymentService(io);
    deploymentService.deploy(req.params.id); // Run in background
    res.json({ message: 'Deployment started' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const deploymentService = new DeploymentService(io);
    
    // Cleanup server resources (PM2, Nginx, Files)
    await deploymentService.cleanup(req.params.id).catch(err => {
      console.error('Cleanup failed:', err);
      // We continue even if cleanup fails to allow deleting from DB
    });

    // Delete associated deployments
    const { Deployment } = await import('../models/Deployment');
    await Deployment.deleteMany({ projectId: req.params.id });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

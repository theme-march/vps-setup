import express from 'express';
import crypto from 'crypto';
import { Project } from '../models/Project';
import { DeploymentService } from '../services/DeploymentService';

const router = express.Router();

router.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const { repository, ref } = req.body;

  if (event !== 'push') return res.status(200).send('Ignored event');

  const project = await Project.findOne({ repoUrl: repository.html_url });
  if (!project) return res.status(404).send('Project not found');

  // Verify signature
  const hmac = crypto.createHmac('sha256', project.webhookSecret || '');
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  // Check branch
  const branch = ref.split('/').pop();
  if (branch !== project.branch) {
    return res.status(200).send('Ignored branch');
  }

  const io = req.app.get('io');
  const deploymentService = new DeploymentService(io);
  deploymentService.deploy(project._id.toString());

  res.status(200).send('Deployment triggered');
});

export default router;

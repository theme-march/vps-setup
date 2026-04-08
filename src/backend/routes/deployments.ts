import express from 'express';
import { Deployment } from '../models/Deployment';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Get all deployments for a user's projects
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    // In a real app, we would filter by projects owned by the user
    // For now, we'll return all deployments and populate project info
    const deployments = await Deployment.find()
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(deployments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Get logs for a specific deployment
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);
    if (!deployment) return res.status(404).json({ message: 'Deployment not found' });
    res.json({ logs: deployment.logs });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a deployment record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deployment = await Deployment.findByIdAndDelete(req.params.id);
    if (!deployment) return res.status(404).json({ message: 'Deployment not found' });
    res.json({ message: 'Deployment deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Update deployment status (e.g., to stop a stuck build)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const deployment = await Deployment.findByIdAndUpdate(
      req.params.id,
      { status, finishedAt: status !== 'building' ? new Date() : undefined },
      { new: true }
    );
    if (!deployment) return res.status(404).json({ message: 'Deployment not found' });
    res.json(deployment);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

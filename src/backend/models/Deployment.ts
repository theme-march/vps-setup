import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['idle', 'building', 'success', 'failed'], default: 'idle' },
  logs: { type: String, default: '' },
  commitHash: { type: String },
  commitMessage: { type: String },
  author: { type: String },
  createdAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
});

export const Deployment = mongoose.model('Deployment', deploymentSchema);

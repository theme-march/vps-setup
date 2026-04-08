import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  repoUrl: { type: String, required: true },
  branch: { type: String, default: 'main' },
  buildCommand: { type: String, default: 'npm install && npm run build' },
  outputDir: { type: String, default: 'dist' },
  port: { type: String, default: '80' },
  internalPort: { type: Number, default: 3000 },
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
  customDomain: { type: String },
  framework: { type: String, default: 'nodejs' },
  status: { type: String, enum: ['idle', 'building', 'success', 'failed'], default: 'idle' },
  lastDeployment: { type: mongoose.Schema.Types.ObjectId, ref: 'Deployment' },
  envVars: [{ key: String, value: String }],
  webhookSecret: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Project = mongoose.model('Project', projectSchema);

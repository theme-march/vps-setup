import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String }, // In a real app, encrypt this or use SSH keys
  sshKey: { type: String },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Server = mongoose.model('Server', serverSchema);

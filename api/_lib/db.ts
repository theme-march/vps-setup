import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_URI_DIRECT = process.env.MONGODB_URI_DIRECT?.trim();

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
  } catch (err: any) {
    if (err.message.includes('querySrv') && MONGODB_URI_DIRECT) {
      await mongoose.connect(MONGODB_URI_DIRECT, {
        serverSelectionTimeoutMS: 10000,
      });
      isConnected = true;
      return;
    }
    throw err;
  }
}

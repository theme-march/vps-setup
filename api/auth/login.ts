import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../_lib/db';
import { User, IUser } from '../../src/backend/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { email, password } = req.body || {};
    const user = await User.findOne({ email }) as IUser | null;

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token, user: { email: user.email } });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

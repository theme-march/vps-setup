import express from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = new User({ email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }) as IUser | null;
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

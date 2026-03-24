import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { signToken, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, name are required' });
    return;
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(id, email, password_hash, name);
  const token = signToken(id);
  res.status(201).json({ token, user: { id, email, name } });
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

export default router;

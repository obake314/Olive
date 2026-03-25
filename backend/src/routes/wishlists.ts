import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getFamilyUserIds } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /wishlists
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userIds = getFamilyUserIds(req.userId!);
  const ph = userIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT w.*, u.name as created_by_name FROM wishlists w JOIN users u ON u.id = w.user_id WHERE w.user_id IN (${ph}) ORDER BY w.created_at DESC`
  ).all(...userIds);
  res.json(rows);
});

// POST /wishlists
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, memo, url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' }) as any;
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO wishlists (id, user_id, name, memo, url) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, name.trim(), memo || null, url || null
  );
  const row = db.prepare('SELECT w.*, u.name as created_by_name FROM wishlists w JOIN users u ON u.id = w.user_id WHERE w.id = ?').get(id);
  res.status(201).json(row);
});

// PUT /wishlists/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wishlists WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' }) as any;
  const { name, memo, url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' }) as any;
  db.prepare('UPDATE wishlists SET name = ?, memo = ?, url = ? WHERE id = ?').run(
    name.trim(), memo || null, url || null, req.params.id
  );
  const row = db.prepare('SELECT w.*, u.name as created_by_name FROM wishlists w JOIN users u ON u.id = w.user_id WHERE w.id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /wishlists/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM wishlists WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' }) as any;
  res.status(204).send();
});

export default router;

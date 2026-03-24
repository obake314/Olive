import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /todos
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const todos = db.prepare(
    'SELECT * FROM todos WHERE user_id = ? ORDER BY done ASC, due_date ASC, created_at DESC'
  ).all(req.userId);
  res.json(todos);
});

// POST /todos
router.post('/', (req: AuthRequest, res: Response) => {
  const { title, due_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'タイトルは必須です' }) as any;
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO todos (id, user_id, title, due_date) VALUES (?, ?, ?, ?)').run(
    id, req.userId, title.trim(), due_date || null
  );
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  res.status(201).json(todo);
});

// PATCH /todos/:id/toggle
router.patch('/:id/toggle', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!todo) return res.status(404).json({ error: 'Not found' }) as any;
  db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(todo.done ? 0 : 1, todo.id);
  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(todo.id));
});

// PUT /todos/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!todo) return res.status(404).json({ error: 'Not found' }) as any;
  const { title, due_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'タイトルは必須です' }) as any;
  db.prepare('UPDATE todos SET title = ?, due_date = ? WHERE id = ?').run(
    title.trim(), due_date || null, req.params.id
  );
  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id));
});

// DELETE /todos/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' }) as any;
  res.status(204).send();
});

export default router;

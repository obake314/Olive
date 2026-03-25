import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getFamilyUserIds } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const TODO_SELECT = `
  SELECT t.*, u.name as created_by_name,
    a.name as assignee_name
  FROM todos t
  JOIN users u ON u.id = t.user_id
  LEFT JOIN users a ON a.id = t.assignee_id
`;

// GET /todos
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userIds = getFamilyUserIds(req.userId!);
  const ph = userIds.map(() => '?').join(',');
  const todos = db.prepare(
    `${TODO_SELECT} WHERE t.user_id IN (${ph}) ORDER BY t.done ASC, t.due_date ASC, t.created_at DESC`
  ).all(...userIds);
  res.json(todos);
});

// POST /todos
router.post('/', (req: AuthRequest, res: Response) => {
  const { title, note, due_date, assignee_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'タイトルは必須です' }) as any;
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO todos (id, user_id, title, note, due_date, assignee_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.userId, title.trim(), note || null, due_date || null, assignee_id || null
  );
  const todo = db.prepare(`${TODO_SELECT} WHERE t.id = ?`).get(id);
  res.status(201).json(todo);
});

// PATCH /todos/:id/toggle
router.patch('/:id/toggle', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userIds = getFamilyUserIds(req.userId!);
  const ph = userIds.map(() => '?').join(',');
  const todo = db.prepare(`SELECT * FROM todos WHERE id = ? AND user_id IN (${ph})`).get(req.params.id, ...userIds) as any;
  if (!todo) return res.status(404).json({ error: 'Not found' }) as any;
  db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(todo.done ? 0 : 1, todo.id);
  res.json(db.prepare(`${TODO_SELECT} WHERE t.id = ?`).get(todo.id));
});

// PUT /todos/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userIds = getFamilyUserIds(req.userId!);
  const ph = userIds.map(() => '?').join(',');
  const todo = db.prepare(`SELECT * FROM todos WHERE id = ? AND user_id IN (${ph})`).get(req.params.id, ...userIds);
  if (!todo) return res.status(404).json({ error: 'Not found' }) as any;
  const { title, note, due_date, assignee_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'タイトルは必須です' }) as any;
  db.prepare('UPDATE todos SET title = ?, note = ?, due_date = ?, assignee_id = ? WHERE id = ?').run(
    title.trim(), note || null, due_date || null, assignee_id ?? null, req.params.id
  );
  res.json(db.prepare(`${TODO_SELECT} WHERE t.id = ?`).get(req.params.id));
});

// DELETE /todos/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userIds = getFamilyUserIds(req.userId!);
  const ph = userIds.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM todos WHERE id = ? AND user_id IN (${ph})`).run(req.params.id, ...userIds);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' }) as any;
  res.status(204).send();
});

export default router;

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /meal-plans?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to, date } = req.query;

  let rows: any[];
  if (date) {
    rows = db.prepare(`
      SELECT mp.*, d.name as dish_name, d.recipe_url
      FROM meal_plans mp
      JOIN dishes d ON d.id = mp.dish_id
      WHERE mp.date = ? AND mp.user_id = ?
      ORDER BY mp.meal_type
    `).all(date as string, req.userId);
  } else if (from && to) {
    rows = db.prepare(`
      SELECT mp.*, d.name as dish_name, d.recipe_url
      FROM meal_plans mp
      JOIN dishes d ON d.id = mp.dish_id
      WHERE mp.date BETWEEN ? AND ? AND mp.user_id = ?
      ORDER BY mp.date, mp.meal_type
    `).all(from as string, to as string, req.userId);
  } else {
    rows = db.prepare(`
      SELECT mp.*, d.name as dish_name, d.recipe_url
      FROM meal_plans mp
      JOIN dishes d ON d.id = mp.dish_id
      WHERE mp.user_id = ?
      ORDER BY mp.date DESC, mp.meal_type
      LIMIT 100
    `).all(req.userId);
  }

  res.json(rows);
});

// POST /meal-plans
router.post('/', (req: AuthRequest, res: Response) => {
  const { date, meal_type, dish_id } = req.body;
  if (!date || !meal_type || !dish_id) {
    return res.status(400).json({ error: 'date, meal_type, and dish_id are required' });
  }
  if (!['breakfast', 'lunch', 'dinner'].includes(meal_type)) {
    return res.status(400).json({ error: 'meal_type must be breakfast, lunch, or dinner' });
  }

  const db = getDb();
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ? AND user_id = ?').get(dish_id, req.userId);
  if (!dish) return res.status(404).json({ error: 'Dish not found' });

  const id = uuidv4();
  db.prepare('INSERT INTO meal_plans (id, user_id, date, meal_type, dish_id) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, date, meal_type, dish_id
  );

  const plan = db.prepare(`
    SELECT mp.*, d.name as dish_name, d.recipe_url
    FROM meal_plans mp
    JOIN dishes d ON d.id = mp.dish_id
    WHERE mp.id = ?
  `).get(id);
  res.status(201).json(plan);
});

// DELETE /meal-plans/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM meal_plans WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

const router = Router();

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as week start
  d.setUTCDate(diff);
  return d.toISOString().split('T')[0];
}

// GET /shopping?week_start=YYYY-MM-DD
// If no week_start, auto-generate from meal plans for that week
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const weekStart = (req.query.week_start as string) || getWeekStart(new Date().toISOString().split('T')[0]);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Get manually managed items for this week
  const existingItems = db.prepare(
    'SELECT * FROM shopping_items WHERE week_start = ? ORDER BY name'
  ).all(weekStart) as any[];

  // Auto-generate from meal plans for the week
  const mealIngredients = db.prepare(`
    SELECT i.name, SUM(i.quantity) as total_quantity, i.unit
    FROM meal_plans mp
    JOIN ingredients i ON i.dish_id = mp.dish_id
    WHERE mp.date BETWEEN ? AND ?
    GROUP BY LOWER(i.name), i.unit
    ORDER BY i.name
  `).all(weekStart, weekEndStr) as any[];

  // Merge: auto-generated items that aren't already manually tracked
  const existingNames = new Set(existingItems.filter(i => !i.custom).map((i: any) => `${i.name.toLowerCase()}:${i.unit}`));
  const autoItems = mealIngredients
    .filter(i => !existingNames.has(`${i.name.toLowerCase()}:${i.unit}`))
    .map(i => ({
      id: `auto_${i.name}_${i.unit}`,
      week_start: weekStart,
      name: i.name,
      quantity: i.total_quantity,
      unit: i.unit,
      checked: 0,
      custom: 0,
      auto: true,
    }));

  // Update quantities for existing auto items
  const updatedExisting = existingItems.map((item: any) => {
    if (!item.custom) {
      const match = mealIngredients.find(
        (i: any) => i.name.toLowerCase() === item.name.toLowerCase() && i.unit === item.unit
      );
      if (match) return { ...item, quantity: match.total_quantity };
    }
    return item;
  });

  res.json([...updatedExisting, ...autoItems]);
});

// POST /shopping/generate - Regenerate shopping list for a week from meal plans
router.post('/generate', (req: Request, res: Response) => {
  const db = getDb();
  const weekStart = (req.body.week_start as string) || getWeekStart(new Date().toISOString().split('T')[0]);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const mealIngredients = db.prepare(`
    SELECT i.name, SUM(i.quantity) as total_quantity, i.unit
    FROM meal_plans mp
    JOIN ingredients i ON i.dish_id = mp.dish_id
    WHERE mp.date BETWEEN ? AND ?
    GROUP BY LOWER(i.name), i.unit
    ORDER BY i.name
  `).all(weekStart, weekEndStr) as any[];

  // Clear non-custom items and re-insert
  db.prepare('DELETE FROM shopping_items WHERE week_start = ? AND custom = 0').run(weekStart);

  const insert = db.prepare(
    'INSERT INTO shopping_items (id, week_start, name, quantity, unit, checked, custom) VALUES (?, ?, ?, ?, ?, 0, 0)'
  );
  const insertMany = db.transaction((items: any[]) => {
    for (const item of items) {
      insert.run(uuidv4(), weekStart, item.name, item.total_quantity, item.unit);
    }
  });
  insertMany(mealIngredients);

  const items = db.prepare('SELECT * FROM shopping_items WHERE week_start = ? ORDER BY name').all(weekStart);
  res.json(items);
});

// POST /shopping - Add custom item
router.post('/', (req: Request, res: Response) => {
  const { week_start, name, quantity, unit } = req.body;
  if (!week_start || !name) return res.status(400).json({ error: 'week_start and name are required' });

  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO shopping_items (id, week_start, name, quantity, unit, checked, custom) VALUES (?, ?, ?, ?, ?, 0, 1)'
  ).run(id, week_start, name, quantity || 0, unit || '');

  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
  res.status(201).json(item);
});

// PATCH /shopping/:id/check - Toggle check
router.patch('/:id/check', (req: Request, res: Response) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id) as any;
  if (!item) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE shopping_items SET checked = ? WHERE id = ?').run(
    item.checked ? 0 : 1,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /shopping/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM shopping_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

const router = Router();

// GET /dishes
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const dishes = db.prepare(`
    SELECT d.*,
      json_group_array(
        CASE WHEN i.id IS NOT NULL THEN
          json_object('id', i.id, 'name', i.name, 'quantity', i.quantity, 'unit', i.unit)
        ELSE NULL END
      ) as ingredients_json
    FROM dishes d
    LEFT JOIN ingredients i ON i.dish_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all();

  const result = dishes.map((d: any) => ({
    ...d,
    ingredients: JSON.parse(d.ingredients_json).filter((i: any) => i !== null),
    ingredients_json: undefined,
  }));

  res.json(result);
});

// GET /dishes/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id) as any;
  if (!dish) return res.status(404).json({ error: 'Not found' });

  const ingredients = db.prepare('SELECT * FROM ingredients WHERE dish_id = ?').all(req.params.id);
  res.json({ ...dish, ingredients });
});

// POST /dishes
router.post('/', (req: Request, res: Response) => {
  const { name, recipe_url, ingredients = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO dishes (id, name, recipe_url) VALUES (?, ?, ?)').run(id, name, recipe_url || null);

  const insertIngredient = db.prepare(
    'INSERT INTO ingredients (id, dish_id, name, quantity, unit) VALUES (?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((items: any[]) => {
    for (const item of items) {
      insertIngredient.run(uuidv4(), id, item.name, item.quantity || 0, item.unit || '');
    }
  });
  insertMany(ingredients);

  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(id);
  const savedIngredients = db.prepare('SELECT * FROM ingredients WHERE dish_id = ?').all(id);
  res.status(201).json({ ...dish, ingredients: savedIngredients });
});

// PUT /dishes/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, recipe_url, ingredients } = req.body;
  db.prepare('UPDATE dishes SET name = ?, recipe_url = ? WHERE id = ?').run(
    name ?? (existing as any).name,
    recipe_url !== undefined ? recipe_url : (existing as any).recipe_url,
    req.params.id
  );

  if (Array.isArray(ingredients)) {
    db.prepare('DELETE FROM ingredients WHERE dish_id = ?').run(req.params.id);
    const insertIngredient = db.prepare(
      'INSERT INTO ingredients (id, dish_id, name, quantity, unit) VALUES (?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) {
        insertIngredient.run(uuidv4(), req.params.id, item.name, item.quantity || 0, item.unit || '');
      }
    });
    insertMany(ingredients);
  }

  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  const savedIngredients = db.prepare('SELECT * FROM ingredients WHERE dish_id = ?').all(req.params.id);
  res.json({ ...dish, ingredients: savedIngredients });
});

// DELETE /dishes/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

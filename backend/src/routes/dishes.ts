import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getDb, seedDefaultDishes, getFamilyUserIds } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const MAX_IMAGE_BYTES = 200 * 1024; // 200KB

async function compressImage(base64: string): Promise<string> {
  const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid image format');
  const buffer = Buffer.from(matches[2], 'base64');
  const compressed = await sharp(buffer)
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  if (compressed.length > MAX_IMAGE_BYTES) {
    const quality = Math.floor(75 * MAX_IMAGE_BYTES / compressed.length);
    const recompressed = await sharp(buffer)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: Math.max(quality, 20) })
      .toBuffer();
    return `data:image/jpeg;base64,${recompressed.toString('base64')}`;
  }
  return `data:image/jpeg;base64,${compressed.toString('base64')}`;
}

const router = Router();
router.use(authenticate);

// GET /dishes
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userIds = getFamilyUserIds(req.userId!);
  const placeholders = userIds.map(() => '?').join(',');
  const dishes = db.prepare(`
    SELECT d.*,
      json_group_array(
        CASE WHEN i.id IS NOT NULL THEN
          json_object('id', i.id, 'name', i.name, 'quantity', i.quantity, 'unit', i.unit)
        ELSE NULL END
      ) as ingredients_json
    FROM dishes d
    LEFT JOIN ingredients i ON i.dish_id = d.id
    WHERE d.user_id IN (${placeholders})
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all(...userIds);

  const result = dishes.map((d: any) => ({
    ...d,
    ingredients: JSON.parse(d.ingredients_json).filter((i: any) => i !== null),
    ingredients_json: undefined,
  }));

  res.json(result);
});

// POST /dishes/seed-defaults — 定番料理を一括追加
router.post('/seed-defaults', (req: AuthRequest, res: Response) => {
  seedDefaultDishes(req.userId!);
  res.json({ message: '定番料理を追加しました' });
});

// GET /dishes/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!dish) return res.status(404).json({ error: 'Not found' });

  const ingredients = db.prepare('SELECT * FROM ingredients WHERE dish_id = ?').all(req.params.id);
  res.json({ ...dish, ingredients });
});

// POST /dishes
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, recipe_url, recipe_text, image_data, ingredients = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  let processedImage: string | null = null;
  if (image_data) {
    try { processedImage = await compressImage(image_data); }
    catch { processedImage = null; }
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO dishes (id, user_id, name, recipe_url, recipe_text, image_data) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.userId, name, recipe_url || null, recipe_text || null, processedImage
  );

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
  res.status(201).json({ ...(dish as any), ingredients: savedIngredients });
});

// PUT /dishes/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM dishes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, recipe_url, recipe_text, image_data, ingredients } = req.body;

  let processedImage = (existing as any).image_data;
  if (image_data !== undefined) {
    if (image_data === null) {
      processedImage = null;
    } else {
      try { processedImage = await compressImage(image_data); }
      catch { processedImage = (existing as any).image_data; }
    }
  }

  db.prepare('UPDATE dishes SET name = ?, recipe_url = ?, recipe_text = ?, image_data = ? WHERE id = ?').run(
    name ?? (existing as any).name,
    recipe_url !== undefined ? recipe_url : (existing as any).recipe_url,
    recipe_text !== undefined ? recipe_text : (existing as any).recipe_text,
    processedImage,
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
  res.json({ ...(dish as any), ingredients: savedIngredients });
});

// DELETE /dishes/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM dishes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

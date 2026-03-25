import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

// 調味料として買い物リストから除外する単位・名称
const SEASONING_UNITS = new Set(['適量', '少々', 'お好みで', 'ひとつまみ', '少量', 'g未満']);
const SEASONING_NAMES = new Set([
  '塩', '砂糖', '薄口しょうゆ', 'しょうゆ', '醤油', '味噌', 'みそ', '酢', 'みりん', '本みりん',
  '酒', '料理酒', '油', 'サラダ油', 'ごま油', 'オリーブオイル', 'オリーブ油', 'バター',
  'こしょう', '胡椒', '黒こしょう', '白こしょう', 'ソース', 'マヨネーズ', 'ケチャップ',
  '片栗粉', '小麦粉', '薄力粉', '強力粉', 'だし', 'だし汁', '出汁', '顆粒だし', '和風だし',
  'コンソメ', '鶏がらスープ', '中華スープの素', '豆板醤', '甜麺醤', 'オイスターソース',
  '白だし', 'めんつゆ', 'ポン酢', '七味', '一味', 'わさび', '辛子', '粒マスタード',
]);

function isSeasoning(name: string, unit: string): boolean {
  if (SEASONING_UNITS.has(unit.trim())) return true;
  if (SEASONING_NAMES.has(name.trim())) return true;
  return false;
}

const router = Router();
router.use(authenticate);

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split('T')[0];
}

// GET /shopping?week_start=YYYY-MM-DD
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const weekStart = (req.query.week_start as string) || getWeekStart(new Date().toISOString().split('T')[0]);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const existingItems = db.prepare(
    'SELECT * FROM shopping_items WHERE week_start = ? AND user_id = ? ORDER BY name'
  ).all(weekStart, req.userId) as any[];

  const mealIngredients = db.prepare(`
    SELECT i.name, SUM(i.quantity) as total_quantity, i.unit
    FROM meal_plans mp
    JOIN ingredients i ON i.dish_id = mp.dish_id
    WHERE mp.date BETWEEN ? AND ? AND mp.user_id = ?
    GROUP BY LOWER(i.name), i.unit
    ORDER BY i.name
  `).all(weekStart, weekEndStr, req.userId) as any[];

  const existingNames = new Set(existingItems.filter(i => !i.custom).map((i: any) => `${i.name.toLowerCase()}:${i.unit}`));
  const autoItems = mealIngredients
    .filter(i => !existingNames.has(`${i.name.toLowerCase()}:${i.unit}`) && !isSeasoning(i.name, i.unit))
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

// POST /shopping/generate
router.post('/generate', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const weekStart = (req.body.week_start as string) || getWeekStart(new Date().toISOString().split('T')[0]);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const mealIngredients = db.prepare(`
    SELECT i.name, SUM(i.quantity) as total_quantity, i.unit
    FROM meal_plans mp
    JOIN ingredients i ON i.dish_id = mp.dish_id
    WHERE mp.date BETWEEN ? AND ? AND mp.user_id = ?
    GROUP BY LOWER(i.name), i.unit
    ORDER BY i.name
  `).all(weekStart, weekEndStr, req.userId) as any[];

  db.prepare('DELETE FROM shopping_items WHERE week_start = ? AND custom = 0 AND user_id = ?').run(weekStart, req.userId);

  const filteredIngredients = mealIngredients.filter(i => !isSeasoning(i.name, i.unit));

  const insert = db.prepare(
    'INSERT INTO shopping_items (id, user_id, week_start, name, quantity, unit, checked, custom) VALUES (?, ?, ?, ?, ?, ?, 0, 0)'
  );
  const insertMany = db.transaction((items: any[]) => {
    for (const item of items) {
      insert.run(uuidv4(), req.userId, weekStart, item.name, item.total_quantity, item.unit);
    }
  });
  insertMany(filteredIngredients);

  const items = db.prepare('SELECT * FROM shopping_items WHERE week_start = ? AND user_id = ? ORDER BY name').all(weekStart, req.userId);
  res.json(items);
});

// POST /shopping - Add custom item
router.post('/', (req: AuthRequest, res: Response) => {
  const { week_start, name, quantity, unit } = req.body;
  if (!week_start || !name) return res.status(400).json({ error: 'week_start and name are required' });

  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO shopping_items (id, user_id, week_start, name, quantity, unit, checked, custom) VALUES (?, ?, ?, ?, ?, ?, 0, 1)'
  ).run(id, req.userId, week_start, name, quantity || 0, unit || '');

  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
  res.status(201).json(item);
});

// PATCH /shopping/:id/check
router.patch('/:id/check', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!item) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE shopping_items SET checked = ? WHERE id = ?').run(
    item.checked ? 0 : 1,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// PUT /shopping/:id - Edit item name/quantity/unit
router.put('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM shopping_items WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!item) return res.status(404).json({ error: 'Not found' });

  const { name, quantity, unit } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  db.prepare('UPDATE shopping_items SET name = ?, quantity = ?, unit = ? WHERE id = ?')
    .run(name, quantity ?? item.quantity, unit ?? item.unit, req.params.id);
  const updated = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /shopping/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM shopping_items WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

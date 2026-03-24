import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/olive.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const { mkdirSync } = require('fs');
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      recipe_url TEXT,
      recipe_text TEXT,
      image_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      dish_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner')),
      dish_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '',
      checked INTEGER NOT NULL DEFAULT 0,
      custom INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_dishes_user_id ON dishes(user_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_ingredients_dish_id ON ingredients(dish_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_items_week ON shopping_items(week_start);
    CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON shopping_items(user_id);
  `);
  // マイグレーション: 既存テーブルにカラム追加
  try { db.exec(`ALTER TABLE dishes ADD COLUMN recipe_text TEXT`); } catch {}
  try { db.exec(`ALTER TABLE dishes ADD COLUMN image_data TEXT`); } catch {}

  seedDemoAccount();
  seedDishes();
}

function seedDemoAccount(): void {
  const existing = db.prepare("SELECT id FROM users WHERE email = 'demo@olive.app'").get();
  if (existing) return;
  const password_hash = bcrypt.hashSync('demo1234', 10);
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
    uuidv4(), 'demo@olive.app', password_hash, 'デモ'
  );
}

function seedDishes(): void {
  const user = db.prepare("SELECT id FROM users WHERE email = 'demo@olive.app'").get() as { id: string } | undefined;
  if (!user) return;

  const dishNames = [
    '寿司', '刺身', '天ぷら', 'うどん', '蕎麦', 'ラーメン', '丼物', '肉じゃが', 'おでん', '照り焼きチキン',
    '豚肉の生姜焼き', 'さばの味噌煮', 'ぶりの照り焼き', '肉豆腐', '鶏の唐揚げ', 'とんかつ', 'きんぴらごぼう',
    '茶碗蒸し', 'ひじきと大豆の五目煮', 'ほうれん草のごま和え', 'かぼちゃの煮物', '味噌汁', '焼き魚',
    '卵焼き/だし巻き卵', 'お好み焼き', 'たこ焼き', '餃子', 'カレーライス', '筑前煮', '豆腐'
  ];

  const stmt = db.prepare('INSERT INTO dishes (id, user_id, name) VALUES (?, ?, ?)');
  const checkStmt = db.prepare('SELECT id FROM dishes WHERE user_id = ? AND name = ?');

  for (const name of dishNames) {
    const existingDish = checkStmt.get(user.id, name);
    if (!existingDish) {
      stmt.run(uuidv4(), user.id, name);
    }
  }
}

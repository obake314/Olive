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
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    CREATE INDEX IF NOT EXISTS idx_shopping_items_week ON shopping_items(week_start);
    CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON shopping_items(user_id);

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active')),
      invited_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(family_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS family_invitations (
      token TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      invited_email TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
  `);
  // マイグレーション: 既存テーブルにカラム追加
  try { db.exec(`ALTER TABLE dishes ADD COLUMN recipe_text TEXT`); } catch {}
  try { db.exec(`ALTER TABLE dishes ADD COLUMN image_data TEXT`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`); } catch {}
  // デモアカウントは認証済みにする
  db.exec(`UPDATE users SET email_verified = 1 WHERE email = 'demo@olive.app'`);

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

interface DefaultDish {
  name: string;
  recipe_text: string;
  image_url?: string;
  ingredients: { name: string; quantity: number; unit: string }[];
}

const DEFAULT_DISHES: DefaultDish[] = [
  {
    name: '肉じゃが',
    image_url: 'https://publicdomainq.net/images/201804/23/nikujaga-002f.jpg',
    recipe_text: '1. じゃがいもは一口大に切り、水にさらす。\n2. 玉ねぎは薄切り、牛肉は食べやすい大きさに切る。\n3. 鍋に油を熱し牛肉を炒め、玉ねぎ・にんじん・じゃがいもを加えて炒める。\n4. だし汁を加えて中火で煮る。アクを取り除く。\n5. 砂糖・みりん・しょうゆを加え、落し蓋をして弱火で15分煮る。\n6. 汁が少なくなったら火を止めて完成。',
    ingredients: [{ name: '牛薄切り肉', quantity: 200, unit: 'g' }, { name: 'じゃがいも', quantity: 3, unit: '個' }, { name: '玉ねぎ', quantity: 1, unit: '個' }, { name: 'にんじん', quantity: 1, unit: '本' }, { name: 'だし汁', quantity: 300, unit: 'ml' }, { name: '砂糖', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: 'しょうゆ', quantity: 3, unit: '大さじ' }],
  },
  {
    name: '照り焼きチキン',
    image_url: 'https://sozaiya-san.jp/img/food/washoku/f-chicken-teriyaki/f-chicken-teriyaki_01.jpg',
    recipe_text: '1. 鶏もも肉は余分な脂を取り除き、フォークで数か所刺す。\n2. フライパンに油を熱し、皮目を下にして中火で焼く。\n3. 皮がパリッとしたら裏返し、蓋をして弱火で7分蒸し焼きにする。\n4. 余分な油をふき取り、砂糖・みりん・しょうゆを混ぜたタレを加える。\n5. 強火にして照りが出るまでからめる。\n6. 食べやすい大きさに切って盛り付ける。',
    ingredients: [{ name: '鶏もも肉', quantity: 300, unit: 'g' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: '砂糖', quantity: 1, unit: '大さじ' }, { name: 'サラダ油', quantity: 1, unit: '大さじ' }],
  },
  {
    name: '豚肉の生姜焼き',
    image_url: 'https://publicdomainq.net/images/201903/05/ginger-fried-pork-001f.jpg',
    recipe_text: '1. 豚ロース肉は筋切りをして、しょうが・しょうゆ・みりん・酒に10分漬ける。\n2. フライパンに油を熱し、豚肉を中火で両面焼く。\n3. 漬けダレを加えて絡め、照りが出たら完成。\n4. キャベツの千切りと一緒に盛り付ける。',
    ingredients: [{ name: '豚ロース薄切り', quantity: 200, unit: 'g' }, { name: 'しょうが', quantity: 1, unit: 'かけ' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: '酒', quantity: 1, unit: '大さじ' }, { name: 'キャベツ', quantity: 100, unit: 'g' }],
  },
  {
    name: 'さばの味噌煮',
    image_url: 'https://publicdomainq.net/images/201812/28/mackerel-miso-001f.jpg',
    recipe_text: '1. さばは切り身にして、熱湯をかけて霜降りにする。\n2. 鍋に水・酒・砂糖・みりんを入れて煮立てる。\n3. さばを加え、落し蓋をして中火で5分煮る。\n4. 味噌を溶き入れ、さらに5分煮る。\n5. 煮汁を絡めながら仕上げる。',
    ingredients: [{ name: 'さば', quantity: 2, unit: '切れ' }, { name: '味噌', quantity: 3, unit: '大さじ' }, { name: '砂糖', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: '酒', quantity: 3, unit: '大さじ' }, { name: '水', quantity: 100, unit: 'ml' }, { name: 'しょうが', quantity: 1, unit: 'かけ' }],
  },
  {
    name: '鶏の唐揚げ',
    image_url: 'https://publicdomainq.net/images/201912/03/fried-chicken-011f.jpg',
    recipe_text: '1. 鶏もも肉は一口大に切り、しょうゆ・酒・しょうが・にんにくで15分漬ける。\n2. 片栗粉を薄くまぶす。\n3. 170℃の油で3〜4分揚げ、一度取り出して2分休ませる。\n4. 180℃に上げた油で1分カラッと二度揚げする。',
    ingredients: [{ name: '鶏もも肉', quantity: 300, unit: 'g' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: '酒', quantity: 1, unit: '大さじ' }, { name: 'しょうが', quantity: 1, unit: 'かけ' }, { name: 'にんにく', quantity: 1, unit: 'かけ' }, { name: '片栗粉', quantity: 4, unit: '大さじ' }, { name: '揚げ油', quantity: 500, unit: 'ml' }],
  },
  {
    name: 'カレーライス',
    image_url: 'https://publicdomainq.net/images/201804/23/curry-rice-003f.jpg',
    recipe_text: '1. 玉ねぎは薄切り、にんじん・じゃがいもは一口大に切る。\n2. 鍋に油を熱し、玉ねぎを飴色になるまで炒める。\n3. 肉を加えて炒め、にんじん・じゃがいもを加えてさらに炒める。\n4. 水を加えて沸騰したらアクを取り、野菜が柔らかくなるまで15分煮る。\n5. 火を止めてカレールーを割り入れ、溶けたら弱火で10分煮る。\n6. ご飯と一緒に盛り付ける。',
    ingredients: [{ name: '豚肉または鶏肉', quantity: 200, unit: 'g' }, { name: '玉ねぎ', quantity: 2, unit: '個' }, { name: 'にんじん', quantity: 1, unit: '本' }, { name: 'じゃがいも', quantity: 2, unit: '個' }, { name: 'カレールー', quantity: 4, unit: '皿分' }, { name: '水', quantity: 700, unit: 'ml' }, { name: 'サラダ油', quantity: 1, unit: '大さじ' }],
  },
  {
    name: '餃子',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Gy%C5%8Dza_003.jpg',
    recipe_text: '1. キャベツはみじん切りにして塩もみし、水気を絞る。\n2. ひき肉・キャベツ・ニラ・しょうが・にんにく・しょうゆ・ごま油・酒を混ぜてよくこねる。\n3. 餃子の皮に具を包む。\n4. フライパンに油を熱し、餃子を並べて中火で焼く。\n5. 水を加えて蓋をし、蒸し焼きにする。\n6. 水気がなくなったら蓋を取り、パリッと焼いて完成。',
    ingredients: [{ name: '豚ひき肉', quantity: 150, unit: 'g' }, { name: 'キャベツ', quantity: 150, unit: 'g' }, { name: 'ニラ', quantity: 50, unit: 'g' }, { name: '餃子の皮', quantity: 20, unit: '枚' }, { name: 'しょうが', quantity: 1, unit: 'かけ' }, { name: 'にんにく', quantity: 1, unit: 'かけ' }, { name: 'しょうゆ', quantity: 1, unit: '大さじ' }, { name: 'ごま油', quantity: 1, unit: '大さじ' }],
  },
  {
    name: 'とんかつ',
    image_url: 'https://sozaiya-san.jp/img/food/washoku/f-tonkatsu/f-tonkatsu_01.jpg',
    recipe_text: '1. 豚ロース肉は筋切りし、塩・こしょうをふる。\n2. 小麦粉・溶き卵・パン粉の順に衣をつける。\n3. 170℃の油でじっくり4〜5分揚げる。\n4. 一度取り出して2分休ませてから、180℃で1分カラッと仕上げる。\n5. 食べやすい大きさに切り、キャベツの千切りを添える。',
    ingredients: [{ name: '豚ロース肉', quantity: 200, unit: 'g' }, { name: '塩こしょう', quantity: 0, unit: '適量' }, { name: '小麦粉', quantity: 2, unit: '大さじ' }, { name: '卵', quantity: 1, unit: '個' }, { name: 'パン粉', quantity: 50, unit: 'g' }, { name: '揚げ油', quantity: 500, unit: 'ml' }, { name: 'キャベツ', quantity: 100, unit: 'g' }],
  },
  {
    name: '味噌汁',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Miso_Soup_1.JPG',
    recipe_text: '1. だし汁（煮干しまたはかつお）を鍋で温める。\n2. 好みの具材（豆腐・わかめ・ねぎなど）を加えて煮る。\n3. 火を弱めて味噌を溶き入れる。\n4. 沸騰させずに完成。',
    ingredients: [{ name: 'だし汁', quantity: 400, unit: 'ml' }, { name: '味噌', quantity: 2, unit: '大さじ' }, { name: '豆腐', quantity: 100, unit: 'g' }, { name: 'わかめ', quantity: 5, unit: 'g' }, { name: 'ねぎ', quantity: 1, unit: '本' }],
  },
  {
    name: 'かぼちゃの煮物',
    image_url: 'https://sozaiya-san.jp/img/food/washoku/f-kabocha-nituke/f-kabocha-nituke_01.jpg',
    recipe_text: '1. かぼちゃは一口大に切り、面取りする。\n2. 鍋に皮を下にしてかぼちゃを並べ、だし汁・砂糖・みりん・しょうゆを加える。\n3. 落し蓋をして中火で15分煮る。\n4. 煮汁が少なくなったら完成。',
    ingredients: [{ name: 'かぼちゃ', quantity: 300, unit: 'g' }, { name: 'だし汁', quantity: 200, unit: 'ml' }, { name: '砂糖', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 1, unit: '大さじ' }, { name: 'しょうゆ', quantity: 1, unit: '大さじ' }],
  },
  {
    name: 'ほうれん草のごま和え',
    image_url: 'https://publicdomainq.net/images/201912/28/spinach-goma-ae-001f.jpg',
    recipe_text: '1. ほうれん草は塩を加えた湯でさっと茹で、水にさらす。\n2. 水気を絞り、4cm長さに切る。\n3. すりごま・砂糖・しょうゆ・みりんを混ぜてごま和えのたれを作る。\n4. ほうれん草とたれを和えて完成。',
    ingredients: [{ name: 'ほうれん草', quantity: 200, unit: 'g' }, { name: 'すりごま', quantity: 2, unit: '大さじ' }, { name: '砂糖', quantity: 1, unit: '大さじ' }, { name: 'しょうゆ', quantity: 1, unit: '大さじ' }, { name: 'みりん', quantity: 1, unit: '大さじ' }],
  },
  {
    name: '卵焼き/だし巻き卵',
    image_url: 'https://publicdomainq.net/images/201802/12/japanese-omelette-001f.jpg',
    recipe_text: '1. 卵3個をよく溶き、だし汁・砂糖・塩・しょうゆを加えて混ぜる。\n2. 卵焼き器に油をなじませ、卵液の1/3を流し入れる。\n3. 半熟になったら手前に巻く。\n4. 油を塗って奥に寄せ、残りの卵液を2回に分けて同様に巻く。\n5. 巻きすで形を整えて冷ます。',
    ingredients: [{ name: '卵', quantity: 3, unit: '個' }, { name: 'だし汁', quantity: 3, unit: '大さじ' }, { name: '砂糖', quantity: 1, unit: '大さじ' }, { name: 'しょうゆ', quantity: 0.5, unit: '小さじ' }, { name: '塩', quantity: 0, unit: 'ひとつまみ' }, { name: 'サラダ油', quantity: 1, unit: '大さじ' }],
  },
  {
    name: '筑前煮',
    image_url: 'https://publicdomainq.net/images/202001/04/chikuzenni-002f.jpg',
    recipe_text: '1. 鶏もも肉・れんこん・ごぼう・にんじん・こんにゃく・干ししいたけを一口大に切る。\n2. ごぼう・れんこんはアク抜きする。こんにゃくはちぎって塩もみする。\n3. 鍋に油を熱し、鶏肉を炒めてから野菜を加えて炒める。\n4. だし汁を加えて煮立て、アクを取る。\n5. 砂糖・みりん・しょうゆ・酒を加え、落し蓋をして弱火で20分煮る。',
    ingredients: [{ name: '鶏もも肉', quantity: 200, unit: 'g' }, { name: 'れんこん', quantity: 100, unit: 'g' }, { name: 'ごぼう', quantity: 1, unit: '本' }, { name: 'にんじん', quantity: 1, unit: '本' }, { name: 'こんにゃく', quantity: 100, unit: 'g' }, { name: '干ししいたけ', quantity: 4, unit: '枚' }, { name: 'だし汁', quantity: 300, unit: 'ml' }, { name: '砂糖', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: 'しょうゆ', quantity: 3, unit: '大さじ' }],
  },
  {
    name: 'きんぴらごぼう',
    image_url: 'https://publicdomainq.net/images/201905/11/kinpira-gobo-001f.jpg',
    recipe_text: '1. ごぼうはささがきにして水にさらす。にんじんは細切りにする。\n2. フライパンにごま油を熱し、ごぼうとにんじんを炒める。\n3. しんなりしたら砂糖・みりん・しょうゆを加えて炒め合わせる。\n4. 仕上げに七味唐辛子をふる。',
    ingredients: [{ name: 'ごぼう', quantity: 1, unit: '本' }, { name: 'にんじん', quantity: 0.5, unit: '本' }, { name: 'ごま油', quantity: 1, unit: '大さじ' }, { name: '砂糖', quantity: 1, unit: '大さじ' }, { name: 'みりん', quantity: 1, unit: '大さじ' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: '七味唐辛子', quantity: 0, unit: '適量' }],
  },
  {
    name: 'ぶりの照り焼き',
    image_url: 'https://publicdomainq.net/images/201905/11/yellowtail-teriyaki-001f.jpg',
    recipe_text: '1. ぶりは塩をふって10分おき、水気をふき取る。\n2. フライパンに油を熱し、中火で両面に焼き色をつける。\n3. 余分な油をふき取り、しょうゆ・みりん・砂糖を混ぜたタレを加える。\n4. 強火にして照りが出るまで絡める。',
    ingredients: [{ name: 'ぶり', quantity: 2, unit: '切れ' }, { name: '塩', quantity: 0, unit: '少々' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: '砂糖', quantity: 1, unit: '大さじ' }, { name: 'サラダ油', quantity: 1, unit: '大さじ' }],
  },
  {
    name: 'ラーメン',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Ramen-2.jpg',
    recipe_text: '1. 鍋に水を沸かし、チャーシュー・長ねぎ・しょうがでスープを作る。\n2. しょうゆ・みりん・塩で味を整える。\n3. 麺を別鍋で茹でて水気を切る。\n4. 丼にスープを注ぎ、麺を入れる。\n5. チャーシュー・メンマ・煮卵・ねぎをトッピングする。',
    ingredients: [{ name: '中華麺', quantity: 2, unit: '玉' }, { name: 'チャーシュー', quantity: 100, unit: 'g' }, { name: '長ねぎ', quantity: 1, unit: '本' }, { name: 'メンマ', quantity: 50, unit: 'g' }, { name: '煮卵', quantity: 2, unit: '個' }, { name: 'しょうゆ', quantity: 3, unit: '大さじ' }, { name: 'みりん', quantity: 1, unit: '大さじ' }, { name: '鶏がらスープ', quantity: 600, unit: 'ml' }],
  },
  {
    name: 'お好み焼き',
    image_url: 'https://publicdomainq.net/images/201905/11/okonomiyaki-002f.jpg',
    recipe_text: '1. 小麦粉・だし汁・卵・キャベツ・豚バラ肉を混ぜて生地を作る。\n2. フライパンに油を熱し、生地を丸く流し入れる。\n3. 豚バラ肉を上に並べ、蓋をして中火で5分焼く。\n4. 裏返してさらに5分焼く。\n5. お好みソース・マヨネーズ・青のり・かつお節をかける。',
    ingredients: [{ name: '小麦粉', quantity: 100, unit: 'g' }, { name: 'だし汁', quantity: 100, unit: 'ml' }, { name: '卵', quantity: 1, unit: '個' }, { name: 'キャベツ', quantity: 200, unit: 'g' }, { name: '豚バラ薄切り', quantity: 100, unit: 'g' }, { name: 'お好みソース', quantity: 0, unit: '適量' }, { name: 'マヨネーズ', quantity: 0, unit: '適量' }, { name: '青のり', quantity: 0, unit: '適量' }],
  },
  {
    name: '天ぷら',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Tempura-1.jpg',
    recipe_text: '1. 衣は冷水・卵・小麦粉をさっくり混ぜる（混ぜすぎない）。\n2. えび・野菜に薄く小麦粉をはたいてから衣をつける。\n3. 170℃の油で揚げる（野菜は2〜3分、えびは2分）。\n4. 天つゆ（だし汁・しょうゆ・みりん）と大根おろしを添えて盛り付ける。',
    ingredients: [{ name: 'えび', quantity: 6, unit: '尾' }, { name: 'さつまいも', quantity: 1, unit: '本' }, { name: 'なす', quantity: 1, unit: '本' }, { name: 'ししとう', quantity: 6, unit: '本' }, { name: '小麦粉', quantity: 100, unit: 'g' }, { name: '卵', quantity: 1, unit: '個' }, { name: '冷水', quantity: 150, unit: 'ml' }, { name: '揚げ油', quantity: 500, unit: 'ml' }],
  },
  {
    name: '茶碗蒸し',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Chawan-mushi_001.jpg',
    recipe_text: '1. だし汁・薄口しょうゆ・みりん・塩を混ぜ、溶き卵に加えて漉す。\n2. 器に具材（鶏肉・えび・しいたけ・三つ葉）を入れ、卵液を注ぐ。\n3. 蒸し器で強火2分→弱火12分蒸す。\n4. 三つ葉を飾って完成。',
    ingredients: [{ name: '卵', quantity: 2, unit: '個' }, { name: 'だし汁', quantity: 300, unit: 'ml' }, { name: '薄口しょうゆ', quantity: 1, unit: '小さじ' }, { name: 'みりん', quantity: 1, unit: '小さじ' }, { name: '鶏もも肉', quantity: 50, unit: 'g' }, { name: 'えび', quantity: 4, unit: '尾' }, { name: 'しいたけ', quantity: 2, unit: '枚' }, { name: '三つ葉', quantity: 0, unit: '適量' }],
  },
  {
    name: 'おでん',
    image_url: 'https://publicdomainq.net/images/201812/28/oden-001f.jpg',
    recipe_text: '1. 大根は2cm輪切りにして面取りし、米のとぎ汁で下茹でする。\n2. こんにゃくは塩もみして下茹でする。\n3. だし汁・しょうゆ・みりん・塩でだしを作る。\n4. 大根・こんにゃく・卵・ちくわ・さつまあげを加えて弱火で1時間煮込む。\n5. 練り辛子を添えて盛り付ける。',
    ingredients: [{ name: '大根', quantity: 0.5, unit: '本' }, { name: 'こんにゃく', quantity: 1, unit: '枚' }, { name: '卵', quantity: 4, unit: '個' }, { name: 'ちくわ', quantity: 4, unit: '本' }, { name: 'さつまあげ', quantity: 4, unit: '枚' }, { name: 'だし汁', quantity: 1000, unit: 'ml' }, { name: 'しょうゆ', quantity: 3, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }],
  },
  {
    name: '肉豆腐',
    image_url: 'https://publicdomainq.net/images/201812/28/sukiyaki-001f.jpg',
    recipe_text: '1. 豆腐は食べやすい大きさに切る。牛肉は一口大に切る。\n2. 鍋にだし汁・砂糖・みりん・しょうゆを入れて煮立てる。\n3. 牛肉を加えてほぐしながら炒め、アクを取る。\n4. 豆腐と長ねぎを加え、落し蓋をして弱火で10分煮る。',
    ingredients: [{ name: '木綿豆腐', quantity: 1, unit: '丁' }, { name: '牛薄切り肉', quantity: 150, unit: 'g' }, { name: '長ねぎ', quantity: 1, unit: '本' }, { name: 'だし汁', quantity: 200, unit: 'ml' }, { name: '砂糖', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: 'しょうゆ', quantity: 3, unit: '大さじ' }],
  },
  {
    name: '焼き魚',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Grilled_fish.jpg',
    recipe_text: '1. 魚に塩をふって10分おき、水気をふき取る。\n2. グリルを予熱し、魚を並べる。\n3. 中火で片面5〜6分、裏返してさらに4〜5分焼く。\n4. 大根おろし・すだちを添えて盛り付ける。',
    ingredients: [{ name: 'さんままたはさば', quantity: 2, unit: '尾' }, { name: '塩', quantity: 0, unit: '適量' }, { name: '大根おろし', quantity: 100, unit: 'g' }, { name: 'すだち', quantity: 1, unit: '個' }],
  },
  {
    name: 'ひじきと大豆の五目煮',
    image_url: 'https://publicdomainq.net/images/201905/11/hijiki-nimono-001f.jpg',
    recipe_text: '1. ひじきは水で戻し、水気を切る。大豆は水煮を使用。\n2. にんじんは細切り、油揚げは短冊切りにする。\n3. 鍋にごま油を熱し、ひじき・にんじんを炒める。\n4. 大豆・油揚げを加えてさらに炒める。\n5. だし汁・砂糖・みりん・しょうゆを加えて中火で10分煮る。',
    ingredients: [{ name: 'ひじき（乾燥）', quantity: 20, unit: 'g' }, { name: '大豆（水煮）', quantity: 100, unit: 'g' }, { name: 'にんじん', quantity: 0.5, unit: '本' }, { name: '油揚げ', quantity: 1, unit: '枚' }, { name: 'だし汁', quantity: 200, unit: 'ml' }, { name: '砂糖', quantity: 1, unit: '大さじ' }, { name: 'みりん', quantity: 1, unit: '大さじ' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: 'ごま油', quantity: 1, unit: '大さじ' }],
  },
  {
    name: 'うどん',
    image_url: 'https://publicdomainq.net/images/201912/26/udon-002f.jpg',
    recipe_text: '1. だし汁・しょうゆ・みりん・塩でつゆを作り、温める。\n2. うどんを袋の表示通り茹でて水気を切る。\n3. 丼にうどんを入れてつゆを注ぐ。\n4. かまぼこ・ねぎ・天かすをトッピングする。',
    ingredients: [{ name: 'うどん', quantity: 2, unit: '玉' }, { name: 'だし汁', quantity: 600, unit: 'ml' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: 'かまぼこ', quantity: 4, unit: '枚' }, { name: '長ねぎ', quantity: 1, unit: '本' }],
  },
  {
    name: '蕎麦',
    image_url: 'https://publicdomainq.net/images/201912/26/soba-001f.jpg',
    recipe_text: '1. だし汁・しょうゆ・みりんでそばつゆを作る。\n2. そばを袋の表示通り茹でて冷水でしめる。\n3. 器にそばを盛り、つゆを注ぐ（温・冷はお好みで）。\n4. 薬味（ねぎ・わさび）を添える。',
    ingredients: [{ name: 'そば', quantity: 2, unit: '玉' }, { name: 'だし汁', quantity: 600, unit: 'ml' }, { name: 'しょうゆ', quantity: 3, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: 'ねぎ', quantity: 1, unit: '本' }, { name: 'わさび', quantity: 0, unit: '適量' }],
  },
  {
    name: '丼物',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Oyakodon_002.jpg',
    recipe_text: '1. だし汁・しょうゆ・みりん・砂糖で割り下を作る。\n2. 親子丼の場合：鶏もも肉と玉ねぎを割り下で煮て、溶き卵でとじる。\n3. ご飯を丼に盛り、具材をのせる。\n4. 三つ葉を散らして完成。',
    ingredients: [{ name: 'ご飯', quantity: 2, unit: '膳' }, { name: '鶏もも肉', quantity: 200, unit: 'g' }, { name: '玉ねぎ', quantity: 1, unit: '個' }, { name: '卵', quantity: 3, unit: '個' }, { name: 'だし汁', quantity: 200, unit: 'ml' }, { name: 'しょうゆ', quantity: 2, unit: '大さじ' }, { name: 'みりん', quantity: 2, unit: '大さじ' }, { name: '砂糖', quantity: 1, unit: '大さじ' }],
  },
  {
    name: 'たこ焼き',
    image_url: 'https://publicdomainq.net/images/201809/01/takoyaki-001f.jpg',
    recipe_text: '1. 小麦粉・だし汁・卵・薄口しょうゆで生地を作る。\n2. たこ焼き器を熱して油を塗り、生地を流し込む。\n3. タコ・ねぎ・紅生姜・天かすを入れる。\n4. 生地が固まりかけたら竹串で回して丸くする。\n5. ソース・マヨネーズ・青のり・かつお節をかける。',
    ingredients: [{ name: '小麦粉', quantity: 150, unit: 'g' }, { name: 'だし汁', quantity: 400, unit: 'ml' }, { name: '卵', quantity: 2, unit: '個' }, { name: 'ゆでタコ', quantity: 150, unit: 'g' }, { name: '長ねぎ', quantity: 1, unit: '本' }, { name: '紅生姜', quantity: 20, unit: 'g' }, { name: '天かす', quantity: 20, unit: 'g' }],
  },
  {
    name: '寿司',
    image_url: 'https://cdn.stocksnap.io/img-thumbs/960w/sushi-food_5A4A1994E8.jpg',
    recipe_text: '1. ご飯を炊き、すし酢（酢・砂糖・塩）を混ぜて切るように合わせる。\n2. シャリを手のひらに乗せ、ネタをのせて形を整える。\n3. ネタはマグロ・サーモン・えびなど好みで。\n4. わさび・しょうゆを添えて盛り付ける。',
    ingredients: [{ name: 'ご飯', quantity: 2, unit: '合' }, { name: '酢', quantity: 4, unit: '大さじ' }, { name: '砂糖', quantity: 2, unit: '大さじ' }, { name: '塩', quantity: 1, unit: '小さじ' }, { name: 'マグロ', quantity: 100, unit: 'g' }, { name: 'サーモン', quantity: 100, unit: 'g' }, { name: 'えび', quantity: 8, unit: '尾' }],
  },
  {
    name: '刺身',
    image_url: 'https://cdn.stocksnap.io/img-thumbs/960w/sashimi-sushi_8A17D44391.jpg',
    recipe_text: '1. 新鮮な魚を柵で用意する。\n2. 皮がある場合は引く。\n3. 包丁を斜めに入れて、厚さ5〜7mmに切る。\n4. 大葉・大根のけん・わさびを盛り付ける。\n5. しょうゆを添えて完成。',
    ingredients: [{ name: 'マグロ（柵）', quantity: 150, unit: 'g' }, { name: 'サーモン（柵）', quantity: 150, unit: 'g' }, { name: '大葉', quantity: 6, unit: '枚' }, { name: '大根', quantity: 100, unit: 'g' }, { name: 'わさび', quantity: 0, unit: '適量' }, { name: 'しょうゆ', quantity: 0, unit: '適量' }],
  },
  {
    name: '豆腐',
    image_url: 'https://publicdomainq.net/images/201907/20/chilled-tofu-001f.jpg',
    recipe_text: '1. 豆腐はキッチンペーパーで包み、軽く水切りする。\n2. 食べやすい大きさに切って器に盛る。\n3. しょうが・みょうが・ねぎなど薬味をのせる。\n4. しょうゆをかけて完成（冷奴の場合はそのまま）。',
    ingredients: [{ name: '絹ごし豆腐', quantity: 1, unit: '丁' }, { name: 'しょうが', quantity: 1, unit: 'かけ' }, { name: 'ねぎ', quantity: 1, unit: '本' }, { name: 'しょうゆ', quantity: 0, unit: '適量' }],
  },
];

/** ユーザーが属するアクティブな家族メンバー全員の user_id を返す（自分を含む） */
export function getFamilyUserIds(userId: string): string[] {
  const db = getDb();
  const member = db.prepare(
    `SELECT family_id FROM family_members WHERE user_id = ? AND status = 'active' LIMIT 1`
  ).get(userId) as { family_id: string } | undefined;
  if (!member) return [userId];
  const members = db.prepare(
    `SELECT user_id FROM family_members WHERE family_id = ? AND status = 'active'`
  ).all(member.family_id) as { user_id: string }[];
  return members.map(m => m.user_id);
}

export function seedDefaultDishes(userId: string): void {
  const db = getDb();
  const checkStmt = db.prepare('SELECT id FROM dishes WHERE user_id = ? AND name = ?');
  const insertDish = db.prepare('INSERT INTO dishes (id, user_id, name, recipe_text, image_data) VALUES (?, ?, ?, ?, ?)');
  const insertIngredient = db.prepare('INSERT INTO ingredients (id, dish_id, name, quantity, unit) VALUES (?, ?, ?, ?, ?)');

  for (const dish of DEFAULT_DISHES) {
    const existing = checkStmt.get(userId, dish.name) as { id: string } | undefined;
    const dishId = existing?.id ?? uuidv4();
    if (!existing) {
      insertDish.run(dishId, userId, dish.name, dish.recipe_text, dish.image_url);
    } else {
      db.prepare('UPDATE dishes SET recipe_text = ?, image_data = ? WHERE id = ?').run(dish.recipe_text, dish.image_url, dishId);
      db.prepare('DELETE FROM ingredients WHERE dish_id = ?').run(dishId);
    }
    for (const ing of dish.ingredients) {
      insertIngredient.run(uuidv4(), dishId, ing.name, ing.quantity, ing.unit);
    }
  }
}

function seedDishes(): void {
  const user = db.prepare("SELECT id FROM users WHERE email = 'demo@olive.app'").get() as { id: string } | undefined;
  if (!user) return;
  seedDefaultDishes(user.id);
}

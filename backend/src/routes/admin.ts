import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

const router = Router();

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #f4f4f0; color: #2d3a24; font-size: 14px; }
  header { background: #354a2f; color: #fff; padding: 16px 32px;
           display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 18px; font-weight: 700; }
  header .subtitle { font-size: 13px; opacity: 0.7; }
  header a { color: #a3b68a; font-size: 13px; text-decoration: none; margin-left: auto; }
  header a:hover { text-decoration: underline; }
  .main { padding: 24px 32px; max-width: 1300px; margin: 0 auto; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-card { background: #fff; border: 1px solid #c7b793; border-radius: 8px;
               padding: 16px 24px; min-width: 140px; }
  .stat-card .val { font-size: 28px; font-weight: 700; color: #354a2f; }
  .stat-card .lbl { font-size: 12px; color: #5c724a; margin-top: 2px; }
  .table-wrap { background: #fff; border: 1px solid #c7b793; border-radius: 8px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #354a2f; color: #fff; }
  thead th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #fafaf5; }
  tbody tr:hover { background: #f0f4e8; }
  td { padding: 10px 14px; border-bottom: 1px solid #eee; vertical-align: middle; }
  td.email { font-weight: 600; font-size: 13px; max-width: 220px;
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.date { color: #888; font-size: 12px; white-space: nowrap; }
  .verified { color: #2d7a4a; font-weight: 600; }
  .unverified { color: #b05a00; }
  .del-btn { background: #c0392b; color: #fff; border: none; border-radius: 4px;
             padding: 4px 10px; font-size: 12px; cursor: pointer; font-weight: 600; }
  .del-btn:hover { background: #96281b; }
  .demo-label { color: #888; font-size: 12px; }
  .link-btn { color: #354a2f; font-size: 12px; font-weight: 600; text-decoration: none;
              border: 1px solid #c7b793; border-radius: 4px; padding: 3px 8px; white-space: nowrap; }
  .link-btn:hover { background: #f0f4e8; }
  /* dishes grid */
  .page-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #354a2f; }
  .dishes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .dish-card { background: #fff; border: 1px solid #c7b793; border-radius: 8px; overflow: hidden; }
  .dish-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #eee; }
  .dish-no-img { width: 100%; aspect-ratio: 4/3; background: #e8e4d8; display: flex;
                 align-items: center; justify-content: center; color: #999; font-size: 12px; }
  .dish-name { padding: 8px 10px; font-size: 13px; font-weight: 600; color: #2d3a24; }
  .dish-meta { padding: 0 10px 8px; font-size: 11px; color: #888; }
  @media (max-width: 768px) {
    .main { padding: 16px; }
    header { padding: 12px 16px; }
    .table-wrap { overflow-x: auto; }
  }
`;

function html(title: string, body: string, backHref = '') {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Olive Admin</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <div>
    <h1>Olive 管理画面</h1>
    <div class="subtitle">${esc(title)}</div>
  </div>
  ${backHref ? `<a href="${backHref}">← 戻る</a>` : ''}
</header>
<div class="main">${body}</div>
</body>
</html>`;
}

// Basic 認証ミドルウェア
function adminAuth(req: Request, res: Response, next: () => void) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).send('Admin not configured (ADMIN_PASSWORD not set)');
    return;
  }
  const authHeader = req.headers['authorization'] || '';
  const b64 = authHeader.replace(/^Basic\s+/i, '');
  let password = '';
  try {
    password = Buffer.from(b64, 'base64').toString('utf8').split(':').slice(1).join(':');
  } catch { password = ''; }

  if (password !== adminPassword) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Olive Admin"');
    res.status(401).send('Unauthorized');
    return;
  }
  next();
}

router.use(adminAuth);

// GET /admin — ユーザー一覧
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();

  const users = db.prepare(`
    SELECT
      u.id, u.email, u.name, u.email_verified, u.created_at,
      COUNT(DISTINCT d.id) AS dish_count,
      COUNT(DISTINCT d_img.id) AS dish_with_image_count,
      COUNT(DISTINCT mp.id) AS meal_plan_count,
      COUNT(DISTINCT t.id) AS todo_count,
      f.name AS family_name
    FROM users u
    LEFT JOIN dishes d ON d.user_id = u.id
    LEFT JOIN dishes d_img ON d_img.user_id = u.id AND d_img.image_data IS NOT NULL
    LEFT JOIN meal_plans mp ON mp.user_id = u.id
    LEFT JOIN todos t ON t.user_id = u.id
    LEFT JOIN family_members fm ON fm.user_id = u.id AND fm.status = 'active'
    LEFT JOIN families f ON f.id = fm.family_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all() as any[];

  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.email_verified).length;
  const totalDishes = users.reduce((s, u) => s + u.dish_count, 0);
  const totalWithImage = users.reduce((s, u) => s + u.dish_with_image_count, 0);

  const rows = users.map(u => `
    <tr>
      <td class="email">${esc(u.email)}</td>
      <td>${esc(u.name)}</td>
      <td class="${u.email_verified ? 'verified' : 'unverified'}">${u.email_verified ? '認証済' : '未認証'}</td>
      <td>${esc(u.family_name || '—')}</td>
      <td class="num">
        <a class="link-btn" href="/admin/users/${esc(u.id)}/dishes">
          ${u.dish_count}品 (画像${u.dish_with_image_count})
        </a>
      </td>
      <td class="num">${u.meal_plan_count}</td>
      <td class="num">${u.todo_count}</td>
      <td class="date">${u.created_at.slice(0, 16).replace('T', ' ')}</td>
      <td>
        ${u.email !== 'demo@olive.app' ? `
        <form method="POST" action="/admin/users/${esc(u.id)}/delete"
              onsubmit="return confirm('${esc(u.email)} を削除しますか？\\nすべてのデータが削除されます。')">
          <button class="del-btn" type="submit">削除</button>
        </form>` : '<span class="demo-label">demo</span>'}
      </td>
    </tr>
  `).join('');

  const body = `
  <div class="stats">
    <div class="stat-card"><div class="val">${totalUsers}</div><div class="lbl">総ユーザー数</div></div>
    <div class="stat-card"><div class="val">${verifiedUsers}</div><div class="lbl">メール認証済み</div></div>
    <div class="stat-card"><div class="val">${totalUsers - verifiedUsers}</div><div class="lbl">未認証</div></div>
    <div class="stat-card"><div class="val">${totalDishes}</div><div class="lbl">総料理数</div></div>
    <div class="stat-card"><div class="val">${totalWithImage}</div><div class="lbl">画像あり料理</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>メールアドレス</th><th>名前</th><th>認証</th><th>家族グループ</th>
          <th>料理数</th><th>献立数</th><th>TODO数</th><th>登録日時</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html('ユーザー管理', body));
});

// GET /admin/users/:id/dishes — ユーザーの料理一覧（画像プレビュー）
router.get('/users/:id/dishes', (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).send('User not found'); return; }

  const dishes = db.prepare(`
    SELECT id, name, image_data,
      (SELECT COUNT(*) FROM ingredients WHERE dish_id = dishes.id) AS ingredient_count
    FROM dishes WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id) as any[];

  const withImage = dishes.filter(d => d.image_data).length;

  const cards = dishes.map(d => `
    <div class="dish-card">
      ${d.image_data
        ? `<img class="dish-img" src="${d.image_data}" alt="${esc(d.name)}">`
        : `<div class="dish-no-img">画像なし</div>`}
      <div class="dish-name">${esc(d.name)}</div>
      <div class="dish-meta">材料 ${d.ingredient_count}種</div>
    </div>
  `).join('');

  const body = `
  <div class="stats" style="margin-bottom:20px">
    <div class="stat-card"><div class="val">${dishes.length}</div><div class="lbl">料理数</div></div>
    <div class="stat-card"><div class="val">${withImage}</div><div class="lbl">画像あり</div></div>
    <div class="stat-card"><div class="val">${dishes.length - withImage}</div><div class="lbl">画像なし</div></div>
  </div>
  <p class="page-title">${esc(user.name)} (${esc(user.email)}) の料理マスタ</p>
  <div class="dishes-grid">${cards}</div>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html(`料理一覧 — ${user.email}`, body, '/admin'));
});

// POST /admin/users/:id/delete
router.post('/users/:id/delete', (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.params.id) as { email: string } | undefined;
  if (!user) { res.status(404).send('User not found'); return; }
  if (user.email === 'demo@olive.app') { res.status(403).send('Cannot delete demo account'); return; }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default router;

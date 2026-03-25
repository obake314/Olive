import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { getDb } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://olive.eclo.info';

// GET /family/join は認証不要（メールリンクから直接アクセス）
router.get('/join', (req, res: Response) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('無効なリンクです') as any;

  const db = getDb();
  const inv = db.prepare('SELECT * FROM family_invitations WHERE token = ?').get(token) as any;
  if (!inv) return res.status(400).send('このリンクは無効または期限切れです') as any;
  if (new Date(inv.expires_at) < new Date()) {
    db.prepare('DELETE FROM family_invitations WHERE token = ?').run(token);
    return res.status(400).send('このリンクは期限切れです') as any;
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(inv.invited_email) as any;
  if (!user) {
    return res.redirect(`${APP_URL}/login?invite=${token}&email=${encodeURIComponent(inv.invited_email)}`);
  }

  const existingMembership = db.prepare(
    `SELECT family_id FROM family_members WHERE user_id = ? AND status = 'active'`
  ).get(user.id) as any;
  if (existingMembership && existingMembership.family_id !== inv.family_id) {
    return res.redirect(`${APP_URL}?error=already_in_family`);
  }

  db.prepare(`INSERT OR REPLACE INTO family_members (id, family_id, user_id, status, invited_by) VALUES (?, ?, ?, 'active', ?)`)
    .run(uuidv4(), inv.family_id, user.id, inv.invited_by);
  db.prepare('DELETE FROM family_invitations WHERE token = ?').run(token);

  res.redirect(`${APP_URL}?joined=1`);
});

// 以下は認証が必要なルート
router.use(authenticate);

// GET /family — 自分の家族情報
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const member = db.prepare(
    `SELECT fm.*, f.name as family_name FROM family_members fm
     JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = ? AND fm.status = 'active' LIMIT 1`
  ).get(req.userId) as any;

  if (!member) return res.json({ family: null, members: [] });

  const members = db.prepare(
    `SELECT fm.status, fm.created_at, u.id, u.name, u.email
     FROM family_members fm JOIN users u ON u.id = fm.user_id
     WHERE fm.family_id = ? ORDER BY fm.created_at ASC`
  ).all(member.family_id) as any[];

  res.json({ family: { id: member.family_id, name: member.family_name }, members });
});

// POST /family — 家族グループを作成
router.post('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    `SELECT family_id FROM family_members WHERE user_id = ? AND status = 'active'`
  ).get(req.userId);
  if (existing) return res.status(409).json({ error: 'すでに家族グループに参加しています' }) as any;

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'グループ名は必須です' }) as any;

  const familyId = uuidv4();
  db.prepare('INSERT INTO families (id, name, created_by) VALUES (?, ?, ?)').run(familyId, name.trim(), req.userId);
  db.prepare('INSERT INTO family_members (id, family_id, user_id, status, invited_by) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), familyId, req.userId, 'active', req.userId
  );
  res.status(201).json({ id: familyId, name: name.trim() });
});

// POST /family/invite — メールで招待
router.post('/invite', async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'メールアドレスは必須です' }) as any;

  const db = getDb();
  const myMembership = db.prepare(
    `SELECT fm.family_id, f.name FROM family_members fm JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = ? AND fm.status = 'active'`
  ).get(req.userId) as any;
  if (!myMembership) return res.status(400).json({ error: '先に家族グループを作成してください' }) as any;

  const inviter = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId) as any;

  const token = uuidv4();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT OR REPLACE INTO family_invitations (token, family_id, invited_email, invited_by, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    token, myMembership.family_id, email.trim(), req.userId, expires
  );

  const link = `${APP_URL}/api/family/join?token=${token}`;
  try {
    await resend.emails.send({
      from: 'Olive <olive@eclo.info>',
      to: email.trim(),
      subject: `【Olive】${inviter?.name || ''}さんから家族グループへの招待`,
      html: `
        <p>${inviter?.name || 'ユーザー'}さんがあなたをOliveの家族グループ「${myMembership.name}」に招待しました。</p>
        <p><a href="${link}" style="background:#4a7c59;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">招待を承認する</a></p>
        <p>このリンクは7日間有効です。</p>
        <p style="color:#999;font-size:12px;">心当たりがない場合は無視してください。</p>
      `,
    });
  } catch (e) {
    console.error('Failed to send invite email:', e);
  }

  res.json({ message: `${email} に招待メールを送信しました` });
});

// DELETE /family/leave — 家族から離脱
router.delete('/leave', (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare(`DELETE FROM family_members WHERE user_id = ? AND status = 'active'`).run(req.userId);
  res.json({ message: '家族グループから離脱しました' });
});

export default router;

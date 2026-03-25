import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { getDb, seedDefaultDishes } from '../db/database';
import { signToken, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://olive.eclo.info';

function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${APP_URL}/api/auth/verify?token=${token}`;
  return resend.emails.send({
    from: 'Olive <olive@eclo.info>',
    to: email,
    subject: '【Olive】メールアドレスの確認',
    html: `
      <p>Olive にご登録いただきありがとうございます。</p>
      <p>以下のリンクをクリックしてメールアドレスを確認してください。</p>
      <p><a href="${link}" style="background:#4a7c59;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">メールアドレスを確認する</a></p>
      <p>このリンクは24時間有効です。</p>
      <p style="color:#999;font-size:12px;">心当たりがない場合は無視してください。</p>
    `,
  }).then(() => {});
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'パスワードは8文字以上にしてください' });
    return;
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'このメールアドレスはすでに登録されています' });
    return;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const name = email.split('@')[0];
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(id, email, password_hash, name);
  await seedDefaultDishes(id);

  // 認証トークン発行
  const token = uuidv4();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, id, expires);

  try {
    await sendVerificationEmail(email, token);
  } catch (e) {
    console.error('Failed to send verification email:', e);
  }

  res.status(201).json({ message: '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。' });
});

// GET /auth/verify?token=xxx
router.get('/verify', (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) {
    res.status(400).send('無効なリンクです');
    return;
  }
  const db = getDb();
  const record = db.prepare('SELECT * FROM email_verifications WHERE token = ?').get(token) as any;
  if (!record) {
    res.status(400).send('このリンクは無効または期限切れです');
    return;
  }
  if (new Date(record.expires_at) < new Date()) {
    db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
    res.status(400).send('このリンクは期限切れです。再度登録してください。');
    return;
  }
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(record.user_id);
  db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
  // 認証完了後はアプリのログイン画面にリダイレクト
  res.redirect(`${APP_URL}/login?verified=1`);
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    return;
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    return;
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    return;
  }
  if (!user.email_verified) {
    res.status(403).json({ error: 'メールアドレスが未確認です。届いたメールのリンクをクリックしてください。' });
    return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, avatar_data FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// PUT /auth/profile — 名前・アバター変更
router.put('/profile', authenticate, (req: AuthRequest, res: Response) => {
  const { name, avatar_data } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '名前は必須です' }) as any;
  const db = getDb();
  db.prepare('UPDATE users SET name = ?, avatar_data = ? WHERE id = ?').run(
    name.trim(), avatar_data ?? null, req.userId
  );
  const user = db.prepare('SELECT id, email, name, avatar_data FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

// PUT /auth/email — メールアドレス変更リクエスト（確認メール送信）
router.put('/email', authenticate, async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' }) as any;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) return res.status(404).json({ error: 'Not found' }) as any;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'パスワードが正しくありません' }) as any;

  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim(), req.userId);
  if (existing) return res.status(409).json({ error: 'このメールアドレスはすでに使用されています' }) as any;

  // 確認トークン発行
  const token = uuidv4();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET pending_email = ? WHERE id = ?').run(email.trim(), req.userId);
  db.prepare('INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, req.userId, expires);

  try {
    const link = `${APP_URL}/api/auth/verify-email?token=${token}`;
    await resend.emails.send({
      from: 'Olive <olive@eclo.info>',
      to: email.trim(),
      subject: '【Olive】メールアドレス変更の確認',
      html: `
        <p>メールアドレス変更のリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして新しいメールアドレスを確認してください。</p>
        <p><a href="${link}" style="background:#4a7c59;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">メールアドレスを確認する</a></p>
        <p>このリンクは24時間有効です。</p>
      `,
    });
  } catch (e) {
    console.error('Failed to send email change verification:', e);
  }

  res.json({ message: '確認メールを送信しました。新しいメールアドレス宛のリンクをクリックして変更を完了してください。' });
});

// GET /auth/verify-email?token=xxx — メールアドレス変更確認
router.get('/verify-email', (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) { res.status(400).send('無効なリンクです'); return; }
  const db = getDb();
  const record = db.prepare('SELECT * FROM email_verifications WHERE token = ?').get(token) as any;
  if (!record) { res.status(400).send('このリンクは無効または期限切れです'); return; }
  if (new Date(record.expires_at) < new Date()) {
    db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
    res.status(400).send('このリンクは期限切れです'); return;
  }
  const user = db.prepare('SELECT pending_email FROM users WHERE id = ?').get(record.user_id) as any;
  if (!user?.pending_email) { res.status(400).send('変更リクエストが見つかりません'); return; }
  db.prepare('UPDATE users SET email = ?, pending_email = NULL WHERE id = ?').run(user.pending_email, record.user_id);
  db.prepare('DELETE FROM email_verifications WHERE token = ?').run(token);
  res.redirect(`${APP_URL}/login?email_changed=1`);
});

export default router;

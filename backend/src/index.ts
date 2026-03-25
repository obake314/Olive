import express from 'express';
import cors from 'cors';
import dishesRouter from './routes/dishes';
import mealPlansRouter from './routes/mealPlans';
import shoppingRouter from './routes/shopping';
import authRouter from './routes/auth';
import recipeExtractRouter from './routes/recipeExtract';
import todosRouter from './routes/todos';
import familyRouter from './routes/family';
import adminRouter from './routes/admin';
import wishlistsRouter from './routes/wishlists';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: 環境変数 ALLOWED_ORIGINS で許可オリジンをカンマ区切りで指定
// 例: https://yourname.github.io,https://yourdomain.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:8081', 'http://localhost:19006'];

app.use(cors({
  origin: (origin, callback) => {
    // curl / モバイルアプリ (origin なし) は許可
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} is not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Olive' }));

app.use('/auth', authRouter);
app.use('/recipes', recipeExtractRouter);
app.use('/dishes', dishesRouter);
app.use('/meal-plans', mealPlansRouter);
app.use('/shopping', shoppingRouter);
app.use('/todos', todosRouter);
app.use('/family', familyRouter);
app.use('/wishlists', wishlistsRouter);
app.use('/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`Olive API running on port ${PORT}`);
});

export default app;

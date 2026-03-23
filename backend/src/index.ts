import express from 'express';
import cors from 'cors';
import dishesRouter from './routes/dishes';
import mealPlansRouter from './routes/mealPlans';
import shoppingRouter from './routes/shopping';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Olive' }));

app.use('/dishes', dishesRouter);
app.use('/meal-plans', mealPlansRouter);
app.use('/shopping', shoppingRouter);

app.listen(PORT, () => {
  console.log(`Olive API running on port ${PORT}`);
});

export default app;

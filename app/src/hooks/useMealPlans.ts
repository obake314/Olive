import { useState, useEffect, useCallback } from 'react';
import { MealPlan, MealType } from '../types';
import { mealPlansApi } from '../api/client';

export function useMealPlans(from: string, to: string) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mealPlansApi.list({ from, to });
      setMealPlans(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const addMealPlan = async (date: string, meal_type: MealType, dish_id: string) => {
    const plan = await mealPlansApi.create({ date, meal_type, dish_id });
    setMealPlans(prev => [...prev, plan]);
    return plan;
  };

  const removeMealPlan = async (id: string) => {
    await mealPlansApi.delete(id);
    setMealPlans(prev => prev.filter(p => p.id !== id));
  };

  return { mealPlans, loading, error, reload: load, addMealPlan, removeMealPlan };
}

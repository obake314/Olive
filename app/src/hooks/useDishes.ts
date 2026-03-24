import { useState, useEffect, useCallback } from 'react';
import { Dish, Ingredient } from '../types';
import { dishesApi } from '../api/client';

type DishIngredientInput = Omit<Ingredient, 'id' | 'dish_id'>;
type CreateDishInput = Omit<Dish, 'id' | 'created_at' | 'ingredients'> & {
  ingredients: DishIngredientInput[];
};
type UpdateDishInput = Partial<CreateDishInput>;

export function useDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dishesApi.list();
      setDishes(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createDish = async (data: CreateDishInput) => {
    const dish = await dishesApi.create(data);
    setDishes(prev => [dish, ...prev]);
    return dish;
  };

  const updateDish = async (id: string, data: UpdateDishInput) => {
    const dish = await dishesApi.update(id, data);
    setDishes(prev => prev.map(d => d.id === id ? dish : d));
    return dish;
  };

  const deleteDish = async (id: string) => {
    await dishesApi.delete(id);
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  return { dishes, loading, error, reload: load, createDish, updateDish, deleteDish };
}

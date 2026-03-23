import { useState, useEffect, useCallback } from 'react';
import { Dish } from '../types';
import { dishesApi } from '../api/client';

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

  const createDish = async (data: Omit<Dish, 'id' | 'created_at'>) => {
    const dish = await dishesApi.create(data);
    setDishes(prev => [dish, ...prev]);
    return dish;
  };

  const updateDish = async (id: string, data: Partial<Omit<Dish, 'id' | 'created_at'>>) => {
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

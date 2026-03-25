import { useState, useEffect, useCallback } from 'react';
import { ShoppingItem } from '../types';
import { shoppingApi } from '../api/client';

export function useShopping(weekStart: string) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shoppingApi.list(weekStart);
      setItems(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    const data = await shoppingApi.generate(weekStart);
    setItems(data);
  };

  const addCustom = async (name: string, quantity?: number, unit?: string, note?: string) => {
    const item = await shoppingApi.addCustom({ week_start: weekStart, name, quantity, unit, note });
    setItems(prev => [...prev, item]);
  };

  const toggleCheck = async (id: string) => {
    // Auto-generated items (auto=true) need to be persisted first
    const item = items.find(i => i.id === id);
    if (item?.auto) {
      // Generate first to persist them
      await generate();
      const persisted = await shoppingApi.list(weekStart);
      const persistedItem = persisted.find(
        i => i.name === item.name && i.unit === item.unit
      );
      if (persistedItem) {
        const updated = await shoppingApi.toggleCheck(persistedItem.id);
        setItems(prev => prev.map(i => i.id === id ? { ...updated } : i));
      }
      return;
    }
    const updated = await shoppingApi.toggleCheck(id);
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  };

  const updateItem = async (id: string, data: { name: string; quantity?: number; unit?: string; note?: string }) => {
    const updated = await shoppingApi.update(id, data);
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  };

  const deleteItem = async (id: string) => {
    await shoppingApi.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return { items, loading, error, reload: load, generate, addCustom, toggleCheck, updateItem, deleteItem };
}

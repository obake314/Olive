import { Dish, MealPlan, MealType, ShoppingItem } from '../types';

// Development: http://localhost:3000
// Production (Docker): same origin via nginx /api proxy
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Dishes
export const dishesApi = {
  list: () => request<Dish[]>('/dishes'),
  get: (id: string) => request<Dish>(`/dishes/${id}`),
  create: (data: Omit<Dish, 'id' | 'created_at'>) =>
    request<Dish>('/dishes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Dish, 'id' | 'created_at'>>) =>
    request<Dish>(`/dishes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/dishes/${id}`, { method: 'DELETE' }),
};

// Meal Plans
export const mealPlansApi = {
  list: (params: { from?: string; to?: string; date?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<MealPlan[]>(`/meal-plans?${qs}`);
  },
  create: (data: { date: string; meal_type: MealType; dish_id: string }) =>
    request<MealPlan>('/meal-plans', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/meal-plans/${id}`, { method: 'DELETE' }),
};

// Shopping
export const shoppingApi = {
  list: (weekStart: string) => request<ShoppingItem[]>(`/shopping?week_start=${weekStart}`),
  generate: (weekStart: string) =>
    request<ShoppingItem[]>('/shopping/generate', {
      method: 'POST',
      body: JSON.stringify({ week_start: weekStart }),
    }),
  addCustom: (data: { week_start: string; name: string; quantity?: number; unit?: string }) =>
    request<ShoppingItem>('/shopping', { method: 'POST', body: JSON.stringify(data) }),
  toggleCheck: (id: string) =>
    request<ShoppingItem>(`/shopping/${id}/check`, { method: 'PATCH' }),
  delete: (id: string) => request<void>(`/shopping/${id}`, { method: 'DELETE' }),
};

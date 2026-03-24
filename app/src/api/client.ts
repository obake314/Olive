import { Dish, Ingredient, MealPlan, MealType, ShoppingItem } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || '/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<{ id: string; email: string; name: string }>('/auth/me'),
};

// Dishes
type DishIngredientInput = Omit<Ingredient, 'id' | 'dish_id'>;
type DishInput = Omit<Dish, 'id' | 'created_at' | 'ingredients'> & {
  ingredients: DishIngredientInput[];
};

export const dishesApi = {
  list: () => request<Dish[]>('/dishes'),
  get: (id: string) => request<Dish>(`/dishes/${id}`),
  create: (data: DishInput) =>
    request<Dish>('/dishes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<DishInput>) =>
    request<Dish>(`/dishes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/dishes/${id}`, { method: 'DELETE' }),
};

// Recipe Extract
export const recipeApi = {
  extract: (url: string) =>
    request<{ name: string; ingredients: { name: string; quantity: number; unit: string }[] }>(
      '/recipes/extract',
      { method: 'POST', body: JSON.stringify({ url }) }
    ),
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

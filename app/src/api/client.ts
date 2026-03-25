import { Dish, Ingredient, MealPlan, MealType, ShoppingItem, Todo, Family, FamilyMember } from '../types';

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
    if (res.status === 413) throw new Error('データが大きすぎます。画像を小さくして再試行してください。');
    const error = await res.json().catch(() => ({ error: `サーバーエラー (${res.status})` }));
    throw new Error(error.error || `リクエスト失敗 (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<{ id: string; email: string; name: string; avatar_data?: string }>('/auth/me'),
  updateProfile: (data: { name: string; avatar_data?: string }) =>
    request<{ id: string; email: string; name: string; avatar_data?: string }>('/auth/profile', {
      method: 'PUT', body: JSON.stringify(data),
    }),
  requestEmailChange: (email: string, password: string) =>
    request<{ message: string }>('/auth/email', {
      method: 'PUT', body: JSON.stringify({ email, password }),
    }),
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
  seedDefaults: () => request<{ message: string }>('/dishes/seed-defaults', { method: 'POST' }),
};

// Recipe Extract
export const recipeApi = {
  extract: (url: string) =>
    request<{ name: string; recipe_text: string; ingredients: { name: string; quantity: number; unit: string }[] }>(
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

// Todos
export const todosApi = {
  list: () => request<Todo[]>('/todos'),
  create: (data: { title: string; due_date?: string; assignee_id?: string }) =>
    request<Todo>('/todos', { method: 'POST', body: JSON.stringify(data) }),
  toggle: (id: string) => request<Todo>(`/todos/${id}/toggle`, { method: 'PATCH' }),
  update: (id: string, data: { title: string; due_date?: string; assignee_id?: string }) =>
    request<Todo>(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/todos/${id}`, { method: 'DELETE' }),
};

// Family
export const familyApi = {
  get: () => request<{ family: Family | null; members: FamilyMember[] }>('/family'),
  create: (name: string) => request<Family>('/family', { method: 'POST', body: JSON.stringify({ name }) }),
  invite: (email: string) => request<{ message: string }>('/family/invite', { method: 'POST', body: JSON.stringify({ email }) }),
  leave: () => request<{ message: string }>('/family/leave', { method: 'DELETE' }),
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
  update: (id: string, data: { name: string; quantity?: number; unit?: string }) =>
    request<ShoppingItem>(`/shopping/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/shopping/${id}`, { method: 'DELETE' }),
};

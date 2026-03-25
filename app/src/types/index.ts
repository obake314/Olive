export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface Ingredient {
  id: string;
  dish_id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Dish {
  id: string;
  name: string;
  description?: string;
  recipe_url?: string;
  recipe_text?: string;
  recipe_memo?: string;
  image_data?: string;
  tags: string[];
  created_at: string;
  ingredients: Ingredient[];
}

export interface MealPlan {
  id: string;
  date: string;
  meal_type: MealType;
  dish_id: string;
  dish_name: string;
  recipe_url?: string;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  week_start: string;
  name: string;
  quantity: number;
  unit: string;
  note?: string;
  checked: number;
  custom: number;
  auto?: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active';
}

export interface Family {
  id: string;
  name: string;
}

export interface Todo {
  id: string;
  title: string;
  note?: string;
  done: number;
  due_date?: string;
  created_at: string;
  assignee_id?: string;
  assignee_name?: string;
  created_by_name?: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  memo?: string;
  url?: string;
  created_at: string;
  created_by_name?: string;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];

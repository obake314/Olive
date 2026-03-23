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
  recipe_url?: string;
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
  checked: number;
  custom: number;
  auto?: boolean;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];

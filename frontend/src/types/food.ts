// UC37: Manage Food & Drinks & UC38: Order Food & Drinks
export type FoodCategory = 'all' | 'food' | 'drink' | 'combo';

export interface FoodItem {
  id: string;
  name: string;
  category: 'food' | 'drink' | 'combo';
  price: number;
  description: string;
  image: string;
  isAvailable: boolean;
  unit: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodCartItem {
  item: FoodItem;
  quantity: number;
}

export interface FoodMutationPayload {
  name: string;
  category: 'food' | 'drink' | 'combo';
  price: number;
  description?: string;
  image?: string;
  isAvailable?: boolean;
  unit?: string;
}


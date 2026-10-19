export type FoodCategory = 'combo' | 'popcorn' | 'drink' | 'snack';

export type FoodCategoryFilter = 'all' | FoodCategory;

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  price: number;
  originalPrice?: number;
  description: string;
  imageUrl: string;
  size?: string;
  calories?: number;
  stockQuantity: number;
  isAvailable: boolean;
  isBestSeller?: boolean;
  preparationTime?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FoodFormData {
  name: string;
  category: FoodCategory;
  price: string;
  originalPrice: string;
  description: string;
  imageUrl: string;
  size: string;
  calories: string;
  stockQuantity: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  preparationTime: string;
}

export interface FoodFormErrors {
  name?: string;
  price?: string;
  originalPrice?: string;
  description?: string;
  imageUrl?: string;
  stockQuantity?: string;
  calories?: string;
  general?: string;
}

export type FoodSortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'best-seller';

export interface FoodFilterOptions {
  category: FoodCategoryFilter;
  searchQuery: string;
  onlyAvailable: boolean;
  onlyBestSeller: boolean;
  sortBy: FoodSortOption;
}

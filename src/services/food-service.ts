import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '@/types/food';

const FOOD_STORAGE_KEY = '@movie_theater_food_drinks_v1';

export const INITIAL_FOOD_ITEMS: FoodItem[] = [
  {
    id: 'fnb_01',
    name: 'CineMax Solo Combo',
    category: 'combo',
    price: 85000,
    originalPrice: 105000,
    description: 'Bao gồm 01 bắp ngọt lớn 60oz thơm lừng vị bơ & 01 ly nước có ga mát lạnh 32oz.',
    imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=600',
    size: 'Tiêu chuẩn',
    calories: 520,
    stockQuantity: 150,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '2 - 3 phút',
    createdAt: '2025-01-15T09:00:00Z',
  },
  {
    id: 'fnb_02',
    name: 'Couple Sweet Combo',
    category: 'combo',
    price: 129000,
    originalPrice: 165000,
    description: 'Dành cho 2 người: 01 bắp vị phô mai/caramel lớn 85oz, 02 ly nước ngọt có ga 32oz tùy chọn và 01 gói kẹo dẻo.',
    imageUrl: 'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=600',
    size: 'Lớn (L)',
    calories: 890,
    stockQuantity: 120,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '3 - 5 phút',
    createdAt: '2025-01-16T10:00:00Z',
  },
  {
    id: 'fnb_03',
    name: 'Blockbuster Family Combo',
    category: 'combo',
    price: 219000,
    originalPrice: 280000,
    description: 'Thưởng thức cùng nhóm bạn: 02 bắp khổng lồ (Caramel & Phô mai) 85oz, 04 ly nước ngọt 32oz và 01 phần khoai tây chiên sốt phô mai.',
    imageUrl: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=600',
    size: 'Gia đình (XL)',
    calories: 1450,
    stockQuantity: 80,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '5 - 7 phút',
    createdAt: '2025-01-17T11:00:00Z',
  },
  {
    id: 'fnb_04',
    name: 'Bắp Rang Phô Mai Hảo Hạng',
    category: 'popcorn',
    price: 55000,
    originalPrice: 65000,
    description: 'Bắp nổ tươi tại quầy, áo đều lớp bột phô mai béo ngậy mằn mặn đặc trưng không thể cưỡng lại.',
    imageUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600',
    size: 'Vừa (M)',
    calories: 460,
    stockQuantity: 200,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '1 - 2 phút',
    createdAt: '2025-01-18T08:30:00Z',
  },
  {
    id: 'fnb_05',
    name: 'Bắp Rang Vị Caramel Ngọt Ngào',
    category: 'popcorn',
    price: 55000,
    originalPrice: 65000,
    description: 'Hạt bắp nổ giòn tan bọc sốt caramel đường mía vàng óng thơm nức mũi.',
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600',
    size: 'Vừa (M)',
    calories: 480,
    stockQuantity: 180,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '1 - 2 phút',
    createdAt: '2025-01-19T09:15:00Z',
  },
  {
    id: 'fnb_06',
    name: 'Bắp Rang Bơ Truyền Thống Mỹ',
    category: 'popcorn',
    price: 49000,
    description: 'Bắp nổ hạt tròn vàng giòn, hương bơ béo ngậy cùng chút muối mặn kinh điển của rạp chiếu phim.',
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600',
    size: 'Vừa (M)',
    calories: 420,
    stockQuantity: 250,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '1 - 2 phút',
    createdAt: '2025-01-20T10:00:00Z',
  },
  {
    id: 'fnb_07',
    name: 'Bắp Rang Socola Đen Đậm Vị',
    category: 'popcorn',
    price: 59000,
    originalPrice: 70000,
    description: 'Sự kết hợp độc đáo giữa bắp giòn rụm và sốt socola Bỉ đậm đà, vị đắng ngọt hài hòa quyến rũ.',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600',
    size: 'Lớn (L)',
    calories: 510,
    stockQuantity: 95,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '2 - 3 phút',
    createdAt: '2025-01-21T11:20:00Z',
  },
  {
    id: 'fnb_08',
    name: 'Coca-Cola Tươi Lạnh 32oz',
    category: 'drink',
    price: 35000,
    description: 'Ly Coca-Cola tươi đá mát lạnh có ga sảng khoái, chuẩn vị thưởng thức trọn vẹn từng thước phim.',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600',
    size: 'Lớn (32oz)',
    calories: 180,
    stockQuantity: 300,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '1 phút',
    createdAt: '2025-01-22T08:00:00Z',
  },
  {
    id: 'fnb_09',
    name: 'Sprite Chanh Tươi Mát Lạnh 32oz',
    category: 'drink',
    price: 35000,
    description: 'Nước ngọt có ga vị chanh tự nhiên mát lạnh bùng nổ năng lượng.',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600',
    size: 'Lớn (32oz)',
    calories: 170,
    stockQuantity: 220,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '1 phút',
    createdAt: '2025-01-23T08:30:00Z',
  },
  {
    id: 'fnb_10',
    name: 'Trà Đào Cam Sả Đặc Biệt',
    category: 'drink',
    price: 45000,
    originalPrice: 55000,
    description: 'Trà thanh mát kết hợp tép cam mọng nước, hương sả dễ chịu và những miếng đào giòn ngâm vàng óng.',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600',
    size: 'Vừa (M)',
    calories: 140,
    stockQuantity: 110,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '2 - 3 phút',
    createdAt: '2025-01-24T09:00:00Z',
  },
  {
    id: 'fnb_11',
    name: 'Cà Phê Muối CineMax Signature',
    category: 'drink',
    price: 39000,
    description: 'Cà phê pha phin truyền thống thơm lừng phủ lớp kem muối béo ngậy mằn mặn đặc trưng.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    size: 'Vừa (M)',
    calories: 195,
    stockQuantity: 70,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '2 - 4 phút',
    createdAt: '2025-01-25T10:00:00Z',
  },
  {
    id: 'fnb_12',
    name: 'Khoai Tây Chiên Lắc Phô Mai',
    category: 'snack',
    price: 45000,
    originalPrice: 55000,
    description: 'Khoai tây cắt lát chiên giòn rụm bên ngoài mềm mịn bên trong, lắc đều bột phô mai cam thơm lừng.',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
    size: 'Hộp tiêu chuẩn',
    calories: 380,
    stockQuantity: 90,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '4 - 6 phút',
    createdAt: '2025-01-26T14:00:00Z',
  },
  {
    id: 'fnb_13',
    name: 'Xúc Xích Nướng Phô Mai Đức',
    category: 'snack',
    price: 42000,
    description: 'Xúc xích Đức cao cấp nướng vàng óng mọng nước, nhân phô mai tan chảy kích thích vị giác.',
    imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600',
    size: '02 Cây lớn',
    calories: 320,
    stockQuantity: 65,
    isAvailable: true,
    isBestSeller: false,
    preparationTime: '3 - 5 phút',
    createdAt: '2025-01-27T15:30:00Z',
  },
  {
    id: 'fnb_14',
    name: 'Bánh Nachos Sốt Phô Mai & Salsa',
    category: 'snack',
    price: 59000,
    originalPrice: 70000,
    description: 'Bánh bắp tortilla giòn tan kiểu Mexico ăn kèm 02 ngăn sốt: phô mai cheddar nóng hổi và sốt cà chua salsa chua cay.',
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600',
    size: 'Hộp lớn',
    calories: 490,
    stockQuantity: 40,
    isAvailable: true,
    isBestSeller: true,
    preparationTime: '3 - 5 phút',
    createdAt: '2025-01-28T16:00:00Z',
  },
  {
    id: 'fnb_15',
    name: 'Nước Khoáng Tinh Khiết Dasani 500ml',
    category: 'drink',
    price: 20000,
    description: 'Nước khoáng tinh khiết đóng chai 500ml thanh khiết tự nhiên.',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600',
    size: '500ml',
    calories: 0,
    stockQuantity: 0,
    isAvailable: false,
    isBestSeller: false,
    preparationTime: 'Ngay lập tức',
    createdAt: '2025-01-29T16:30:00Z',
  },
];

/**
 * Fetch all food and drink items from persistent storage
 */
export async function getAllFoodItems(): Promise<FoodItem[]> {
  try {
    const rawData = await AsyncStorage.getItem(FOOD_STORAGE_KEY);
    if (!rawData) {
      // First time initialization: seed initial mock items
      await AsyncStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(INITIAL_FOOD_ITEMS));
      return INITIAL_FOOD_ITEMS;
    }
    const parsed: FoodItem[] = JSON.parse(rawData);
    return parsed;
  } catch (error) {
    console.error('Error loading food items from storage:', error);
    return INITIAL_FOOD_ITEMS;
  }
}

/**
 * Get item by ID
 */
export async function getFoodItemById(id: string): Promise<FoodItem | null> {
  const items = await getAllFoodItems();
  return items.find((item) => item.id === id) || null;
}

/**
 * Create a new food or drink item
 */
export async function createFoodItem(
  data: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FoodItem> {
  const items = await getAllFoodItems();
  const newItem: FoodItem = {
    ...data,
    id: `fnb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [newItem, ...items];
  await AsyncStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(updatedList));
  return newItem;
}

/**
 * Update an existing food or drink item
 */
export async function updateFoodItem(
  id: string,
  updates: Partial<Omit<FoodItem, 'id' | 'createdAt'>>
): Promise<FoodItem> {
  const items = await getAllFoodItems();
  const targetIndex = items.findIndex((i) => i.id === id);

  if (targetIndex === -1) {
    throw new Error(`Không tìm thấy món với mã: ${id}`);
  }

  const updatedItem: FoodItem = {
    ...items[targetIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  items[targetIndex] = updatedItem;
  await AsyncStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(items));
  return updatedItem;
}

/**
 * Delete a food or drink item
 */
export async function deleteFoodItem(id: string): Promise<boolean> {
  const items = await getAllFoodItems();
  const filtered = items.filter((i) => i.id !== id);

  if (filtered.length === items.length) {
    return false;
  }

  await AsyncStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Quick toggle availability status (In stock / Out of stock)
 */
export async function toggleFoodAvailability(id: string): Promise<FoodItem> {
  const items = await getAllFoodItems();
  const target = items.find((i) => i.id === id);
  if (!target) {
    throw new Error(`Không tìm thấy món với mã: ${id}`);
  }

  return updateFoodItem(id, {
    isAvailable: !target.isAvailable,
  });
}

/**
 * Reset food catalog back to initial CineMax defaults
 */
export async function resetDefaultFoodItems(): Promise<FoodItem[]> {
  await AsyncStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(INITIAL_FOOD_ITEMS));
  return INITIAL_FOOD_ITEMS;
}

/**
 * Get statistical summary for F&B dashboard
 */
export async function getFoodStats() {
  const items = await getAllFoodItems();
  const total = items.length;
  const available = items.filter((i) => i.isAvailable).length;
  const outOfStock = total - available;
  const combos = items.filter((i) => i.category === 'combo').length;
  const bestSellers = items.filter((i) => i.isBestSeller).length;
  const avgPrice =
    total > 0 ? Math.round(items.reduce((sum, i) => sum + i.price, 0) / total) : 0;

  return {
    total,
    available,
    outOfStock,
    combos,
    bestSellers,
    avgPrice,
  };
}

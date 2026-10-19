import { FoodCategory, FoodFormData, FoodFormErrors } from '@/types/food';

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  combo: 'Combo Rạp',
  popcorn: 'Bắp Rang',
  drink: 'Thức Uống',
  snack: 'Đồ Ăn Nhẹ',
};

export const CATEGORY_ICONS: Record<FoodCategory, string> = {
  combo: 'fast-food',
  popcorn: 'nutrition',
  drink: 'beer',
  snack: 'pizza',
};

export const CATEGORY_COLORS: Record<FoodCategory, { bg: string; text: string; border: string }> = {
  combo: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#EF4444',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  popcorn: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  drink: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#3B82F6',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  snack: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#10B981',
    border: 'rgba(16, 185, 129, 0.35)',
  },
};

export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0 đ';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function validateFoodForm(data: FoodFormData): { isValid: boolean; errors: FoodFormErrors } {
  const errors: FoodFormErrors = {};

  // Validate Name
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    errors.name = 'Vui lòng nhập tên món ăn/thức uống';
  } else if (trimmedName.length < 2) {
    errors.name = 'Tên món phải có tối thiểu 2 ký tự';
  } else if (trimmedName.length > 80) {
    errors.name = 'Tên món không được vượt quá 80 ký tự';
  }

  // Validate Price
  const cleanPrice = data.price.replace(/[^\d]/g, '');
  const numericPrice = Number(cleanPrice);
  if (!cleanPrice) {
    errors.price = 'Vui lòng nhập giá bán';
  } else if (isNaN(numericPrice) || numericPrice < 1000) {
    errors.price = 'Giá bán phải từ 1.000 đ trở lên';
  } else if (numericPrice > 10000000) {
    errors.price = 'Giá bán không hợp lý (tối đa 10.000.000 đ)';
  }

  // Validate Original Price if entered
  if (data.originalPrice && data.originalPrice.trim() !== '') {
    const cleanOrig = data.originalPrice.replace(/[^\d]/g, '');
    const numericOrig = Number(cleanOrig);
    if (isNaN(numericOrig) || numericOrig < numericPrice) {
      errors.originalPrice = 'Giá gốc phải lớn hơn hoặc bằng giá bán';
    }
  }

  // Validate Description
  const trimmedDesc = data.description.trim();
  if (!trimmedDesc) {
    errors.description = 'Vui lòng nhập mô tả cho món';
  } else if (trimmedDesc.length < 5) {
    errors.description = 'Mô tả cần ít nhất 5 ký tự';
  }

  // Validate Image URL
  const trimmedImg = data.imageUrl.trim();
  if (!trimmedImg) {
    errors.imageUrl = 'Vui lòng nhập đường link hình ảnh';
  } else if (!/^https?:\/\/.+/i.test(trimmedImg)) {
    errors.imageUrl = 'Đường link hình ảnh phải bắt đầu bằng http:// hoặc https://';
  }

  // Validate Stock Quantity
  if (data.stockQuantity && data.stockQuantity.trim() !== '') {
    const stock = Number(data.stockQuantity);
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      errors.stockQuantity = 'Số lượng trong kho phải là số nguyên không âm';
    }
  }

  // Validate Calories
  if (data.calories && data.calories.trim() !== '') {
    const cal = Number(data.calories);
    if (isNaN(cal) || cal < 0) {
      errors.calories = 'Lượng calo phải là số không âm';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export const PRESET_FOOD_IMAGES = [
  {
    title: 'Combo Bắp & 2 Nước',
    url: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=600',
    category: 'combo' as FoodCategory,
  },
  {
    title: 'Bắp Rang Bơ Vàng',
    url: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600',
    category: 'popcorn' as FoodCategory,
  },
  {
    title: 'Bắp Rang Phô Mai',
    url: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600',
    category: 'popcorn' as FoodCategory,
  },
  {
    title: 'Coca-Cola Đá Mát',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600',
    category: 'drink' as FoodCategory,
  },
  {
    title: 'Trà Đào Cam Sả',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600',
    category: 'drink' as FoodCategory,
  },
  {
    title: 'Khoai Tây Chiên Giòn',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
    category: 'snack' as FoodCategory,
  },
  {
    title: 'Xúc Xích Nướng',
    url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600',
    category: 'snack' as FoodCategory,
  },
  {
    title: 'Bánh Nachos Phô Mai',
    url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600',
    category: 'snack' as FoodCategory,
  },
];

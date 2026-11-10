// UC39: Manage Promotions
export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount: number;
  minOrderValue: number;
  startDate?: string;
  endDate?: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckPromotionResult {
  success: boolean;
  message: string;
  promotion?: Promotion;
  discountAmount?: number;
}

export interface PromotionMutationPayload {
  code: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  isActive?: boolean;
}


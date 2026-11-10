// Nguyễn Minh Quân - CE180048
export type PricingCategory =
  | 'format'
  | 'seat_type'
  | 'day_of_week'
  | 'time_slot'
  | 'audience'
  | 'other';

export type AdjustmentType =
  | 'fixed_surcharge'
  | 'fixed_discount'
  | 'percentage_surcharge'
  | 'percentage_discount'
  | 'fixed_price';

export interface PricingRuleItem {
  id: string;
  code: string;
  name: string;
  category: PricingCategory;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  adjustmentFormatted: string;
  condition: string;
  applicableFormats: string[];
  applicableDays: number[];
  applicableTimeFrom: string;
  applicableTimeTo: string;
  applicableSeatTypes: string[];
  targetAudience: 'all' | 'adult' | 'student' | 'child' | 'senior' | 'member';
  description: string;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingRuleFormData {
  code: string;
  name: string;
  category: PricingCategory;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  condition?: string;
  applicableFormats?: string[];
  applicableDays?: number[];
  applicableTimeFrom?: string;
  applicableTimeTo?: string;
  applicableSeatTypes?: string[];
  targetAudience?: 'all' | 'adult' | 'student' | 'child' | 'senior' | 'member';
  description?: string;
  priority?: number;
  isActive?: boolean;
}

export interface PricingRulesResponse {
  success: boolean;
  total: number;
  rules: PricingRuleItem[];
  message?: string;
}

export interface PricingRuleDetailResponse {
  success: boolean;
  rule: PricingRuleItem;
  message?: string;
}

export interface PricingRuleSummaryResponse {
  success: boolean;
  summary: {
    total: number;
    active: number;
    inactive: number;
    byCategory: {
      format: number;
      seat_type: number;
      day_of_week: number;
      time_slot: number;
      audience: number;
    };
  };
}

export interface PricingCalculatePreviewPayload {
  basePrice?: number;
  format?: string;
  dayOfWeek?: number;
  time?: string;
  seatType?: string;
  targetAudience?: string;
}

export interface PricingCalculatePreviewResponse {
  success: boolean;
  preview: {
    basePrice: number;
    calculatedPrice: number;
    calculatedPriceFormatted: string;
    format: string;
    dayOfWeek: number;
    time: string;
    seatType: string;
    targetAudience: string;
    appliedRules: Array<{
      code: string;
      name: string;
      adjustmentFormatted: string;
      impact: string;
    }>;
  };
}

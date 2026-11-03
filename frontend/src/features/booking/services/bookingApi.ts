// Anh Kiệt - CE180795
// Service kết nối API cho Module Quản Lý Đặt Vé & Thanh Toán
// UC29 đến UC36

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  CreateBookingPayload,
  PromotionInfo,
  TicketBooking,
} from '../types/booking.types';

function getBaseUrl(): string {
  if (Platform.OS !== 'web') {
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost && /^\d+\.\d+\.\d+\.\d+$/.test(debuggerHost)) {
      return `http://${debuggerHost}:5000/api`;
    }
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
}

const BASE_URL = getBaseUrl();

async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data as T;
}

export const BookingAPI = {
  /**
   * UC29: Lấy danh sách các ghế đã được đặt của một suất chiếu
   */
  getOccupiedSeats: async (showtimeId: string): Promise<string[]> => {
    try {
      const res = await apiRequest<{ success: boolean; occupiedSeats: string[] }>(
        `/bookings/showtime/${encodeURIComponent(showtimeId)}/occupied-seats`
      );
      return res.occupiedSeats || [];
    } catch (error) {
      console.warn('Lỗi tải danh sách ghế đã đặt:', error);
      return [];
    }
  },

  /**
   * Lấy danh sách các mã khuyến mãi đang có hiệu lực
   */
  getActivePromotions: async (): Promise<PromotionInfo[]> => {
    try {
      const res = await apiRequest<{ success: boolean; promotions: PromotionInfo[] }>(
        '/promotions'
      );
      return res.promotions || [];
    } catch (error) {
      console.warn('Lỗi tải danh sách khuyến mãi:', error);
      return [];
    }
  },

  /**
   * UC31: Áp dụng mã khuyến mãi & tính số tiền giảm giá
   */
  applyPromotion: async (
    code: string,
    orderTotal: number
  ): Promise<{
    success: boolean;
    discountAmount: number;
    finalTotal: number;
    message: string;
    promotion?: PromotionInfo;
  }> => {
    return apiRequest('/promotions/apply', {
      method: 'POST',
      body: JSON.stringify({ code, orderTotal }),
    });
  },

  /**
   * UC29, UC32, UC33, UC35: Tạo đơn vé, lưu ghế, thanh toán giả lập và xuất vé điện tử
   */
  createBooking: async (
    payload: CreateBookingPayload
  ): Promise<{
    success: boolean;
    message: string;
    booking: TicketBooking;
  }> => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * UC30: Lấy danh sách vé đã đặt của người dùng
   */
  getMyTickets: async (userId?: string, phone?: string): Promise<TicketBooking[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append('userId', userId);
      if (phone) queryParams.append('phone', phone);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const res = await apiRequest<{ success: boolean; tickets: TicketBooking[] }>(
        `/bookings/my-tickets${qs}`
      );
      return res.tickets || [];
    } catch (error) {
      console.warn('Lỗi tải danh sách vé cá nhân:', error);
      return [];
    }
  },

  /**
   * UC30: Xem chi tiết một đơn đặt vé
   */
  getBookingDetails: async (id: string): Promise<TicketBooking> => {
    const res = await apiRequest<{ success: boolean; booking: TicketBooking }>(
      `/bookings/${encodeURIComponent(id)}`
    );
    return res.booking;
  },

  /**
   * UC34: Hủy đơn đặt vé theo quy định rạp chiếu
   */
  cancelBooking: async (
    id: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; booking: TicketBooking }> => {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * UC36: Quản trị viên tìm kiếm và lọc toàn bộ danh sách đơn đặt vé
   */
  getAllBookingsAdmin: async (params: {
    search?: string;
    status?: string;
    theaterId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    bookings: TicketBooking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.theaterId) queryParams.append('theaterId', params.theaterId);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest(`/bookings${qs}`);
  },

  /**
   * UC36: Quản trị viên cập nhật trạng thái đơn vé
   */
  updateBookingStatusAdmin: async (
    id: string,
    status: 'confirmed' | 'cancelled' | 'completed',
    cancelledReason?: string
  ): Promise<{ success: boolean; message: string; booking: TicketBooking }> => {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, cancelledReason }),
    });
  },
};


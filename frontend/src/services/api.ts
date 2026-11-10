/**
 * API Service — kết nối đến backend Node.js/Express + MongoDB Atlas
 *
 * Đổi BASE_URL theo môi trường:
 *  - Thiết bị thật (Expo Go cùng WiFi): Tự động lấy IP LAN máy tính qua Constants.expoConfig.hostUri
 *  - Android Emulator: http://10.0.2.2:5000
 *  - iOS Simulator / Web: http://localhost:5000
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ShowtimeFilterParams,
  ShowtimeFormPayload,
  ShowtimeMutationResponse,
  ShowtimesResponse,
} from '@/types/showtime';
import { FoodItem, FoodMutationPayload } from '@/types/food';
import { Promotion, CheckPromotionResult, PromotionMutationPayload } from '@/types/promotion';
import { Review, MovieReviewsResponse, ReviewMutationPayload } from '@/types/review';
import { NotificationItem, NotificationMutationPayload } from '@/types/notification';
import { Order, CreateOrderPayload, OrderStatus } from '@/types/order';
import { ReportSummary, TopMovieStat, TopFoodStat, RevenueTrend } from '@/types/report';
import {
  BookSeatsPayload,
  BookSeatsResponse,
  GenerateRoomData,
  GetSeatsResponse,
  HoldSeatsPayload,
  HoldSeatsResponse,
  SeatFormData,
  SeatItem,
  ShowtimeSeatMapResponse,
} from '@/types/seat';

function getBaseUrl(): string {
  // Tự động lấy IP mạng LAN của máy tính khi chạy trên Expo Go / thiết bị thật
  if (Platform.OS !== 'web') {
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost && /^\d+\.\d+\.\d+\.\d+$/.test(debuggerHost)) {
      return `http://${debuggerHost}:5000/api`;
    }
  }
  // Android emulator cần địa chỉ đặc biệt để trỏ về máy host
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
}

const BASE_URL = getBaseUrl();
const TOKEN_STORAGE_KEY = '@movie_theater_token_v2';

// ─── Generic fetch wrapper ────────────────────────────────────────────────────
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Không thể đọc token từ storage, tiếp tục gửi request
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string>),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Server trả về lỗi — throw để caller xử lý
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data as T;
}

// ─── Auth token helper ────────────────────────────────────────────────────────
function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS (UC01, UC02, UC04, UC05, UC06)
// ════════════════════════════════════════════════════════════════════════════

export const AuthAPI = {
  /** Đăng ký tài khoản mới */
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Đăng nhập — trả về token + user */
  login: (data: { identifier: string; password: string; rememberMe: boolean }) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Lấy thông tin user hiện tại từ token */
  getMe: (token: string) =>
    apiRequest('/auth/me', {
      headers: authHeader(token),
    }),

  /** Cập nhật hồ sơ */
  updateProfile: (
    token: string,
    data: { fullName?: string; phone?: string; avatarUrl?: string }
  ) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(data),
    }),

  /** Đổi mật khẩu */
  changePassword: (token: string, oldPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  /** Yêu cầu OTP để reset mật khẩu */
  forgotPassword: (identifier: string) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  /** Xác minh OTP */
  verifyOtp: (identifier: string, code: string) =>
    apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, code }),
    }),

  /** Hoàn tất reset mật khẩu */
  resetPassword: (identifier: string, code: string, newPassword: string) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, code, newPassword }),
    }),

  /** Xóa tài khoản */
  deleteAccount: (token: string) =>
    apiRequest('/auth/account', {
      method: 'DELETE',
      headers: authHeader(token),
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC07 & UC08: ADMIN & ROLE MANAGEMENT ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════
export const AdminAPI = {
  /** Lấy danh sách tài khoản (UC07) */
  getAccounts: (token: string, search = '', role = 'all', status = 'all') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role && role !== 'all') params.append('role', role);
    if (status && status !== 'all') params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/admin/accounts${queryString}`, {
      headers: authHeader(token),
    });
  },

  /** Thêm tài khoản mới (UC07) */
  createAccount: (
    token: string,
    data: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      role?: string;
      membershipTier?: string;
      loyaltyPoints?: number;
    }
  ) =>
    apiRequest('/admin/accounts', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(data),
    }),

  /** Cập nhật thông tin tài khoản (UC07) */
  updateAccount: (
    token: string,
    id: string,
    data: {
      fullName?: string;
      phone?: string;
      membershipTier?: string;
      loyaltyPoints?: number;
    }
  ) =>
    apiRequest(`/admin/accounts/${id}`, {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(data),
    }),

  /** Vô hiệu hóa hoặc kích hoạt lại tài khoản (UC07) */
  toggleStatus: (token: string, id: string, isActive: boolean) =>
    apiRequest(`/admin/accounts/${id}/status`, {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ isActive }),
    }),

  /** Cập nhật vai trò & phân quyền (UC08) */
  updateRole: (token: string, id: string, role: string, customPermissions?: string[]) =>
    apiRequest(`/admin/accounts/${id}/role`, {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ role, customPermissions }),
    }),

  /** Lấy ma trận phân quyền các vai trò (UC08) */
  getRoleMatrix: () => apiRequest('/admin/roles'),
};

// ════════════════════════════════════════════════════════════════════════════
// UC09: BOOKING HISTORY & TICKETS ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════
export const BookingAPI = {
  /** Lấy danh sách vé sắp sử dụng và lịch sử đặt vé (UC09) */
  getMyBookings: (token: string) =>
    apiRequest('/bookings/my-bookings', {
      headers: authHeader(token),
    }),

  /** Hủy vé sắp sử dụng (UC09) */
  cancelBooking: (token: string, id: string) =>
    apiRequest(`/bookings/${id}/cancel`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  /** Đặt vé xem phim mới (UC09) */
  createBooking: (token: string, data: any) =>
    apiRequest('/bookings', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(data),
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC10: MEMBERSHIP & LOYALTY POINTS ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════
export const MembershipAPI = {
  /** Lấy thông tin hội viên & tiến trình thăng hạng (UC10) */
  getInfo: (token: string) =>
    apiRequest('/membership/info', {
      headers: authHeader(token),
    }),

  /** Lấy lịch sử biến động điểm tích lũy (UC10) */
  getHistory: (token: string) =>
    apiRequest('/membership/history', {
      headers: authHeader(token),
    }),

  /** Đổi điểm tích lũy lấy quà / voucher (UC10) */
  redeemReward: (token: string, rewardId: string) =>
    apiRequest('/membership/redeem', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ rewardId }),
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC21 & UC22: SHOWTIME ENDPOINTS — Nguyễn Minh Quân - CE180048
// Truy vấn & Quản lý (Thêm, Xem, Sửa, Xóa) lịch chiếu trực tiếp trên MongoDB Atlas
// ════════════════════════════════════════════════════════════════════════════

export const ShowtimeAPI = {
  /** UC21 & UC22: Lấy danh sách phim, cụm rạp, ngày chiếu và các suất chiếu đã lọc từ MongoDB Atlas */
  getShowtimes: (params: ShowtimeFilterParams = {}): Promise<ShowtimesResponse> => {
    const query = new URLSearchParams();
    if (params.dateKey) query.append('dateKey', params.dateKey);
    if (params.movieId) query.append('movieId', params.movieId);
    if (params.theaterId) query.append('theaterId', params.theaterId);
    if (params.area) query.append('area', params.area);
    if (params.format) query.append('format', params.format);
    if (params.period) query.append('period', params.period);
    if (params.searchQuery) query.append('searchQuery', params.searchQuery);

    const qs = query.toString();
    return apiRequest<ShowtimesResponse>(`/showtimes${qs ? `?${qs}` : ''}`);
  },

  /** Lấy chi tiết một suất chiếu cụ thể theo mã suất chiếu */
  getShowtimeById: (id: string) => apiRequest(`/showtimes/${encodeURIComponent(id)}`),

  /** UC22: Thêm mới một suất chiếu lên MongoDB Atlas */
  createShowtime: (payload: ShowtimeFormPayload): Promise<ShowtimeMutationResponse> =>
    apiRequest<ShowtimeMutationResponse>('/showtimes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** UC22: Cập nhật (Sửa) một suất chiếu trên MongoDB Atlas */
  updateShowtime: (
    id: string,
    payload: Partial<ShowtimeFormPayload>
  ): Promise<ShowtimeMutationResponse> =>
    apiRequest<ShowtimeMutationResponse>(`/showtimes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** UC22: Xóa một suất chiếu khỏi MongoDB Atlas */
  deleteShowtime: (id: string): Promise<ShowtimeMutationResponse> =>
    apiRequest<ShowtimeMutationResponse>(`/showtimes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC37: FOOD & DRINKS API
// ════════════════════════════════════════════════════════════════════════════
export const FoodAPI = {
  getFoods: (params: { category?: string; search?: string; availableOnly?: boolean } = {}): Promise<{ success: boolean; items: FoodItem[] }> => {
    const qs = new URLSearchParams();
    if (params.category && params.category !== 'all') qs.append('category', params.category);
    if (params.search) qs.append('search', params.search);
    if (params.availableOnly) qs.append('availableOnly', 'true');
    const queryStr = qs.toString();
    return apiRequest(`/food${queryStr ? `?${queryStr}` : ''}`);
  },

  getFoodById: (id: string): Promise<{ success: boolean; item: FoodItem }> =>
    apiRequest(`/food/${encodeURIComponent(id)}`),

  createFood: (payload: FoodMutationPayload): Promise<{ success: boolean; message: string; item: FoodItem }> =>
    apiRequest('/food', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateFood: (id: string, payload: Partial<FoodMutationPayload>): Promise<{ success: boolean; message: string; item: FoodItem }> =>
    apiRequest(`/food/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  toggleAvailable: (id: string): Promise<{ success: boolean; message: string; item: FoodItem }> =>
    apiRequest(`/food/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    }),

  deleteFood: (id: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/food/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC39: PROMOTIONS API
// ════════════════════════════════════════════════════════════════════════════
export const PromotionAPI = {
  getPromotions: (params: { activeOnly?: boolean; search?: string } = {}): Promise<{ success: boolean; promotions: Promotion[] }> => {
    const qs = new URLSearchParams();
    if (params.activeOnly) qs.append('activeOnly', 'true');
    if (params.search) qs.append('search', params.search);
    const queryStr = qs.toString();
    return apiRequest(`/promotions${queryStr ? `?${queryStr}` : ''}`);
  },

  checkPromotion: (code: string, orderTotal: number): Promise<CheckPromotionResult> =>
    apiRequest(`/promotions/check/${encodeURIComponent(code)}?orderTotal=${orderTotal}`),

  createPromotion: (payload: PromotionMutationPayload): Promise<{ success: boolean; message: string; promotion: Promotion }> =>
    apiRequest('/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePromotion: (id: string, payload: Partial<PromotionMutationPayload>): Promise<{ success: boolean; message: string; promotion: Promotion }> =>
    apiRequest(`/promotions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  togglePromotion: (id: string): Promise<{ success: boolean; message: string; promotion: Promotion }> =>
    apiRequest(`/promotions/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    }),

  deletePromotion: (id: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/promotions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC40 & UC41: REVIEWS API
// ════════════════════════════════════════════════════════════════════════════
export const ReviewAPI = {
  getMovieReviews: (movieId: string): Promise<MovieReviewsResponse> =>
    apiRequest(`/reviews/movie/${encodeURIComponent(movieId)}`),

  createReview: (payload: ReviewMutationPayload): Promise<{ success: boolean; message: string; review: Review }> =>
    apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateReview: (id: string, payload: { rating?: number; comment?: string }): Promise<{ success: boolean; message: string; review: Review }> =>
    apiRequest(`/reviews/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteReview: (id: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/reviews/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getAdminReviews: (params: { status?: string; search?: string; movieId?: string } = {}): Promise<{ success: boolean; total: number; reviews: Review[] }> => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== 'all') qs.append('status', params.status);
    if (params.search) qs.append('search', params.search);
    if (params.movieId && params.movieId !== 'all') qs.append('movieId', params.movieId);
    const queryStr = qs.toString();
    return apiRequest(`/reviews/admin/all${queryStr ? `?${queryStr}` : ''}`);
  },

  moderateReview: (id: string, status: 'approved' | 'hidden' | 'flagged'): Promise<{ success: boolean; message: string; review: Review }> =>
    apiRequest(`/reviews/admin/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC42 & UC43: NOTIFICATIONS API
// ════════════════════════════════════════════════════════════════════════════
export const NotificationAPI = {
  getNotifications: (userId?: string): Promise<{ success: boolean; unreadCount: number; notifications: NotificationItem[] }> => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiRequest(`/notifications${qs}`);
  },

  getUnreadCount: (userId?: string): Promise<{ success: boolean; count: number }> => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiRequest(`/notifications/unread-count${qs}`);
  },

  markAsRead: (id: string, userId?: string): Promise<{ success: boolean; notification: NotificationItem }> =>
    apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  markAllAsRead: (userId?: string): Promise<{ success: boolean; message: string }> =>
    apiRequest('/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  getAdminNotifications: (params: { type?: string; search?: string } = {}): Promise<{ success: boolean; total: number; notifications: NotificationItem[] }> => {
    const qs = new URLSearchParams();
    if (params.type && params.type !== 'all') qs.append('type', params.type);
    if (params.search) qs.append('search', params.search);
    const queryStr = qs.toString();
    return apiRequest(`/notifications/admin/all${queryStr ? `?${queryStr}` : ''}`);
  },

  createNotification: (payload: NotificationMutationPayload): Promise<{ success: boolean; message: string; notification: NotificationItem }> =>
    apiRequest('/notifications/admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateNotification: (id: string, payload: Partial<NotificationMutationPayload>): Promise<{ success: boolean; message: string; notification: NotificationItem }> =>
    apiRequest(`/notifications/admin/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteNotification: (id: string): Promise<{ success: boolean; message: string }> =>
    apiRequest(`/notifications/admin/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC38 & UC44: ORDERS API
// ════════════════════════════════════════════════════════════════════════════
export const OrderAPI = {
  createOrder: (payload: CreateOrderPayload): Promise<{ success: boolean; message: string; order: Order }> =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOrders: (params: { userId?: string; status?: string } = {}): Promise<{ success: boolean; total: number; orders: Order[] }> => {
    const qs = new URLSearchParams();
    if (params.userId && params.userId !== 'all') qs.append('userId', params.userId);
    if (params.status && params.status !== 'all') qs.append('status', params.status);
    const queryStr = qs.toString();
    return apiRequest(`/orders${queryStr ? `?${queryStr}` : ''}`);
  },

  getFoodOrders: (params: { status?: string; search?: string } = {}): Promise<{ success: boolean; total: number; orders: Order[] }> => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== 'all') qs.append('status', params.status);
    if (params.search) qs.append('search', params.search);
    const queryStr = qs.toString();
    return apiRequest(`/orders/food-orders${queryStr ? `?${queryStr}` : ''}`);
  },

  getOrderById: (id: string): Promise<{ success: boolean; order: Order }> =>
    apiRequest(`/orders/${encodeURIComponent(id)}`),

  updateOrderStatus: (id: string, orderStatus: OrderStatus): Promise<{ success: boolean; message: string; order: Order }> =>
    apiRequest(`/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus }),
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// UC45: REPORTS API
// ════════════════════════════════════════════════════════════════════════════
export const ReportAPI = {
  getSummary: (): Promise<{ success: boolean; data: ReportSummary }> =>
    apiRequest('/reports/summary'),

  getTopMovies: (): Promise<{ success: boolean; topMovies: TopMovieStat[] }> =>
    apiRequest('/reports/top-movies'),

  getTopFoods: (): Promise<{ success: boolean; topFoods: TopFoodStat[] }> =>
    apiRequest('/reports/top-foods'),

  getRevenueTrends: (): Promise<{ success: boolean; trends: RevenueTrend[] }> =>
    apiRequest('/reports/revenue-trends'),
};

// ════════════════════════════════════════════════════════════════════════════
// UC23: SEAT MANAGEMENT ENDPOINTS — Nguyễn Minh Quân - CE180048
// Truy vấn sơ đồ & Quản lý (Thêm, Xem, Sửa, Xóa) thông tin ghế trên MongoDB Atlas
// ════════════════════════════════════════════════════════════════════════════

export const SeatAPI = {
  /** Lấy danh sách ghế, thông số phòng và thống kê ghế theo rạp & phòng chiếu */
  getSeats: (params: {
    theaterId?: string;
    room?: string;
    type?: string;
    status?: string;
    row?: string;
    search?: string;
  } = {}): Promise<GetSeatsResponse> => {
    const query = new URLSearchParams();
    if (params.theaterId) query.append('theaterId', params.theaterId);
    if (params.room) query.append('room', params.room);
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.row) query.append('row', params.row);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    return apiRequest<GetSeatsResponse>(`/seats${qs ? `?${qs}` : ''}`);
  },

  /** Lấy danh sách các phòng và số lượng ghế theo rạp */
  getRooms: (theaterId: string = 't1') =>
    apiRequest(`/seats/rooms?theaterId=${encodeURIComponent(theaterId)}`),

  /** Lấy chi tiết 1 ghế theo ID */
  getSeatById: (id: string): Promise<{ success: boolean; seat: SeatItem }> =>
    apiRequest(`/seats/${encodeURIComponent(id)}`),

  /** UC23: Thêm mới 1 ghế vào phòng chiếu */
  createSeat: (data: SeatFormData): Promise<{ success: boolean; message: string; seat: SeatItem }> =>
    apiRequest('/seats', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** UC23: Tự động khởi tạo sơ đồ hàng loạt ghế cho phòng chiếu */
  generateRoom: (
    data: GenerateRoomData
  ): Promise<{ success: boolean; message: string; totalCreated: number }> =>
    apiRequest('/seats/generate-room', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** UC23: Cập nhật thông tin ghế (Mã ghế, hàng, loại ghế, giá vé, trạng thái, ghi chú) */
  updateSeat: (
    id: string,
    data: Partial<SeatFormData>
  ): Promise<{ success: boolean; message: string; seat: SeatItem }> =>
    apiRequest(`/seats/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** UC23: Xóa 1 ghế khỏi phòng chiếu */
  deleteSeat: (id: string): Promise<{ success: boolean; message: string; deletedId: string }> =>
    apiRequest(`/seats/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  /** UC23: Xóa nhiều ghế theo danh sách ID */
  batchDeleteSeats: (
    ids: string[]
  ): Promise<{ success: boolean; message: string; deletedCount: number }> =>
    apiRequest('/seats/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  /** UC24 & UC25: Lấy sơ đồ ghế chi tiết và trạng thái còn trống/đã đặt/đang giữ của suất chiếu */
  getShowtimeSeatMap: (
    showtimeId: string,
    params: { holdToken?: string; userId?: string } = {}
  ): Promise<ShowtimeSeatMapResponse> => {
    const qs = new URLSearchParams();
    if (params.holdToken) qs.append('holdToken', params.holdToken);
    if (params.userId) qs.append('userId', params.userId);
    const queryStr = qs.toString();
    return apiRequest<ShowtimeSeatMapResponse>(
      `/seats/showtime/${encodeURIComponent(showtimeId)}${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /** UC25: Khóa giữ chỗ tạm thời (5 phút) và kiểm tra tình trạng ghế để tránh đặt trùng */
  holdSeats: (payload: HoldSeatsPayload): Promise<HoldSeatsResponse> =>
    apiRequest<HoldSeatsResponse>('/seats/hold', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** UC25: Giải phóng ghế đã giữ khi người dùng hủy hoặc đổi ghế */
  releaseSeats: (payload: {
    showtimeId: string;
    seatCodes?: string[];
    userId?: string;
    holdToken?: string;
  }): Promise<{ success: boolean; message: string }> =>
    apiRequest('/seats/release', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** UC25: Kiểm tra nhanh tình trạng khả dụng realtime của danh sách ghế */
  checkSeats: (payload: {
    showtimeId: string;
    seatCodes: string[];
    userId?: string;
    holdToken?: string;
  }): Promise<{ success: boolean; isAvailable: boolean; conflictBooked: string[]; conflictHolding: string[] }> =>
    apiRequest('/seats/check-seats', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** UC24 & UC25: Đặt giữ ghế cho suất chiếu và lưu vé lên MongoDB Atlas */
  bookSeats: (payload: BookSeatsPayload): Promise<BookSeatsResponse> =>
    apiRequest<BookSeatsResponse>('/seats/book', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

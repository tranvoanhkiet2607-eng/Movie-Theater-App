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

import {
  ShowtimeFilterParams,
  ShowtimeFormPayload,
  ShowtimeMutationResponse,
  ShowtimesResponse,
} from '@/types/showtime';

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

// ─── Generic fetch wrapper ────────────────────────────────────────────────────
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
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

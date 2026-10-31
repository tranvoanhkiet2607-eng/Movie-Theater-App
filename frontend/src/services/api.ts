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
// AUTH ENDPOINTS
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

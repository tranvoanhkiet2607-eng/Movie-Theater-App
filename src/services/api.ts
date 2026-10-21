/**
 * API Service — kết nối đến backend Node.js/Express + MongoDB
 *
 * Đổi BASE_URL theo môi trường:
 *  - Android Emulator: http://10.0.2.2:5000
 *  - iOS Simulator / Web: http://localhost:5000
 *  - Thiết bị thật (cùng WiFi): http://<IP_máy_tính>:5000
 */

import { Platform } from 'react-native';

function getBaseUrl(): string {
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

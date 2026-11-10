// Service kết nối API cho Module Cinema, Room & Facility Management
// UC17: Manage Cinemas | UC18: Manage Rooms
// UC19: View Cinema Details | UC20: Manage Cinema Facilities

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  Theater,
  TheatersResponse,
  TheaterDetailResponse,
  RoomsResponse,
  TheaterFormPayload,
  Room,
  RoomFormPayload,
} from '../types/cinema.types';

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

function authHeader(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const CinemaAPI = {
  /**
   * UC17, UC19: Lấy danh sách toàn bộ cụm rạp
   */
  getTheaters: async (params: { area?: string; search?: string } = {}): Promise<TheatersResponse> => {
    const query = new URLSearchParams();
    if (params.area && params.area !== 'all') query.append('area', params.area);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());

    const qs = query.toString();
    return apiRequest<TheatersResponse>(`/theaters${qs ? `?${qs}` : ''}`);
  },

  /**
   * UC19: Lấy chi tiết cụm rạp kèm danh sách phòng chiếu & tiện ích
   */
  getTheaterById: async (id: string): Promise<Theater> => {
    const res = await apiRequest<TheaterDetailResponse>(`/theaters/${encodeURIComponent(id)}`);
    return res.theater;
  },

  /**
   * UC17: Thêm cụm rạp mới (Admin)
   */
  createTheater: async (payload: TheaterFormPayload, token: string): Promise<Theater> => {
    const res = await apiRequest<{ success: boolean; message: string; theater: Theater }>('/theaters', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    });
    return res.theater;
  },

  /**
   * UC17: Cập nhật thông tin cụm rạp (Admin)
   */
  updateTheater: async (
    id: string,
    payload: Partial<TheaterFormPayload>,
    token: string
  ): Promise<Theater> => {
    const res = await apiRequest<{ success: boolean; message: string; theater: Theater }>(
      `/theaters/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify(payload),
      }
    );
    return res.theater;
  },

  /**
   * UC17: Xóa cụm rạp (Admin)
   */
  deleteTheater: async (id: string, token: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/theaters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeader(token),
    });
  },

  /**
   * UC18, UC19: Lấy danh sách các phòng chiếu của rạp
   */
  getRooms: async (theaterId: string): Promise<Room[]> => {
    const res = await apiRequest<RoomsResponse>(`/theaters/${encodeURIComponent(theaterId)}/rooms`);
    return res.rooms || [];
  },

  /**
   * UC18: Thêm phòng chiếu mới cho rạp (Admin)
   */
  createRoom: async (theaterId: string, payload: RoomFormPayload, token: string): Promise<Room> => {
    const res = await apiRequest<{ success: boolean; message: string; room: Room }>(
      `/theaters/${encodeURIComponent(theaterId)}/rooms`,
      {
        method: 'POST',
        headers: authHeader(token),
        body: JSON.stringify(payload),
      }
    );
    return res.room;
  },

  /**
   * UC18: Sửa thông tin phòng chiếu (Admin)
   */
  updateRoom: async (
    theaterId: string,
    roomId: string,
    payload: Partial<RoomFormPayload>,
    token: string
  ): Promise<Room> => {
    const res = await apiRequest<{ success: boolean; message: string; room: Room }>(
      `/theaters/${encodeURIComponent(theaterId)}/rooms/${encodeURIComponent(roomId)}`,
      {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify(payload),
      }
    );
    return res.room;
  },

  /**
   * UC18: Xóa phòng chiếu (Admin)
   */
  deleteRoom: async (
    theaterId: string,
    roomId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiRequest(
      `/theaters/${encodeURIComponent(theaterId)}/rooms/${encodeURIComponent(roomId)}`,
      {
        method: 'DELETE',
        headers: authHeader(token),
      }
    );
  },

  /**
   * UC20: Cập nhật tiện ích và thông tin hoạt động rạp (Admin)
   */
  updateFacilities: async (
    theaterId: string,
    data: { amenities?: string[]; hotline?: string; distance?: string },
    token: string
  ): Promise<Theater> => {
    const res = await apiRequest<{ success: boolean; message: string; theater: Theater }>(
      `/theaters/${encodeURIComponent(theaterId)}/facilities`,
      {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify(data),
      }
    );
    return res.theater;
  },
};

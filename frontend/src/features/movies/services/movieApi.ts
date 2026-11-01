// Service kết nối API cho Module Movie Catalog
// UC11: View Movies | UC12: Search Movies | UC13: Filter Movies

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  Movie,
  MovieDetailResponse,
  MovieFilterState,
  MoviesResponse,
  GenresResponse,
} from '../types/movie.types';

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

export const MovieAPI = {
  /**
   * UC11, UC12, UC13: Lấy danh sách phim kết hợp tìm kiếm và bộ lọc
   */
  getMovies: async (filters: Partial<MovieFilterState> = {}): Promise<MoviesResponse> => {
    const query = new URLSearchParams();

    if (filters.search && filters.search.trim()) {
      query.append('search', filters.search.trim());
    }
    if (filters.status && filters.status !== 'all') {
      query.append('status', filters.status);
    }
    if (filters.genre && filters.genre !== 'all') {
      query.append('genre', filters.genre);
    }
    if (filters.ageRating && filters.ageRating !== 'all') {
      query.append('ageRating', filters.ageRating);
    }
    if (filters.format && filters.format !== 'all') {
      query.append('format', filters.format);
    }
    if (filters.sort && filters.sort !== 'default') {
      query.append('sort', filters.sort);
    }

    const qs = query.toString();
    return apiRequest<MoviesResponse>(`/movies${qs ? `?${qs}` : ''}`);
  },

  /**
   * UC13: Lấy danh sách các thể loại phim có trong cơ sở dữ liệu
   */
  getGenres: async (): Promise<string[]> => {
    try {
      const res = await apiRequest<GenresResponse>('/movies/genres');
      return res.genres || [];
    } catch {
      return [];
    }
  },

  /**
   * UC11: Lấy chi tiết thông tin 1 phim theo id hoặc mã code
   */
  getMovieById: async (id: string): Promise<Movie> => {
    const res = await apiRequest<MovieDetailResponse>(`/movies/${encodeURIComponent(id)}`);
    return res.movie;
  },
};

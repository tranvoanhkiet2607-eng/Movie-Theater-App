// Định nghĩa Types & Interfaces cho Module Movie Catalog
// UC11: View Movies | UC12: Search Movies | UC13: Filter Movies

export type AgeRating = 'P' | 'K' | 'T13' | 'T16' | 'T18';

export type MovieStatusFilter = 'all' | 'now_showing' | 'coming_soon';

export type MovieSortOption = 'default' | 'rating' | 'newest' | 'title_asc' | 'duration_desc';

export interface Movie {
  id: string;
  code: string;
  title: string;
  originalTitle: string;
  genre: string;
  durationMinutes: number;
  durationLabel: string;
  rating: string;
  ageRating: AgeRating;
  ageDescription: string;
  poster: string;
  badge?: string;
  releaseDate: string;
  director: string;
  cast: string[];
  synopsis: string;
  formats: string[];
  isNowShowing: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MovieFilterState {
  search: string;
  status: MovieStatusFilter;
  genre: string;
  ageRating: string;
  format: string;
  sort: MovieSortOption;
}

export interface MoviesResponse {
  success: boolean;
  total: number;
  movies: Movie[];
}

export interface GenresResponse {
  success: boolean;
  genres: string[];
}

export interface MovieDetailResponse {
  success: boolean;
  movie: Movie;
}

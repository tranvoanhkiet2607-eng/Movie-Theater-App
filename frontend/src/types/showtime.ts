// Nguyễn Minh Quân - CE180048

export type ShowtimeFormat =
  | '2D Phụ đề'
  | '2D Lồng tiếng'
  | '3D Phụ đề'
  | 'IMAX 3D'
  | '4DX'
  | 'Gold Class VIP';

export type AgeRating = 'P' | 'K' | 'T13' | 'T16' | 'T18';

export type TimeSlotPeriod = 'all' | 'morning' | 'afternoon' | 'evening' | 'late';

export type SeatAvailabilityStatus = 'available' | 'filling_fast' | 'almost_full' | 'sold_out';

export type ShowtimeViewMode = 'by_movie' | 'by_theater';

export interface ShowtimeDateOption {
  dateKey: string;
  dayLabel: string;
  dateDisplay: string;
  fullDateLabel: string;
  isWeekend: boolean;
}

export interface ShowtimeMovie {
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
  formats: ShowtimeFormat[];
  isNowShowing?: boolean;
}

export interface ShowtimeTheater {
  id: string;
  code: string;
  name: string;
  shortName: string;
  area: string;
  address: string;
  distance: string;
  hotline: string;
  totalRooms: number;
  supportedFormats: ShowtimeFormat[];
  amenities: string[];
}

export interface ShowtimeItem {
  id: string;
  code: string;
  movieId: string;
  theaterId: string;
  dateKey: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  room: string;
  format: ShowtimeFormat;
  price: number;
  priceFormatted: string;
  totalSeats: number;
  availableSeats: number;
  status: SeatAvailabilityStatus;
}

export interface ShowtimeFilterParams {
  dateKey?: string;
  movieId?: string;
  theaterId?: string;
  area?: string;
  format?: ShowtimeFormat | 'all';
  period?: TimeSlotPeriod;
  searchQuery?: string;
}

export interface ShowtimesResponse {
  success: boolean;
  total: number;
  dates: ShowtimeDateOption[];
  formats: ShowtimeFormat[];
  movies: ShowtimeMovie[];
  theaters: ShowtimeTheater[];
  showtimes: ShowtimeItem[];
}

// UC22: Payload Thêm / Sửa Suất chiếu
export interface ShowtimeFormPayload {
  movieId: string;
  theaterId: string;
  dateKey: string;
  startTime: string;
  room: string;
  format: ShowtimeFormat;
  price: number;
  totalSeats: number;
  availableSeats: number;
}

export interface ShowtimeMutationResponse {
  success: boolean;
  message: string;
  showtime?: ShowtimeItem;
  deletedId?: string;
}

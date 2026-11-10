// Nguyễn Minh Quân - CE180048

export type SeatType = 'standard' | 'vip' | 'couple';
export type SeatStatus = 'available' | 'maintenance' | 'reserved';

export interface SeatItem {
  id: string;
  _id?: string;
  code: string;
  seatCode: string; // ví dụ: A01, B05, SW-F1
  row: string; // A, B, C...
  colNumber: number; // 1, 2, 3...
  theaterId: string;
  room: string;
  type: SeatType;
  price: number;
  priceFormatted: string;
  status: SeatStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatSummary {
  total: number;
  available: number;
  maintenance: number;
  reserved: number;
  standardCount: number;
  vipCount: number;
  coupleCount: number;
}

export interface RoomStats {
  room: string;
  totalSeats: number;
  availableSeats: number;
  maintenanceSeats: number;
  vipSeats: number;
  standardSeats: number;
  coupleSeats: number;
}

export interface GetSeatsResponse {
  success: boolean;
  theaters: Array<{
    id: string;
    code: string;
    name: string;
    shortName: string;
    area: string;
    address: string;
  }>;
  rooms: string[];
  activeTheaterId: string;
  activeRoom: string;
  rows: string[];
  summary: SeatSummary;
  totalMatching: number;
  seats: SeatItem[];
  message?: string;
}

export interface SeatFormData {
  theaterId: string;
  room: string;
  row: string;
  colNumber: number;
  seatCode?: string;
  type: SeatType;
  price: number;
  status: SeatStatus;
  notes?: string;
}

export interface GenerateRoomData {
  theaterId: string;
  room: string;
  rows: string[];
  colsPerRow: number;
  vipRows: string[];
  coupleRows: string[];
  standardPrice: number;
  vipPrice: number;
  couplePrice: number;
  overwrite: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// UC24: SHOWTIME SEAT MAP & BOOKING TYPES — Nguyễn Minh Quân - CE180048
// ════════════════════════════════════════════════════════════════════════════

export type RuntimeSeatStatus = 'available' | 'booked' | 'maintenance' | 'selected';

export interface ShowtimeSeatItem {
  id: string;
  code: string;
  seatCode: string;
  row: string;
  colNumber: number;
  type: SeatType;
  basePrice: number;
  price: number;
  priceFormatted: string;
  status: 'available' | 'booked' | 'maintenance';
  notes?: string;
}

export interface ShowtimeSeatMapSummary {
  totalSeats: number;
  availableCount: number;
  bookedCount: number;
  maintenanceCount: number;
  standardCount: number;
  vipCount: number;
  coupleCount: number;
}

export interface ShowtimeSeatMapResponse {
  success: boolean;
  showtime: {
    id: string;
    code: string;
    startTime: string;
    endTime: string;
    dateStr: string;
    dateKey: string;
    room: string;
    format: string;
    price: number;
    priceFormatted: string;
    status: string;
  };
  movie: {
    id: string;
    title: string;
    originalTitle: string;
    poster: string;
    genre: string;
    durationLabel: string;
    rating: string;
    ageRating: string;
    ageDescription: string;
  } | null;
  theater: {
    id: string;
    name: string;
    shortName: string;
    address: string;
    area: string;
  } | null;
  summary: ShowtimeSeatMapSummary;
  seatMap: ShowtimeSeatItem[];
  otherShowtimes: Array<{
    id: string;
    code: string;
    startTime: string;
    room: string;
    format: string;
    priceFormatted: string;
    availableSeats: number;
    totalSeats: number;
    status: string;
  }>;
  message?: string;
}

export interface BookSeatsPayload {
  showtimeId: string;
  seatCodes: string[];
  userId?: string;
  paymentMethod?: string;
  combos?: string;
}

export interface BookSeatsResponse {
  success: boolean;
  message: string;
  booking: any;
  showtime: {
    code: string;
    availableSeats: number;
    totalSeats: number;
    status: string;
  };
}


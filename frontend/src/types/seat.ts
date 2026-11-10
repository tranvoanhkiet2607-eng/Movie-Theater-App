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


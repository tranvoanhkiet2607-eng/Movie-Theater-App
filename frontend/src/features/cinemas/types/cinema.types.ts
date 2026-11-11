// Định nghĩa Types & Interfaces cho Module Cinema & Room Management

export interface Room {
  id: string;
  code: string;
  name: string;
  theaterId: string;
  format: string; // '2D Phụ đề' | '2D Lồng tiếng' | '3D Phụ đề' | 'IMAX 3D' | '4DX' | 'Gold Class VIP'
  totalSeats: number;
  rows?: number;
  cols?: number;
  status: 'active' | 'maintenance';
}

export interface Theater {
  id: string;
  code: string;
  name: string;
  shortName: string;
  area: string;
  address: string;
  distance?: string;
  hotline?: string;
  totalRooms: number;
  supportedFormats: string[];
  amenities: string[];
  rooms?: Room[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TheatersResponse {
  success: boolean;
  total: number;
  theaters: Theater[];
}

export interface TheaterDetailResponse {
  success: boolean;
  theater: Theater;
}

export interface RoomsResponse {
  success: boolean;
  total: number;
  rooms: Room[];
}

export interface TheaterFormPayload {
  code?: string;
  name: string;
  shortName: string;
  area: string;
  address: string;
  distance?: string;
  hotline?: string;
  totalRooms?: number;
  supportedFormats?: string[];
  amenities?: string[];
}

export interface RoomFormPayload {
  code?: string;
  name: string;
  format: string;
  totalSeats: number;
  rows?: number;
  cols?: number;
  status: 'active' | 'maintenance';
}

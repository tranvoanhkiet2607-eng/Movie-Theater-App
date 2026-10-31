import { FoodCategory } from './food';

export interface SelectedFoodItem {
  foodId: string;
  name: string;
  category: FoodCategory;
  price: number;
  originalPrice?: number;
  quantity: number;
  imageUrl: string;
  size?: string;
}

export type PaymentMethod = 'momo' | 'vnpay' | 'card' | 'membership' | 'counter';

export type FnbPickupStatus = 'pending' | 'prepared' | 'picked_up';

export interface TicketBookingOrder {
  id: string; // e.g. TCK-8821
  orderCode: string; // e.g. CNX-89213
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  theaterId: string;
  theaterName: string;
  roomName: string; // e.g. "Rạp 03 (IMAX)"
  showtimeDate: string; // e.g. "Hôm nay, 15/10/2025"
  showtimeTime: string; // e.g. "19:30"
  format: string; // e.g. "IMAX 3D"
  seats: string[]; // e.g. ["F08", "F09"]
  seatPriceTotal: number;
  foodItems: SelectedFoodItem[]; // Attached F&B
  foodPriceTotal: number;
  discountAmount: number;
  pointsUsed: number;
  pointsEarned: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: 'confirmed' | 'pending' | 'cancelled';
  fnbPickupStatus: FnbPickupStatus;
  createdAt: string;
  barcode: string;
}

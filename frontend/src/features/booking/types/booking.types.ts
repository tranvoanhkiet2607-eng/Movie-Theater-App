// Anh Kiệt - CE180795
// Types cho phân hệ Booking Management & Payment (UC29 đến UC36)

export type SeatType = 'standard' | 'vip' | 'couple';
export type SeatStatus = 'available' | 'selected' | 'occupied';

export interface SeatInfo {
  id: string; // e.g. "A01", "D05", "H03"
  row: string; // "A", "B", ...
  number: number; // 1, 2, ...
  type: SeatType;
  price: number;
  status: SeatStatus;
}

export interface SelectedFoodItem {
  foodId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  size?: string;
  imageUrl: string;
}

export interface PromotionInfo {
  code: string;
  title: string;
  description?: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
}

export type PaymentMethod = 'momo' | 'vnpay' | 'zalopay' | 'card' | 'counter';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface TicketBooking {
  id: string;
  bookingCode: string; // e.g. CNX-8921-3921
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Chi tiết suất chiếu & phim
  showtimeId: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  theaterId: string;
  theaterName: string;
  roomName: string;
  showtimeDate: string;
  showtimeTime: string;
  format: string;

  // Ghế đã chọn (UC29)
  seats: string[];
  seatDetails: {
    seatNumber: string;
    type: SeatType;
    price: number;
  }[];
  seatPriceTotal: number;

  // Bắp nước (UC32)
  foodItems: SelectedFoodItem[];
  foodPriceTotal: number;

  // Khuyến mãi (UC31)
  promotionCode?: string;
  discountAmount: number;

  // Tổng thanh toán (UC32)
  totalAmount: number;

  // Thanh toán (UC33)
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;

  // Trạng thái đơn (UC34, UC36)
  status: BookingStatus;
  cancelledReason?: string;
  cancelledAt?: string;

  // Vé điện tử & QR (UC35)
  barcode: string;
  qrCodeData: string;
  createdAt: string;
}

export interface CreateBookingPayload {
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  showtimeId: string;
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  theaterId: string;
  theaterName: string;
  roomName: string;
  showtimeDate: string;
  showtimeTime: string;
  format?: string;
  seats: string[];
  seatDetails: {
    seatNumber: string;
    type: SeatType;
    price: number;
  }[];
  seatPriceTotal: number;
  foodItems?: SelectedFoodItem[];
  foodPriceTotal?: number;
  promotionCode?: string;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
}


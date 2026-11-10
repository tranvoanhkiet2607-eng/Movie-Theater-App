// UC38: Order Food & Drinks & UC44: Manage Food Orders
export interface OrderTicket {
  seatNumber: string;
  seatType: string;
  price: number;
}

export interface OrderFoodItem {
  foodId?: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  orderCode: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  movie: {
    id: string;
    title: string;
    poster: string;
    ageRating: string;
  };
  theater: {
    id: string;
    name: string;
    room: string;
    showtimeDate: string;
    showtimeTime: string;
    format: string;
  };
  tickets: OrderTicket[];
  foods: OrderFoodItem[];
  subtotalTickets: number;
  subtotalFoods: number;
  promotionCode: string;
  discountAmount: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  orderStatus: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  showtimeId?: string;
  movie: {
    id: string;
    title: string;
    poster?: string;
    ageRating?: string;
  };
  theater: {
    id: string;
    name: string;
    room: string;
    showtimeDate: string;
    showtimeTime: string;
    format: string;
  };
  tickets: OrderTicket[];
  foods: OrderFoodItem[];
  promotionCode?: string;
  paymentMethod?: string;
  notes?: string;
}


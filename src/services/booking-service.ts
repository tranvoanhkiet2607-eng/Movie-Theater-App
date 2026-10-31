import AsyncStorage from '@react-native-async-storage/async-storage';
import { TicketBookingOrder } from '@/types/booking';

const BOOKINGS_STORAGE_KEY = '@movie_theater_ticket_orders_v1';

export const INITIAL_TICKET_ORDERS: TicketBookingOrder[] = [
  {
    id: 'TCK-8821',
    orderCode: 'CNX-8821-VN',
    userId: 'usr_demo_01',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    customerEmail: 'customer@cinema.com',
    movieId: 'm1',
    movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
    moviePoster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
    theaterId: 't1',
    theaterName: 'CineMax Vincom Đồng Khởi',
    roomName: 'Rạp 03 (IMAX Laser)',
    showtimeDate: 'Hôm nay',
    showtimeTime: '20:15',
    format: 'IMAX 3D',
    seats: ['F08', 'F09'],
    seatPriceTotal: 240000,
    foodItems: [
      {
        foodId: 'fnb_01',
        name: 'CineMax Solo Combo',
        category: 'combo',
        price: 85000,
        originalPrice: 105000,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=600',
        size: 'Tiêu chuẩn',
      },
      {
        foodId: 'fnb_08',
        name: 'Coca-Cola Tươi Lạnh 32oz',
        category: 'drink',
        price: 35000,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600',
        size: 'Lớn (32oz)',
      },
    ],
    foodPriceTotal: 120000,
    discountAmount: 20000,
    pointsUsed: 20,
    pointsEarned: 34,
    totalAmount: 340000,
    paymentMethod: 'momo',
    status: 'confirmed',
    fnbPickupStatus: 'pending',
    createdAt: new Date().toISOString(),
    barcode: '8936088210982',
  },
];

/**
 * Get all ticket orders from storage
 */
export async function getAllTicketOrders(): Promise<TicketBookingOrder[]> {
  try {
    const rawData = await AsyncStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!rawData) {
      await AsyncStorage.setItem(
        BOOKINGS_STORAGE_KEY,
        JSON.stringify(INITIAL_TICKET_ORDERS)
      );
      return INITIAL_TICKET_ORDERS;
    }
    const parsed: TicketBookingOrder[] = JSON.parse(rawData);
    return parsed;
  } catch (error) {
    console.error('Error loading ticket orders:', error);
    return INITIAL_TICKET_ORDERS;
  }
}

/**
 * Get ticket orders for a specific user ID
 */
export async function getTicketOrdersByUserId(
  userId?: string
): Promise<TicketBookingOrder[]> {
  const allOrders = await getAllTicketOrders();
  if (!userId) return allOrders;
  return allOrders.filter((order) => !order.userId || order.userId === userId);
}

/**
 * Get single ticket order by ID
 */
export async function getTicketOrderById(
  id: string
): Promise<TicketBookingOrder | null> {
  const allOrders = await getAllTicketOrders();
  return allOrders.find((order) => order.id === id) || null;
}

/**
 * Create a new movie ticket booking order with attached food & drinks
 */
export async function createTicketOrder(
  orderData: Omit<
    TicketBookingOrder,
    'id' | 'orderCode' | 'createdAt' | 'barcode' | 'status' | 'fnbPickupStatus'
  > &
    Partial<Pick<TicketBookingOrder, 'status' | 'fnbPickupStatus'>>
): Promise<TicketBookingOrder> {
  const allOrders = await getAllTicketOrders();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderCode = `CNX-${timestamp.toString().slice(-4)}-${randomSuffix}`;
  const barcode = `893${timestamp.toString().slice(-7)}${randomSuffix.toString().slice(-3)}`;

  const newOrder: TicketBookingOrder = {
    ...orderData,
    id: orderId,
    orderCode,
    status: orderData.status || 'confirmed',
    fnbPickupStatus: orderData.fnbPickupStatus || 'pending',
    createdAt: new Date().toISOString(),
    barcode,
  };

  const updatedOrders = [newOrder, ...allOrders];
  await AsyncStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updatedOrders));
  return newOrder;
}

/**
 * Toggle or update F&B pickup status at cinema concession counter
 */
export async function toggleFnbPickupStatus(
  orderId: string
): Promise<TicketBookingOrder> {
  const allOrders = await getAllTicketOrders();
  const index = allOrders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    throw new Error(`Không tìm thấy đơn vé với mã ${orderId}`);
  }

  const currentStatus = allOrders[index].fnbPickupStatus;
  const nextStatus = currentStatus === 'picked_up' ? 'pending' : 'picked_up';

  allOrders[index] = {
    ...allOrders[index],
    fnbPickupStatus: nextStatus,
  };

  await AsyncStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(allOrders));
  return allOrders[index];
}

/**
 * Delete a ticket order
 */
export async function deleteTicketOrder(orderId: string): Promise<boolean> {
  const allOrders = await getAllTicketOrders();
  const filtered = allOrders.filter((o) => o.id !== orderId);
  if (filtered.length === allOrders.length) return false;
  await AsyncStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Reset ticket orders back to initial mock state
 */
export async function resetDefaultTicketOrders(): Promise<TicketBookingOrder[]> {
  await AsyncStorage.setItem(
    BOOKINGS_STORAGE_KEY,
    JSON.stringify(INITIAL_TICKET_ORDERS)
  );
  return INITIAL_TICKET_ORDERS;
}

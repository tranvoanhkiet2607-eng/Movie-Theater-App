// Anh Kiệt - CE180795
// UC32: Bảng chiết tính tổng tiền vé & đồ ăn (Calculate Booking Total)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeatInfo, SelectedFoodItem, PromotionInfo } from '../types/booking.types';

interface OrderSummaryProps {
  movieTitle: string;
  theaterName: string;
  roomName: string;
  showtimeDate: string;
  showtimeTime: string;
  selectedSeats: SeatInfo[];
  selectedFoodItems: SelectedFoodItem[];
  appliedPromo: PromotionInfo | null;
  discountAmount: number;
}

export default function OrderSummary({
  movieTitle,
  theaterName,
  roomName,
  showtimeDate,
  showtimeTime,
  selectedSeats,
  selectedFoodItems,
  appliedPromo,
  discountAmount,
}: OrderSummaryProps) {
  const seatSubtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const foodSubtotal = selectedFoodItems.reduce(
    (sum, f) => sum + f.price * f.quantity,
    0
  );
  const subtotalBeforeDiscount = seatSubtotal + foodSubtotal;
  const finalTotal = Math.max(0, subtotalBeforeDiscount - discountAmount);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="receipt-outline" size={20} color="#E50914" />
        <Text style={styles.headerTitle}>Chi Tiết Thanh Toán (UC32)</Text>
      </View>

      {/* Thông tin suất chiếu vắn tắt */}
      <View style={styles.metaBox}>
        <Text style={styles.movieTitle} numberOfLines={1}>
          {movieTitle}
        </Text>
        <Text style={styles.theaterMeta}>
          {theaterName} • {roomName}
        </Text>
        <Text style={styles.timeMeta}>
          {showtimeTime} • {showtimeDate}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Chi tiết từng mục */}
      <View style={styles.lineItem}>
        <Text style={styles.itemLabel}>
          Vé xem phim ({selectedSeats.length} ghế: {selectedSeats.map((s) => s.id).join(', ')})
        </Text>
        <Text style={styles.itemValue}>{seatSubtotal.toLocaleString('vi-VN')}đ</Text>
      </View>

      {/* Danh sách bắp nước */}
      {selectedFoodItems.map((food) => (
        <View key={food.foodId} style={styles.lineItem}>
          <Text style={styles.itemSubLabel}>
            + {food.name} (x{food.quantity})
          </Text>
          <Text style={styles.itemSubValue}>
            {(food.price * food.quantity).toLocaleString('vi-VN')}đ
          </Text>
        </View>
      ))}

      {/* Khuyến mãi giảm giá */}
      {discountAmount > 0 && (
        <View style={styles.lineItem}>
          <Text style={styles.discountLabel}>
            Khuyến mãi ({appliedPromo?.code || 'Voucher'})
          </Text>
          <Text style={styles.discountValue}>
            -{discountAmount.toLocaleString('vi-VN')}đ
          </Text>
        </View>
      )}

      <View style={styles.lineItem}>
        <Text style={styles.itemSubLabel}>Phí tiện ích / VAT</Text>
        <Text style={styles.itemSubValue}>Đã bao gồm</Text>
      </View>

      <View style={styles.divider} />

      {/* Tổng thanh toán */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TỔNG CỘNG THANH TOÁN:</Text>
        <Text style={styles.totalValue}>{finalTotal.toLocaleString('vi-VN')}đ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  metaBox: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  theaterMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 2,
  },
  timeMeta: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 10,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  itemLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  itemValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    paddingLeft: 8,
    flex: 1,
  },
  itemSubValue: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  discountLabel: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  discountValue: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  totalValue: {
    color: '#E50914',
    fontSize: 20,
    fontWeight: '900',
  },
});


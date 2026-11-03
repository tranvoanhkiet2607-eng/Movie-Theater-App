// Anh Kiệt - CE180795
// UC29: Sơ đồ chọn ghế rạp chiếu phim (Seat Map)
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeatInfo, SeatType } from '../types/booking.types';

interface SeatMapProps {
  basePrice: number;
  occupiedSeats: string[];
  selectedSeats: SeatInfo[];
  onToggleSeat: (seat: SeatInfo) => void;
  maxSeats?: number;
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SEATS_PER_ROW = 10;

export default function SeatMap({
  basePrice = 90000,
  occupiedSeats = [],
  selectedSeats = [],
  onToggleSeat,
  maxSeats = 8,
}: SeatMapProps) {
  // Sinh danh sách ghế của phòng chiếu
  const layout = useMemo(() => {
    const grid: SeatInfo[][] = [];

    ROWS.forEach((row) => {
      const rowSeats: SeatInfo[] = [];
      const isCoupleRow = row === 'H';
      const isVipRow = ['D', 'E', 'F', 'G'].includes(row);

      const count = isCoupleRow ? 8 : SEATS_PER_ROW;

      for (let i = 1; i <= count; i++) {
        const id = `${row}${String(i).padStart(2, '0')}`;
        let type: SeatType = 'standard';
        let price = Number(basePrice);

        if (isCoupleRow) {
          type = 'couple';
          price = Math.round(Number(basePrice) * 1.8);
        } else if (isVipRow) {
          type = 'vip';
          price = Number(basePrice) + 20000;
        }

        const isOccupied = occupiedSeats.includes(id);
        const isSelected = selectedSeats.some((s) => s.id === id);

        rowSeats.push({
          id,
          row,
          number: i,
          type,
          price,
          status: isOccupied ? 'occupied' : isSelected ? 'selected' : 'available',
        });
      }
      grid.push(rowSeats);
    });

    return grid;
  }, [basePrice, occupiedSeats, selectedSeats]);

  const getSeatColor = (seat: SeatInfo) => {
    if (seat.status === 'occupied') return '#374151'; // Xám tối: Đã bán
    if (seat.status === 'selected') return '#E50914'; // Đỏ nổi bật: Đang chọn
    if (seat.type === 'couple') return '#EC4899'; // Hồng: Ghế đôi
    if (seat.type === 'vip') return '#F59E0B'; // Vàng hổ phách: VIP
    return '#4B5563'; // Xám: Thường
  };

  return (
    <View style={styles.container}>
      {/* Mô phỏng Màn Hình Chiếu Cong */}
      <View style={styles.screenWrapper}>
        <View style={styles.screenCurve} />
        <Text style={styles.screenText}>MÀN HÌNH / SCREEN</Text>
      </View>

      {/* Lưới Sơ Đồ Ghế */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {layout.map((rowSeats, rowIndex) => {
            const rowLabel = ROWS[rowIndex];
            const isCoupleRow = rowLabel === 'H';

            return (
              <View key={rowLabel} style={styles.row}>
                <Text style={styles.rowLabel}>{rowLabel}</Text>

                <View style={styles.seatRowWrapper}>
                  {rowSeats.map((seat) => {
                    const isOccupied = seat.status === 'occupied';
                    const isSelected = seat.status === 'selected';

                    return (
                      <TouchableOpacity
                        key={seat.id}
                        disabled={isOccupied}
                        activeOpacity={0.7}
                        onPress={() => onToggleSeat(seat)}
                        style={[
                          styles.seat,
                          isCoupleRow && styles.coupleSeat,
                          {
                            backgroundColor: getSeatColor(seat),
                            borderColor: isSelected ? '#FFFFFF' : 'transparent',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.seatText,
                            isSelected && styles.seatTextSelected,
                            isOccupied && styles.seatTextOccupied,
                          ]}>
                          {seat.number}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.rowLabel}>{rowLabel}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Chú thích màu sắc ghế (Legend) */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#4B5563' }]} />
          <Text style={styles.legendText}>Ghế thường</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Ghế VIP</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#EC4899' }]} />
          <Text style={styles.legendText}>Ghế đôi</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#E50914' }]} />
          <Text style={styles.legendText}>Đang chọn</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#374151' }]} />
          <Text style={styles.legendText}>Đã bán</Text>
        </View>
      </View>

      {/* Thanh hiển thị ghế đã chọn */}
      <View style={styles.selectedSummaryBox}>
        <View style={styles.selectedSummaryRow}>
          <Text style={styles.summaryTitle}>
            Ghế đã chọn ({selectedSeats.length}/{maxSeats}):
          </Text>
          <Text style={styles.summarySeatsText}>
            {selectedSeats.length > 0
              ? selectedSeats.map((s) => s.id).join(', ')
              : 'Chưa chọn ghế'}
          </Text>
        </View>

        {selectedSeats.length > 0 && (
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Tiền vé tạm tính:</Text>
            <Text style={styles.subtotalPrice}>
              {selectedSeats
                .reduce((acc, s) => acc + s.price, 0)
                .toLocaleString('vi-VN')}
              đ
            </Text>
          </View>
        )}
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
  screenWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  screenCurve: {
    width: '85%',
    height: 6,
    backgroundColor: '#E50914',
    borderRadius: 10,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  screenText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  gridContainer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  rowLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  seatRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  seat: {
    width: 26,
    height: 26,
    borderRadius: 6,
    marginHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  coupleSeat: {
    width: 36,
    borderRadius: 8,
  },
  seatText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  seatTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  seatTextOccupied: {
    color: '#6B7280',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
  },
  selectedSummaryBox: {
    marginTop: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  selectedSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  summarySeatsText: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '700',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  subtotalLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  subtotalPrice: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '800',
  },
});


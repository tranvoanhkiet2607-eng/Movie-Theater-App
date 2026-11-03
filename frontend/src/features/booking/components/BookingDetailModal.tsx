// Anh Kiệt - CE180795
// UC30: Xem chi tiết đơn vé (View Booking Details)
// UC34: Hủy đặt vé theo quy định (Cancel Booking)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TicketBooking } from '../types/booking.types';
import { BookingAPI } from '../services/bookingApi';

interface BookingDetailModalProps {
  visible: boolean;
  booking: TicketBooking | null;
  onClose: () => void;
  onOpenETicket?: (booking: TicketBooking) => void;
  onBookingCancelled?: (updatedBooking: TicketBooking) => void;
}

export default function BookingDetailModal({
  visible,
  booking,
  onClose,
  onOpenETicket,
  onBookingCancelled,
}: BookingDetailModalProps) {
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  if (!booking) return null;

  const handleCancelPress = () => {
    Alert.alert(
      'Xác nhận hủy đặt vé',
      `Bạn có chắc chắn muốn hủy đơn vé [${booking.bookingCode}]?\n\nQuy định: Vé chỉ được hủy trước giờ chiếu ít nhất 60 phút. Ghế [${booking.seats.join(', ')}] sẽ được giải phóng lại trên hệ thống.`,
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Đồng ý hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              const res = await BookingAPI.cancelBooking(
                booking.id || booking.bookingCode,
                'Khách hàng thao tác hủy vé trên ứng dụng'
              );

              if (res.success && res.booking) {
                Alert.alert('Thành công', res.message);
                if (onBookingCancelled) {
                  onBookingCancelled(res.booking);
                }
                onClose();
              }
            } catch (err: any) {
              Alert.alert('Không thể hủy vé', err.message || 'Lỗi khi xử lý hủy vé.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Chi Tiết Đơn Vé (UC30)</Text>
              <Text style={styles.bookingCode}>Mã: {booking.bookingCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Trạng thái đơn vé */}
            <View
              style={[
                styles.statusBanner,
                isCancelled && styles.statusBannerCancelled,
                isCompleted && styles.statusBannerCompleted,
              ]}>
              <Ionicons
                name={
                  isCancelled
                    ? 'close-circle'
                    : isCompleted
                    ? 'checkmark-done-circle'
                    : 'checkmark-circle'
                }
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.statusBannerText}>
                {isCancelled
                  ? `ĐÃ HỦY VÉ (${booking.cancelledReason || 'Theo quy định rạp'})`
                  : isCompleted
                  ? 'ĐÃ SỬ DỤNG (HOÀN TẤT)'
                  : 'VÉ HỢP LỆ (SẴN SÀNG CHECK-IN)'}
              </Text>
            </View>

            {/* Thông tin phim & rạp */}
            <View style={styles.sectionCard}>
              <Text style={styles.movieTitle}>{booking.movieTitle}</Text>
              <Text style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color="#E50914" />{' '}
                {booking.theaterName} • {booking.roomName}
              </Text>
              <Text style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color="#F59E0B" />{' '}
                {booking.showtimeTime} — {booking.showtimeDate}
              </Text>
              <Text style={styles.metaRow}>
                <Ionicons name="film-outline" size={14} color="#9CA3AF" /> Định dạng:{' '}
                {booking.format}
              </Text>
            </View>

            {/* Thông tin ghế & khách hàng */}
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Khách hàng:</Text>
                <Text style={styles.infoValue}>{booking.customerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số điện thoại:</Text>
                <Text style={styles.infoValue}>{booking.customerPhone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ghế đã chọn:</Text>
                <Text style={[styles.infoValue, styles.seatsValue]}>
                  {booking.seats.join(', ')} ({booking.seats.length} ghế)
                </Text>
              </View>
            </View>

            {/* Bắp nước đính kèm nếu có */}
            {booking.foodItems && booking.foodItems.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.cardHeader}>Combo Bắp Nước:</Text>
                {booking.foodItems.map((f, i) => (
                  <View key={i} style={styles.foodRow}>
                    <Text style={styles.foodName}>
                      {f.name} x{f.quantity}
                    </Text>
                    <Text style={styles.foodPrice}>
                      {(f.price * f.quantity).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Chi tiết thanh toán */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeader}>Chi Tiết Thanh Toán:</Text>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Tiền vé ({booking.seats.length} ghế):</Text>
                <Text style={styles.payValue}>
                  {booking.seatPriceTotal.toLocaleString('vi-VN')}đ
                </Text>
              </View>

              {booking.foodPriceTotal > 0 && (
                <View style={styles.payRow}>
                  <Text style={styles.payLabel}>Tiền bắp nước:</Text>
                  <Text style={styles.payValue}>
                    {booking.foodPriceTotal.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}

              {booking.discountAmount > 0 && (
                <View style={styles.payRow}>
                  <Text style={styles.discountLabel}>
                    Voucher ({booking.promotionCode || 'KM'}):
                  </Text>
                  <Text style={styles.discountValue}>
                    -{booking.discountAmount.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}

              <View style={styles.payDivider} />

              <View style={styles.payRow}>
                <Text style={styles.totalLabel}>TỔNG TIỀN:</Text>
                <Text style={styles.totalValue}>
                  {booking.totalAmount.toLocaleString('vi-VN')}đ
                </Text>
              </View>

              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Phương thức:</Text>
                <Text style={styles.methodValue}>
                  {booking.paymentMethod.toUpperCase()} (Đã thanh toán)
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footerRow}>
            {/* Nút xem E-Ticket / QR Code (UC35) */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                if (onOpenETicket) onOpenETicket(booking);
              }}
              style={styles.qrBtn}
              activeOpacity={0.85}>
              <Ionicons name="qr-code" size={18} color="#FFFFFF" />
              <Text style={styles.qrBtnText}>Vé Điện Tử / QR</Text>
            </TouchableOpacity>

            {/* Nút Hủy Vé (UC34) */}
            {!isCancelled && !isCompleted && (
              <TouchableOpacity
                onPress={handleCancelPress}
                disabled={isCancelling}
                style={[styles.cancelBtn, isCancelling && styles.cancelBtnDisabled]}
                activeOpacity={0.85}>
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.cancelBtnText}>Hủy Vé (UC34)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  bookingCode: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    gap: 12,
    paddingBottom: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 12,
  },
  statusBannerCancelled: {
    backgroundColor: '#7F1D1D',
  },
  statusBannerCompleted: {
    backgroundColor: '#1E3A8A',
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  metaRow: {
    color: '#D1D5DB',
    fontSize: 12,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  seatsValue: {
    color: '#E50914',
    fontWeight: '800',
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  foodName: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  foodPrice: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  payLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  payValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  discountLabel: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  discountValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  payDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    color: '#E50914',
    fontSize: 18,
    fontWeight: '900',
  },
  methodValue: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  qrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    height: 46,
    gap: 6,
  },
  qrBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    height: 46,
    gap: 6,
  },
  cancelBtnDisabled: {
    backgroundColor: '#6B7280',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});


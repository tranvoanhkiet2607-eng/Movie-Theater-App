// Anh Kiệt - CE180795
// UC35: Tạo vé điện tử và mã QR sau khi thanh toán thành công (Generate E-Ticket)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TicketBooking } from '../types/booking.types';

interface ETicketModalProps {
  visible: boolean;
  booking: TicketBooking | null;
  onClose: () => void;
  onDone?: () => void;
}

export default function ETicketModal({
  visible,
  booking,
  onClose,
  onDone,
}: ETicketModalProps) {
  if (!booking) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    booking.bookingCode
  )}`;

  const handleSaveTicket = () => {
    Alert.alert(
      'Lưu vé thành công',
      `Mã vé [${booking.bookingCode}] đã được lưu vào mục "Vé của tôi" trong hồ sơ tài khoản. Bạn có thể mở lại bất cứ lúc nào khi đến rạp!`,
      [{ text: 'Đồng ý' }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>VÉ ĐIỆN TỬ (UC35)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Thẻ Vé Điện Tử (Cinema Pass) */}
            <View style={styles.ticketCard}>
              {/* Header vé */}
              <View style={styles.ticketHeader}>
                <View style={styles.cinemaBadge}>
                  <Ionicons name="film" size={16} color="#FFFFFF" />
                  <Text style={styles.cinemaName}>CINEMAX TICKET</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    booking.status === 'confirmed' && styles.statusConfirmed,
                    booking.status === 'cancelled' && styles.statusCancelled,
                  ]}>
                  <Text style={styles.statusText}>
                    {booking.status === 'confirmed'
                      ? 'ĐÃ XÁC NHẬN'
                      : booking.status === 'cancelled'
                      ? 'ĐÃ HỦY'
                      : 'HOÀN TẤT'}
                  </Text>
                </View>
              </View>

              {/* Thông tin phim */}
              <View style={styles.movieSection}>
                {booking.moviePoster ? (
                  <Image source={{ uri: booking.moviePoster }} style={styles.poster} />
                ) : null}
                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle} numberOfLines={2}>
                    {booking.movieTitle}
                  </Text>
                  <View style={styles.formatTag}>
                    <Text style={styles.formatText}>{booking.format || '2D Phụ đề'}</Text>
                  </View>
                  <Text style={styles.theaterText}>{booking.theaterName}</Text>
                  <Text style={styles.roomText}>{booking.roomName}</Text>
                </View>
              </View>

              {/* Đường cắt vé (Tear-off line với 2 vết khuyết bên cạnh) */}
              <View style={styles.perforationRow}>
                <View style={[styles.notch, styles.notchLeft]} />
                <View style={styles.dashedLine} />
                <View style={[styles.notch, styles.notchRight]} />
              </View>

              {/* Chi tiết suất & ghế */}
              <View style={styles.detailsGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>NGÀY CHIẾU</Text>
                  <Text style={styles.gridValue}>{booking.showtimeDate}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>GIỜ CHIẾU</Text>
                  <Text style={[styles.gridValue, styles.timeHighlight]}>
                    {booking.showtimeTime}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>GHẾ NGỒI</Text>
                  <Text style={[styles.gridValue, styles.seatsHighlight]}>
                    {booking.seats.join(', ')}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>TỔNG TIỀN</Text>
                  <Text style={styles.gridValue}>
                    {booking.totalAmount.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>

              {/* Bắp nước đính kèm nếu có */}
              {booking.foodItems && booking.foodItems.length > 0 && (
                <View style={styles.foodSection}>
                  <Text style={styles.foodTitle}>Combo bắp nước đính kèm:</Text>
                  {booking.foodItems.map((f, i) => (
                    <Text key={i} style={styles.foodItemText}>
                      • {f.name} (x{f.quantity})
                    </Text>
                  ))}
                </View>
              )}

              {/* Mã QR Code & Barcode */}
              <View style={styles.qrSection}>
                <View style={styles.qrBox}>
                  <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                </View>
                <Text style={styles.bookingCodeText}>MÃ VÉ: {booking.bookingCode}</Text>
                <Text style={styles.barcodeText}>||| | |||| | ||| || |||| | |</Text>
                <Text style={styles.barcodeNumber}>{booking.barcode}</Text>
                <Text style={styles.qrHint}>
                  Vui lòng xuất trình mã này tại cổng soát vé hoặc máy in vé tự động tại rạp.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSaveTicket}
              style={styles.saveBtn}
              activeOpacity={0.8}>
              <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Lưu Vé</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDone || onClose}
              style={styles.doneBtn}
              activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topBarTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  ticketCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cinemaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cinemaName: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  statusConfirmed: {
    backgroundColor: '#064E3B',
  },
  statusCancelled: {
    backgroundColor: '#7F1D1D',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  movieSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  movieInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  formatTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  formatText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  theaterText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  roomText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    position: 'relative',
  },
  notch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111827',
    position: 'absolute',
  },
  notchLeft: {
    left: -10,
  },
  notchRight: {
    right: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#4B5563',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  gridItem: {
    width: '45%',
  },
  gridLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gridValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  timeHighlight: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '900',
  },
  seatsHighlight: {
    color: '#E50914',
    fontSize: 15,
    fontWeight: '900',
  },
  foodSection: {
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  foodTitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  foodItemText: {
    color: '#D1D5DB',
    fontSize: 11,
  },
  qrSection: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  qrImage: {
    width: 140,
    height: 140,
  },
  bookingCodeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  barcodeText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 4,
  },
  barcodeNumber: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 2,
  },
  qrHint: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    height: 44,
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    borderRadius: 12,
    height: 44,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});


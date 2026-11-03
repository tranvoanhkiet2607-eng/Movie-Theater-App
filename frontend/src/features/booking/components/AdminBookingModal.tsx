// Anh Kiệt - CE180795
// UC36: Quản trị viên tìm kiếm và quản lý đơn đặt vé (Manage Bookings)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TicketBooking, BookingStatus } from '../types/booking.types';
import { BookingAPI } from '../services/bookingApi';

interface AdminBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBooking?: (booking: TicketBooking) => void;
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'completed', label: 'Đã soát vé' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export default function AdminBookingModal({
  visible,
  onClose,
  onSelectBooking,
}: AdminBookingModalProps) {
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [bookings, setBookings] = useState<TicketBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await BookingAPI.getAllBookingsAdmin({
        search,
        status,
        limit: 50,
      });
      if (res.success) {
        setBookings(res.bookings || []);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh sách quản trị vé:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    if (visible) {
      fetchBookings();
    }
  }, [visible, fetchBookings]);

  const handleUpdateStatus = (booking: TicketBooking, newStatus: BookingStatus) => {
    const actionLabel =
      newStatus === 'completed' ? 'Soát vé (Check-in)' : 'Hủy đơn vé';

    Alert.alert(
      `Xác nhận ${actionLabel}`,
      `Bạn có chắc muốn cập nhật trạng thái đơn [${booking.bookingCode}] sang "${newStatus}"?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: newStatus === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await BookingAPI.updateBookingStatusAdmin(
                booking.id || booking.bookingCode,
                newStatus,
                'Quản trị viên thao tác trên bảng điều khiển'
              );
              if (res.success) {
                Alert.alert('Thành công', res.message);
                fetchBookings();
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  const renderBookingItem = ({ item }: { item: TicketBooking }) => {
    const isCancelled = item.status === 'cancelled';
    const isCompleted = item.status === 'completed';

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.codeWrap}>
            <Text style={styles.cardCode}>{item.bookingCode}</Text>
            <Text style={styles.cardTime}>
              {item.showtimeTime} • {item.showtimeDate}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              isCancelled
                ? styles.badgeCancelled
                : isCompleted
                ? styles.badgeCompleted
                : styles.badgeConfirmed,
            ]}>
            <Text style={styles.badgeText}>
              {isCancelled ? 'ĐÃ HỦY' : isCompleted ? 'HOÀN TẤT' : 'ĐÃ XÁC NHẬN'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardMovie} numberOfLines={1}>
          {item.movieTitle}
        </Text>
        <Text style={styles.cardMeta}>
          {item.theaterName} • {item.roomName}
        </Text>

        <View style={styles.cardClientRow}>
          <Text style={styles.cardClient}>
            👤 {item.customerName} ({item.customerPhone})
          </Text>
          <Text style={styles.cardSeats}>
            Ghế: <Text style={styles.seatsHighlight}>{item.seats.join(', ')}</Text>
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardTotal}>
            {item.totalAmount.toLocaleString('vi-VN')}đ
          </Text>

          <View style={styles.actionsWrap}>
            {/* Nút soát vé */}
            {!isCompleted && !isCancelled && (
              <TouchableOpacity
                onPress={() => handleUpdateStatus(item, 'completed')}
                style={styles.checkInBtn}
                activeOpacity={0.8}>
                <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
                <Text style={styles.btnText}>Soát vé</Text>
              </TouchableOpacity>
            )}

            {/* Nút hủy vé admin */}
            {!isCancelled && (
              <TouchableOpacity
                onPress={() => handleUpdateStatus(item, 'cancelled')}
                style={styles.adminCancelBtn}
                activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Quản Lý Đặt Vé (UC36)</Text>
              <Text style={styles.headerSubtitle}>
                Tổng cộng: {totalCount} đơn vé trong hệ thống
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã vé, SĐT, tên khách, phim..."
              placeholderTextColor="#6B7280"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Status Tabs */}
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setStatus(f.key)}
                style={[
                  styles.filterTab,
                  status === f.key && styles.filterTabActive,
                ]}>
                <Text
                  style={[
                    styles.filterTabText,
                    status === f.key && styles.filterTabTextActive,
                  ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Danh sách vé */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Đang tải danh sách đơn vé...</Text>
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id || item.bookingCode}
              renderItem={renderBookingItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={48} color="#4B5563" />
                  <Text style={styles.emptyText}>Không tìm thấy đơn vé nào phù hợp.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    height: '92%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterTabActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterTabText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  codeWrap: {
    flex: 1,
  },
  cardCode: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTime: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeConfirmed: {
    backgroundColor: '#064E3B',
  },
  badgeCompleted: {
    backgroundColor: '#1E3A8A',
  },
  badgeCancelled: {
    backgroundColor: '#7F1D1D',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cardMovie: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 8,
  },
  cardClientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardClient: {
    color: '#D1D5DB',
    fontSize: 11,
  },
  cardSeats: {
    color: '#D1D5DB',
    fontSize: 11,
  },
  seatsHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  cardTotal: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '800',
  },
  actionsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  adminCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
  },
});


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookingItem } from '@/types/auth';
import { BookingAPI } from '@/services/api';

interface BookingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string;
  onBookingAdded?: (newPoints: number) => void;
}

// Fallback mock bookings
const INITIAL_MOCK_BOOKINGS: { upcoming: BookingItem[]; past: BookingItem[] } = {
  upcoming: [
    {
      id: 'bkg_1',
      bookingCode: 'CNM-882194',
      movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
      moviePoster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
      cinemaName: 'CineMax Vincom Đồng Khởi',
      hallName: 'Rạp 03 (IMAX Laser)',
      showtime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      format: 'IMAX 3D Laser',
      seats: ['F08', 'F09'],
      seatType: 'VIP',
      combos: '1 Bắp phô mai lớn + 2 Coca Cola Zero',
      totalAmount: 380000,
      paymentMethod: 'Ví MoMo',
      paymentStatus: 'paid',
      status: 'upcoming',
      qrCodeData: 'CINEMAX-TICKET-F08F09-882194',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bkg_2',
      bookingCode: 'CNM-542109',
      movieTitle: 'Deadpool & Wolverine',
      moviePoster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
      cinemaName: 'CineMax Landmark 81',
      hallName: 'Rạp Gold Class 01',
      showtime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      format: '2D VIP Luxury',
      seats: ['H05', 'H06'],
      seatType: 'Sweetbox',
      combos: '1 Combo Bắp Caramel + 2 Nước ép đào',
      totalAmount: 420000,
      paymentMethod: 'Thẻ tín dụng Visa',
      paymentStatus: 'paid',
      status: 'upcoming',
      qrCodeData: 'CINEMAX-TICKET-H05H06-542109',
      createdAt: new Date().toISOString(),
    },
  ],
  past: [
    {
      id: 'bkg_3',
      bookingCode: 'CNM-319482',
      movieTitle: 'Godzilla x Kong: Đế Chế Mới',
      moviePoster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
      cinemaName: 'CineMax Crescent Mall',
      hallName: 'Rạp 02',
      showtime: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      format: '2D Phụ đề',
      seats: ['G12', 'G13'],
      seatType: 'Standard',
      combos: '1 Bắp bơ ngọt + 1 Sprite',
      totalAmount: 220000,
      paymentMethod: 'Ví MoMo',
      paymentStatus: 'paid',
      status: 'completed',
      qrCodeData: 'CINEMAX-TICKET-G12G13-319482',
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'bkg_4',
      bookingCode: 'CNM-102934',
      movieTitle: 'Kung Fu Panda 4',
      moviePoster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500',
      cinemaName: 'CineMax Landmark 81',
      hallName: 'Rạp 04',
      showtime: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      format: '2D Lồng tiếng',
      seats: ['E05'],
      seatType: 'Standard',
      combos: '',
      totalAmount: 95000,
      paymentMethod: 'ZaloPay',
      paymentStatus: 'refunded',
      status: 'cancelled',
      qrCodeData: 'CINEMAX-TICKET-E05-102934',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    },
  ],
};

export function BookingHistoryModal({
  visible,
  onClose,
  token,
  onBookingAdded,
}: BookingHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [upcomingList, setUpcomingList] = useState<BookingItem[]>(INITIAL_MOCK_BOOKINGS.upcoming);
  const [pastList, setPastList] = useState<BookingItem[]>(INITIAL_MOCK_BOOKINGS.past);
  const [isLoading, setIsLoading] = useState(false);

  // E-ticket modal state
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<BookingItem | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!visible || !token) return;

    BookingAPI.getMyBookings(token)
      .then((res) => {
        if (!isCancelled && res.success) {
          if (res.upcoming) setUpcomingList(res.upcoming);
          if (res.past) setPastList(res.past);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [visible, token]);

  // Cancel upcoming booking (UC09)
  const handleCancelBooking = (booking: BookingItem) => {
    Alert.alert(
      'Xác nhận hủy vé',
      `Bạn có chắc muốn hủy vé [${booking.bookingCode}] - ${booking.movieTitle}? Tiền vé (${booking.totalAmount.toLocaleString('vi-VN')}đ) sẽ được hoàn lại tự động.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Đồng ý hủy vé',
          style: 'destructive',
          onPress: async () => {
            if (token) {
              try {
                await BookingAPI.cancelBooking(token, booking.id);
              } catch {
                // fall through to local update
              }
            }

            const cancelledItem: BookingItem = {
              ...booking,
              status: 'cancelled',
              paymentStatus: 'refunded',
            };

            setUpcomingList((prev) => prev.filter((b) => b.id !== booking.id));
            setPastList((prev) => [cancelledItem, ...prev]);

            Alert.alert(
              'Đã hủy vé thành công',
              `Vé ${booking.bookingCode} đã được chuyển sang lịch sử vé đã hủy và hoàn tiền.`
            );
          },
        },
      ]
    );
  };

  // Open E-Ticket modal
  const handleOpenTicket = (booking: BookingItem) => {
    setSelectedTicket(booking);
    setTicketModalVisible(true);
  };

  // Simulate creating a new booking (quick test feature)
  const handleSimulateNewBooking = async () => {
    const movieOptions = [
      {
        title: 'Joker: Folie à Deux',
        poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500',
        cinema: 'CineMax Vincom Đồng Khởi',
        hall: 'Rạp 02 (Dolby Atmos)',
        format: '2D Phụ đề',
        seats: ['G06', 'G07'],
        total: 240000,
      },
      {
        title: 'Avatar: Dòng Chảy Của Nước',
        poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
        cinema: 'CineMax Landmark 81',
        hall: 'Rạp 03 (IMAX 3D)',
        format: 'IMAX 3D',
        seats: ['F10', 'F11'],
        total: 360000,
      },
    ];

    const pick = movieOptions[Math.floor(Math.random() * movieOptions.length)];
    const code = `CNM-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTicket: BookingItem = {
      id: `bkg_${Date.now()}`,
      bookingCode: code,
      movieTitle: pick.title,
      moviePoster: pick.poster,
      cinemaName: pick.cinema,
      hallName: pick.hall,
      showtime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      format: pick.format,
      seats: pick.seats,
      seatType: 'VIP',
      combos: '1 Bắp ngọt lớn + 2 Coca',
      totalAmount: pick.total,
      paymentMethod: 'Ví MoMo',
      paymentStatus: 'paid',
      status: 'upcoming',
      qrCodeData: `CINEMAX-TICKET-${code}`,
      createdAt: new Date().toISOString(),
    };

    if (token) {
      try {
        const res = await BookingAPI.createBooking(token, newTicket);
        if (res.loyaltyPoints && onBookingAdded) {
          onBookingAdded(res.loyaltyPoints);
        }
      } catch {
        // Local update fallback
      }
    }

    setUpcomingList((prev) => [newTicket, ...prev]);
    Alert.alert(
      'Đặt vé thành công!',
      `Đã tạo vé mới: [${code}] - ${newTicket.movieTitle}. Bạn đã nhận thêm điểm thưởng hội viên!`
    );
  };

  const formatShowtime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${hours}:${mins} • ${day}/${month}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.ticketBadgeIcon}>
              <Ionicons name="ticket" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Vé & Lịch Sử Đặt Vé</Text>
              <Text style={styles.headerSubtitle}>Lịch sử đặt vé & Vé điện tử</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
            onPress={() => setActiveTab('upcoming')}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={activeTab === 'upcoming' ? '#FFFFFF' : '#9CA3AF'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Vé sắp sử dụng ({upcomingList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}>
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === 'history' ? '#FFFFFF' : '#9CA3AF'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Lịch sử đặt vé ({pastList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Button: Simulate quick booking */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            style={styles.simulateBookingBtn}
            onPress={handleSimulateNewBooking}
            activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={16} color="#E50914" />
            <Text style={styles.simulateBookingText}>+ Mô phỏng đặt vé mới (Tích điểm ngay)</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollList}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E50914" size="large" />
              <Text style={styles.loadingText}>Đang tải dữ liệu vé...</Text>
            </View>
          ) : activeTab === 'upcoming' ? (
            // ─── TAB 1: UPCOMING TICKETS ──────────────────────────────────
            upcomingList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="ticket-outline" size={54} color="#4B5563" />
                <Text style={styles.emptyTitle}>Chưa có vé xem phim sắp chiếu</Text>
                <Text style={styles.emptyDesc}>
                  Hãy chọn phim yêu thích tại Trang chủ hoặc bấm &quot;Mô phỏng đặt vé&quot; để thử nghiệm.
                </Text>
              </View>
            ) : (
              upcomingList.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  {/* Card Top: Poster & Info */}
                  <View style={styles.cardMain}>
                    <Image
                      source={{ uri: ticket.moviePoster }}
                      style={styles.moviePoster}
                      resizeMode="cover"
                    />

                    <View style={styles.cardDetails}>
                      <View style={styles.codeRow}>
                        <View style={styles.upcomingBadge}>
                          <Text style={styles.upcomingBadgeText}>SẮP CHIẾU</Text>
                        </View>
                        <Text style={styles.bookingCodeText}>Mã: {ticket.bookingCode}</Text>
                      </View>

                      <Text style={styles.movieTitle} numberOfLines={2}>
                        {ticket.movieTitle}
                      </Text>

                      <View style={styles.infoLine}>
                        <Ionicons name="film-outline" size={13} color="#E50914" />
                        <Text style={styles.formatText}>{ticket.format}</Text>
                      </View>

                      <View style={styles.infoLine}>
                        <Ionicons name="business-outline" size={13} color="#9CA3AF" />
                        <Text style={styles.cinemaText} numberOfLines={1}>
                          {ticket.cinemaName}
                        </Text>
                      </View>

                      <View style={styles.infoLine}>
                        <Ionicons name="time-outline" size={13} color="#F59E0B" />
                        <Text style={styles.showtimeText}>
                          {formatShowtime(ticket.showtime)}
                        </Text>
                      </View>

                      <View style={styles.seatRow}>
                        <Text style={styles.hallTag}>{ticket.hallName}</Text>
                        <Text style={styles.seatTag}>Ghế: {ticket.seats.join(', ')}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Combo Info if present */}
                  {Boolean(ticket.combos) && (
                    <View style={styles.comboBanner}>
                      <Ionicons name="fast-food-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                      <Text style={styles.comboText} numberOfLines={1}>
                        Bắp nước: {ticket.combos}
                      </Text>
                    </View>
                  )}

                  {/* Card Bottom: Actions */}
                  <View style={styles.ticketActionsRow}>
                    <TouchableOpacity
                      style={styles.cancelTicketBtn}
                      onPress={() => handleCancelBooking(ticket)}
                      activeOpacity={0.8}>
                      <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                      <Text style={styles.cancelTicketText}>Hủy vé</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.openTicketBtn}
                      onPress={() => handleOpenTicket(ticket)}
                      activeOpacity={0.85}>
                      <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.openTicketText}>Xem Vé & Mã QR Vào Rạp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            // ─── TAB 2: HISTORY TICKETS ───────────────────────────────────
            pastList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="hourglass-outline" size={54} color="#4B5563" />
                <Text style={styles.emptyTitle}>Chưa có lịch sử đặt vé nào</Text>
                <Text style={styles.emptyDesc}>Các vé đã xem hoặc đã hủy sẽ hiển thị tại đây.</Text>
              </View>
            ) : (
              pastList.map((ticket) => {
                const isCancelled = ticket.status === 'cancelled';
                return (
                  <View
                    key={ticket.id}
                    style={[
                      styles.historyCard,
                      isCancelled && styles.historyCardCancelled,
                    ]}>
                    <View style={styles.historyTopRow}>
                      <View>
                        <Text style={styles.historyCode}>Mã vé: {ticket.bookingCode}</Text>
                        <Text style={styles.historyMovieTitle}>{ticket.movieTitle}</Text>
                      </View>

                      <View
                        style={[
                          styles.historyStatusBadge,
                          { backgroundColor: isCancelled ? '#7F1D1D' : '#064E3B' },
                        ]}>
                        <Text
                          style={[
                            styles.historyStatusText,
                            { color: isCancelled ? '#FCA5A5' : '#34D399' },
                          ]}>
                          {isCancelled ? 'Đã hủy' : 'Đã xem'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyMetaRow}>
                      <Text style={styles.historyCinema}>{ticket.cinemaName} • {ticket.hallName}</Text>
                      <Text style={styles.historyShowtime}>Suất: {formatShowtime(ticket.showtime)}</Text>
                      <Text style={styles.historySeats}>Ghế: {ticket.seats.join(', ')} ({ticket.seatType})</Text>
                    </View>

                    <View style={styles.historyBottomRow}>
                      <View>
                        <Text style={styles.historyPriceLabel}>Tổng thanh toán:</Text>
                        <Text style={styles.historyPrice}>
                          {ticket.totalAmount.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyPayMethod}>{ticket.paymentMethod}</Text>
                        <Text style={styles.historyPayStatus}>
                          {ticket.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Đã thanh toán'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )
          )}
        </ScrollView>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SUB-MODAL: Digital E-Ticket with QR Code & Barcode */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Modal
          visible={ticketModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setTicketModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.eTicketWrapper}>
              {/* Ticket Top Edge Notch */}
              <View style={styles.ticketTopHeader}>
                <View style={styles.ticketBrandRow}>
                  <Ionicons name="film" size={18} color="#E50914" />
                  <Text style={styles.ticketBrandText}>CINEMAX E-TICKET</Text>
                </View>
                <TouchableOpacity onPress={() => setTicketModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {selectedTicket && (
                <ScrollView contentContainerStyle={styles.ticketBody}>
                  {/* Movie Info */}
                  <Text style={styles.eTicketMovieTitle}>{selectedTicket.movieTitle}</Text>
                  <Text style={styles.eTicketFormat}>{selectedTicket.format}</Text>

                  {/* Cinema & Time */}
                  <View style={styles.eTicketInfoGrid}>
                    <View style={styles.eTicketGridItem}>
                      <Text style={styles.eTicketLabel}>RẠP CHIẾU</Text>
                      <Text style={styles.eTicketValue}>{selectedTicket.cinemaName}</Text>
                    </View>

                    <View style={styles.eTicketGridItem}>
                      <Text style={styles.eTicketLabel}>PHÒNG CHIẾU</Text>
                      <Text style={styles.eTicketValue}>{selectedTicket.hallName}</Text>
                    </View>

                    <View style={styles.eTicketGridItem}>
                      <Text style={styles.eTicketLabel}>GIỜ CHIẾU</Text>
                      <Text style={styles.eTicketValueHigh}>
                        {formatShowtime(selectedTicket.showtime)}
                      </Text>
                    </View>

                    <View style={styles.eTicketGridItem}>
                      <Text style={styles.eTicketLabel}>GHẾ NGỒI</Text>
                      <Text style={styles.eTicketValueHigh}>
                        {selectedTicket.seats.join(', ')} ({selectedTicket.seatType})
                      </Text>
                    </View>
                  </View>

                  {/* Perforated Divider */}
                  <View style={styles.perforatedLine}>
                    <View style={styles.notchLeft} />
                    <View style={styles.dashedLine} />
                    <View style={styles.notchRight} />
                  </View>

                  {/* QR Code Simulation */}
                  <View style={styles.qrSection}>
                    <Text style={styles.qrNotice}>QUÉT MÃ VÀO CỔNG SOÁT VÉ</Text>
                    <View style={styles.qrBox}>
                      {/* Simulated QR Code matrix grid */}
                      <View style={styles.qrMockGrid}>
                        {[...Array(64)].map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.qrCell,
                              (i % 2 === 0 || i % 7 === 0 || i % 5 === 0) &&
                              !(i > 18 && i < 22) &&
                              styles.qrCellFilled,
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.qrCodeText}>{selectedTicket.bookingCode}</Text>
                  </View>

                  {/* Barcode Simulation */}
                  <View style={styles.barcodeSection}>
                    <View style={styles.barcodeLines}>
                      {[24, 12, 28, 16, 32, 18, 26, 14, 30, 20, 24, 16, 28, 14, 32, 18].map(
                        (h, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.barcodeBar,
                              { height: h, width: idx % 2 === 0 ? 3 : 2 },
                            ]}
                          />
                        )
                      )}
                    </View>
                    <Text style={styles.barcodeDigits}>
                      {selectedTicket.bookingCode.replace('-', '')} 9821
                    </Text>
                  </View>

                  <Text style={styles.ticketTermsText}>
                    * Vui lòng xuất trình mã vé tại quầy soát vé trước giờ chiếu 10 phút. Vé đã mua tuân thủ quy định của CineMax Theater.
                  </Text>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setTicketModalVisible(false)}>
                <Text style={styles.doneBtnText}>Đóng Vé Điện Tử</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticketBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#E50914',
  },
  tabText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  quickActionRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  simulateBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E50914',
    gap: 6,
  },
  simulateBookingText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
  },
  emptyDesc: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  moviePoster: {
    width: 90,
    height: 130,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  upcomingBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bookingCodeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 4,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  formatText: {
    fontSize: 12,
    color: '#F87171',
    fontWeight: '600',
  },
  cinemaText: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
  },
  showtimeText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: 'bold',
  },
  seatRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  hallTag: {
    fontSize: 11,
    color: '#93C5FD',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seatTag: {
    fontSize: 11,
    color: '#A7F3D0',
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  comboBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  comboText: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
  },
  ticketActionsRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#182030',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  cancelTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#7F1D1D22',
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 4,
  },
  cancelTicketText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  openTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E50914',
  },
  openTicketText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyCardCancelled: {
    opacity: 0.7,
    borderColor: '#7F1D1D',
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyCode: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  historyMovieTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 2,
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  historyMetaRow: {
    marginVertical: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    gap: 2,
  },
  historyCinema: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  historyShowtime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  historySeats: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '600',
  },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyPriceLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  historyPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  historyPayMethod: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  historyPayStatus: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  eTicketWrapper: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  ticketTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
  },
  ticketBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketBrandText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  ticketBody: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  eTicketMovieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  eTicketFormat: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: 'bold',
    marginTop: 2,
  },
  eTicketInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 12,
    width: '100%',
  },
  eTicketGridItem: {
    width: '47%',
  },
  eTicketLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  eTicketValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 2,
  },
  eTicketValueHigh: {
    fontSize: 13,
    color: '#111827',
    fontWeight: 'bold',
    marginTop: 2,
  },
  perforatedLine: {
    width: '100%',
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  notchLeft: {
    position: 'absolute',
    left: -28,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  notchRight: {
    position: 'absolute',
    right: -28,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  qrNotice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4B5563',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  qrBox: {
    width: 140,
    height: 140,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 2,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrMockGrid: {
    width: 120,
    height: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    width: 15,
    height: 15,
    backgroundColor: '#F3F4F6',
  },
  qrCellFilled: {
    backgroundColor: '#111827',
  },
  qrCodeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 2,
    marginTop: 6,
  },
  barcodeSection: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  barcodeBar: {
    backgroundColor: '#111827',
  },
  barcodeDigits: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
    letterSpacing: 2,
  },
  ticketTermsText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 14,
  },
  doneBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

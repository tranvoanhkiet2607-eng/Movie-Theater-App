// Anh Kiệt - CE180795
// Màn hình Phân hệ Đặt Vé Xem Phim (Booking Flow)
// Tích hợp toàn diện: UC29, UC30, UC31, UC32, UC33, UC34, UC35, UC36
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { BottomTabInset } from '@/constants/theme';
import {
  SeatInfo,
  SelectedFoodItem,
  PromotionInfo,
  PaymentMethod,
  TicketBooking,
} from '../types/booking.types';
import { BookingAPI } from '../services/bookingApi';

import SeatMap from '../components/SeatMap';
import FoodComboSelector from '../components/FoodComboSelector';
import PromotionSection from '../components/PromotionSection';
import OrderSummary from '../components/OrderSummary';
import PaymentModal from '../components/PaymentModal';
import ETicketModal from '../components/ETicketModal';

export default function BookingFlowScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    showtimeId?: string;
    movieId?: string;
    movieTitle?: string;
    moviePoster?: string;
    theaterId?: string;
    theaterName?: string;
    roomName?: string;
    showtimeDate?: string;
    showtimeTime?: string;
    format?: string;
    price?: string;
  }>();

  // Dữ liệu suất chiếu từ Params hoặc dữ liệu mẫu mặc định
  const showtimeId = params.showtimeId || 'st_demo_01';
  const movieId = params.movieId || 'm1';
  const movieTitle = params.movieTitle || 'Dune: Hành Tinh Cát - Phần 2';
  const moviePoster =
    params.moviePoster ||
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500';
  const theaterId = params.theaterId || 't1';
  const theaterName = params.theaterName || 'CineMax Vincom Đồng Khởi';
  const roomName = params.roomName || 'Rạp 03 (IMAX Laser)';
  const showtimeDate = params.showtimeDate || 'Hôm nay';
  const showtimeTime = params.showtimeTime || '19:30';
  const format = params.format || 'IMAX 3D';
  const basePrice = Number(params.price || 110000);

  // ─── State Quản lý Luồng Đặt Vé ───────────────────────────────────────────
  // Bước 1: Chọn ghế (UC29)
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SeatInfo[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState<boolean>(true);

  // Bước 2: Bắp nước (UC32)
  const [selectedFoodItems, setSelectedFoodItems] = useState<SelectedFoodItem[]>([]);

  // Bước 3: Khuyến mãi (UC31)
  const [appliedPromo, setAppliedPromo] = useState<PromotionInfo | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Thông tin khách hàng
  const [customerName, setCustomerName] = useState<string>(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || '');

  // Modals (UC33, UC35)
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
  const [createdBooking, setCreatedBooking] = useState<TicketBooking | null>(null);
  const [eTicketModalVisible, setETicketModalVisible] = useState<boolean>(false);

  // 1. Tải danh sách ghế đã bán của suất chiếu từ Backend (UC29)
  useEffect(() => {
    let mounted = true;
    setIsLoadingSeats(true);
    BookingAPI.getOccupiedSeats(showtimeId)
      .then((seats) => {
        if (mounted) setOccupiedSeats(seats);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingSeats(false);
      });

    return () => {
      mounted = false;
    };
  }, [showtimeId]);

  // Cập nhật thông tin khách nếu user đăng nhập
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName || '');
      if (!customerPhone) setCustomerPhone(user.phone || '');
      if (!customerEmail) setCustomerEmail(user.email || '');
    }
  }, [user]);

  // ─── Xử lý chọn/bỏ chọn ghế (UC29) ─────────────────────────────────────────
  const handleToggleSeat = (seat: SeatInfo) => {
    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (isAlreadySelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 8) {
        Alert.alert('Giới hạn', 'Bạn chỉ có thể đặt tối đa 8 ghế trong một lần.');
        return;
      }
      setSelectedSeats([...selectedSeats, { ...seat, status: 'selected' }]);
    }
  };

  // ─── Xử lý thêm/bớt bắp nước (UC32) ────────────────────────────────────────
  const handleChangeFoodQuantity = (
    item: Omit<SelectedFoodItem, 'quantity'>,
    delta: number
  ) => {
    const existingIndex = selectedFoodItems.findIndex(
      (f) => f.foodId === item.foodId
    );

    if (existingIndex > -1) {
      const current = selectedFoodItems[existingIndex];
      const newQty = current.quantity + delta;

      if (newQty <= 0) {
        setSelectedFoodItems(
          selectedFoodItems.filter((f) => f.foodId !== item.foodId)
        );
      } else {
        const updated = [...selectedFoodItems];
        updated[existingIndex] = { ...current, quantity: newQty };
        setSelectedFoodItems(updated);
      }
    } else if (delta > 0) {
      setSelectedFoodItems([...selectedFoodItems, { ...item, quantity: 1 }]);
    }
  };

  // ─── Tính toán tổng tiền (UC32) ────────────────────────────────────────────
  const seatSubtotal = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.price, 0),
    [selectedSeats]
  );

  const foodSubtotal = useMemo(
    () => selectedFoodItems.reduce((sum, f) => sum + f.price * f.quantity, 0),
    [selectedFoodItems]
  );

  const totalBeforeDiscount = seatSubtotal + foodSubtotal;
  const finalTotalAmount = Math.max(0, totalBeforeDiscount - discountAmount);

  // ─── Xử lý khuyến mãi (UC31) ───────────────────────────────────────────────
  const handleApplyPromoSuccess = (promo: PromotionInfo, discount: number) => {
    setAppliedPromo(promo);
    setDiscountAmount(discount);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
  };

  // ─── Xử lý thanh toán & tạo vé (UC33, UC35) ────────────────────────────────
  const handleOpenPayment = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Chưa chọn ghế', 'Vui lòng chọn ít nhất một ghế ngồi để tiếp tục.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert(
        'Thiếu thông tin liên hệ',
        'Vui lòng điền Họ tên và Số điện thoại để nhận mã vé điện tử.'
      );
      return;
    }

    setPaymentModalVisible(true);
  };

  const handleExecutePaymentSuccess = async (paymentMethod: PaymentMethod) => {
    try {
      const payload = {
        userId: user?.id || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        showtimeId,
        movieId,
        movieTitle,
        moviePoster,
        theaterId,
        theaterName,
        roomName,
        showtimeDate,
        showtimeTime,
        format,
        seats: selectedSeats.map((s) => s.id),
        seatDetails: selectedSeats.map((s) => ({
          seatNumber: s.id,
          type: s.type,
          price: s.price,
        })),
        seatPriceTotal: seatSubtotal,
        foodItems: selectedFoodItems,
        foodPriceTotal: foodSubtotal,
        promotionCode: appliedPromo?.code || '',
        discountAmount,
        totalAmount: finalTotalAmount,
        paymentMethod,
      };

      const res = await BookingAPI.createBooking(payload);

      if (res.success && res.booking) {
        setPaymentModalVisible(false);
        setCreatedBooking(res.booking);
        setETicketModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Đặt vé không thành công', err.message || 'Lỗi khi tạo đơn vé.');
      throw err;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.topHeaderTextWrap}>
          <Text style={styles.topHeaderTitle} numberOfLines={1}>
            {movieTitle}
          </Text>
          <Text style={styles.topHeaderSub}>
            {theaterName} • {roomName}
          </Text>
        </View>
        <View style={styles.formatBadge}>
          <Text style={styles.formatBadgeText}>{format}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: BottomTabInset + 60 },
        ]}>
        {/* Bước 1: Sơ đồ chọn ghế (UC29) */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <Text style={styles.sectionTitle}>Chọn Ghế Ngồi (UC29)</Text>
        </View>

        {isLoadingSeats ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#E50914" />
            <Text style={styles.loadingText}>Đang tải sơ đồ phòng chiếu...</Text>
          </View>
        ) : (
          <SeatMap
            basePrice={basePrice}
            occupiedSeats={occupiedSeats}
            selectedSeats={selectedSeats}
            onToggleSeat={handleToggleSeat}
          />
        )}

        {/* Bước 2: Chọn bắp nước (UC32) */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <Text style={styles.sectionTitle}>Chọn Combo Bắp Nước (UC32)</Text>
        </View>

        <FoodComboSelector
          selectedFoodItems={selectedFoodItems}
          onChangeQuantity={handleChangeFoodQuantity}
        />

        {/* Bước 3: Khuyến mãi (UC31) */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>3</Text>
          </View>
          <Text style={styles.sectionTitle}>Khuyến Mãi & Giảm Giá (UC31)</Text>
        </View>

        <PromotionSection
          orderSubtotal={totalBeforeDiscount}
          appliedPromo={appliedPromo}
          discountAmount={discountAmount}
          onApplySuccess={handleApplyPromoSuccess}
          onRemovePromo={handleRemovePromo}
        />

        {/* Thông tin người nhận vé */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>4</Text>
          </View>
          <Text style={styles.sectionTitle}>Thông Tin Nhận Vé</Text>
        </View>

        <View style={styles.contactCard}>
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Họ và tên người nhận vé *</Text>
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Số điện thoại nhận SMS / Zalo *</Text>
            <TextInput
              style={styles.textInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="0901234567"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Email nhận vé điện tử (Tùy chọn)</Text>
            <TextInput
              style={styles.textInput}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="email@example.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Bảng chiết tính tổng tiền (UC32) */}
        <OrderSummary
          movieTitle={movieTitle}
          theaterName={theaterName}
          roomName={roomName}
          showtimeDate={showtimeDate}
          showtimeTime={showtimeTime}
          selectedSeats={selectedSeats}
          selectedFoodItems={selectedFoodItems}
          appliedPromo={appliedPromo}
          discountAmount={discountAmount}
        />
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.floatingBottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>
            {selectedSeats.length > 0
              ? `${selectedSeats.length} ghế (${selectedSeats.map((s) => s.id).join(', ')})`
              : 'Chưa chọn ghế'}
          </Text>
          <Text style={styles.bottomPriceValue}>
            {finalTotalAmount.toLocaleString('vi-VN')}đ
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleOpenPayment}
          disabled={selectedSeats.length === 0}
          style={[
            styles.checkoutBtn,
            selectedSeats.length === 0 && styles.checkoutBtnDisabled,
          ]}
          activeOpacity={0.85}>
          <Text style={styles.checkoutBtnText}>Thanh Toán (UC33)</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Modal Thanh Toán Giả Lập (UC33) */}
      <PaymentModal
        visible={paymentModalVisible}
        totalAmount={finalTotalAmount}
        onClose={() => setPaymentModalVisible(false)}
        onPaySuccess={handleExecutePaymentSuccess}
      />

      {/* Modal Vé Điện Tử E-Ticket (UC35) */}
      <ETicketModal
        visible={eTicketModalVisible}
        booking={createdBooking}
        onClose={() => {
          setETicketModalVisible(false);
          router.replace('/profile');
        }}
        onDone={() => {
          setETicketModalVisible(false);
          router.replace('/profile');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F121B',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  topHeaderTextWrap: {
    flex: 1,
  },
  topHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  topHeaderSub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  formatBadge: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  formatBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  contactCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 12,
  },
  inputField: {
    gap: 4,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    height: 44,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomPriceLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomPriceValue: {
    color: '#E50914',
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 44,
    gap: 6,
  },
  checkoutBtnDisabled: {
    backgroundColor: '#4B5563',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});


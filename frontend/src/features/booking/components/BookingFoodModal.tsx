// UC38: Order Food & Drinks (Food Ordering) & Checkout with Promotions (UC39)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodAPI, PromotionAPI, OrderAPI } from '@/services/api';
import { FoodItem, FoodCategory } from '@/types/food';
import { Promotion } from '@/types/promotion';
import { Order } from '@/types/order';
import { useAuth } from '@/context/auth-context';

interface BookingFoodModalProps {
  visible: boolean;
  onClose: () => void;
  movie: any;
  theater: any;
  showtime: any;
  dateLabel?: string;
  onBookingComplete?: (order: Order) => void;
}

const AVAILABLE_SEAT_GRID = [
  { row: 'E', seats: ['E03', 'E04', 'E05', 'E06', 'E07', 'E08'], type: 'standard', price: 95000 },
  { row: 'F', seats: ['F03', 'F04', 'F05', 'F06', 'F07', 'F08'], type: 'vip', price: 135000 },
  { row: 'G', seats: ['G03', 'G04', 'G05', 'G06', 'G07', 'G08'], type: 'vip', price: 135000 },
  { row: 'H', seats: ['H01-H02', 'H03-H04', 'H05-H06'], type: 'couple', price: 195000 },
];

export default function BookingFoodModal({
  visible,
  onClose,
  movie,
  theater,
  showtime,
  dateLabel = 'Hôm nay',
  onBookingComplete,
}: BookingFoodModalProps) {
  const { user } = useAuth();

  // Wizard Step: 1: Seats -> 2: Food & Drinks (UC38) -> 3: Payment & Coupon (UC39) -> 4: Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Selected Seats State
  const [selectedSeats, setSelectedSeats] = useState<{ seatNumber: string; seatType: string; price: number }[]>([
    { seatNumber: 'F05', seatType: 'vip', price: 135000 },
    { seatNumber: 'F06', seatType: 'vip', price: 135000 },
  ]);

  // Food & Drinks State (UC38)
  const [foodMenu, setFoodMenu] = useState<FoodItem[]>([]);
  const [loadingFoods, setLoadingFoods] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('all');
  const [foodQuantities, setFoodQuantities] = useState<{ [foodId: string]: number }>({});

  // Coupon & Payment State (UC39)
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('MoMo');
  const [notes, setNotes] = useState<string>('');

  // Submitting Order State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Load Food Menu on Modal Open
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setCompletedOrder(null);
      setLoadingFoods(true);
      FoodAPI.getFoods({ availableOnly: true })
        .then((res) => {
          if (res.success) {
            setFoodMenu(res.items || []);
          }
        })
        .catch((err) => console.log('[Load Food Error]', err))
        .finally(() => setLoadingFoods(false));
    }
  }, [visible]);

  // Seat toggle handler
  const toggleSeat = (seatNumber: string, seatType: string, price: number) => {
    const exists = selectedSeats.some((s) => s.seatNumber === seatNumber);
    if (exists) {
      if (selectedSeats.length === 1) {
        Alert.alert('Thông báo', 'Bạn cần chọn ít nhất 1 ghế.');
        return;
      }
      setSelectedSeats((prev) => prev.filter((s) => s.seatNumber !== seatNumber));
    } else {
      if (selectedSeats.length >= 8) {
        Alert.alert('Giới hạn', 'Bạn chỉ có thể đặt tối đa 8 ghế cho mỗi đơn.');
        return;
      }
      setSelectedSeats((prev) => [...prev, { seatNumber, seatType, price }]);
    }
  };

  // Food quantity handlers (UC38)
  const handleIncreaseFood = (foodId: string) => {
    setFoodQuantities((prev) => ({
      ...prev,
      [foodId]: (prev[foodId] || 0) + 1,
    }));
  };

  const handleDecreaseFood = (foodId: string) => {
    setFoodQuantities((prev) => {
      const current = prev[foodId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[foodId];
        return next;
      }
      return { ...prev, [foodId]: current - 1 };
    });
  };

  // Calculations
  const subtotalTickets = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  const subtotalFoods = useMemo(() => {
    return Object.entries(foodQuantities).reduce((sum, [fId, qty]) => {
      const food = foodMenu.find((item) => item.id === fId);
      return sum + (food ? food.price * qty : 0);
    }, 0);
  }, [foodQuantities, foodMenu]);

  const rawSubtotal = subtotalTickets + subtotalFoods;
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  // Apply Coupon Handler (UC39)
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setCouponError('Vui lòng nhập mã khuyến mãi');
      return;
    }

    setCouponChecking(true);
    setCouponError(null);

    try {
      const res = await PromotionAPI.checkPromotion(code, rawSubtotal);
      if (res.success && res.promotion) {
        setAppliedPromo(res.promotion);
        setDiscountAmount(res.discountAmount || 0);
        setCouponCode(code);
      } else {
        setCouponError(res.message || 'Mã khuyến mãi không hợp lệ');
        setAppliedPromo(null);
        setDiscountAmount(0);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Không thể kiểm tra mã khuyến mãi');
      setAppliedPromo(null);
      setDiscountAmount(0);
    } finally {
      setCouponChecking(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponError(null);
  };

  // Submit Order Handler
  const handleConfirmOrder = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Chưa chọn ghế', 'Vui lòng chọn ít nhất 1 ghế.');
      return;
    }

    setIsSubmitting(true);
    try {
      const foodsPayload = Object.entries(foodQuantities).map(([fId, qty]) => {
        const item = foodMenu.find((f) => f.id === fId);
        return {
          foodId: fId,
          name: item?.name || 'Món ăn',
          category: item?.category || 'food',
          price: item?.price || 0,
          quantity: qty,
          image: item?.image || '',
        };
      });

      const payload = {
        user: {
          id: user?.id || 'guest',
          fullName: user?.fullName || 'Khách hàng CineMax',
          email: user?.email || '',
          phone: user?.phone || '',
        },
        showtimeId: showtime?.id,
        movie: {
          id: movie?.id || showtime?.movieId || 'm1',
          title: movie?.title || 'Phim rạp',
          poster: movie?.poster || '',
          ageRating: movie?.ageRating || 'T13',
        },
        theater: {
          id: theater?.id || showtime?.theaterId || 'th1',
          name: theater?.name || 'CineMax Theater',
          room: showtime?.room || 'Rạp 01',
          showtimeDate: dateLabel,
          showtimeTime: showtime?.startTime || '19:30',
          format: showtime?.format || '2D Phụ đề',
        },
        tickets: selectedSeats,
        foods: foodsPayload,
        promotionCode: appliedPromo?.code || '',
        paymentMethod,
        notes,
      };

      const res = await OrderAPI.createOrder(payload);
      if (res.success && res.order) {
        setCompletedOrder(res.order);
        setCurrentStep(4); // Move to Success Step
        onBookingComplete?.(res.order);
      }
    } catch (err: any) {
      Alert.alert('Lỗi đặt vé', err.message || 'Không thể tạo đơn đặt vé.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Food Menu
  const filteredFoodMenu = foodMenu.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {movie?.title || 'Đặt Vé & Bắp Nước'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {theater?.name || 'CineMax'} • {showtime?.room} • {showtime?.startTime} ({dateLabel})
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Stepper Wizard Indicator */}
          {currentStep < 4 && (
            <View style={styles.stepperContainer}>
              <View style={[styles.stepItem, currentStep >= 1 && styles.stepItemActive]}>
                <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, currentStep >= 1 && styles.stepNumActive]}>1</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Chọn ghế</Text>
              </View>

              <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

              <View style={[styles.stepItem, currentStep >= 2 && styles.stepItemActive]}>
                <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, currentStep >= 2 && styles.stepNumActive]}>2</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Bắp & Nước</Text>
              </View>

              <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

              <View style={[styles.stepItem, currentStep >= 3 && styles.stepItemActive]}>
                <View style={[styles.stepCircle, currentStep >= 3 && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, currentStep >= 3 && styles.stepNumActive]}>3</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Thanh toán</Text>
              </View>
            </View>
          )}

          {/* Step 1: Chọn Ghế */}
          {currentStep === 1 && (
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
              <View style={styles.screenIndicator}>
                <View style={styles.screenCurve} />
                <Text style={styles.screenText}>MÀN HÌNH CHIẾU</Text>
              </View>

              {/* Seat Types Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.seatBox, styles.seatBoxStandard]} />
                  <Text style={styles.legendText}>Thường (95k)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.seatBox, styles.seatBoxVip]} />
                  <Text style={styles.legendText}>VIP (135k)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.seatBox, styles.seatBoxCouple]} />
                  <Text style={styles.legendText}>Ghế Đôi (195k)</Text>
                </View>
              </View>

              {/* Seat Grid */}
              <View style={styles.seatGrid}>
                {AVAILABLE_SEAT_GRID.map((row) => (
                  <View key={row.row} style={styles.gridRow}>
                    <Text style={styles.rowLabel}>{row.row}</Text>
                    <View style={styles.rowSeats}>
                      {row.seats.map((seat) => {
                        const isSelected = selectedSeats.some((s) => s.seatNumber === seat);
                        const isCouple = row.type === 'couple';

                        return (
                          <TouchableOpacity
                            key={seat}
                            onPress={() => toggleSeat(seat, row.type, row.price)}
                            activeOpacity={0.7}
                            style={[
                              styles.seatBox,
                              row.type === 'standard' && styles.seatBoxStandard,
                              row.type === 'vip' && styles.seatBoxVip,
                              row.type === 'couple' && styles.seatBoxCouple,
                              isCouple && styles.seatBoxCoupleWidth,
                              isSelected && styles.seatBoxSelected,
                            ]}>
                            <Text
                              style={[
                                styles.seatNumberText,
                                isSelected && styles.seatNumberTextSelected,
                              ]}>
                              {seat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>

              {/* Selected Seats Summary */}
              <View style={styles.selectedSeatsBox}>
                <View style={styles.selectedSeatsRow}>
                  <Text style={styles.selectedSeatsTitle}>Ghế đang chọn ({selectedSeats.length}):</Text>
                  <Text style={styles.selectedSeatsValue}>
                    {selectedSeats.map((s) => s.seatNumber).join(', ')}
                  </Text>
                </View>
                <Text style={styles.selectedSeatsPrice}>
                  Tạm tính vé: {subtotalTickets.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Step 2: UC38 - Chọn Đồ Ăn & Thức Uống */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              {/* Category Filter */}
              <View style={styles.categoryTabs}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'food', label: 'Bắp rang' },
                  { key: 'drink', label: 'Nước ngọt' },
                  { key: 'combo', label: 'Combo ưu đãi' },
                ].map((c) => {
                  const active = selectedCategory === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setSelectedCategory(c.key as FoodCategory)}
                      style={[styles.categoryTab, active && styles.categoryTabActive]}>
                      <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {loadingFoods ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#E50914" />
                  <Text style={styles.loadingText}>Đang tải thực đơn bắp nước...</Text>
                </View>
              ) : (
                <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
                  {filteredFoodMenu.map((item) => {
                    const quantity = foodQuantities[item.id] || 0;

                    return (
                      <View key={item.id} style={styles.foodCard}>
                        <Image source={{ uri: item.image }} style={styles.foodImage} />
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{item.name}</Text>
                          <Text style={styles.foodDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                          <View style={styles.foodPriceRow}>
                            <Text style={styles.foodPrice}>
                              {item.price.toLocaleString('vi-VN')}đ
                            </Text>
                            <Text style={styles.foodUnit}>/{item.unit}</Text>
                          </View>
                        </View>

                        {/* Quantity Counter */}
                        <View style={styles.counterBox}>
                          {quantity > 0 ? (
                            <>
                              <TouchableOpacity
                                onPress={() => handleDecreaseFood(item.id)}
                                style={styles.counterBtn}>
                                <Ionicons name="remove" size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                              <Text style={styles.counterValue}>{quantity}</Text>
                              <TouchableOpacity
                                onPress={() => handleIncreaseFood(item.id)}
                                style={styles.counterBtn}>
                                <Ionicons name="add" size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleIncreaseFood(item.id)}
                              style={styles.addFoodBtn}>
                              <Ionicons name="add" size={16} color="#FFFFFF" />
                              <Text style={styles.addFoodBtnText}>Thêm</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {/* Food Subtotal Bar */}
              <View style={styles.foodSubtotalBar}>
                <View>
                  <Text style={styles.foodSubtotalLabel}>Đồ ăn & Thức uống:</Text>
                  <Text style={styles.foodSubtotalVal}>
                    {subtotalFoods > 0
                      ? `${subtotalFoods.toLocaleString('vi-VN')}đ`
                      : 'Chưa chọn món nào'}
                  </Text>
                </View>
                <Text style={styles.foodSkipHint}>Có thể bỏ qua nếu không dùng</Text>
              </View>
            </View>
          )}

          {/* Step 3: Thanh toán & Mã Khuyến Mãi (UC39) */}
          {currentStep === 3 && (
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
              {/* Order Breakdown Box */}
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Chi tiết đơn đặt vé & đồ ăn</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Vé xem phim ({selectedSeats.length} ghế: {selectedSeats.map((s) => s.seatNumber).join(', ')}):
                  </Text>
                  <Text style={styles.summaryValue}>{subtotalTickets.toLocaleString('vi-VN')}đ</Text>
                </View>

                {subtotalFoods > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Đồ ăn & thức uống ({Object.values(foodQuantities).reduce((a, b) => a + b, 0)} phần):
                    </Text>
                    <Text style={styles.summaryValue}>{subtotalFoods.toLocaleString('vi-VN')}đ</Text>
                  </View>
                )}

                {appliedPromo && discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#10B981' }]}>
                      Khuyến mãi ({appliedPromo.code}):
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                      -{discountAmount.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.summaryRowTotal}>
                  <Text style={styles.summaryTotalLabel}>TỔNG THANH TOÁN:</Text>
                  <Text style={styles.summaryTotalValue}>{finalTotal.toLocaleString('vi-VN')}đ</Text>
                </View>
              </View>

              {/* Promotion Code Section */}
              <View style={styles.couponSection}>
                <Text style={styles.sectionSubtitle}>Mã khuyến mãi & Ưu đãi</Text>

                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Nhập mã (VD: CINEMAX20, POPCORN50K)"
                    placeholderTextColor="#6B7280"
                    value={couponCode}
                    onChangeText={setCouponCode}
                    autoCapitalize="characters"
                  />
                  {appliedPromo ? (
                    <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                      <Text style={styles.removeCouponText}>Hủy</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleApplyCoupon()}
                      disabled={couponChecking}
                      style={styles.applyCouponBtn}>
                      {couponChecking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.applyCouponBtnText}>Áp dụng</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}
                {appliedPromo && (
                  <View style={styles.couponSuccessBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.couponSuccessText}>
                      Đã áp dụng mã [{appliedPromo.code}] - Giảm {discountAmount.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                )}

                {/* Quick Promos Suggestions */}
                <View style={styles.quickPromosRow}>
                  <Text style={styles.quickPromoHint}>Mã gợi ý:</Text>
                  {['CINEMAX20', 'POPCORN50K', 'VIPWEEKEND'].map((pCode) => (
                    <TouchableOpacity
                      key={pCode}
                      onPress={() => handleApplyCoupon(pCode)}
                      style={styles.quickPromoChip}>
                      <Text style={styles.quickPromoChipText}>{pCode}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Methods */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionSubtitle}>Phương thức thanh toán</Text>
                <View style={styles.paymentMethodsRow}>
                  {[
                    { id: 'MoMo', label: 'Ví MoMo', icon: 'wallet-outline' },
                    { id: 'VNPay', label: 'VNPay QR', icon: 'qr-code-outline' },
                    { id: 'ZaloPay', label: 'ZaloPay', icon: 'card-outline' },
                    { id: 'CashAtCounter', label: 'Tại quầy', icon: 'cash-outline' },
                  ].map((p) => {
                    const active = paymentMethod === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setPaymentMethod(p.id)}
                        style={[styles.paymentMethodCard, active && styles.paymentMethodCardActive]}>
                        <Ionicons
                          name={p.icon as any}
                          size={20}
                          color={active ? '#E50914' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.paymentMethodLabel,
                            active && styles.paymentMethodLabelActive,
                          ]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionSubtitle}>Ghi chú cho quầy bắp nước</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Ghi chú thêm (VD: ít đá, bắp lắc kỹ phô mai...)"
                  placeholderTextColor="#6B7280"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </ScrollView>
          )}

          {/* Step 4: Đặt Thành Công (Success) */}
          {currentStep === 4 && completedOrder && (
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.successContent}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={72} color="#10B981" />
              </View>

              <Text style={styles.successTitle}>Đặt Vé & Bắp Nước Thành Công!</Text>
              <Text style={styles.successCode}>Mã đơn hàng: #{completedOrder.orderCode}</Text>

              <View style={styles.successCard}>
                <Text style={styles.successCardMovie}>{completedOrder.movie.title}</Text>
                <Text style={styles.successCardTheater}>
                  {completedOrder.theater.name} • {completedOrder.theater.room}
                </Text>
                <Text style={styles.successCardTime}>
                  Suất: {completedOrder.theater.showtimeTime} ({completedOrder.theater.showtimeDate})
                </Text>
                <Text style={styles.successCardSeats}>
                  Ghế: {completedOrder.tickets.map((t) => t.seatNumber).join(', ')}
                </Text>

                {completedOrder.foods.length > 0 && (
                  <View style={styles.successFoodsBox}>
                    <Text style={styles.successFoodsTitle}>Đồ ăn & Thức uống:</Text>
                    {completedOrder.foods.map((f, i) => (
                      <Text key={i} style={styles.successFoodItem}>
                        • {f.name} x{f.quantity} ({f.price.toLocaleString('vi-VN')}đ)
                      </Text>
                    ))}
                    <Text style={styles.foodStatusBadge}>
                      Trạng thái quầy: Đang chuẩn bị
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tổng thanh toán:</Text>
                  <Text style={[styles.summaryValue, { color: '#E50914', fontSize: 16 }]}>
                    {completedOrder.totalPrice.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>

              <Text style={styles.successNotice}>
                Quý khách vui lòng xuất trình mã đơn tại Kiosk rạp hoặc quầy Concession để nhận vé và đồ ăn.
              </Text>

              <TouchableOpacity style={styles.successDoneBtn} onPress={onClose}>
                <Text style={styles.successDoneBtnText}>Hoàn tất</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Bottom Navigation Buttons */}
          {currentStep < 4 && (
            <View style={styles.bottomBar}>
              <View style={styles.bottomPriceInfo}>
                <Text style={styles.bottomTotalLabel}>Tổng tạm tính:</Text>
                <Text style={styles.bottomTotalValue}>{finalTotal.toLocaleString('vi-VN')}đ</Text>
              </View>

              <View style={styles.bottomActions}>
                {currentStep > 1 && (
                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setCurrentStep((s) => s - 1)}>
                    <Text style={styles.backStepBtnText}>Quay lại</Text>
                  </TouchableOpacity>
                )}

                {currentStep < 3 ? (
                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setCurrentStep((s) => s + 1)}>
                    <Text style={styles.nextStepBtnText}>
                      {currentStep === 1 ? 'Chọn bắp nước' : 'Tiếp tục thanh toán'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.confirmOrderBtn}
                    disabled={isSubmitting}
                    onPress={handleConfirmOrder}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="card" size={18} color="#FFFFFF" />
                        <Text style={styles.confirmOrderBtnText}>Thanh toán ngay</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '75%',
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#262626',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1A1D24',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepItemActive: {},
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#E50914',
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#374151',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#E50914',
  },
  stepContainer: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  screenIndicator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  screenCurve: {
    width: '70%',
    height: 4,
    backgroundColor: '#E50914',
    borderRadius: 2,
    marginBottom: 6,
    shadowColor: '#E50914',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  screenText: {
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  seatGrid: {
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    width: 20,
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  rowSeats: {
    flexDirection: 'row',
    gap: 8,
  },
  seatBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  seatBoxCoupleWidth: {
    width: 78,
  },
  seatBoxStandard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  seatBoxVip: {
    backgroundColor: '#312E81',
    borderColor: '#6366F1',
  },
  seatBoxCouple: {
    backgroundColor: '#831843',
    borderColor: '#DB2777',
  },
  seatBoxSelected: {
    backgroundColor: '#E50914',
    borderColor: '#EF4444',
  },
  seatNumberText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  seatNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedSeatsBox: {
    backgroundColor: '#1A1D24',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  selectedSeatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  selectedSeatsTitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  selectedSeatsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  selectedSeatsPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1F2937',
  },
  categoryTabActive: {
    backgroundColor: '#E50914',
  },
  categoryTabText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1D24',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
  },
  foodImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#262626',
  },
  foodInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  foodDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 15,
  },
  foodPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  foodPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  foodUnit: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 2,
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 18,
    textAlign: 'center',
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addFoodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  foodSubtotalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1D24',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  foodSubtotalLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  foodSubtotalVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  foodSkipHint: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  summaryBox: {
    backgroundColor: '#1A1D24',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 10,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E50914',
  },
  couponSection: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#1A1D24',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  applyCouponBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyCouponBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removeCouponBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeCouponText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '700',
  },
  couponErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
  couponSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  couponSuccessText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  quickPromosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  quickPromoHint: {
    fontSize: 11,
    color: '#6B7280',
  },
  quickPromoChip: {
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickPromoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: '#1A1D24',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#262626',
  },
  paymentMethodCardActive: {
    borderColor: '#E50914',
    backgroundColor: '#201A1D',
  },
  paymentMethodLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  paymentMethodLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notesSection: {
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#1A1D24',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#FFFFFF',
  },
  successContent: {
    alignItems: 'center',
    padding: 24,
  },
  successIconWrapper: {
    marginVertical: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  successCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 16,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#1A1D24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  successCardMovie: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successCardTheater: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  successCardTime: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 4,
  },
  successCardSeats: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 4,
  },
  successFoodsBox: {
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  successFoodsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  successFoodItem: {
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 2,
  },
  foodStatusBadge: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 4,
  },
  successNotice: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  successDoneBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 20,
  },
  successDoneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1D24',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  bottomPriceInfo: {},
  bottomTotalLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  bottomTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E50914',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backStepBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backStepBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  nextStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nextStepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 10,
  },
});


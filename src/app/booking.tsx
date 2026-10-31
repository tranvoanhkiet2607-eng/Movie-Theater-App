import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { FoodItem } from '@/types/food';
import { SelectedFoodItem, PaymentMethod, TicketBookingOrder } from '@/types/booking';
import { getAllFoodItems } from '@/services/food-service';
import { createTicketOrder } from '@/services/booking-service';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  formatVND,
} from '@/utils/food-helpers';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

interface MovieData {
  id: string;
  title: string;
  genre: string;
  duration: string;
  rating: string;
  poster: string;
  ageRating: string;
}

const MOVIES: MovieData[] = [
  {
    id: 'm1',
    title: 'Dune: Hành Tinh Cát - Phần 2',
    genre: 'Khoa học viễn tưởng, Hành động',
    duration: '166 phút',
    rating: '8.8 ★',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
    ageRating: 'T16',
  },
  {
    id: 'm2',
    title: 'Godzilla x Kong: Đế Chế Mới',
    genre: 'Hành động, Phiêu lưu',
    duration: '115 phút',
    rating: '8.2 ★',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
    ageRating: 'T13',
  },
  {
    id: 'm3',
    title: 'Kung Fu Panda 4',
    genre: 'Hoạt hình, Hài hước',
    duration: '94 phút',
    rating: '8.0 ★',
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500',
    ageRating: 'P',
  },
  {
    id: 'm4',
    title: 'Deadpool & Wolverine',
    genre: 'Hài hước, Siêu anh hùng',
    duration: '127 phút',
    rating: '9.0 ★',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
    ageRating: 'T18',
  },
];

const THEATERS = [
  {
    id: 't1',
    name: 'CineMax Vincom Đồng Khởi',
    address: 'Tầng 3, 72 Lê Thánh Tôn, Quận 1',
    room: 'Rạp 03 (IMAX Laser)',
    formats: ['IMAX 3D', '2D'],
  },
  {
    id: 't2',
    name: 'CineMax Landmark 81',
    address: 'Tầng B1, 720A Điện Biên Phủ, Bình Thạnh',
    room: 'Rạp 02 (Dolby Atmos)',
    formats: ['2D VIP', '4DX'],
  },
  {
    id: 't3',
    name: 'CineMax Crescent Mall',
    address: 'Tầng 5, 101 Tôn Dật Tiên, Quận 7',
    room: 'Rạp 01 (Premium)',
    formats: ['2D Phụ đề'],
  },
];

const DATES = [
  { label: 'Hôm nay', date: '15/10' },
  { label: 'Ngày mai', date: '16/10' },
  { label: 'Thứ 6', date: '17/10' },
  { label: 'Thứ 7', date: '18/10' },
];

const SHOWTIMES = [
  { time: '10:15', price: 90000, type: '2D Phụ đề' },
  { time: '13:30', price: 120000, type: '2D VIP' },
  { time: '16:45', price: 120000, type: '2D VIP' },
  { time: '19:30', price: 140000, type: 'IMAX 3D' },
  { time: '22:15', price: 110000, type: '2D Phụ đề' },
];

// Seat Map definition (Row A - F, 8 seats per row)
const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEATS_PER_ROW = 8;
const OCCUPIED_SEATS = ['C03', 'C04', 'D05', 'D06', 'E01', 'E02'];

export default function TicketBookingScreen() {
  const params = useLocalSearchParams<{
    movieId?: string;
    theaterId?: string;
    showtime?: string;
    format?: string;
    prefilledFood?: string;
    step?: string;
  }>();

  const { user, updateProfile } = useAuth();

  // Wizard Steps: 1: 'seats', 2: 'food', 3: 'checkout', 4: 'success'
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (params.step === 'food') return 2;
    if (params.step === 'checkout') return 3;
    return 1;
  });

  // Step 1: Movie, Cinema, Date, Time & Seats
  const selectedMovie = useMemo<MovieData>(() => {
    const found = MOVIES.find((m) => m.id === params.movieId);
    return found || MOVIES[0];
  }, [params.movieId]);
  const [selectedTheater, setSelectedTheater] = useState(
    THEATERS.find((t) => t.id === params.theaterId) || THEATERS[0]
  );
  const [selectedDate, setSelectedDate] = useState<string>(DATES[0].label);
  const [selectedShowtime, setSelectedShowtime] = useState(
    SHOWTIMES.find((s) => s.time === params.showtime) || SHOWTIMES[3]
  );
  const [selectedSeats, setSelectedSeats] = useState<string[]>(['F08', 'F09']);

  // Step 2: Food & Drinks Catalog & Selection
  const [foodCatalog, setFoodCatalog] = useState<FoodItem[]>([]);
  const [loadingFood, setLoadingFood] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [foodSearchQuery, setFoodSearchQuery] = useState<string>('');
  const [selectedFoodMap, setSelectedFoodMap] = useState<Record<string, SelectedFoodItem>>({});

  // Step 3: Checkout Details
  const [customerName, setCustomerName] = useState<string>(user?.fullName || 'Nguyễn Văn A');
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || '0901234567');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || 'customer@cinema.com');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState<boolean>(false);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 4: Success Order Result
  const [confirmedOrder, setConfirmedOrder] = useState<TicketBookingOrder | null>(null);

  // Load live food catalog from Food Service
  useEffect(() => {
    let isMounted = true;
    getAllFoodItems()
      .then((items) => {
        if (isMounted) {
          setFoodCatalog(items);
          setLoadingFood(false);

          // Handle prefilled food if passed via params
          if (params.prefilledFood) {
            try {
              const parsed = JSON.parse(decodeURIComponent(params.prefilledFood));
              if (Array.isArray(parsed)) {
                const initialMap: Record<string, SelectedFoodItem> = {};
                parsed.forEach((item: SelectedFoodItem) => {
                  initialMap[item.foodId] = item;
                });
                setSelectedFoodMap(initialMap);
              }
            } catch {
              // ignore invalid JSON
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load food for booking:', err);
        if (isMounted) setLoadingFood(false);
      });

    return () => {
      isMounted = false;
    };
  }, [params.prefilledFood]);

  // Seat toggle handler
  const handleToggleSeat = (seatCode: string) => {
    if (OCCUPIED_SEATS.includes(seatCode)) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seatCode)) {
        return prev.filter((s) => s !== seatCode);
      } else {
        if (prev.length >= 8) {
          Alert.alert('Giới hạn ghế', 'Bạn chỉ có thể đặt tối đa 8 ghế trong một đơn.');
          return prev;
        }
        return [...prev, seatCode].sort();
      }
    });
  };

  // Seat price calculations
  const seatPricePerTicket = selectedShowtime.price;
  const seatPriceTotal = selectedSeats.length * seatPricePerTicket;

  // Food quantity modifier handlers (The core feature)
  const handleAddFoodQuantity = (item: FoodItem) => {
    if (!item.isAvailable) {
      Alert.alert('Tạm hết hàng', `Món "${item.name}" hiện đang tạm hết.`);
      return;
    }

    setSelectedFoodMap((prev) => {
      const existing = prev[item.id];
      const newQty = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [item.id]: {
          foodId: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          originalPrice: item.originalPrice,
          quantity: newQty,
          imageUrl: item.imageUrl,
          size: item.size,
        },
      };
    });
  };

  const handleDecreaseFoodQuantity = (item: FoodItem) => {
    setSelectedFoodMap((prev) => {
      const existing = prev[item.id];
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }

      return {
        ...prev,
        [item.id]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const selectedFoodList: SelectedFoodItem[] = useMemo(() => {
    return Object.values(selectedFoodMap).filter((item) => item.quantity > 0);
  }, [selectedFoodMap]);

  const totalFoodCount = useMemo(() => {
    return selectedFoodList.reduce((sum, i) => sum + i.quantity, 0);
  }, [selectedFoodList]);

  const totalFoodPrice = useMemo(() => {
    return selectedFoodList.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [selectedFoodList]);

  // Points and discounts
  const availablePoints = user?.loyaltyPoints || 0;
  // Use up to 50 points or up to 50% of bill (1 point = 1000 VND)
  const maxUsablePoints = Math.min(availablePoints, 100);
  const pointsDeduction = useLoyaltyPoints ? maxUsablePoints * 1000 : 0;

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherMessage('Vui lòng nhập mã ưu đãi');
      return;
    }
    if (code === 'CINEMAX20' || code === 'BAPNUOC20') {
      const discount = Math.round((seatPriceTotal + totalFoodPrice) * 0.2);
      setAppliedDiscount(discount);
      setVoucherMessage('✅ Áp dụng mã thành công: Giảm 20% toàn đơn!');
    } else if (code === 'FNB10' || code === 'COMBO10') {
      const discount = Math.round(totalFoodPrice * 0.15);
      setAppliedDiscount(discount);
      setVoucherMessage('✅ Áp dụng mã thành công: Giảm 15% bắp nước!');
    } else {
      setAppliedDiscount(0);
      setVoucherMessage('❌ Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Grand Total calculation
  const grandTotal = Math.max(
    0,
    seatPriceTotal + totalFoodPrice - appliedDiscount - pointsDeduction
  );

  // Loyalty points earned: 5% of grand total divided by 1000
  const pointsEarned = Math.round((grandTotal * 0.05) / 1000);

  // Filtered food catalog for Step 2
  const filteredFoodItems = useMemo(() => {
    let result = foodCatalog;
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }
    if (foodSearchQuery.trim()) {
      const q = foodSearchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          CATEGORY_LABELS[item.category].toLowerCase().includes(q)
      );
    }
    return result;
  }, [foodCatalog, selectedCategory, foodSearchQuery]);

  // Final Order Submission
  const handleConfirmBooking = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Chưa chọn ghế', 'Vui lòng chọn ít nhất 1 ghế xem phim.');
      setCurrentStep(1);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng cung cấp Họ tên và Số điện thoại nhận vé.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create order in booking service
      const newOrder = await createTicketOrder({
        userId: user?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        movieId: selectedMovie.id,
        movieTitle: selectedMovie.title,
        moviePoster: selectedMovie.poster,
        theaterId: selectedTheater.id,
        theaterName: selectedTheater.name,
        roomName: selectedTheater.room,
        showtimeDate: selectedDate,
        showtimeTime: selectedShowtime.time,
        format: selectedShowtime.type,
        seats: selectedSeats,
        seatPriceTotal,
        foodItems: selectedFoodList,
        foodPriceTotal: totalFoodPrice,
        discountAmount: appliedDiscount,
        pointsUsed: useLoyaltyPoints ? maxUsablePoints : 0,
        pointsEarned,
        totalAmount: grandTotal,
        paymentMethod,
        status: 'confirmed',
        fnbPickupStatus: 'pending',
      });

      // 2. Update user points if authenticated
      if (user && updateProfile) {
        const netPointsChange =
          pointsEarned - (useLoyaltyPoints ? maxUsablePoints : 0);
        const nextPoints = Math.max(0, user.loyaltyPoints + netPointsChange);
        await updateProfile({
          loyaltyPoints: nextPoints,
        });
      }

      setConfirmedOrder(newOrder);
      setCurrentStep(4);
    } catch (err) {
      console.error('Booking order error:', err);
      Alert.alert('Lỗi đặt vé', 'Không thể hoàn tất đơn đặt vé. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (currentStep > 1 && currentStep < 4) {
              setCurrentStep(currentStep - 1);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topHeaderTitleCol}>
          <Text style={styles.topHeaderTitle}>
            {currentStep === 4 ? 'Vé Xem Phim & Bắp Nước' : 'Đặt Vé & Chọn Bắp Nước'}
          </Text>
          <Text style={styles.topHeaderSubtitle}>{selectedMovie.title}</Text>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.8}>
          <Ionicons name="home-outline" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Wizard Progress Steps (Steps 1, 2, 3) */}
      {currentStep < 4 && (
        <View style={styles.stepsBarContainer}>
          <TouchableOpacity
            style={[styles.stepItem, currentStep === 1 && styles.stepItemActive]}
            onPress={() => setCurrentStep(1)}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 1 && styles.stepCircleCompleted,
                currentStep === 1 && styles.stepCircleActive,
              ]}>
              <Text style={styles.stepCircleText}>1</Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= 1 && styles.stepLabelCompleted,
                currentStep === 1 && styles.stepLabelActive,
              ]}>
              Suất & Ghế
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.stepDivider,
              currentStep >= 2 && styles.stepDividerActive,
            ]}
          />

          <TouchableOpacity
            style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}
            onPress={() => {
              if (selectedSeats.length > 0) setCurrentStep(2);
            }}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 2 && styles.stepCircleCompleted,
                currentStep === 2 && styles.stepCircleActive,
              ]}>
              <Ionicons
                name="fast-food"
                size={13}
                color={currentStep >= 2 ? '#FFFFFF' : '#6B7280'}
              />
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= 2 && styles.stepLabelCompleted,
                currentStep === 2 && styles.stepLabelActive,
              ]}>
              Bắp Nước & Combo
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.stepDivider,
              currentStep >= 3 && styles.stepDividerActive,
            ]}
          />

          <TouchableOpacity
            style={[styles.stepItem, currentStep === 3 && styles.stepItemActive]}
            onPress={() => {
              if (selectedSeats.length > 0) setCurrentStep(3);
            }}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= 3 && styles.stepCircleCompleted,
                currentStep === 3 && styles.stepCircleActive,
              ]}>
              <Text style={styles.stepCircleText}>3</Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= 3 && styles.stepLabelCompleted,
                currentStep === 3 && styles.stepLabelActive,
              ]}>
              Thanh Toán
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          {/* ======================================================== */}
          {/* STEP 1: MOVIE, CINEMA, TIME & SEAT SELECTION             */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <View style={styles.stepWrapper}>
              {/* Movie info banner */}
              <View style={styles.selectedMovieCard}>
                <Image
                  source={{ uri: selectedMovie.poster }}
                  style={styles.selectedMoviePoster}
                />
                <View style={styles.selectedMovieInfo}>
                  <View style={styles.movieBadgeRow}>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeText}>{selectedMovie.ageRating}</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>{selectedMovie.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.selectedMovieTitle} numberOfLines={2}>
                    {selectedMovie.title}
                  </Text>
                  <Text style={styles.selectedMovieMeta}>
                    🕒 {selectedMovie.duration} • {selectedMovie.genre}
                  </Text>
                </View>
              </View>

              {/* Theater Selector */}
              <Text style={styles.sectionHeading}>CHỌN CỤM RẠP</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}>
                {THEATERS.map((t) => {
                  const isSelected = selectedTheater.id === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.theaterChip,
                        isSelected && styles.theaterChipActive,
                      ]}
                      onPress={() => setSelectedTheater(t)}
                      activeOpacity={0.85}>
                      <Ionicons
                        name="videocam"
                        size={16}
                        color={isSelected ? '#E50914' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.theaterChipText,
                          isSelected && styles.theaterChipTextActive,
                        ]}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Date Selector */}
              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
                CHỌN NGÀY CHIẾU
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}>
                {DATES.map((d, index) => {
                  const isSelected = selectedDate === d.label;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.dateChip, isSelected && styles.dateChipActive]}
                      onPress={() => setSelectedDate(d.label)}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.dateChipLabel,
                          isSelected && styles.dateChipLabelActive,
                        ]}>
                        {d.label}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipSub,
                          isSelected && styles.dateChipSubActive,
                        ]}>
                        {d.date}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Showtime Selector */}
              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
                CHỌN SUẤT CHIẾU
              </Text>
              <View style={styles.showtimeGrid}>
                {SHOWTIMES.map((st, i) => {
                  const isSelected = selectedShowtime.time === st.time;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.showtimeCard,
                        isSelected && styles.showtimeCardActive,
                      ]}
                      onPress={() => setSelectedShowtime(st)}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.showtimeTime,
                          isSelected && styles.showtimeTimeActive,
                        ]}>
                        {st.time}
                      </Text>
                      <Text
                        style={[
                          styles.showtimeType,
                          isSelected && styles.showtimeTypeActive,
                        ]}>
                        {st.type}
                      </Text>
                      <Text
                        style={[
                          styles.showtimePrice,
                          isSelected && styles.showtimePriceActive,
                        ]}>
                        {formatVND(st.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Interactive Seat Map */}
              <Text style={[styles.sectionHeading, { marginTop: 22 }]}>
                CHỌN GHẾ NGỒI • {selectedTheater.room}
              </Text>

              <View style={styles.screenCard}>
                {/* Cinema Screen Curve */}
                <View style={styles.screenCurveWrapper}>
                  <View style={styles.screenBar} />
                  <Text style={styles.screenText}>MÀN HÌNH CHIẾU LASER</Text>
                </View>

                {/* Seat Matrix */}
                <View style={styles.seatMatrix}>
                  {SEAT_ROWS.map((row) => (
                    <View key={row} style={styles.seatRow}>
                      <Text style={styles.rowLabel}>{row}</Text>
                      {Array.from({ length: SEATS_PER_ROW }).map((_, colIdx) => {
                        const seatCode = `${row}0${colIdx + 1}`;
                        const isOccupied = OCCUPIED_SEATS.includes(seatCode);
                        const isSelected = selectedSeats.includes(seatCode);
                        const isVipRow = row === 'E' || row === 'F';

                        return (
                          <TouchableOpacity
                            key={seatCode}
                            disabled={isOccupied}
                            onPress={() => handleToggleSeat(seatCode)}
                            style={[
                              styles.seatBox,
                              isVipRow && styles.seatBoxVip,
                              isSelected && styles.seatBoxSelected,
                              isOccupied && styles.seatBoxOccupied,
                            ]}
                            activeOpacity={0.7}>
                            <Text
                              style={[
                                styles.seatNumberText,
                                isSelected && styles.seatNumberTextSelected,
                                isOccupied && styles.seatNumberTextOccupied,
                              ]}>
                              {colIdx + 1}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <Text style={styles.rowLabel}>{row}</Text>
                    </View>
                  ))}
                </View>

                {/* Seat Map Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={styles.seatBox} />
                    <Text style={styles.legendText}>Ghế thường</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.seatBox, styles.seatBoxVip]} />
                    <Text style={styles.legendText}>Ghế VIP</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.seatBox, styles.seatBoxSelected]} />
                    <Text style={styles.legendText}>Đang chọn</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.seatBox, styles.seatBoxOccupied]} />
                    <Text style={styles.legendText}>Đã bán</Text>
                  </View>
                </View>
              </View>

              {/* Selected Seats summary bar */}
              <View style={styles.step1SummaryCard}>
                <View style={styles.step1SummaryLeft}>
                  <Text style={styles.step1SummaryLabel}>Ghế đã chọn:</Text>
                  <Text style={styles.step1SummarySeats}>
                    {selectedSeats.length > 0
                      ? selectedSeats.join(', ')
                      : 'Chưa chọn ghế nào'}
                  </Text>
                  <Text style={styles.step1SummaryTotal}>
                    Tạm tính vé: {formatVND(seatPriceTotal)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryNextBtn,
                    selectedSeats.length === 0 && styles.primaryNextBtnDisabled,
                  ]}
                  disabled={selectedSeats.length === 0}
                  onPress={() => setCurrentStep(2)}
                  activeOpacity={0.85}>
                  <Text style={styles.primaryNextBtnText}>Chọn Bắp Nước</Text>
                  <Ionicons name="fast-food-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* STEP 2: CHỌN ĐỒ ĂN & THỨC UỐNG (F&B CONCESSION)           */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <View style={styles.stepWrapper}>
              {/* Highlight Concession Banner */}
              <View style={styles.fnbFeatureBanner}>
                <View style={styles.fnbFeatureIconWrap}>
                  <Ionicons name="fast-food" size={26} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.fnbTag}>
                    <Text style={styles.fnbTagText}>ƯU ĐÃI KÈM VÉ XEM PHIM</Text>
                  </View>
                  <Text style={styles.fnbFeatureTitle}>
                    Thực Đơn Bắp Nước & Combo Rạp
                  </Text>
                  <Text style={styles.fnbFeatureDesc}>
                    Chọn bắp rang nóng giòn, nước ngọt mát lạnh hoặc combo tiết kiệm
                    thêm trực tiếp vào đơn đặt vé để nhận ngay tại quầy Concession!
                  </Text>
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.fnbSearchContainer}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.fnbSearchInput}
                  placeholder="Tìm bắp caramel, phô mai, coca, trà đào..."
                  placeholderTextColor="#6B7280"
                  value={foodSearchQuery}
                  onChangeText={setFoodSearchQuery}
                  clearButtonMode="while-editing"
                />
                {foodSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setFoodSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChips}>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'combo', label: '🍿+🥤 Combo Ưu Đãi' },
                  { id: 'popcorn', label: '🍿 Bắp Rang Bơ' },
                  { id: 'drink', label: '🥤 Nước Giải Khát' },
                  { id: 'snack', label: '🍟 Snack & Ăn Vặt' },
                ].map((c) => {
                  const isSelected = selectedCategory === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillActive,
                      ]}
                      onPress={() => setSelectedCategory(c.id)}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextActive,
                        ]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Food Items List */}
              {loadingFood ? (
                <View style={styles.foodLoadingWrap}>
                  <ActivityIndicator size="large" color="#E50914" />
                  <Text style={styles.foodLoadingText}>
                    Đang tải danh mục Bắp & Nước rạp...
                  </Text>
                </View>
              ) : filteredFoodItems.length === 0 ? (
                <View style={styles.emptyFoodWrap}>
                  <Ionicons name="fast-food-outline" size={48} color="#4B5563" />
                  <Text style={styles.emptyFoodTitle}>
                    Không tìm thấy món ăn, thức uống phù hợp
                  </Text>
                  <Text style={styles.emptyFoodSubtitle}>
                    Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục
                  </Text>
                </View>
              ) : (
                <View style={styles.foodItemsGrid}>
                  {filteredFoodItems.map((item) => {
                    const selected = selectedFoodMap[item.id];
                    const qty = selected?.quantity || 0;
                    const catColors = CATEGORY_COLORS[item.category];
                    const hasDiscount =
                      item.originalPrice && item.originalPrice > item.price;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.foodItemCard,
                          !item.isAvailable && styles.foodItemCardDisabled,
                          qty > 0 && styles.foodItemCardSelected,
                        ]}>
                        <View style={styles.foodItemImageContainer}>
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.foodItemImage}
                          />

                          {/* Category Badge */}
                          <View
                            style={[
                              styles.foodItemCatBadge,
                              {
                                backgroundColor: catColors.bg,
                                borderColor: catColors.border,
                              },
                            ]}>
                            <Ionicons
                              name={CATEGORY_ICONS[item.category] as any}
                              size={11}
                              color={catColors.text}
                              style={{ marginRight: 3 }}
                            />
                            <Text
                              style={[
                                styles.foodItemCatText,
                                { color: catColors.text },
                              ]}>
                              {CATEGORY_LABELS[item.category]}
                            </Text>
                          </View>

                          {/* Hot Badge */}
                          {item.isBestSeller && (
                            <View style={styles.hotBadge}>
                              <Ionicons name="flame" size={10} color="#FFFFFF" />
                              <Text style={styles.hotBadgeText}>BÁN CHẠY</Text>
                            </View>
                          )}

                          {!item.isAvailable && (
                            <View style={styles.outOfStockMask}>
                              <Text style={styles.outOfStockMaskText}>HẾT HÀNG</Text>
                            </View>
                          )}
                        </View>

                        {/* Content */}
                        <View style={styles.foodItemBody}>
                          <View style={styles.foodItemTitleRow}>
                            <Text style={styles.foodItemTitle} numberOfLines={2}>
                              {item.name}
                            </Text>
                            {item.size ? (
                              <View style={styles.foodItemSizeBadge}>
                                <Text style={styles.foodItemSizeText}>
                                  {item.size}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.foodItemDesc} numberOfLines={2}>
                            {item.description}
                          </Text>

                          {/* Meta Calories & Prep */}
                          <View style={styles.foodItemMetaRow}>
                            {item.calories ? (
                              <Text style={styles.foodItemMetaText}>
                                🔥 {item.calories} kcal
                              </Text>
                            ) : null}
                            {item.preparationTime ? (
                              <Text style={styles.foodItemMetaText}>
                                ⏱️ {item.preparationTime}
                              </Text>
                            ) : null}
                          </View>

                          {/* Price & Action Row */}
                          <View style={styles.foodItemPriceActionRow}>
                            <View>
                              <Text style={styles.foodItemPrice}>
                                {formatVND(item.price)}
                              </Text>
                              {hasDiscount && (
                                <Text style={styles.foodItemOriginalPrice}>
                                  {formatVND(item.originalPrice!)}
                                </Text>
                              )}
                            </View>

                            {/* Stepper Quantity Button */}
                            {!item.isAvailable ? (
                              <View style={styles.stepperDisabled}>
                                <Text style={styles.stepperDisabledText}>
                                  Tạm hết
                                </Text>
                              </View>
                            ) : qty === 0 ? (
                              <TouchableOpacity
                                style={styles.addInitialBtn}
                                onPress={() => handleAddFoodQuantity(item)}
                                activeOpacity={0.85}>
                                <Ionicons name="add" size={16} color="#FFFFFF" />
                                <Text style={styles.addInitialBtnText}>Thêm</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.stepperControl}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => handleDecreaseFoodQuantity(item)}
                                  activeOpacity={0.75}>
                                  <Ionicons
                                    name={qty === 1 ? 'trash-outline' : 'remove'}
                                    size={15}
                                    color="#EF4444"
                                  />
                                </TouchableOpacity>

                                <View style={styles.stepperCountWrap}>
                                  <Text style={styles.stepperCountText}>{qty}</Text>
                                </View>

                                <TouchableOpacity
                                  style={[styles.stepperBtn, styles.stepperBtnPlus]}
                                  onPress={() => handleAddFoodQuantity(item)}
                                  activeOpacity={0.75}>
                                  <Ionicons name="add" size={15} color="#FFFFFF" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Sticky Selected Food Cart Bottom Bar */}
              <View style={styles.fnbSelectedFooter}>
                <View style={styles.fnbFooterInfo}>
                  <View style={styles.fnbFooterCountRow}>
                    <Ionicons name="fast-food" size={18} color="#F59E0B" />
                    <Text style={styles.fnbFooterCountText}>
                      {totalFoodCount > 0
                        ? `${totalFoodCount} món bắp nước đã chọn`
                        : 'Chưa chọn bắp nước'}
                    </Text>
                  </View>

                  <Text style={styles.fnbFooterPriceText}>
                    {formatVND(totalFoodPrice)}
                    <Text style={styles.fnbFooterSubText}>
                      {' '}
                      (+ Vé: {formatVND(seatPriceTotal)})
                    </Text>
                  </Text>
                </View>

                <View style={styles.fnbFooterActions}>
                  {totalFoodCount === 0 ? (
                    <TouchableOpacity
                      style={styles.skipFoodBtn}
                      onPress={() => setCurrentStep(3)}
                      activeOpacity={0.85}>
                      <Text style={styles.skipFoodBtnText}>Bỏ qua bắp nước</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.proceedCheckoutBtn}
                    onPress={() => setCurrentStep(3)}
                    activeOpacity={0.85}>
                    <Text style={styles.proceedCheckoutBtnText}>
                      {totalFoodCount > 0 ? 'Thêm Vào Đơn' : 'Tiếp Tục'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* STEP 3: ORDER SUMMARY, F&B REVIEW & PAYMENT CHECKOUT    */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <View style={styles.stepWrapper}>
              {/* Movie Ticket Review Card */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Ionicons name="film-outline" size={20} color="#E50914" />
                  <Text style={styles.reviewCardTitle}>THÔNG TIN VÉ XEM PHIM</Text>
                </View>

                <View style={styles.reviewMovieRow}>
                  <Image
                    source={{ uri: selectedMovie.poster }}
                    style={styles.reviewMoviePoster}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewMovieName}>{selectedMovie.title}</Text>
                    <Text style={styles.reviewMetaRow}>
                      📍 {selectedTheater.name}
                    </Text>
                    <Text style={styles.reviewMetaRow}>
                      🚪 {selectedTheater.room} • {selectedShowtime.type}
                    </Text>
                    <Text style={styles.reviewMetaRow}>
                      🕒 {selectedShowtime.time} - {selectedDate}
                    </Text>
                    <Text style={styles.reviewSeatsRow}>
                      🪑 Ghế: <Text style={styles.highlightText}>{selectedSeats.join(', ')}</Text> ({selectedSeats.length} vé)
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewLineItem}>
                  <Text style={styles.reviewLineLabel}>
                    Tiền vé ({selectedSeats.length} x {formatVND(seatPricePerTicket)}):
                  </Text>
                  <Text style={styles.reviewLineValue}>
                    {formatVND(seatPriceTotal)}
                  </Text>
                </View>
              </View>

              {/* ATTACHED FOOD & DRINKS BREAKDOWN CARD (Requested Feature) */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Ionicons name="fast-food-outline" size={20} color="#F59E0B" />
                  <Text style={styles.reviewCardTitle}>
                    ĐỒ ĂN & THỨC UỐNG ĐÍNH KÈM ĐƠN VÉ
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCurrentStep(2)}
                    style={styles.editFoodBtn}>
                    <Text style={styles.editFoodBtnText}>Sửa / Thêm món</Text>
                  </TouchableOpacity>
                </View>

                {selectedFoodList.length === 0 ? (
                  <View style={styles.noFoodChosenWrap}>
                    <Ionicons name="fast-food-outline" size={32} color="#6B7280" />
                    <Text style={styles.noFoodChosenText}>
                      Bạn chưa chọn bắp nước kèm theo đơn vé này.
                    </Text>
                    <TouchableOpacity
                      style={styles.addFoodNowBtn}
                      onPress={() => setCurrentStep(2)}
                      activeOpacity={0.85}>
                      <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.addFoodNowBtnText}>
                        Chọn Bắp Nước Ngay
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.foodListReview}>
                    {selectedFoodList.map((fItem) => (
                      <View key={fItem.foodId} style={styles.foodReviewRow}>
                        <Image
                          source={{ uri: fItem.imageUrl }}
                          style={styles.foodReviewThumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodReviewName}>{fItem.name}</Text>
                          <Text style={styles.foodReviewSub}>
                            {fItem.size ? `${fItem.size} • ` : ''}
                            {formatVND(fItem.price)} / phần
                          </Text>
                        </View>
                        <View style={styles.foodReviewQtyPrice}>
                          <Text style={styles.foodReviewQty}>
                            x{fItem.quantity}
                          </Text>
                          <Text style={styles.foodReviewLineTotal}>
                            {formatVND(fItem.price * fItem.quantity)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.reviewDivider} />

                    <View style={styles.reviewLineItem}>
                      <Text style={styles.reviewLineLabel}>
                        Tổng tiền bắp & nước ({totalFoodCount} món):
                      </Text>
                      <Text style={[styles.reviewLineValue, { color: '#F59E0B' }]}>
                        {formatVND(totalFoodPrice)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Customer Contact Information */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.reviewCardTitle}>THÔNG TIN NHẬN VÉ</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Họ và tên khách hàng *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Nhập họ tên"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Số điện thoại nhận mã vé *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email nhận hóa đơn điện tử</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customerEmail}
                    onChangeText={setCustomerEmail}
                    placeholder="Nhập email"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Voucher & Loyalty Points */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Ionicons name="gift-outline" size={18} color="#F59E0B" />
                  <Text style={styles.reviewCardTitle}>ƯU ĐÃI & ĐIỂM THƯỞNG</Text>
                </View>

                {/* Loyalty points toggle */}
                {user ? (
                  <View style={styles.pointsBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointsBoxTitle}>
                        Điểm thành viên CineMax
                      </Text>
                      <Text style={styles.pointsBoxSub}>
                        Bạn có {availablePoints} điểm (Tối đa dùng {maxUsablePoints}{' '}
                        điểm = {formatVND(maxUsablePoints * 1000)})
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.pointsToggleBtn,
                        useLoyaltyPoints && styles.pointsToggleBtnActive,
                      ]}
                      onPress={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                      activeOpacity={0.8}>
                      <Ionicons
                        name={
                          useLoyaltyPoints ? 'checkmark-circle' : 'ellipse-outline'
                        }
                        size={18}
                        color={useLoyaltyPoints ? '#FFFFFF' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.pointsToggleBtnText,
                          useLoyaltyPoints && styles.pointsToggleBtnTextActive,
                        ]}>
                        {useLoyaltyPoints ? 'Đang dùng' : 'Dùng điểm'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Voucher code input */}
                <View style={styles.voucherInputRow}>
                  <TextInput
                    style={styles.voucherInput}
                    placeholder="Nhập mã ưu đãi (CINEMAX20, FNB10)"
                    placeholderTextColor="#6B7280"
                    value={voucherCode}
                    onChangeText={setVoucherCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.applyVoucherBtn}
                    onPress={handleApplyVoucher}
                    activeOpacity={0.85}>
                    <Text style={styles.applyVoucherBtnText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
                {voucherMessage ? (
                  <Text style={styles.voucherMessageText}>{voucherMessage}</Text>
                ) : null}
              </View>

              {/* Payment Method Selector */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.reviewCardTitle}>PHƯƠNG THỨC THANH TOÁN</Text>
                </View>

                {[
                  {
                    id: 'momo',
                    title: 'Ví Điện Tử MoMo',
                    desc: 'Thanh toán tức thì không phí',
                    icon: 'wallet',
                    color: '#D82D8B',
                  },
                  {
                    id: 'vnpay',
                    title: 'VNPAY-QR',
                    desc: 'Quét mã qua app ngân hàng',
                    icon: 'qr-code',
                    color: '#005BAA',
                  },
                  {
                    id: 'card',
                    title: 'Thẻ Quốc Tế / ATM Nội Địa',
                    desc: 'Visa, Mastercard, JCB, Napas',
                    icon: 'card',
                    color: '#3B82F6',
                  },
                  {
                    id: 'membership',
                    title: 'Ví Thẻ Thành Viên CineMax',
                    desc: 'Trừ số dư tài khoản thành viên',
                    icon: 'sparkles',
                    color: '#F59E0B',
                  },
                  {
                    id: 'counter',
                    title: 'Thanh Toán Tại Quầy Rạp',
                    desc: 'Nhận vé & trả tiền trực tiếp',
                    icon: 'storefront',
                    color: '#10B981',
                  },
                ].map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.paymentOption,
                        isSelected && styles.paymentOptionSelected,
                      ]}
                      onPress={() => setPaymentMethod(pm.id as PaymentMethod)}
                      activeOpacity={0.85}>
                      <View
                        style={[
                          styles.paymentIconWrap,
                          { backgroundColor: `${pm.color}22` },
                        ]}>
                        <Ionicons
                          name={pm.icon as any}
                          size={18}
                          color={pm.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentOptionTitle}>{pm.title}</Text>
                        <Text style={styles.paymentOptionDesc}>{pm.desc}</Text>
                      </View>
                      <Ionicons
                        name={
                          isSelected
                            ? 'radio-button-on'
                            : 'radio-button-off-outline'
                        }
                        size={20}
                        color={isSelected ? '#E50914' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Final Payment Price Breakdown */}
              <View style={styles.totalBreakdownCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tổng tiền vé xem phim:</Text>
                  <Text style={styles.breakdownValue}>
                    {formatVND(seatPriceTotal)}
                  </Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tổng tiền bắp nước:</Text>
                  <Text style={styles.breakdownValue}>
                    {formatVND(totalFoodPrice)}
                  </Text>
                </View>

                {appliedDiscount > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: '#10B981' }]}>
                      Khuyến mãi / Giảm giá:
                    </Text>
                    <Text style={[styles.breakdownValue, { color: '#10B981' }]}>
                      -{formatVND(appliedDiscount)}
                    </Text>
                  </View>
                ) : null}

                {pointsDeduction > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: '#10B981' }]}>
                      Đổi {maxUsablePoints} điểm tích lũy:
                    </Text>
                    <Text style={[styles.breakdownValue, { color: '#10B981' }]}>
                      -{formatVND(pointsDeduction)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.reviewDivider} />

                <View style={styles.breakdownRowTotal}>
                  <View>
                    <Text style={styles.totalGrandLabel}>TỔNG THANH TOÁN</Text>
                    <Text style={styles.pointsEarnTip}>
                      🎉 Tích lũy: +{pointsEarned} điểm thưởng
                    </Text>
                  </View>
                  <Text style={styles.totalGrandValue}>{formatVND(grandTotal)}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmBookingBtn,
                    isSubmitting && styles.confirmBookingBtnDisabled,
                  ]}
                  disabled={isSubmitting}
                  onPress={handleConfirmBooking}
                  activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.confirmBookingBtnText}>
                        Xác Nhận Đặt Vé & Bắp Nước ({formatVND(grandTotal)})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* STEP 4: BOOKING SUCCESS & CONCESSION PICKUP VOUCHER      */}
          {/* ======================================================== */}
          {currentStep === 4 && confirmedOrder && (
            <View style={styles.successWrapper}>
              <View style={styles.successHeaderCard}>
                <View style={styles.successCheckCircle}>
                  <Ionicons name="checkmark-done" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>ĐẶT VÉ THÀNH CÔNG!</Text>
                <Text style={styles.successSub}>
                  Đơn đặt vé và bắp nước đã được xác nhận vào hệ thống
                </Text>
                <View style={styles.orderCodeBadge}>
                  <Text style={styles.orderCodeBadgeLabel}>MÃ ĐƠN HÀNG:</Text>
                  <Text style={styles.orderCodeBadgeValue}>
                    {confirmedOrder.orderCode}
                  </Text>
                </View>
              </View>

              {/* Barcode & QR Code simulation */}
              <View style={styles.ticketBarcodeCard}>
                <Text style={styles.barcodeInstruction}>
                  Xuất trình mã này tại Cổng Soát Vé & Quầy Bắp Nước Concession
                </Text>
                <View style={styles.barcodeBox}>
                  {/* Fake barcode vertical lines */}
                  <View style={styles.barcodeLinesRow}>
                    {Array.from({ length: 36 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.barcodeLine,
                          {
                            width: i % 3 === 0 ? 3 : i % 5 === 0 ? 4 : 2,
                            backgroundColor: i % 4 === 1 ? '#000000' : '#222222',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.barcodeDigits}>
                    {confirmedOrder.barcode}
                  </Text>
                </View>
              </View>

              {/* Concession Food Pickup Notice (Core Request Highlight) */}
              <View style={styles.concessionPickupCard}>
                <View style={styles.concessionHeaderRow}>
                  <View style={styles.concessionIconCircle}>
                    <Ionicons name="fast-food" size={22} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.concessionTitle}>
                      QUẦY BẮP NƯỚC (CONCESSION)
                    </Text>
                    <Text style={styles.concessionStatusText}>
                      Trạng thái: 🟡 Sẵn sàng nhận tại quầy rạp
                    </Text>
                  </View>
                </View>

                <Text style={styles.concessionGuide}>
                  🎬 Vui lòng ghé quầy Bắp Nước tại{' '}
                  <Text style={styles.highlightText}>
                    {confirmedOrder.theaterName}
                  </Text>{' '}
                  trước giờ chiếu 10 - 15 phút, xuất trình mã{' '}
                  <Text style={styles.highlightText}>
                    {confirmedOrder.orderCode}
                  </Text>{' '}
                  để nhân viên chuẩn bị nóng hổi cho bạn!
                </Text>

                {confirmedOrder.foodItems.length > 0 ? (
                  <View style={styles.concessionItemList}>
                    <Text style={styles.concessionItemHead}>
                      Món bắp nước cần nhận ({confirmedOrder.foodItems.length}):
                    </Text>
                    {confirmedOrder.foodItems.map((fi) => (
                      <View key={fi.foodId} style={styles.concessionItemRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.concessionItemName}>
                          {fi.name} {fi.size ? `(${fi.size})` : ''}
                        </Text>
                        <Text style={styles.concessionItemQty}>
                          x{fi.quantity}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noFoodInTicketNotice}>
                    (Đơn vé không có bắp nước đính kèm)
                  </Text>
                )}
              </View>

              {/* Ticket Details Summary */}
              <View style={styles.successTicketDetails}>
                <Text style={styles.successDetailsHeading}>CHI TIẾT VÉ</Text>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Phim:</Text>
                  <Text style={styles.successDetailValue}>
                    {confirmedOrder.movieTitle}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Rạp & Phòng:</Text>
                  <Text style={styles.successDetailValue}>
                    {confirmedOrder.theaterName} • {confirmedOrder.roomName}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Suất chiếu:</Text>
                  <Text style={styles.successDetailValue}>
                    {confirmedOrder.showtimeTime} - {confirmedOrder.showtimeDate}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Ghế:</Text>
                  <Text
                    style={[styles.successDetailValue, { color: '#E50914' }]}>
                    {confirmedOrder.seats.join(', ')}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Tổng thanh toán:</Text>
                  <Text
                    style={[styles.successDetailValue, { color: '#10B981' }]}>
                    {formatVND(confirmedOrder.totalAmount)}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.successActionsRow}>
                <TouchableOpacity
                  style={styles.viewProfileTicketBtn}
                  onPress={() => router.push('/profile')}
                  activeOpacity={0.85}>
                  <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewProfileTicketBtnText}>
                    Xem Vé Trong Hồ Sơ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backHomeBtn}
                  onPress={() => router.push('/')}
                  activeOpacity={0.85}>
                  <Ionicons name="home-outline" size={18} color="#D1D5DB" />
                  <Text style={styles.backHomeBtnText}>Về Trang Chủ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
    backgroundColor: '#0B0C10',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#151821',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#232838',
  },
  homeBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#151821',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#232838',
  },
  topHeaderTitleCol: {
    flex: 1,
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topHeaderSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  stepsBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#111319',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.6,
  },
  stepItemActive: {
    opacity: 1,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#232838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#E50914',
  },
  stepCircleCompleted: {
    backgroundColor: '#E50914',
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: '#E5E7EB',
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: '#232838',
    marginHorizontal: 8,
  },
  stepDividerActive: {
    backgroundColor: '#E50914',
  },
  stepWrapper: {
    width: '100%',
    paddingVertical: 10,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  selectedMovieCard: {
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 18,
    gap: 12,
  },
  selectedMoviePoster: {
    width: 60,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#1F2430',
  },
  selectedMovieInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  movieBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  ageBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  ratingBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingBadgeText: {
    color: '#F5C518',
    fontSize: 10,
    fontWeight: '700',
  },
  selectedMovieTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  selectedMovieMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  horizontalChips: {
    gap: 8,
    paddingBottom: 4,
  },
  theaterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232838',
    gap: 6,
  },
  theaterChipActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  theaterChipText: {
    color: '#9CA3AF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  theaterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateChip: {
    backgroundColor: '#151821',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232838',
    alignItems: 'center',
    minWidth: 70,
  },
  dateChipActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
  dateChipLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateChipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateChipSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  dateChipSubActive: {
    color: '#E50914',
    fontWeight: '700',
  },
  showtimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  showtimeCard: {
    width: '31%',
    backgroundColor: '#151821',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#232838',
    alignItems: 'center',
  },
  showtimeCardActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  showtimeTime: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  showtimeTimeActive: {
    color: '#E50914',
  },
  showtimeType: {
    color: '#9CA3AF',
    fontSize: 10.5,
    marginTop: 2,
  },
  showtimeTypeActive: {
    color: '#E5E7EB',
  },
  showtimePrice: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  showtimePriceActive: {
    color: '#F59E0B',
  },
  screenCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 16,
    alignItems: 'center',
  },
  screenCurveWrapper: {
    width: '85%',
    alignItems: 'center',
    marginBottom: 20,
  },
  screenBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E50914',
    borderRadius: 2,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  screenText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  seatMatrix: {
    gap: 8,
    alignItems: 'center',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    width: 14,
    textAlign: 'center',
  },
  seatBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#232838',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D3345',
  },
  seatBoxVip: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: '#2A261E',
  },
  seatBoxSelected: {
    backgroundColor: '#E50914',
    borderColor: '#FF3344',
  },
  seatBoxOccupied: {
    backgroundColor: '#111319',
    borderColor: '#181A22',
    opacity: 0.35,
  },
  seatNumberText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
  },
  seatNumberTextSelected: {
    color: '#FFFFFF',
  },
  seatNumberTextOccupied: {
    color: '#4B5563',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  step1SummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151821',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232838',
  },
  step1SummaryLeft: {
    flex: 1,
  },
  step1SummaryLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  step1SummarySeats: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  step1SummaryTotal: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  primaryNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  primaryNextBtnDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.5,
  },
  primaryNextBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fnbFeatureBanner: {
    flexDirection: 'row',
    backgroundColor: '#1A1813',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
    gap: 12,
  },
  fnbFeatureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fnbTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  fnbTagText: {
    color: '#F59E0B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fnbFeatureTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  fnbFeatureDesc: {
    color: '#9CA3AF',
    fontSize: 11.5,
    lineHeight: 16,
  },
  fnbSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 12,
    gap: 8,
  },
  fnbSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#232838',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  categoryPillText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  foodLoadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  foodLoadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyFoodWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyFoodTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyFoodSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  foodItemsGrid: {
    gap: 12,
    marginTop: 12,
  },
  foodItemCard: {
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#232838',
    gap: 12,
  },
  foodItemCardDisabled: {
    opacity: 0.6,
  },
  foodItemCardSelected: {
    borderColor: 'rgba(229, 9, 20, 0.4)',
    backgroundColor: '#18151A',
  },
  foodItemImageContainer: {
    position: 'relative',
    width: 95,
    height: 95,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1F2430',
  },
  foodItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  foodItemCatBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  foodItemCatText: {
    fontSize: 9,
    fontWeight: '700',
  },
  hotBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  hotBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  outOfStockMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockMaskText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  foodItemBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  foodItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  foodItemTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  foodItemSizeBadge: {
    backgroundColor: '#232838',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  foodItemSizeText: {
    color: '#9CA3AF',
    fontSize: 9.5,
    fontWeight: '600',
  },
  foodItemDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  foodItemMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 3,
  },
  foodItemMetaText: {
    color: '#6B7280',
    fontSize: 10,
  },
  foodItemPriceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  foodItemPrice: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  foodItemOriginalPrice: {
    color: '#6B7280',
    fontSize: 10.5,
    textDecorationLine: 'line-through',
  },
  stepperDisabled: {
    backgroundColor: '#1F2430',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stepperDisabledText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  addInitialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addInitialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2330',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E3547',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPlus: {
    backgroundColor: '#E50914',
    borderRadius: 5,
  },
  stepperCountWrap: {
    paddingHorizontal: 8,
  },
  stepperCountText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  fnbSelectedFooter: {
    marginTop: 20,
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2E3D',
  },
  fnbFooterInfo: {
    marginBottom: 12,
  },
  fnbFooterCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fnbFooterCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fnbFooterPriceText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  fnbFooterSubText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  fnbFooterActions: {
    flexDirection: 'row',
    gap: 10,
  },
  skipFoodBtn: {
    flex: 1,
    backgroundColor: '#1F2430',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  skipFoodBtnText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
  },
  proceedCheckoutBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    borderRadius: 10,
    paddingVertical: 11,
    gap: 6,
  },
  proceedCheckoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 16,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reviewCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  editFoodBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editFoodBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewMovieRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewMoviePoster: {
    width: 65,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1F2430',
  },
  reviewMovieName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  reviewMetaRow: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  reviewSeatsRow: {
    color: '#E5E7EB',
    fontSize: 12,
    marginTop: 4,
  },
  highlightText: {
    color: '#E50914',
    fontWeight: '800',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#1F2430',
    marginVertical: 12,
  },
  reviewLineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLineLabel: {
    color: '#9CA3AF',
    fontSize: 12.5,
  },
  reviewLineValue: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  noFoodChosenWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  noFoodChosenText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  addFoodNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginTop: 6,
  },
  addFoodNowBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  foodListReview: {
    gap: 10,
  },
  foodReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foodReviewThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#1F2430',
  },
  foodReviewName: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  foodReviewSub: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  foodReviewQtyPrice: {
    alignItems: 'flex-end',
  },
  foodReviewQty: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  foodReviewLineTotal: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#111319',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#232838',
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1813',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 12,
    gap: 8,
  },
  pointsBoxTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pointsBoxSub: {
    color: '#F59E0B',
    fontSize: 11,
    marginTop: 2,
  },
  pointsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2E3D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pointsToggleBtnActive: {
    backgroundColor: '#10B981',
  },
  pointsToggleBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  pointsToggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#111319',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#232838',
  },
  applyVoucherBtn: {
    backgroundColor: '#2A2E3D',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  applyVoucherBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  voucherMessageText: {
    fontSize: 11.5,
    color: '#F59E0B',
    marginTop: 6,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111319',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 8,
    gap: 12,
  },
  paymentOptionSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  paymentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentOptionDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  totalBreakdownCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2E3D',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    color: '#9CA3AF',
    fontSize: 12.5,
  },
  breakdownValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalGrandLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pointsEarnTip: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  totalGrandValue: {
    color: '#E50914',
    fontSize: 20,
    fontWeight: '900',
  },
  confirmBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  confirmBookingBtnDisabled: {
    opacity: 0.6,
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  successHeaderCard: {
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232838',
    width: '100%',
    marginBottom: 16,
  },
  successCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  successSub: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  orderCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.4)',
    gap: 6,
    marginTop: 14,
  },
  orderCodeBadgeLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  orderCodeBadgeValue: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ticketBarcodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  barcodeInstruction: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  barcodeBox: {
    alignItems: 'center',
  },
  barcodeLinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 48,
  },
  barcodeLine: {
    height: '100%',
    borderRadius: 1,
  },
  barcodeDigits: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 6,
  },
  concessionPickupCard: {
    backgroundColor: '#1A1813',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    width: '100%',
    marginBottom: 16,
  },
  concessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  concessionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  concessionTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  concessionStatusText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  concessionGuide: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  concessionItemList: {
    backgroundColor: '#111319',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  concessionItemHead: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  concessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  concessionItemName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  concessionItemQty: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  noFoodInTicketNotice: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontStyle: 'italic',
  },
  successTicketDetails: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
    width: '100%',
    marginBottom: 20,
  },
  successDetailsHeading: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  successDetailLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  successDetailValue: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  successActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  viewProfileTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  viewProfileTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  backHomeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2430',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  backHomeBtnText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
});

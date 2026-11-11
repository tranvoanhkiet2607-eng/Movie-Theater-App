// Nguyễn Minh Quân - CE180048
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { SeatAPI, ShowtimeAPI, FoodAPI, PromotionAPI } from '@/services/api';
import { ShowtimeSeatItem, ShowtimeSeatMapResponse } from '@/types/seat';
import { ShowtimePricingResponse } from '@/types/showtime';
import { FoodItem } from '@/types/food';
import { Promotion } from '@/types/promotion';

export default function SeatBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showtimeId?: string }>();
  const { user, isAuthenticated } = useAuth();

  // Token nhận diện phiên chọn ghế độc nhất của thiết bị
  const [holdToken] = useState<string>(
    () => `tok_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
  );

  const [activeShowtimeId, setActiveShowtimeId] = useState<string>(
    params.showtimeId || 'st-m1-t1-d0-0930'
  );

  // ─── Data States ────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<ShowtimeSeatMapResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Selected Seats & Hold Timer States (UC25) ──────────────────────────────
  const [selectedSeatCodes, setSelectedSeatCodes] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Ví MoMo');
  const [isHoldingLoading, setIsHoldingLoading] = useState<boolean>(false);

  // ─── Modals & Notices State ─────────────────────────────────────────────────
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);
  const [seatNotice, setSeatNotice] = useState<string | null>(null);
  const [orphanWarning, setOrphanWarning] = useState<string | null>(null);

  // ─── UC27: View Ticket Prices State ──────────────────────────────────────────
  const [pricingModalVisible, setPricingModalVisible] = useState<boolean>(false);
  const [pricingData, setPricingData] = useState<ShowtimePricingResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState<boolean>(false);

  // ─── Food & Drinks State (UC38) ─────────────────────────────────────────────
  const [availableFoods, setAvailableFoods] = useState<FoodItem[]>([]);
  const [loadingFoods, setLoadingFoods] = useState<boolean>(false);
  const [foodQuantities, setFoodQuantities] = useState<{ [foodId: string]: number }>({});
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all');

  // ─── Promotion Voucher State (UC39) ─────────────────────────────────────────
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponChecking, setCouponChecking] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch Seat Map for Showtime ────────────────────────────────────────────
  const fetchSeatMap = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setIsLoading(true);
        setErrorMessage(null);

        const res = await SeatAPI.getShowtimeSeatMap(activeShowtimeId, {
          holdToken,
          userId: user?.id,
        });

        setData(res);

        // Đồng bộ các ghế đang được giữ bởi user này nếu server phản hồi
        if (res.myHold && res.myHold.seatCodes?.length > 0) {
          setSelectedSeatCodes(res.myHold.seatCodes);
          setRemainingSeconds(res.myHold.remainingSeconds || 300);
          setHoldExpiresAt(res.myHold.expiresAt);
        }
      } catch (err: any) {
        if (!isBackground) {
          setErrorMessage(
            err?.message || 'Không thể tải sơ đồ ghế của suất chiếu lúc này.'
          );
        }
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [activeShowtimeId, holdToken, user?.id]
  );

  // Khởi tạo và thiết lập polling làm mới trạng thái ghế ngầm mỗi 15 giây
  useEffect(() => {
    fetchSeatMap();

    refreshIntervalRef.current = setInterval(() => {
      fetchSeatMap(true);
    }, 15000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchSeatMap]);

  // Đồng bộ params từ bên ngoài
  useEffect(() => {
    if (params.showtimeId && params.showtimeId !== activeShowtimeId) {
      setActiveShowtimeId(params.showtimeId);
      setSelectedSeatCodes([]);
      setRemainingSeconds(0);
      setHoldExpiresAt(null);
    }
  }, [params.showtimeId]);

  // ─── Countdown Timer cho ghế đang giữ chỗ (UC25) ─────────────────────────────
  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (selectedSeatCodes.length > 0 && holdExpiresAt) {
        // Hết thời gian giữ chỗ
        Alert.alert(
          'Hết thời gian giữ chỗ',
          'Thời gian giữ chỗ ghế (5 phút) đã hết hạn. Hệ thống đã mở lại ghế cho khách hàng khác để tránh chiếm chỗ.',
          [{ text: 'Đã hiểu' }]
        );
        setSelectedSeatCodes([]);
        setHoldExpiresAt(null);
        fetchSeatMap();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds, selectedSeatCodes.length, holdExpiresAt, fetchSeatMap]);

  // Giải phóng ghế khi rời khỏi màn hình
  useEffect(() => {
    return () => {
      if (selectedSeatCodes.length > 0) {
        SeatAPI.releaseSeats({
          showtimeId: activeShowtimeId,
          holdToken,
          userId: user?.id,
        }).catch(() => {});
      }
    };
  }, [activeShowtimeId, holdToken, user?.id, selectedSeatCodes.length]);

  // ─── Format Timer (MM:SS) ───────────────────────────────────────────────────
  const timerDisplay = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [remainingSeconds]);

  // ─── Group Seats By Row ────────────────────────────────────────────────────
  const seatsByRow = useMemo(() => {
    if (!data?.seatMap) return [];
    const map: Record<string, ShowtimeSeatItem[]> = {};

    data.seatMap.forEach((seat) => {
      const r = seat.row.toUpperCase();
      if (!map[r]) map[r] = [];
      map[r].push(seat);
    });

    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => a.colNumber - b.colNumber);
    });

    const sortedRowKeys = Object.keys(map).sort();
    return sortedRowKeys.map((r) => ({
      row: r,
      items: map[r],
    }));
  }, [data]);

  // ─── Selected Seats Details & Total Amount ──────────────────────────────────
  const selectedSeatDetails = useMemo(() => {
    if (!data?.seatMap || selectedSeatCodes.length === 0) return [];
    const set = new Set(selectedSeatCodes);
    return data.seatMap.filter((s) => set.has(s.seatCode));
  }, [data, selectedSeatCodes]);

  const totalAmount = useMemo(() => {
    return selectedSeatDetails.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeatDetails]);

  const totalAmountFormatted = useMemo(() => {
    return `${totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
  }, [totalAmount]);

  // ─── UC27: Phân rã giá vé chi tiết theo từng loại ghế ───────────────────────
  const selectedSeatBreakdown = useMemo(() => {
    if (!selectedSeatDetails.length) return null;
    const stdSeats = selectedSeatDetails.filter((s) => s.type === 'standard');
    const vipSeats = selectedSeatDetails.filter((s) => s.type === 'vip');
    const coupleSeats = selectedSeatDetails.filter((s) => s.type === 'couple');

    return {
      standard: {
        count: stdSeats.length,
        seats: stdSeats.map((s) => s.seatCode),
        subtotal: stdSeats.reduce((sum, s) => sum + s.price, 0),
      },
      vip: {
        count: vipSeats.length,
        seats: vipSeats.map((s) => s.seatCode),
        subtotal: vipSeats.reduce((sum, s) => sum + s.price, 0),
      },
      couple: {
        count: coupleSeats.length,
        seats: coupleSeats.map((s) => s.seatCode),
        subtotal: coupleSeats.reduce((sum, s) => sum + s.price, 0),
      },
    };
  }, [selectedSeatDetails]);

  // ─── Tải danh sách đồ ăn khi mở modal đặt vé ──────────────────────────────
  useEffect(() => {
    if (confirmModalVisible) {
      setLoadingFoods(true);
      FoodAPI.getFoods({ availableOnly: true })
        .then((res) => {
          if (res.success) setAvailableFoods(res.items || []);
        })
        .catch((err) => console.log('[Load Food Error]', err))
        .finally(() => setLoadingFoods(false));
    }
  }, [confirmModalVisible]);

  // ─── Tính toán tiền Đồ ăn & Khuyến mãi ────────────────────────────────────
  const subtotalFoods = useMemo(() => {
    return Object.entries(foodQuantities).reduce((sum, [fId, qty]) => {
      const item = availableFoods.find((f) => f.id === fId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [foodQuantities, availableFoods]);

  const rawSubtotalAll = totalAmount + subtotalFoods;
  const finalPayTotal = Math.max(0, rawSubtotalAll - discountAmount);

  const subtotalFoodsFormatted = useMemo(() => {
    return `${subtotalFoods.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
  }, [subtotalFoods]);

  const discountAmountFormatted = useMemo(() => {
    return `${discountAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
  }, [discountAmount]);

  const finalPayTotalFormatted = useMemo(() => {
    return `${finalPayTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
  }, [finalPayTotal]);

  const totalFoodItemsCount = useMemo(() => {
    return Object.values(foodQuantities).reduce((sum, q) => sum + q, 0);
  }, [foodQuantities]);

  const filteredFoods = useMemo(() => {
    if (foodCategoryFilter === 'all') return availableFoods;
    return availableFoods.filter((f) => f.category === foodCategoryFilter);
  }, [availableFoods, foodCategoryFilter]);

  const handleIncreaseFood = (id: string) => {
    setFoodQuantities((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleDecreaseFood = (id: string) => {
    setFoodQuantities((prev) => {
      const cur = prev[id] || 0;
      if (cur <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: cur - 1 };
    });
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Vui lòng nhập mã khuyến mãi');
      return;
    }
    setCouponChecking(true);
    setCouponError(null);
    try {
      const res = await PromotionAPI.checkPromotion(code, rawSubtotalAll);
      if (res.success && res.promotion) {
        setAppliedPromo(res.promotion);
        setDiscountAmount(res.discountAmount || 0);
      } else {
        setCouponError(res.message || 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
        setAppliedPromo(null);
        setDiscountAmount(0);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Lỗi khi kiểm tra mã khuyến mãi');
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

  // ─── UC27: Mở Modal Bảng giá vé theo suất chiếu ─────────────────────────────
  const handleOpenPricingModal = async () => {
    try {
      setPricingLoading(true);
      setPricingModalVisible(true);
      const res = await ShowtimeAPI.getShowtimePricing(activeShowtimeId);
      if (res && res.success) {
        setPricingData(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải bảng giá vé:', err);
    } finally {
      setPricingLoading(false);
    }
  };

  // ─── UC25: Xử lý chọn ghế & Kiểm tra tình trạng tránh đặt trùng ──────────────
  const handleToggleSeat = async (seat: ShowtimeSeatItem) => {
    setSeatNotice(null);
    setOrphanWarning(null);

    // 1. Kiểm tra nếu ghế đã bán
    if (seat.status === 'booked') {
      setSeatNotice(`Ghế ${seat.seatCode} đã có khách hàng mua vé cho suất chiếu này.`);
      return;
    }

    // 2. Kiểm tra nếu ghế đang bị khách hàng khác giữ chỗ
    if (seat.status === 'holding') {
      setSeatNotice(
        `Ghế ${seat.seatCode} đang được một khách hàng khác giữ chỗ. Vui lòng chọn ghế khác!`
      );
      return;
    }

    // 3. Kiểm tra nếu ghế bảo trì
    if (seat.status === 'maintenance') {
      setSeatNotice(`Ghế ${seat.seatCode} hiện đang bảo trì kỹ thuật.`);
      return;
    }

    const isCurrentlySelected = selectedSeatCodes.includes(seat.seatCode);
    let nextSelected: string[] = [];

    if (isCurrentlySelected) {
      // Bỏ chọn ghế
      nextSelected = selectedSeatCodes.filter((c) => c !== seat.seatCode);
    } else {
      // Chọn thêm ghế
      if (selectedSeatCodes.length >= 8) {
        Alert.alert('Giới hạn', 'Bạn chỉ có thể chọn tối đa 8 ghế trong một lần đặt vé.');
        return;
      }
      nextSelected = [...selectedSeatCodes, seat.seatCode];
    }

    // Nếu bỏ chọn hết tất cả các ghế
    if (nextSelected.length === 0) {
      setSelectedSeatCodes([]);
      setRemainingSeconds(0);
      setHoldExpiresAt(null);
      try {
        await SeatAPI.releaseSeats({
          showtimeId: activeShowtimeId,
          holdToken,
          userId: user?.id,
        });
        await fetchSeatMap(true);
      } catch {}
      return;
    }

    // Gọi API giữ chỗ tạm thời và kiểm tra chống đặt trùng (UC25)
    try {
      setIsHoldingLoading(true);
      const res = await SeatAPI.holdSeats({
        showtimeId: activeShowtimeId,
        seatCodes: nextSelected,
        userId: user?.id,
        holdToken,
      });

      if (res.success) {
        setSelectedSeatCodes(nextSelected);
        setRemainingSeconds(res.remainingSeconds || 300);
        setHoldExpiresAt(res.expiresAt || null);
        // Refresh seat map để đồng bộ
        await fetchSeatMap(true);
      }
    } catch (err: any) {
      // Nếu có lỗi vi phạm quy tắc bỏ trống ghế lẻ hoặc xung đột
      const msg = err?.message || 'Không thể chọn ghế này.';
      if (msg.includes('Quy tắc rạp phim') || msg.includes('lẻ loi')) {
        setOrphanWarning(msg);
      } else {
        setSeatNotice(msg);
        // Làm mới lại sơ đồ ghế vì có thể ghế vừa bị người khác mua
        await fetchSeatMap(true);
      }
    } finally {
      setIsHoldingLoading(false);
    }
  };

  // ─── Handle Confirm Booking ─────────────────────────────────────────────────
  const handleConfirmBooking = async () => {
    if (selectedSeatCodes.length === 0) return;

    try {
      setBookingLoading(true);

      const foodsPayload = Object.entries(foodQuantities).map(([fId, qty]) => {
        const item = availableFoods.find((f) => f.id === fId);
        return {
          foodId: fId,
          name: item?.name || 'Món ăn',
          category: item?.category || 'food',
          price: item?.price || 0,
          quantity: qty,
          image: item?.image || '',
        };
      });

      const res = await SeatAPI.bookSeats({
        showtimeId: activeShowtimeId,
        seatCodes: selectedSeatCodes,
        userId: user?.id,
        holdToken,
        paymentMethod,
        foods: foodsPayload,
        promotionCode: appliedPromo?.code || '',
        discountAmount,
        totalAmount: finalPayTotal,
      });

      setConfirmModalVisible(false);
      setSuccessBooking({
        ...res.booking,
        orderedFoods: foodsPayload,
        discountAmount,
        totalPaid: finalPayTotal,
      });
      setSelectedSeatCodes([]);
      setFoodQuantities({});
      setAppliedPromo(null);
      setDiscountAmount(0);
      setCouponCode('');
      setRemainingSeconds(0);
      setHoldExpiresAt(null);
      // Refresh lại sơ đồ ghế để hiển thị các ghế vừa đặt chuyển sang trạng thái đã đặt
      await fetchSeatMap();
    } catch (err: any) {
      Alert.alert(
        'Đặt vé không thành công',
        err?.message || 'Có lỗi xảy ra trong quá trình đặt vé. Vui lòng thử lại.'
      );
      await fetchSeatMap();
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerMovieTitle} numberOfLines={1}>
              {data?.movie?.title || 'Chọn ghế xem phim'}
            </Text>
            <Text style={styles.headerSubInfo} numberOfLines={1}>
              {data?.theater?.shortName || data?.theater?.name || 'CineMax'} •{' '}
              {data?.showtime?.room} • {data?.showtime?.format}
            </Text>
          </View>

          {/* Đồng hồ đếm ngược giữ ghế (UC25 Seat Hold Timer) */}
          {remainingSeconds > 0 ? (
            <View style={styles.timerBadge}>
              <Ionicons name="time" size={14} color="#FFFFFF" />
              <Text style={styles.timerBadgeText}>{timerDisplay}</Text>
            </View>
          ) : (
            <View style={styles.timeBadge}>
              <Ionicons name="film-outline" size={14} color="#FFFFFF" />
              <Text style={styles.timeBadgeText}>
                {data?.showtime?.startTime || '--:--'}
              </Text>
            </View>
          )}

          {/* Nút xem bảng giá vé (UC27) */}
          <TouchableOpacity
            style={styles.pricingBtn}
            onPress={handleOpenPricingModal}
            activeOpacity={0.8}>
            <Ionicons name="pricetag" size={13} color="#FFFFFF" />
            <Text style={styles.pricingBtnText}>Bảng giá</Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách các suất chiếu khác cùng ngày để đổi nhanh */}
        {data?.otherShowtimes && data.otherShowtimes.length > 1 && (
          <View style={styles.showtimeSelectorWrapper}>
            <Text style={styles.showtimeSelectorLabel}>Suất chiếu khác:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.showtimeChipsRow}>
              {data.otherShowtimes.map((st) => {
                const isActive = st.code === activeShowtimeId;
                return (
                  <TouchableOpacity
                    key={st.code || st.id}
                    style={[
                      styles.showtimeChip,
                      isActive && styles.showtimeChipActive,
                    ]}
                    onPress={() => setActiveShowtimeId(st.code || st.id)}
                    activeOpacity={0.8}>
                    <Text
                      style={[
                        styles.showtimeChipText,
                        isActive && styles.showtimeChipTextActive,
                      ]}>
                      {st.startTime}
                    </Text>
                    <Text
                      style={[
                        styles.showtimeChipRoom,
                        isActive && styles.showtimeChipRoomActive,
                      ]}>
                      {st.room}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ─── Content ─────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Đang kiểm tra sơ đồ ghế realtime...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={28} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSeatMap()}>
              <Text style={styles.retryBtnText}>Tải lại sơ đồ ghế</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ─── 1. Màn hình chiếu Cinema Screen ──────────────────────────── */}
            <View style={styles.screenContainer}>
              <View style={styles.screenGlow} />
              <View style={styles.screenCurve} />
              <Text style={styles.screenText}>MÀN HÌNH CHIẾU</Text>
            </View>

            {/* ─── 2. Bảng chú thích trạng thái ghế (Legend) ────────────────── */}
            <View style={styles.legendWrapper}>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#E5E7EB' }]} />
                  <Text style={styles.legendLabel}>Trống</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendLabel}>VIP</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#EC4899' }]} />
                  <Text style={styles.legendLabel}>Sweetbox</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#E50914' }]}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                  <Text style={styles.legendLabel}>Đang chọn</Text>
                </View>

                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendBox,
                      { backgroundColor: '#78350F', borderWidth: 1, borderColor: '#D97706' },
                    ]}>
                    <Ionicons name="time" size={9} color="#FBBF24" />
                  </View>
                  <Text style={styles.legendLabel}>Đang giữ</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#374151' }]}>
                    <Ionicons name="person" size={9} color="#9CA3AF" />
                  </View>
                  <Text style={styles.legendLabel}>Đã bán</Text>
                </View>
              </View>
            </View>

            {/* ─── 3. Thanh hiển thị nhanh giá vé các loại ghế (UC27) ────── */}
            <TouchableOpacity
              style={styles.quickPricingBar}
              onPress={handleOpenPricingModal}
              activeOpacity={0.8}>
              <View style={styles.quickPricingItem}>
                <View style={[styles.miniSeatDot, { backgroundColor: '#E5E7EB' }]} />
                <Text style={styles.quickPricingText}>
                  Thường:{' '}
                  <Text style={styles.quickPricingBold}>
                    {data?.pricing?.standardPriceFormatted || data?.showtime?.priceFormatted || '95.000đ'}
                  </Text>
                </Text>
              </View>
              <View style={styles.quickPricingDivider} />
              <View style={styles.quickPricingItem}>
                <View style={[styles.miniSeatDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.quickPricingText}>
                  VIP:{' '}
                  <Text style={styles.quickPricingBold}>
                    {data?.pricing?.vipPriceFormatted || '120.000đ'}
                  </Text>
                </Text>
              </View>
              <View style={styles.quickPricingDivider} />
              <View style={styles.quickPricingItem}>
                <View style={[styles.miniSeatDot, { backgroundColor: '#EC4899' }]} />
                <Text style={styles.quickPricingText}>
                  Sweetbox:{' '}
                  <Text style={styles.quickPricingBold}>
                    {data?.pricing?.couplePriceFormatted || '200.000đ'}
                  </Text>
                </Text>
              </View>
              <Ionicons name="information-circle-outline" size={16} color="#E50914" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Banner Cảnh báo ghế lẻ loi (Orphan Seat Rule) */}
            {orphanWarning && (
              <View style={styles.orphanWarningBanner}>
                <Ionicons name="warning" size={18} color="#EF4444" />
                <Text style={styles.orphanWarningText}>{orphanWarning}</Text>
              </View>
            )}

            {/* Banner Thông báo xung đột / trạng thái ghế */}
            {seatNotice && (
              <View style={styles.noticeBanner}>
                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                <Text style={styles.noticeText}>{seatNotice}</Text>
              </View>
            )}

            {/* Banner đồng hồ giữ chỗ nếu đang chọn ghế */}
            {remainingSeconds > 0 && selectedSeatCodes.length > 0 && (
              <View style={styles.holdBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.holdBannerText}>
                  Ghế [{selectedSeatCodes.join(', ')}] đang được tạm khóa riêng cho bạn trong{' '}
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{timerDisplay}</Text>
                </Text>
              </View>
            )}

            {/* ─── 3. Sơ đồ ma trận ghế tương tác (Interactive Map) ─────────── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.seatGridContainer}>
                {seatsByRow.map((group) => (
                  <View key={group.row} style={styles.seatRow}>
                    <Text style={styles.rowLabelText}>{group.row}</Text>

                    <View style={styles.seatsInRow}>
                      {group.items.map((seat) => {
                        const isSelected = selectedSeatCodes.includes(seat.seatCode);
                        const isBooked = seat.status === 'booked';
                        const isHolding = seat.status === 'holding';
                        const isMaint = seat.status === 'maintenance';
                        const isCouple = seat.type === 'couple';
                        const isVip = seat.type === 'vip';

                        let bgColor = '#E5E7EB'; // standard available
                        if (isVip) bgColor = '#F59E0B';
                        if (isCouple) bgColor = '#EC4899';
                        if (isHolding) bgColor = '#78350F';
                        if (isBooked) bgColor = '#374151';
                        if (isMaint) bgColor = '#1F2937';
                        if (isSelected) bgColor = '#E50914';

                        return (
                          <TouchableOpacity
                            key={seat.id || seat.code}
                            style={[
                              styles.seatButton,
                              isCouple && styles.seatButtonCouple,
                              { backgroundColor: bgColor },
                              isSelected && styles.seatButtonSelected,
                              isHolding && styles.seatButtonHolding,
                              isMaint && styles.seatButtonMaintenance,
                            ]}
                            onPress={() => handleToggleSeat(seat)}
                            disabled={isBooked || isMaint || isHolding || isHoldingLoading}
                            activeOpacity={0.7}>
                            {isSelected ? (
                              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                            ) : isHolding ? (
                              <Ionicons name="time" size={11} color="#FBBF24" />
                            ) : isBooked ? (
                              <Ionicons name="person" size={11} color="#6B7280" />
                            ) : isMaint ? (
                              <Ionicons name="construct" size={10} color="#EF4444" />
                            ) : (
                              <Text
                                style={[
                                  styles.seatNumberText,
                                  isCouple && styles.seatNumberTextCouple,
                                  isVip && { color: '#000000' },
                                ]}>
                                {seat.colNumber}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.rowLabelText}>{group.row}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* ─── 4. Thống kê trạng thái ghế của suất chiếu ────────────────── */}
            {data?.summary && (
              <View style={styles.summaryBar}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatVal}>{data.summary.totalSeats}</Text>
                  <Text style={styles.summaryStatName}>Tổng ghế</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatVal, { color: '#10B981' }]}>
                    {data.summary.availableCount}
                  </Text>
                  <Text style={styles.summaryStatName}>Còn trống</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatVal, { color: '#F59E0B' }]}>
                    {data.summary.holdingCount || 0}
                  </Text>
                  <Text style={styles.summaryStatName}>Đang giữ</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatVal, { color: '#EF4444' }]}>
                    {data.summary.bookedCount}
                  </Text>
                  <Text style={styles.summaryStatName}>Đã bán</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatVal, { color: '#EC4899' }]}>
                    {data.summary.coupleCount}
                  </Text>
                  <Text style={styles.summaryStatName}>Sweetbox</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── Thanh thanh toán & chọn ghế cố định phía dưới (Bottom Bar) ──────── */}
      <View style={styles.bottomBar}>
        {/* Phân rã giá vé chi tiết theo từng loại ghế (UC27) */}
        {selectedSeatBreakdown &&
          (selectedSeatBreakdown.standard.count > 0 ||
            selectedSeatBreakdown.vip.count > 0 ||
            selectedSeatBreakdown.couple.count > 0) && (
            <View style={styles.breakdownRow}>
              {selectedSeatBreakdown.standard.count > 0 && (
                <View style={styles.breakdownChip}>
                  <View style={[styles.miniSeatDot, { backgroundColor: '#64748B' }]} />
                  <Text style={styles.breakdownChipText}>
                    {selectedSeatBreakdown.standard.count}x Thường ({selectedSeatBreakdown.standard.subtotal.toLocaleString('vi-VN')}đ)
                  </Text>
                </View>
              )}
              {selectedSeatBreakdown.vip.count > 0 && (
                <View
                  style={[
                    styles.breakdownChip,
                    { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' },
                  ]}>
                  <View style={[styles.miniSeatDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.breakdownChipText, { color: '#F59E0B' }]}>
                    {selectedSeatBreakdown.vip.count}x VIP ({selectedSeatBreakdown.vip.subtotal.toLocaleString('vi-VN')}đ)
                  </Text>
                </View>
              )}
              {selectedSeatBreakdown.couple.count > 0 && (
                <View
                  style={[
                    styles.breakdownChip,
                    { backgroundColor: 'rgba(236, 72, 153, 0.15)', borderColor: '#EC4899' },
                  ]}>
                  <View style={[styles.miniSeatDot, { backgroundColor: '#EC4899' }]} />
                  <Text style={[styles.breakdownChipText, { color: '#EC4899' }]}>
                    {selectedSeatBreakdown.couple.count}x Sweetbox ({selectedSeatBreakdown.couple.subtotal.toLocaleString('vi-VN')}đ)
                  </Text>
                </View>
              )}
            </View>
          )}

        <View style={styles.bottomInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedCountText}>
              {selectedSeatCodes.length > 0
                ? `Đang giữ ${selectedSeatCodes.length} ghế (khóa 5p):`
                : 'Chưa chọn ghế nào'}
            </Text>
            <Text style={styles.selectedSeatsList} numberOfLines={1}>
              {selectedSeatCodes.length > 0
                ? selectedSeatCodes.join(', ')
                : 'Chạm vào ghế trống để giữ chỗ'}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
            <Text style={styles.totalPriceLabel}>Tạm tính</Text>
            <Text style={styles.totalPriceValue}>{totalAmountFormatted}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            selectedSeatCodes.length === 0 && styles.bookButtonDisabled,
          ]}
          onPress={() => {
            if (!isAuthenticated) {
              router.push('/login');
            } else {
              setConfirmModalVisible(true);
            }
          }}
          disabled={selectedSeatCodes.length === 0}
          activeOpacity={0.85}>
          <Ionicons
            name={isAuthenticated ? 'ticket' : 'log-in'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.bookButtonText}>
            {isAuthenticated ? 'Tiến hành đặt vé' : 'Đăng nhập để đặt vé'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: XÁC NHẬN ĐẶT GHẾ
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Xác Nhận Đặt Ghế & Bắp Nước</Text>
                <Text style={styles.modalSubtitle}>
                  {data?.movie?.title} • {data?.theater?.shortName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}>
              {/* 1. Chi tiết suất chiếu & ghế */}
              <View style={styles.bookingDetailBox}>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>Phim:</Text>
                  <Text style={styles.bookingDetailVal} numberOfLines={1}>
                    {data?.movie?.title}
                  </Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>Suất chiếu:</Text>
                  <Text style={styles.bookingDetailVal}>
                    {data?.showtime?.startTime} • {data?.showtime?.dateStr}
                  </Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>Phòng chiếu:</Text>
                  <Text style={styles.bookingDetailVal}>
                    {data?.showtime?.room} ({data?.showtime?.format})
                  </Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>Ghế đã chọn:</Text>
                  <Text style={[styles.bookingDetailVal, { color: '#E50914', fontWeight: '800' }]}>
                    {selectedSeatCodes.join(', ')} ({selectedSeatCodes.length} ghế)
                  </Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>Thời gian giữ chỗ còn lại:</Text>
                  <Text style={[styles.bookingDetailVal, { color: '#F59E0B', fontWeight: '800' }]}>
                    {timerDisplay}
                  </Text>
                </View>
              </View>

              {/* 2. Chọn đồ ăn & nước uống (UC38) */}
              <View style={styles.foodSectionWrapper}>
                <View style={styles.foodSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="fast-food-outline" size={18} color="#F59E0B" />
                    <Text style={styles.foodSectionTitle}>Chọn Bắp & Nước Uống Kèm Theo</Text>
                  </View>
                  {totalFoodItemsCount > 0 && (
                    <Text style={styles.foodBadgeSelected}>{totalFoodItemsCount} món đã chọn</Text>
                  )}
                </View>

                {/* Danh mục F&B */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodCatRow}>
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'food', label: 'Bắp rang' },
                    { key: 'drink', label: 'Nước ngọt' },
                    { key: 'combo', label: 'Combo' },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setFoodCategoryFilter(cat.key)}
                      style={[
                        styles.foodCatPill,
                        foodCategoryFilter === cat.key && styles.foodCatPillActive,
                      ]}>
                      <Text
                        style={[
                          styles.foodCatPillText,
                          foodCategoryFilter === cat.key && styles.foodCatPillTextActive,
                        ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {loadingFoods ? (
                  <ActivityIndicator size="small" color="#E50914" style={{ marginVertical: 10 }} />
                ) : filteredFoods.length === 0 ? (
                  <Text style={styles.foodEmptyText}>Không có món ăn nào trong danh mục này.</Text>
                ) : (
                  <View style={styles.foodListContainer}>
                    {filteredFoods.map((f) => {
                      const qty = foodQuantities[f.id] || 0;
                      return (
                        <View
                          key={f.id}
                          style={[styles.foodCardItem, qty > 0 && styles.foodCardItemActive]}>
                          <Image source={{ uri: f.image }} style={styles.foodItemThumb} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.foodItemName} numberOfLines={1}>
                              {f.name}
                            </Text>
                            <Text style={styles.foodItemPrice}>
                              {f.price.toLocaleString('vi-VN')}đ / {f.unit}
                            </Text>
                          </View>
                          <View style={styles.foodQtyControl}>
                            <TouchableOpacity
                              onPress={() => handleDecreaseFood(f.id)}
                              disabled={qty === 0}
                              style={[styles.foodQtyBtn, qty === 0 && styles.foodQtyBtnDisabled]}>
                              <Ionicons name="remove" size={14} color={qty > 0 ? '#FFFFFF' : '#6B7280'} />
                            </TouchableOpacity>
                            <Text style={styles.foodQtyText}>{qty}</Text>
                            <TouchableOpacity
                              onPress={() => handleIncreaseFood(f.id)}
                              style={styles.foodQtyBtn}>
                              <Ionicons name="add" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* 3. Mã ưu đãi / Khuyến mãi (UC39) */}
              <View style={styles.couponSectionWrapper}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="ticket-outline" size={16} color="#EC4899" />
                  <Text style={styles.couponSectionTitle}>Mã Khuyến Mãi / Voucher Giảm Giá</Text>
                </View>

                {appliedPromo ? (
                  <View style={styles.appliedPromoBadge}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appliedPromoCode}>
                        🎉 Đã áp dụng: {appliedPromo.code}
                      </Text>
                      <Text style={styles.appliedPromoDiscount}>
                        Giảm: -{discountAmountFormatted} ({appliedPromo.title})
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleRemoveCoupon} style={styles.appliedPromoRemoveBtn}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.couponInputRow}>
                    <TextInput
                      style={styles.couponInput}
                      placeholder="Nhập mã (VD: CINEMAX20, COMBO50)..."
                      placeholderTextColor="#6B7280"
                      value={couponCode}
                      onChangeText={(t) => {
                        setCouponCode(t);
                        setCouponError(null);
                      }}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={styles.couponApplyBtn}
                      onPress={handleApplyCoupon}
                      disabled={couponChecking || !couponCode.trim()}>
                      {couponChecking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.couponApplyBtnText}>Áp dụng</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}
              </View>

              {/* 4. Chọn phương thức thanh toán */}
              <Text style={styles.paymentTitle}>Phương thức thanh toán:</Text>
              <View style={styles.paymentOptions}>
                {['Ví MoMo', 'ZaloPay', 'Thẻ ATM / Visa', 'Tại quầy vé'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.paymentOption,
                      paymentMethod === p && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod(p)}
                    activeOpacity={0.8}>
                    <Ionicons
                      name={paymentMethod === p ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={paymentMethod === p ? '#E50914' : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        paymentMethod === p && styles.paymentOptionTextActive,
                      ]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 5. Tổng kết chi phí */}
              <View style={styles.costBreakdownBox}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Tiền vé ({selectedSeatCodes.length} ghế):</Text>
                  <Text style={styles.costVal}>{totalAmountFormatted}</Text>
                </View>
                {subtotalFoods > 0 && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Bắp nước ({totalFoodItemsCount} phần):</Text>
                    <Text style={styles.costVal}>{subtotalFoodsFormatted}</Text>
                  </View>
                )}
                {discountAmount > 0 && (
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: '#10B981' }]}>Khuyến mãi giảm:</Text>
                    <Text style={[styles.costVal, { color: '#10B981', fontWeight: '700' }]}>
                      -{discountAmountFormatted}
                    </Text>
                  </View>
                )}
                <View style={[styles.costRow, styles.costTotalRow]}>
                  <Text style={styles.costTotalLabel}>TỔNG THANH TOÁN:</Text>
                  <Text style={styles.costTotalVal}>{finalPayTotalFormatted}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={bookingLoading}>
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmBooking}
                disabled={bookingLoading}>
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.modalConfirmBtnText}>
                      Xác nhận thanh toán ({finalPayTotalFormatted})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: THÔNG BÁO ĐẶT VÉ THÀNH CÔNG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(successBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessBooking(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardSuccess}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Đặt Vé Thành Công!</Text>
            <Text style={styles.successSubtitle}>
              Vé của bạn đã được ghi nhận trực tiếp vào hệ thống rạp CineMax.
            </Text>

            {successBooking && (
              <View style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketCodeLabel}>MÃ VÉ CỦA BẠN</Text>
                  <Text style={styles.ticketCodeVal}>
                    {successBooking.bookingCode}
                  </Text>
                </View>

                <View style={styles.ticketBody}>
                  <Text style={styles.ticketMovieTitle}>
                    {successBooking.movieTitle}
                  </Text>
                  <Text style={styles.ticketTheaterText}>
                    {successBooking.cinemaName} • {successBooking.hallName}
                  </Text>
                  <View style={styles.ticketInfoGrid}>
                    <View style={styles.ticketInfoCol}>
                      <Text style={styles.ticketSmallLabel}>GHẾ</Text>
                      <Text style={styles.ticketSmallVal}>
                        {successBooking.seats?.join(', ')}
                      </Text>
                    </View>
                    <View style={styles.ticketInfoCol}>
                      <Text style={styles.ticketSmallLabel}>ĐỊNH DẠNG</Text>
                      <Text style={styles.ticketSmallVal}>
                        {successBooking.format}
                      </Text>
                    </View>
                    <View style={styles.ticketInfoCol}>
                      <Text style={styles.ticketSmallLabel}>THANH TOÁN</Text>
                      <Text style={styles.ticketSmallVal}>
                        {successBooking.paymentMethod}
                      </Text>
                    </View>
                  </View>

                  {/* Hiển thị bắp nước đã đặt kèm theo nếu có */}
                  {((successBooking.orderedFoods && successBooking.orderedFoods.length > 0) || successBooking.combos) && (
                    <View style={{ marginTop: 10, padding: 8, backgroundColor: '#262626', borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700', marginBottom: 2 }}>
                        🍿 BẮP NƯỚC KÈM THEO:
                      </Text>
                      <Text style={{ fontSize: 12, color: '#FFFFFF' }}>
                        {successBooking.orderedFoods && successBooking.orderedFoods.length > 0
                          ? successBooking.orderedFoods.map((f: any) => `${f.name} x${f.quantity}`).join(', ')
                          : successBooking.combos}
                      </Text>
                    </View>
                  )}

                  <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Tổng tiền thanh toán:</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#10B981' }}>
                      {(successBooking.totalPaid || successBooking.totalAmount || totalAmount).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.successDoneBtn}
                onPress={() => {
                  setSuccessBooking(null);
                  router.push('/profile');
                }}>
                <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
                <Text style={styles.successDoneText}>Xem trong Vé Của Tôi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successBackExploreBtn}
                onPress={() => {
                  setSuccessBooking(null);
                  router.push('/explore');
                }}>
                <Text style={styles.successBackExploreText}>Về Lịch Chiếu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: BẢNG GIÁ VÉ THEO SUẤT CHIẾU VÀ LOẠI GHẾ (UC27)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={pricingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPricingModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.pricingIconCircle, { backgroundColor: '#E50914' }]}>
                <Ionicons name="pricetag" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Bảng Giá Vé Suất Chiếu</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {data?.movie?.title} • {data?.showtime?.format}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {pricingLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={{ color: '#9CA3AF', marginTop: 10, fontSize: 13 }}>
                  Đang tải bảng giá vé từ MongoDB Atlas...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Thông tin suất chiếu & phân loại thời gian */}
                <View style={styles.pricingShowtimeCard}>
                  <View style={styles.pricingShowtimeRow}>
                    <Ionicons name="film-outline" size={16} color="#E50914" />
                    <Text style={styles.pricingShowtimeText}>
                      {data?.theater?.name} • {data?.showtime?.room}
                    </Text>
                  </View>
                  <View style={styles.pricingShowtimeRow}>
                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.pricingShowtimeText}>
                      {data?.showtime?.dateStr} ({data?.showtime?.startTime} ~ {data?.showtime?.endTime})
                    </Text>
                  </View>
                  <View style={styles.pricingFactorsPills}>
                    <View style={styles.pricingFactorPill}>
                      <Text style={styles.pricingFactorPillText}>
                        {pricingData?.pricing?.factors?.dayBadge || 'Cuối tuần / Ngày thường'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pricingFactorPill,
                        { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
                      ]}>
                      <Text style={[styles.pricingFactorPillText, { color: '#60A5FA' }]}>
                        {pricingData?.pricing?.factors?.timeSlot || data?.showtime?.format}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3 Thẻ Loại Ghế và Giá Vé */}
                <Text style={styles.pricingSectionHeading}>Giá vé theo từng loại ghế:</Text>

                {/* Ghế Thường */}
                <View style={[styles.pricingTypeCard, { borderLeftColor: '#64748B' }]}>
                  <View style={styles.pricingTypeHeader}>
                    <View style={styles.pricingTypeTitleRow}>
                      <View
                        style={[
                          styles.miniSeatDot,
                          { backgroundColor: '#64748B', width: 14, height: 14, borderRadius: 7 },
                        ]}
                      />
                      <Text style={styles.pricingTypeName}>Ghế Thường (Standard)</Text>
                      <View style={styles.capacityBadgeSmall}>
                        <Text style={styles.capacityBadgeSmallText}>1 khách</Text>
                      </View>
                    </View>
                    <Text style={styles.pricingTypePrice}>
                      {data?.pricing?.standardPriceFormatted || data?.showtime?.priceFormatted || '95.000đ'}
                    </Text>
                  </View>
                  <Text style={styles.pricingTypeDesc}>
                    Vị trí tiêu chuẩn, tầm nhìn toàn cảnh, đệm êm ái.
                  </Text>
                  <View style={styles.audiencePriceGrid}>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>Người lớn</Text>
                      <Text style={styles.audienceVal}>
                        {data?.pricing?.standardPriceFormatted || data?.showtime?.priceFormatted || '95.000đ'}
                      </Text>
                    </View>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>HSSV (U22)</Text>
                      <Text style={[styles.audienceVal, { color: '#10B981' }]}>
                        {data?.pricing?.standardPrice
                          ? `${(data.pricing.standardPrice - 20000).toLocaleString('vi-VN')}đ`
                          : '75.000đ'}
                      </Text>
                    </View>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>CineMax VIP</Text>
                      <Text style={[styles.audienceVal, { color: '#F59E0B' }]}>
                        {data?.pricing?.standardPrice
                          ? `${(data.pricing.standardPrice - 10000).toLocaleString('vi-VN')}đ`
                          : '85.000đ'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Ghế VIP */}
                <View style={[styles.pricingTypeCard, { borderLeftColor: '#F59E0B' }]}>
                  <View style={styles.pricingTypeHeader}>
                    <View style={styles.pricingTypeTitleRow}>
                      <View
                        style={[
                          styles.miniSeatDot,
                          { backgroundColor: '#F59E0B', width: 14, height: 14, borderRadius: 7 },
                        ]}
                      />
                      <Text style={styles.pricingTypeName}>Ghế VIP (Prime)</Text>
                      <View
                        style={[
                          styles.capacityBadgeSmall,
                          { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
                        ]}>
                        <Text style={[styles.capacityBadgeSmallText, { color: '#F59E0B' }]}>
                          Sweet Spot
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.pricingTypePrice, { color: '#F59E0B' }]}>
                        {data?.pricing?.vipPriceFormatted || '120.000đ'}
                      </Text>
                      <Text style={styles.pricingSurchargeText}>+25.000đ phụ thu</Text>
                    </View>
                  </View>
                  <Text style={styles.pricingTypeDesc}>
                    Vị trí trung tâm phòng chiếu, góc nhìn và âm thanh vòm Dolby tối ưu.
                  </Text>
                  <View style={styles.audiencePriceGrid}>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>Người lớn</Text>
                      <Text style={styles.audienceVal}>
                        {data?.pricing?.vipPriceFormatted || '120.000đ'}
                      </Text>
                    </View>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>HSSV (U22)</Text>
                      <Text style={[styles.audienceVal, { color: '#10B981' }]}>
                        {data?.pricing?.vipPrice
                          ? `${(data.pricing.vipPrice - 15000).toLocaleString('vi-VN')}đ`
                          : '105.000đ'}
                      </Text>
                    </View>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>CineMax VIP</Text>
                      <Text style={[styles.audienceVal, { color: '#F59E0B' }]}>
                        {data?.pricing?.vipPrice
                          ? `${(data.pricing.vipPrice - 10000).toLocaleString('vi-VN')}đ`
                          : '110.000đ'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Ghế Đôi Sweetbox */}
                <View style={[styles.pricingTypeCard, { borderLeftColor: '#EC4899' }]}>
                  <View style={styles.pricingTypeHeader}>
                    <View style={styles.pricingTypeTitleRow}>
                      <View
                        style={[
                          styles.miniSeatDot,
                          { backgroundColor: '#EC4899', width: 14, height: 14, borderRadius: 7 },
                        ]}
                      />
                      <Text style={styles.pricingTypeName}>Ghế Đôi Sweetbox</Text>
                      <View
                        style={[
                          styles.capacityBadgeSmall,
                          { backgroundColor: 'rgba(236, 72, 153, 0.2)' },
                        ]}>
                        <Text style={[styles.capacityBadgeSmallText, { color: '#EC4899' }]}>
                          2 khách
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.pricingTypePrice, { color: '#EC4899' }]}>
                        {data?.pricing?.couplePriceFormatted || '200.000đ'}
                      </Text>
                      <Text style={styles.pricingSurchargeText}>Trọn gói 2 vé</Text>
                    </View>
                  </View>
                  <Text style={styles.pricingTypeDesc}>
                    Ghế sofa đôi rộng rãi cho 2 người ở hàng ghế cuối, riêng tư, lãng mạn.
                  </Text>
                  <View style={styles.audiencePriceGrid}>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>Trọn gói đôi</Text>
                      <Text style={styles.audienceVal}>
                        {data?.pricing?.couplePriceFormatted || '200.000đ'}
                      </Text>
                    </View>
                    <View style={styles.audiencePriceItem}>
                      <Text style={styles.audienceLabel}>CineMax VIP</Text>
                      <Text style={[styles.audienceVal, { color: '#EC4899' }]}>
                        {data?.pricing?.couplePrice
                          ? `${(data.pricing.couplePrice - 15000).toLocaleString('vi-VN')}đ`
                          : '185.000đ'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Ghi chú chính sách giá */}
                <View style={styles.pricingNoteBox}>
                  <Ionicons name="information-circle" size={16} color="#9CA3AF" />
                  <Text style={styles.pricingNoteText}>
                    Giá vé đã bao gồm thuế GTGT. Áp dụng ưu đãi thành viên khi quét mã hội viên tại quầy hoặc đăng nhập trên ứng dụng.
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.pricingCloseBtn}
              onPress={() => setPricingModalVisible(false)}
              activeOpacity={0.8}>
              <Text style={styles.pricingCloseBtnText}>Đã hiểu & Tiếp tục chọn ghế</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F10',
  },
  header: {
    backgroundColor: '#18181B',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerMovieTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  timerBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  showtimeSelectorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  showtimeSelectorLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginRight: 8,
    fontWeight: '600',
  },
  showtimeChipsRow: {
    gap: 6,
  },
  showtimeChip: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  showtimeChipActive: {
    backgroundColor: '#3B82F6',
  },
  showtimeChipText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '700',
  },
  showtimeChipTextActive: {
    color: '#FFFFFF',
  },
  showtimeChipRoom: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  showtimeChipRoomActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 13,
  },
  errorBox: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 40,
    padding: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  screenContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
    width: '100%',
  },
  screenGlow: {
    width: '75%',
    height: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    shadowColor: '#3B82F6',
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
  },
  screenCurve: {
    width: '80%',
    height: 8,
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
  screenText: {
    color: '#60A5FA',
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '700',
    marginTop: 8,
  },
  legendWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#18181B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 10.5,
    color: '#D1D5DB',
  },
  orphanWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  orphanWarningText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  noticeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  holdBannerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  seatGridContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  rowLabelText: {
    width: 20,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  seatsInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 6,
  },
  seatButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatButtonCouple: {
    width: 58,
  },
  seatButtonSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#E50914',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  seatButtonHolding: {
    borderWidth: 1,
    borderColor: '#D97706',
    opacity: 0.85,
  },
  seatButtonMaintenance: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  seatNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  seatNumberTextCouple: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#18181B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryStatName: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#18181B',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedCountText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  selectedSeatsList: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  totalPriceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bookingDetailBox: {
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingDetailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bookingDetailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentOptionActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  paymentOptionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  paymentOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCardSuccess: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#27272A',
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
  ticketHeader: {
    backgroundColor: '#E50914',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  ticketCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  ticketCodeVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  ticketBody: {
    padding: 14,
  },
  ticketMovieTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketTheaterText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  ticketInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#3F3F46',
  },
  ticketInfoCol: {
    alignItems: 'center',
  },
  ticketSmallLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  ticketSmallVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  successActions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  successDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  successDoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successBackExploreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successBackExploreText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── UC27: Ticket Pricing Styles ───────────────────────────────────────────
  pricingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    marginLeft: 6,
  },
  pricingBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  quickPricingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#2A2A30',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickPricingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickPricingDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#374151',
  },
  quickPricingText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  quickPricingBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  miniSeatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  breakdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: '#64748B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  breakdownChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  pricingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingShowtimeCard: {
    backgroundColor: '#1E1E22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  pricingShowtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricingShowtimeText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  pricingFactorsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pricingFactorPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pricingFactorPillText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '600',
  },
  pricingSectionHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  pricingTypeCard: {
    backgroundColor: '#1E1E22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A30',
    borderLeftWidth: 4,
  },
  pricingTypeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pricingTypeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingTypeName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  capacityBadgeSmall: {
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  capacityBadgeSmallText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  pricingTypePrice: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pricingSurchargeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  pricingTypeDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 10,
  },
  audiencePriceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#141416',
    borderRadius: 8,
    padding: 8,
  },
  audiencePriceItem: {
    alignItems: 'center',
  },
  audienceLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  audienceVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pricingNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 14,
    gap: 8,
  },
  pricingNoteText: {
    color: '#9CA3AF',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  pricingCloseBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  pricingCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // ─── Food & Drinks Styles (UC38) ──────────────────────────────────────────
  foodSectionWrapper: {
    backgroundColor: '#1E1E22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A30',
  },
  foodSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  foodSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  foodBadgeSelected: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  foodCatRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  foodCatPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#27272A',
    marginRight: 6,
  },
  foodCatPillActive: {
    backgroundColor: '#E50914',
  },
  foodCatPillText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  foodCatPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  foodEmptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 10,
  },
  foodListContainer: {
    gap: 8,
  },
  foodCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141416',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  foodCardItemActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#1F1D16',
  },
  foodItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#27272A',
  },
  foodItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  foodItemPrice: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  foodQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodQtyBtnDisabled: {
    backgroundColor: '#27272A',
  },
  foodQtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 18,
    textAlign: 'center',
  },
  // ─── Promotion Coupon Styles (UC39) ───────────────────────────────────────
  couponSectionWrapper: {
    backgroundColor: '#1E1E22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A30',
  },
  couponSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#141416',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  couponApplyBtn: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  appliedPromoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B98118',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  appliedPromoCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  appliedPromoDiscount: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
  },
  appliedPromoRemoveBtn: {
    padding: 4,
  },
  couponErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 6,
  },
  // ─── Cost Breakdown Styles ───────────────────────────────────────────────
  costBreakdownBox: {
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  costVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#3F3F46',
    paddingTop: 8,
    marginTop: 4,
  },
  costTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  costTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
});

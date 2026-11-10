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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { SeatAPI } from '@/services/api';
import { ShowtimeSeatItem, ShowtimeSeatMapResponse } from '@/types/seat';

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
      const res = await SeatAPI.bookSeats({
        showtimeId: activeShowtimeId,
        seatCodes: selectedSeatCodes,
        userId: user?.id,
        holdToken,
        paymentMethod,
      });

      setConfirmModalVisible(false);
      setSuccessBooking(res.booking);
      setSelectedSeatCodes([]);
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
                <Text style={styles.modalTitle}>Xác Nhận Đặt Ghế</Text>
                <Text style={styles.modalSubtitle}>
                  {data?.movie?.title} • {data?.theater?.shortName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

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
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingDetailLabel}>Tổng tiền thanh toán:</Text>
                <Text style={[styles.bookingDetailVal, { color: '#10B981', fontSize: 16, fontWeight: '800' }]}>
                  {totalAmountFormatted}
                </Text>
              </View>
            </View>

            {/* Chọn phương thức thanh toán */}
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
                    name={
                      paymentMethod === p ? 'radio-button-on' : 'radio-button-off'
                    }
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
                    <Text style={styles.modalConfirmBtnText}>Xác nhận thanh toán</Text>
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
});

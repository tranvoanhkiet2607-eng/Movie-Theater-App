// Nguyễn Minh Quân - CE180048
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { ShowtimeAPI } from '@/services/api';
import {
  AgeRating,
  SeatAvailabilityStatus,
  ShowtimeDateOption,
  ShowtimeFormat,
  ShowtimeFormPayload,
  ShowtimeItem,
  ShowtimeMovie,
  ShowtimeTheater,
  ShowtimeViewMode,
  TimeSlotPeriod,
} from '@/types/showtime';
import BookingFoodModal from '@/features/booking/components/BookingFoodModal';
import AdminManagementHubModal from '@/features/admin/AdminManagementHubModal';

const TIME_PERIOD_OPTIONS: {
  key: TimeSlotPeriod;
  label: string;
  subLabel: string;
  icon: string;
}[] = [
  { key: 'all', label: 'Cả ngày', subLabel: 'Tất cả giờ', icon: 'time-outline' },
  { key: 'morning', label: 'Buổi sáng', subLabel: 'Trước 12:00', icon: 'sunny-outline' },
  { key: 'afternoon', label: 'Buổi chiều', subLabel: '12:00 - 17:00', icon: 'partly-sunny-outline' },
  { key: 'evening', label: 'Buổi tối', subLabel: '17:00 - 21:00', icon: 'moon-outline' },
  { key: 'late', label: 'Suất khuya', subLabel: 'Sau 21:00', icon: 'sparkles-outline' },
];

const QUICK_ROOMS = [
  'Rạp 01',
  'Rạp 02',
  'Rạp 03 (IMAX)',
  'Rạp 04',
  'Rạp 05',
  'Rạp 4DX',
  'Rạp Gold Class',
];

const QUICK_START_TIMES = [
  '09:00',
  '10:30',
  '12:15',
  '14:00',
  '16:15',
  '18:00',
  '19:30',
  '21:15',
  '22:45',
];

const QUICK_PRICES = [85000, 95000, 110000, 135000, 185000, 250000];

function getAgeBadgeColor(ageRating: AgeRating): { bg: string; text: string } {
  switch (ageRating) {
    case 'P':
      return { bg: '#10B981', text: '#FFFFFF' };
    case 'K':
      return { bg: '#3B82F6', text: '#FFFFFF' };
    case 'T13':
      return { bg: '#F59E0B', text: '#0B0C10' };
    case 'T16':
      return { bg: '#F97316', text: '#FFFFFF' };
    case 'T18':
      return { bg: '#EF4444', text: '#FFFFFF' };
  }
}

function getStatusInfo(status: SeatAvailabilityStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'available':
      return {
        label: 'Còn nhiều ghế',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.12)',
      };
    case 'filling_fast':
      return {
        label: 'Sắp đầy',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.12)',
      };
    case 'almost_full':
      return {
        label: 'Còn ít ghế',
        color: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.15)',
      };
    case 'sold_out':
      return {
        label: 'Hết vé',
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.12)',
      };
  }
}

function previewEndTime(startTime: string, durationMinutes: number): string {
  const parts = startTime.trim().split(':');
  if (parts.length !== 2) return '--:--';
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return '--:--';
  }
  const total = hh * 60 + mm + (durationMinutes || 120);
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export default function ExploreScreen() {
  const { isAuthenticated, user } = useAuth();
  const params = useLocalSearchParams<{ movieId?: string; theaterId?: string }>();

  // ─── Dữ liệu lịch chiếu từ Backend API ───────────────────────────────────────
  const [dates, setDates] = useState<ShowtimeDateOption[]>([]);
  const [formats, setFormats] = useState<ShowtimeFormat[]>([]);
  const [movies, setMovies] = useState<ShowtimeMovie[]>([]);
  const [theaters, setTheaters] = useState<ShowtimeTheater[]>([]);
  const [showtimes, setShowtimes] = useState<ShowtimeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // ─── Bộ lọc Lịch chiếu (Theo Phim, Rạp, Ngày chiếu, Định dạng, Khung giờ) ────
  const [userViewMode, setViewMode] = useState<ShowtimeViewMode | null>(null);
  const viewMode: ShowtimeViewMode =
    userViewMode ?? (params.theaterId ? 'by_theater' : 'by_movie');

  const [selectedDateKey, setSelectedDateKey] = useState<string>('d0');
  const [userMovieId, setSelectedMovieId] = useState<string | null>(null);
  const selectedMovieId = userMovieId ?? params.movieId ?? 'all';

  const [userTheaterId, setSelectedTheaterId] = useState<string | null>(null);
  const selectedTheaterId = userTheaterId ?? params.theaterId ?? 'all';

  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<ShowtimeFormat | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<TimeSlotPeriod>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ─── Tự động bật chế độ Quản lý khi đăng nhập bằng tài khoản Admin ──────────
  const isManageMode = Boolean(isAuthenticated && user?.role === 'admin');
  const [crudSuccessBanner, setCrudSuccessBanner] = useState<string | null>(null);

  // Form Modal State (Thêm mới hoặc Sửa suất chiếu)
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<ShowtimeItem | null>(null);
  const [formMovieId, setFormMovieId] = useState<string>('m1');
  const [formTheaterId, setFormTheaterId] = useState<string>('t1');
  const [formDateKey, setFormDateKey] = useState<string>('d0');
  const [formStartTime, setFormStartTime] = useState<string>('19:30');
  const [formRoom, setFormRoom] = useState<string>('Rạp 01');
  const [formFormat, setFormFormat] = useState<ShowtimeFormat>('2D Phụ đề');
  const [formPrice, setFormPrice] = useState<string>('105000');
  const [formTotalSeats, setFormTotalSeats] = useState<string>('140');
  const [formAvailableSeats, setFormAvailableSeats] = useState<string>('140');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deletingSlot, setDeletingSlot] = useState<ShowtimeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ─── Modals State (Chi tiết suất chiếu & Chi tiết phim) ─────────────────────
  const [selectedShowtime, setSelectedShowtime] = useState<ShowtimeItem | null>(null);
  const [detailMovie, setDetailMovie] = useState<ShowtimeMovie | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);

  // ─── Booking & Food Ordering Modal State (UC38 & UC39) ──────────────────────
  const [bookingModalVisible, setBookingModalVisible] = useState<boolean>(false);
  const [activeBookingShowtime, setActiveBookingShowtime] = useState<ShowtimeItem | null>(null);
  const [adminHubVisible, setAdminHubVisible] = useState<boolean>(false);

  // ─── Gọi REST API lấy dữ liệu lịch chiếu ────────────────────────────────────
  const fetchShowtimes = useCallback(async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      const res = await ShowtimeAPI.getShowtimes({
        dateKey: selectedDateKey,
        movieId: selectedMovieId,
        theaterId: selectedTheaterId,
        area: selectedArea,
        format: selectedFormat,
        period: selectedPeriod,
        searchQuery,
      });

      if (res.dates?.length) setDates(res.dates);
      if (res.formats?.length) setFormats(res.formats);
      if (res.movies) setMovies(res.movies);
      if (res.theaters) setTheaters(res.theaters);
      setShowtimes(res.showtimes || []);
    } catch (err: any) {
      setApiError(
        err?.message ||
          'Không thể tải lịch chiếu lúc này. Vui lòng kiểm tra kết nối mạng và thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedDateKey,
    selectedMovieId,
    selectedTheaterId,
    selectedArea,
    selectedFormat,
    selectedPeriod,
    searchQuery,
  ]);

  useEffect(() => {
    fetchShowtimes();
  }, [fetchShowtimes]);

  // ─── Handlers Quản lý Lịch chiếu (Thêm mới / Sửa / Xóa) ────────────────────
  const handleOpenCreateModal = (presetMovieId?: string, presetTheaterId?: string) => {
    setEditingSlot(null);
    setFormMovieId(
      presetMovieId && presetMovieId !== 'all'
        ? presetMovieId
        : selectedMovieId !== 'all'
          ? selectedMovieId
          : movies[0]?.id || 'm1'
    );
    setFormTheaterId(
      presetTheaterId && presetTheaterId !== 'all'
        ? presetTheaterId
        : selectedTheaterId !== 'all'
          ? selectedTheaterId
          : theaters[0]?.id || 't1'
    );
    setFormDateKey(selectedDateKey || 'd0');
    setFormStartTime('19:30');
    setFormRoom('Rạp 01');
    setFormFormat(selectedFormat !== 'all' ? selectedFormat : '2D Phụ đề');
    setFormPrice('105000');
    setFormTotalSeats('140');
    setFormAvailableSeats('140');
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleOpenEditModal = (slot: ShowtimeItem) => {
    setSelectedShowtime(null);
    setEditingSlot(slot);
    setFormMovieId(slot.movieId);
    setFormTheaterId(slot.theaterId);
    setFormDateKey(slot.dateKey);
    setFormStartTime(slot.startTime);
    setFormRoom(slot.room);
    setFormFormat(slot.format);
    setFormPrice(String(slot.price));
    setFormTotalSeats(String(slot.totalSeats));
    setFormAvailableSeats(String(slot.availableSeats));
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleSaveShowtimeForm = async () => {
    setFormError(null);

    const trimmedRoom = formRoom.trim();
    const trimmedTime = formStartTime.trim();
    const numPrice = Number(formPrice.replace(/\./g, '').trim());
    const numTotal = Number(formTotalSeats);
    const numAvail = Number(formAvailableSeats);

    if (!trimmedTime || !/^\d{1,2}:\d{2}$/.test(trimmedTime)) {
      setFormError('Giờ bắt đầu phải theo định dạng HH:mm (ví dụ: 09:30 hoặc 19:45).');
      return;
    }
    const [hh, mm] = trimmedTime.split(':').map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      setFormError('Giờ bắt đầu không hợp lệ (Giờ từ 00-23, Phút từ 00-59).');
      return;
    }
    if (!trimmedRoom) {
      setFormError('Vui lòng chọn hoặc nhập tên phòng chiếu.');
      return;
    }
    if (Number.isNaN(numPrice) || numPrice < 10000) {
      setFormError('Giá vé phải từ 10.000đ trở lên.');
      return;
    }
    if (Number.isNaN(numTotal) || numTotal < 10) {
      setFormError('Tổng số ghế phải từ 10 ghế trở lên.');
      return;
    }
    if (Number.isNaN(numAvail) || numAvail < 0 || numAvail > numTotal) {
      setFormError(`Số ghế trống phải từ 0 đến ${numTotal} ghế.`);
      return;
    }

    const payload: ShowtimeFormPayload = {
      movieId: formMovieId,
      theaterId: formTheaterId,
      dateKey: formDateKey,
      startTime: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      room: trimmedRoom,
      format: formFormat,
      price: numPrice,
      totalSeats: numTotal,
      availableSeats: numAvail,
    };

    try {
      setIsSubmittingForm(true);
      if (editingSlot) {
        const res = await ShowtimeAPI.updateShowtime(editingSlot.id, payload);
        setCrudSuccessBanner(res.message);
      } else {
        const res = await ShowtimeAPI.createShowtime(payload);
        setCrudSuccessBanner(res.message);
      }
      setFormModalVisible(false);
      setSelectedDateKey(formDateKey);
      await fetchShowtimes();
    } catch (err: any) {
      setFormError(err?.message || 'Không thể lưu thông tin suất chiếu.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleConfirmDeleteShowtime = async () => {
    if (!deletingSlot) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await ShowtimeAPI.deleteShowtime(deletingSlot.id);
      setCrudSuccessBanner(res.message);
      setDeletingSlot(null);
      setSelectedShowtime(null);
      await fetchShowtimes();
    } catch (err: any) {
      setDeleteError(err?.message || 'Xóa suất chiếu thất bại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const theaterAreas = useMemo(() => {
    const distinct = Array.from(new Set(theaters.map((t) => t.area)));
    return ['all', ...distinct];
  }, [theaters]);

  const currentDateObj = useMemo(
    () =>
      dates.find((d) => d.dateKey === selectedDateKey) || {
        dateKey: 'd0',
        dayLabel: 'Hôm nay',
        dateDisplay: '15/10',
        fullDateLabel: 'Thứ Năm, 15/10/2026',
        isWeekend: false,
      },
    [dates, selectedDateKey]
  );

  // Lọc danh sách rạp hiển thị trên thanh chọn theo khu vực
  const visibleTheatersForPicker = useMemo(() => {
    if (selectedArea === 'all') return theaters;
    return theaters.filter((t) => t.area === selectedArea);
  }, [theaters, selectedArea]);

  // Thống kê nhanh cho thanh công cụ Quản trị viên
  const statsSummary = useMemo(() => {
    const total = showtimes.length;
    const soldOut = showtimes.filter((s) => s.status === 'sold_out').length;
    const filling = showtimes.filter(
      (s) => s.status === 'filling_fast' || s.status === 'almost_full'
    ).length;
    const available = total - soldOut;
    return { total, available, filling, soldOut };
  }, [showtimes]);

  // Nhóm kết quả theo Phim -> Rạp (Chế độ Xem theo Phim)
  const groupedByMovie = useMemo(() => {
    const movieMap = new Map<
      string,
      {
        movie: ShowtimeMovie;
        theaters: { theater: ShowtimeTheater; slots: ShowtimeItem[] }[];
      }
    >();

    movies.forEach((movie) => {
      const movieSlots = showtimes.filter((s) => s.movieId === movie.id);
      if (movieSlots.length === 0) return;

      const theaterGroups: { theater: ShowtimeTheater; slots: ShowtimeItem[] }[] = [];
      theaters.forEach((theater) => {
        const slots = movieSlots
          .filter((s) => s.theaterId === theater.id)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (slots.length > 0) {
          theaterGroups.push({ theater, slots });
        }
      });

      if (theaterGroups.length > 0) {
        movieMap.set(movie.id, { movie, theaters: theaterGroups });
      }
    });

    return Array.from(movieMap.values());
  }, [movies, theaters, showtimes]);

  // Nhóm kết quả theo Rạp -> Phim (Chế độ Xem theo Rạp)
  const groupedByTheater = useMemo(() => {
    const theaterMap = new Map<
      string,
      {
        theater: ShowtimeTheater;
        movies: { movie: ShowtimeMovie; slots: ShowtimeItem[] }[];
      }
    >();

    theaters.forEach((theater) => {
      const theaterSlots = showtimes.filter((s) => s.theaterId === theater.id);
      if (theaterSlots.length === 0) return;

      const movieGroups: { movie: ShowtimeMovie; slots: ShowtimeItem[] }[] = [];
      movies.forEach((movie) => {
        const slots = theaterSlots
          .filter((s) => s.movieId === movie.id)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (slots.length > 0) {
          movieGroups.push({ movie, slots });
        }
      });

      if (movieGroups.length > 0) {
        theaterMap.set(theater.id, { theater, movies: movieGroups });
      }
    });

    return Array.from(theaterMap.values());
  }, [movies, theaters, showtimes]);

  const hasActiveFilters =
    selectedMovieId !== 'all' ||
    selectedTheaterId !== 'all' ||
    selectedArea !== 'all' ||
    selectedFormat !== 'all' ||
    selectedPeriod !== 'all' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedMovieId('all');
    setSelectedTheaterId('all');
    setSelectedArea('all');
    setSelectedFormat('all');
    setSelectedPeriod('all');
    setSearchQuery('');
  };

  const selectedSlotMovie = useMemo(
    () =>
      selectedShowtime
        ? movies.find((m) => m.id === selectedShowtime.movieId) || null
        : null,
    [movies, selectedShowtime]
  );

  const selectedSlotTheater = useMemo(
    () =>
      selectedShowtime
        ? theaters.find((t) => t.id === selectedShowtime.theaterId) || null
        : null,
    [theaters, selectedShowtime]
  );

  const activeBookingMovie = useMemo(
    () =>
      activeBookingShowtime
        ? movies.find((m) => m.id === activeBookingShowtime.movieId) || null
        : null,
    [movies, activeBookingShowtime]
  );

  const activeBookingTheater = useMemo(
    () =>
      activeBookingShowtime
        ? theaters.find((t) => t.id === activeBookingShowtime.theaterId) || null
        : null,
    [theaters, activeBookingShowtime]
  );

  const formSelectedMovieObj = useMemo(
    () => movies.find((m) => m.id === formMovieId) || movies[0] || null,
    [movies, formMovieId]
  );

  const deletingSlotMovie = useMemo(
    () =>
      deletingSlot ? movies.find((m) => m.id === deletingSlot.movieId) || null : null,
    [movies, deletingSlot]
  );

  const deletingSlotTheater = useMemo(
    () =>
      deletingSlot
        ? theaters.find((t) => t.id === deletingSlot.theaterId) || null
        : null,
    [theaters, deletingSlot]
  );

  const renderShowtimeSlotButton = (slot: ShowtimeItem) => {
    const isSoldOut = slot.status === 'sold_out';
    const statusInfo = getStatusInfo(slot.status);

    return (
      <View
        key={slot.id}
        style={[
          styles.slotCard,
          isSoldOut && !isManageMode && styles.slotCardSoldOut,
          isManageMode && styles.slotCardManageActive,
        ]}>
        <TouchableOpacity
          disabled={isSoldOut && !isManageMode}
          onPress={() => {
            setBookingNotice(null);
            setSelectedShowtime(slot);
          }}
          activeOpacity={0.8}>
          <View style={styles.slotTimeRow}>
            <Text style={[styles.slotStartTime, isSoldOut && styles.slotTextSoldOut]}>
              {slot.startTime}
            </Text>
            <Text style={styles.slotEndTime}>~{slot.endTime}</Text>
          </View>

          <View style={styles.slotFormatBadge}>
            <Text style={styles.slotFormatText} numberOfLines={1}>
              {slot.format}
            </Text>
          </View>

          <Text style={styles.slotRoomText} numberOfLines={1}>
            {slot.room}
          </Text>

          <View style={styles.slotFooterRow}>
            <Text style={styles.slotPriceText}>{slot.priceFormatted}</Text>
            <View style={styles.slotSeatBadge}>
              <View style={[styles.seatDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.slotSeatText, { color: statusInfo.color }]}>
                {isSoldOut ? 'Hết vé' : `${slot.availableSeats} ghế`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Nút Sửa / Xóa trực tiếp trên thẻ suất chiếu khi đăng nhập Admin */}
        {isManageMode && (
          <View style={styles.slotAdminActionRow}>
            <TouchableOpacity
              style={styles.slotEditBtn}
              onPress={() => handleOpenEditModal(slot)}
              activeOpacity={0.8}>
              <Ionicons name="create-outline" size={13} color="#3B82F6" />
              <Text style={styles.slotEditBtnText}>Sửa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.slotDeleteBtn}
              onPress={() => {
                setDeleteError(null);
                setDeletingSlot(slot);
              }}
              activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={13} color="#EF4444" />
              <Text style={styles.slotDeleteBtnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 40 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* ─── Top Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={[styles.headerBadgeRow, { flex: 1 }]}>
                <Text style={styles.headerTitle}>
                  Hệ Thống Cụm Rạp & Lịch Chiếu
                </Text>
                <Text style={styles.headerSubtitle}>
                  Chọn ngày chiếu, bộ phim và cụm rạp gần bạn nhất để đặt vé
                </Text>
              </View>

              {/* Nút truy cập nhanh Quản Trị Hệ Thống (Chỉ hiển thị cho Admin) */}
              {isManageMode && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#1E2330',
                    borderWidth: 1,
                    borderColor: '#F59E0B',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                  onPress={() => setAdminHubVisible(true)}>
                  <Ionicons name="settings" size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B' }}>
                    Quản Trị
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ─── BẢNG QUẢN LÝ LỊCH CHIẾU (TỰ ĐỘNG HIỆN KHI ĐĂNG NHẬP ADMIN) ─── */}
            {isManageMode && (
              <View style={styles.adminToolbarCard}>
                <View style={styles.adminToolbarHeader}>
                  <View style={styles.adminToolbarLeft}>
                    <View style={styles.adminIconBadge}>
                      <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminToolbarTitle}>
                        QUẢN LÝ LỊCH CHIẾU
                      </Text>
                      <Text style={styles.adminToolbarSub}>
                        Quản trị viên: {user?.fullName}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.addShowtimePrimaryBtn}
                    onPress={() => handleOpenCreateModal()}
                    activeOpacity={0.85}>
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.addShowtimePrimaryText}>
                      Thêm suất chiếu
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Thống kê số lượng suất chiếu */}
                <View style={styles.adminStatsRow}>
                  <View style={styles.adminStatBox}>
                    <Text style={styles.adminStatNum}>{statsSummary.total}</Text>
                    <Text style={styles.adminStatLabel}>Tổng suất</Text>
                  </View>
                  <View style={styles.adminStatBox}>
                    <Text style={[styles.adminStatNum, { color: '#10B981' }]}>
                      {statsSummary.available}
                    </Text>
                    <Text style={styles.adminStatLabel}>Đang mở bán</Text>
                  </View>
                  <View style={styles.adminStatBox}>
                    <Text style={[styles.adminStatNum, { color: '#F59E0B' }]}>
                      {statsSummary.filling}
                    </Text>
                    <Text style={styles.adminStatLabel}>Sắp đầy</Text>
                  </View>
                  <View style={styles.adminStatBox}>
                    <Text style={[styles.adminStatNum, { color: '#EF4444' }]}>
                      {statsSummary.soldOut}
                    </Text>
                    <Text style={styles.adminStatLabel}>Hết vé</Text>
                  </View>
                </View>

                {crudSuccessBanner && (
                  <View style={styles.crudBannerBox}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.crudBannerText}>{crudSuccessBanner}</Text>
                    <TouchableOpacity onPress={() => setCrudSuccessBanner(null)}>
                      <Ionicons name="close" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: '#1E2330',
                    borderWidth: 1,
                    borderColor: '#3B82F6',
                    borderRadius: 10,
                    paddingVertical: 10,
                    marginTop: 10,
                  }}
                  onPress={() => setAdminHubVisible(true)}>
                  <Ionicons name="apps" size={16} color="#3B82F6" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#60A5FA' }}>
                    Trung Tâm Quản Trị Đồ Ăn, Khuyến Mãi & Báo Cáo (UC37, 39, 41, 42, 44, 45)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Chuyển đổi chế độ xem: Theo Phim vs Theo Rạp */}
            <View style={styles.viewModeSwitch}>
              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  viewMode === 'by_movie' && styles.viewModeBtnActive,
                ]}
                onPress={() => setViewMode('by_movie')}
                activeOpacity={0.85}>
                <Ionicons
                  name="film-outline"
                  size={16}
                  color={viewMode === 'by_movie' ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === 'by_movie' && styles.viewModeTextActive,
                  ]}>
                  Lịch chiếu theo Phim
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  viewMode === 'by_theater' && styles.viewModeBtnActive,
                ]}
                onPress={() => setViewMode('by_theater')}
                activeOpacity={0.85}>
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={viewMode === 'by_theater' ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === 'by_theater' && styles.viewModeTextActive,
                  ]}>
                  Lịch chiếu theo Rạp
                </Text>
              </TouchableOpacity>
            </View>

            {/* Thanh tìm kiếm nhanh Phim / Cụm rạp / Phòng chiếu */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm tên phim, tên rạp, quận, phòng chiếu hoặc giờ chiếu..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ─── BƯỚC 1: CHỌN NGÀY CHIẾU (7 NGÀY) ──────────────────────────── */}
          <View style={styles.filterSectionHeader}>
            <View style={styles.filterStepTitleRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepCircleText}>1</Text>
              </View>
              <Text style={styles.sectionHeading}>CHỌN NGÀY CHIẾU</Text>
            </View>
            <Text style={styles.selectedDateFullText}>{currentDateObj.fullDateLabel}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}>
            {dates.map((d) => {
              const isSelected = selectedDateKey === d.dateKey;
              return (
                <TouchableOpacity
                  key={d.dateKey}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => setSelectedDateKey(d.dateKey)}
                  activeOpacity={0.8}>
                  {d.isWeekend && !isSelected && <View style={styles.weekendDot} />}
                  <Text
                    style={[
                      styles.dateLabel,
                      isSelected && styles.dateLabelSelected,
                    ]}>
                    {d.dayLabel}
                  </Text>
                  <Text
                    style={[
                      styles.dateSub,
                      isSelected && styles.dateSubSelected,
                    ]}>
                    {d.dateDisplay}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ─── BƯỚC 2: CHỌN PHIM CHIẾU ───────────────────────────────────── */}
          <View style={styles.filterSectionHeader}>
            <View style={styles.filterStepTitleRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepCircleText}>2</Text>
              </View>
              <Text style={styles.sectionHeading}>CHỌN PHIM</Text>
            </View>
            {selectedMovieId !== 'all' && (
              <TouchableOpacity onPress={() => setSelectedMovieId('all')}>
                <Text style={styles.clearFilterLink}>Xem tất cả phim</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieSelectorList}>
            {/* Nút Tất cả phim */}
            <TouchableOpacity
              style={[
                styles.allMoviesPosterCard,
                selectedMovieId === 'all' && styles.moviePosterCardActive,
              ]}
              onPress={() => setSelectedMovieId('all')}
              activeOpacity={0.85}>
              <View
                style={[
                  styles.allMoviesIconCircle,
                  selectedMovieId === 'all' && { backgroundColor: '#E50914' },
                ]}>
                <Ionicons name="apps" size={22} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.movieSelectorTitle,
                  selectedMovieId === 'all' && styles.movieSelectorTitleActive,
                ]}>
                Tất cả phim
              </Text>
              <Text style={styles.movieSelectorSub}>{movies.length} phim đang chiếu</Text>
            </TouchableOpacity>

            {movies.map((movie) => {
              const isSelected = selectedMovieId === movie.id;
              const ageColor = getAgeBadgeColor(movie.ageRating);
              return (
                <TouchableOpacity
                  key={movie.id}
                  style={[
                    styles.movieSelectorCard,
                    isSelected && styles.moviePosterCardActive,
                  ]}
                  onPress={() =>
                    setSelectedMovieId(isSelected ? 'all' : movie.id)
                  }
                  activeOpacity={0.85}>
                  <View style={styles.movieSelectorPosterWrap}>
                    <Image
                      source={{ uri: movie.poster }}
                      style={styles.movieSelectorPoster}
                    />
                    <View
                      style={[
                        styles.miniAgeBadge,
                        { backgroundColor: ageColor.bg },
                      ]}>
                      <Text style={[styles.miniAgeBadgeText, { color: ageColor.text }]}>
                        {movie.ageRating}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.selectedCheckOverlay}>
                        <Ionicons name="checkmark-circle" size={24} color="#E50914" />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.movieSelectorTitle,
                      isSelected && styles.movieSelectorTitleActive,
                    ]}
                    numberOfLines={1}>
                    {movie.title}
                  </Text>
                  <Text style={styles.movieSelectorSub}>
                    {movie.durationLabel} • {movie.rating}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ─── BƯỚC 3: CHỌN KHU VỰC & CỤM RẠP ────────────────────────────── */}
          <View style={styles.filterSectionHeader}>
            <View style={styles.filterStepTitleRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepCircleText}>3</Text>
              </View>
              <Text style={styles.sectionHeading}>CHỌN CỤM RẠP CHIẾU</Text>
            </View>
            {(selectedTheaterId !== 'all' || selectedArea !== 'all') && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedTheaterId('all');
                  setSelectedArea('all');
                }}>
                <Text style={styles.clearFilterLink}>Tất cả rạp</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lọc nhanh theo Quận / Khu vực */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.areaChipsRow}>
            {theaterAreas.map((area) => {
              const isSelected = selectedArea === area;
              return (
                <TouchableOpacity
                  key={area}
                  style={[styles.areaChip, isSelected && styles.areaChipActive]}
                  onPress={() => {
                    setSelectedArea(area);
                    if (area !== 'all') {
                      const currentTheater = theaters.find(
                        (t) => t.id === selectedTheaterId
                      );
                      if (currentTheater && currentTheater.area !== area) {
                        setSelectedTheaterId('all');
                      }
                    }
                  }}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.areaChipText,
                      isSelected && styles.areaChipTextActive,
                    ]}>
                    {area === 'all' ? 'Tất cả khu vực' : area}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Danh sách chọn Cụm rạp */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.theaterChipsRow}>
            <TouchableOpacity
              style={[
                styles.theaterFilterCard,
                selectedTheaterId === 'all' && styles.theaterFilterCardActive,
              ]}
              onPress={() => setSelectedTheaterId('all')}
              activeOpacity={0.85}>
              <View style={styles.theaterFilterTop}>
                <Ionicons
                  name="business"
                  size={16}
                  color={selectedTheaterId === 'all' ? '#E50914' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.theaterFilterName,
                    selectedTheaterId === 'all' && styles.theaterFilterNameActive,
                  ]}>
                  Tất cả cụm rạp ({visibleTheatersForPicker.length})
                </Text>
              </View>
              <Text style={styles.theaterFilterSub}>
                Hiển thị toàn bộ hệ thống CineMax
              </Text>
            </TouchableOpacity>

            {visibleTheatersForPicker.map((theater) => {
              const isSelected = selectedTheaterId === theater.id;
              return (
                <TouchableOpacity
                  key={theater.id}
                  style={[
                    styles.theaterFilterCard,
                    isSelected && styles.theaterFilterCardActive,
                  ]}
                  onPress={() =>
                    setSelectedTheaterId(isSelected ? 'all' : theater.id)
                  }
                  activeOpacity={0.85}>
                  <View style={styles.theaterFilterTop}>
                    <Ionicons
                      name="location-sharp"
                      size={16}
                      color={isSelected ? '#E50914' : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.theaterFilterName,
                        isSelected && styles.theaterFilterNameActive,
                      ]}
                      numberOfLines={1}>
                      {theater.shortName}
                    </Text>
                    <Text style={styles.theaterDistanceTag}>{theater.distance}</Text>
                  </View>
                  <Text style={styles.theaterFilterSub} numberOfLines={1}>
                    {theater.area} • {theater.totalRooms} phòng chiếu
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ─── BƯỚC 4: LỌC ĐỊNH DẠNG & KHUNG GIỜ ─────────────────────────── */}
          <View style={styles.subFiltersBox}>
            {/* Lọc Định dạng phòng chiếu */}
            <Text style={styles.subFilterLabel}>ĐỊNH DẠNG PHÒNG CHIẾU:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.formatFilterRow}>
              <TouchableOpacity
                style={[
                  styles.formatChip,
                  selectedFormat === 'all' && styles.formatChipActive,
                ]}
                onPress={() => setSelectedFormat('all')}>
                <Text
                  style={[
                    styles.formatChipText,
                    selectedFormat === 'all' && styles.formatChipTextActive,
                  ]}>
                  Tất cả định dạng
                </Text>
              </TouchableOpacity>

              {formats.map((fmt) => {
                const isSelected = selectedFormat === fmt;
                return (
                  <TouchableOpacity
                    key={fmt}
                    style={[styles.formatChip, isSelected && styles.formatChipActive]}
                    onPress={() => setSelectedFormat(isSelected ? 'all' : fmt)}>
                    <Text
                      style={[
                        styles.formatChipText,
                        isSelected && styles.formatChipTextActive,
                      ]}>
                      {fmt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Lọc Khung giờ trong ngày */}
            <Text style={[styles.subFilterLabel, { marginTop: 12 }]}>
              KHUNG GIỜ CHIẾU:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.formatFilterRow}>
              {TIME_PERIOD_OPTIONS.map((period) => {
                const isSelected = selectedPeriod === period.key;
                return (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodChip,
                      isSelected && styles.periodChipActive,
                    ]}
                    onPress={() => setSelectedPeriod(period.key)}>
                    <Ionicons
                      name={period.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                    />
                    <View>
                      <Text
                        style={[
                          styles.periodChipLabel,
                          isSelected && styles.periodChipLabelActive,
                        ]}>
                        {period.label}
                      </Text>
                      <Text style={styles.periodChipSub}>{period.subLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ─── THANH TỔNG KẾT KẾT QUẢ LỌC ────────────────────────────────── */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryLeft}>
              <Ionicons name="ticket" size={16} color="#E50914" />
              <Text style={styles.summaryText}>
                Tìm thấy{' '}
                <Text style={styles.summaryHighlight}>
                  {showtimes.length} suất chiếu
                </Text>{' '}
                ({currentDateObj.dayLabel} - {currentDateObj.dateDisplay})
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={handleResetFilters}>
                  <Ionicons name="refresh" size={14} color="#F59E0B" />
                  <Text style={styles.resetFilterText}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              )}

              {isManageMode && (
                <TouchableOpacity
                  style={styles.quickAddMiniBtn}
                  onPress={() => handleOpenCreateModal()}>
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                  <Text style={styles.quickAddMiniText}>Thêm suất</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Chú thích trạng thái ghế */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Còn nhiều ghế</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Sắp đầy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
              <Text style={styles.legendText}>Còn ít ghế</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Hết vé</Text>
            </View>
          </View>

          {/* ─── HIỂN THỊ KẾT QUẢ LỊCH CHIẾU ───────────────────────────────── */}
          {isLoading ? (
            <View style={styles.loadingStateCard}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingStateTitle}>
                Đang tải lịch chiếu...
              </Text>
              <Text style={styles.loadingStateSub}>
                Vui lòng đợi trong giây lát
              </Text>
            </View>
          ) : apiError ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
              </View>
              <Text style={styles.emptyTitle}>Không thể tải lịch chiếu</Text>
              <Text style={styles.emptyDesc}>{apiError}</Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={fetchShowtimes}>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emptyResetBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : showtimes.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-clear-outline" size={36} color="#E50914" />
              </View>
              <Text style={styles.emptyTitle}>
                Không tìm thấy suất chiếu phù hợp
              </Text>
              <Text style={styles.emptyDesc}>
                Không có suất chiếu nào khớp với bộ lọc hiện tại vào ngày{' '}
                {currentDateObj.dateDisplay}. Bạn hãy thử đổi ngày chiếu, chọn định
                dạng khác hoặc đặt lại bộ lọc.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={handleResetFilters}>
                  <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyResetBtnText}>Xem toàn bộ lịch chiếu</Text>
                </TouchableOpacity>

                {isManageMode && (
                  <TouchableOpacity
                    style={[styles.emptyResetBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleOpenCreateModal()}>
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyResetBtnText}>+ Thêm suất chiếu mới</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : viewMode === 'by_movie' ? (
            /* ═══ CHẾ ĐỘ 1: XEM LỊCH CHIẾU THEO PHIM ═══ */
            <View style={styles.resultsList}>
              {groupedByMovie.map(({ movie, theaters: movieTheaters }) => {
                const ageColor = getAgeBadgeColor(movie.ageRating);
                return (
                  <View key={movie.id} style={styles.movieShowtimeCard}>
                    {/* Thông tin tóm tắt Phim */}
                    <View style={styles.movieCardHeader}>
                      <Image
                        source={{ uri: movie.poster }}
                        style={styles.movieCardPoster}
                      />
                      <View style={styles.movieCardInfo}>
                        <View style={styles.movieBadgeRow}>
                          <View
                            style={[
                              styles.ageBadge,
                              { backgroundColor: ageColor.bg },
                            ]}>
                            <Text
                              style={[
                                styles.ageBadgeText,
                                { color: ageColor.text },
                              ]}>
                              {movie.ageRating}
                            </Text>
                          </View>
                          {movie.badge ? (
                            <View style={styles.hotBadge}>
                              <Text style={styles.hotBadgeText}>{movie.badge}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.movieRatingText}>{movie.rating}</Text>
                        </View>

                        <Text style={styles.movieCardTitle}>{movie.title}</Text>
                        <Text style={styles.movieCardGenre} numberOfLines={1}>
                          {movie.genre}
                        </Text>

                        <View style={styles.movieMetaRow}>
                          <View style={styles.metaPill}>
                            <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                            <Text style={styles.metaPillText}>
                              {movie.durationLabel}
                            </Text>
                          </View>
                          <View style={styles.metaPill}>
                            <Ionicons
                              name="videocam-outline"
                              size={13}
                              color="#9CA3AF"
                            />
                            <Text style={styles.metaPillText}>
                              {movie.formats.length} định dạng
                            </Text>
                          </View>
                        </View>

                        <View style={styles.movieCardBottomActions}>
                          <TouchableOpacity
                            style={styles.movieDetailBtn}
                            onPress={() => setDetailMovie(movie)}>
                            <Ionicons
                              name="information-circle-outline"
                              size={15}
                              color="#E50914"
                            />
                            <Text style={styles.movieDetailBtnText}>
                              Chi tiết phim
                            </Text>
                          </TouchableOpacity>

                          {isManageMode && (
                            <TouchableOpacity
                              style={styles.addSlotForMovieBtn}
                              onPress={() => handleOpenCreateModal(movie.id)}>
                              <Ionicons name="add-circle-outline" size={14} color="#10B981" />
                              <Text style={styles.addSlotForMovieText}>
                                + Thêm suất phim này
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Danh sách các Cụm rạp đang chiếu phim này */}
                    <View style={styles.theaterSubGroupsWrap}>
                      {movieTheaters.map(({ theater, slots }) => (
                        <View key={theater.id} style={styles.theaterSubGroup}>
                          <View style={styles.theaterSubHeader}>
                            <View style={styles.theaterSubTitleRow}>
                              <Ionicons
                                name="location-sharp"
                                size={15}
                                color="#E50914"
                              />
                              <Text style={styles.theaterSubName}>
                                {theater.name}
                              </Text>
                            </View>
                            <View style={styles.theaterDistancePill}>
                              <Text style={styles.theaterDistanceText}>
                                {theater.area} • {theater.distance}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.theaterSubAddress} numberOfLines={1}>
                            {theater.address}
                          </Text>

                          {/* Các giờ chiếu (Slots) */}
                          <View style={styles.slotsGrid}>
                            {slots.map((slot) => renderShowtimeSlotButton(slot))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* ═══ CHẾ ĐỘ 2: XEM LỊCH CHIẾU THEO CỤM RẠP ═══ */
            <View style={styles.resultsList}>
              {groupedByTheater.map(({ theater, movies: theaterMovies }) => (
                <View key={theater.id} style={styles.theaterShowtimeCard}>
                  {/* Header Cụm rạp */}
                  <View style={styles.theaterMainHeader}>
                    <View style={styles.theaterMainTitleRow}>
                      <View style={styles.theaterIconBox}>
                        <Ionicons name="business" size={20} color="#E50914" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.theaterNameWithArea}>
                          <Text style={styles.theaterMainName}>{theater.name}</Text>
                        </View>
                        <Text style={styles.theaterMainAddress}>
                          {theater.address}
                        </Text>
                      </View>
                      {isManageMode ? (
                        <TouchableOpacity
                          style={styles.addSlotForMovieBtn}
                          onPress={() => handleOpenCreateModal(undefined, theater.id)}>
                          <Ionicons name="add-circle-outline" size={14} color="#10B981" />
                          <Text style={styles.addSlotForMovieText}>+ Thêm suất</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.theaterDistanceBadgeBig}>
                          <Ionicons name="navigate" size={11} color="#F59E0B" />
                          <Text style={styles.theaterDistanceBigText}>
                            {theater.distance}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Tiện ích rạp */}
                    <View style={styles.amenitiesRow}>
                      {theater.amenities.map((am, idx) => (
                        <View key={idx} style={styles.amenityTag}>
                          <Ionicons
                            name="checkmark-circle"
                            size={11}
                            color="#10B981"
                          />
                          <Text style={styles.amenityTagText}>{am}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Danh sách Phim chiếu tại rạp này */}
                  <View style={styles.theaterSubGroupsWrap}>
                    {theaterMovies.map(({ movie, slots }) => {
                      const ageColor = getAgeBadgeColor(movie.ageRating);
                      return (
                        <View key={movie.id} style={styles.movieSubGroupInTheater}>
                          <TouchableOpacity
                            style={styles.movieSubHeader}
                            onPress={() => setDetailMovie(movie)}
                            activeOpacity={0.85}>
                            <Image
                              source={{ uri: movie.poster }}
                              style={styles.movieSubMiniPoster}
                            />
                            <View style={{ flex: 1 }}>
                              <View style={styles.movieBadgeRow}>
                                <View
                                  style={[
                                    styles.ageBadge,
                                    { backgroundColor: ageColor.bg },
                                  ]}>
                                  <Text
                                    style={[
                                      styles.ageBadgeText,
                                      { color: ageColor.text },
                                    ]}>
                                    {movie.ageRating}
                                  </Text>
                                </View>
                                <Text
                                  style={styles.movieSubTitle}
                                  numberOfLines={1}>
                                  {movie.title}
                                </Text>
                              </View>
                              <Text style={styles.movieSubMeta}>
                                {movie.genre} • {movie.durationLabel} •{' '}
                                {movie.rating}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="#6B7280"
                            />
                          </TouchableOpacity>

                          <View style={styles.slotsGrid}>
                            {slots.map((slot) => renderShowtimeSlotButton(slot))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: CHI TIẾT SUẤT CHIẾU
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(selectedShowtime)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedShowtime(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedShowtime && selectedSlotMovie && selectedSlotTheater && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderBadge}>
                    <Ionicons name="ticket-outline" size={16} color="#E50914" />
                    <Text style={styles.modalHeaderBadgeText}>
                      THÔNG TIN SUẤT CHIẾU
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedShowtime(null)}>
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Thông tin Phim */}
                <View style={styles.modalMovieBanner}>
                  <Image
                    source={{ uri: selectedSlotMovie.poster }}
                    style={styles.modalMoviePoster}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.movieBadgeRow}>
                      <View
                        style={[
                          styles.ageBadge,
                          {
                            backgroundColor: getAgeBadgeColor(
                              selectedSlotMovie.ageRating
                            ).bg,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.ageBadgeText,
                            {
                              color: getAgeBadgeColor(selectedSlotMovie.ageRating)
                                .text,
                            },
                          ]}>
                          {selectedSlotMovie.ageRating}
                        </Text>
                      </View>
                      <Text style={styles.modalMovieOriginal} numberOfLines={1}>
                        {selectedSlotMovie.originalTitle}
                      </Text>
                    </View>
                    <Text style={styles.modalMovieTitle}>
                      {selectedSlotMovie.title}
                    </Text>
                    <Text style={styles.modalMovieSub}>
                      {selectedSlotMovie.durationLabel} • {selectedSlotMovie.genre}
                    </Text>
                  </View>
                </View>

                {/* Bảng chi tiết Rạp - Ngày - Giờ - Phòng - Ghế */}
                <View style={styles.modalDetailsGrid}>
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>CỤM RẠP CHIẾU</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedSlotTheater.name}
                    </Text>
                    <Text style={styles.modalDetailSubValue}>
                      {selectedSlotTheater.address}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow2Cols}>
                    <View style={styles.modalDetailCol}>
                      <Text style={styles.modalDetailLabel}>NGÀY CHIẾU</Text>
                      <Text style={styles.modalDetailHighlight}>
                        {currentDateObj.dayLabel} ({selectedShowtime.dateStr})
                      </Text>
                    </View>
                    <View style={styles.modalDetailCol}>
                      <Text style={styles.modalDetailLabel}>KHUNG GIỜ CHIẾU</Text>
                      <Text style={styles.modalDetailHighlight}>
                        {selectedShowtime.startTime} ~ {selectedShowtime.endTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow2Cols}>
                    <View style={styles.modalDetailCol}>
                      <Text style={styles.modalDetailLabel}>PHÒNG & ĐỊNH DẠNG</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedShowtime.room} • {selectedShowtime.format}
                      </Text>
                    </View>
                    <View style={styles.modalDetailCol}>
                      <Text style={styles.modalDetailLabel}>TÌNH TRẠNG GHẾ</Text>
                      <Text
                        style={[
                          styles.modalDetailValue,
                          {
                            color: getStatusInfo(selectedShowtime.status).color,
                          },
                        ]}>
                        Còn {selectedShowtime.availableSeats}/
                        {selectedShowtime.totalSeats} ghế trống
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPriceLabel}>Giá vé tiêu chuẩn:</Text>
                    <Text style={styles.modalPriceValue}>
                      {selectedShowtime.priceFormatted} / ghế
                    </Text>
                  </View>
                </View>

                {/* Cảnh báo độ tuổi */}
                <View style={styles.ageWarningBanner}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color="#F59E0B"
                  />
                  <Text style={styles.ageWarningText}>
                    {selectedSlotMovie.ageDescription}
                  </Text>
                </View>

                {bookingNotice ? (
                  <View style={styles.bookingSuccessBox}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.bookingSuccessText}>{bookingNotice}</Text>
                  </View>
                ) : null}

                {/* Nút xem sơ đồ ghế phòng chiếu */}
                <TouchableOpacity
                  style={styles.modalSeatMapBtn}
                  onPress={() => {
                    const slot = selectedShowtime;
                    setSelectedShowtime(null);
                    router.push({
                      pathname: '/seats',
                      params: { theaterId: slot.theaterId, room: slot.room },
                    });
                  }}
                  activeOpacity={0.8}>
                  <Ionicons name="grid-outline" size={16} color="#3B82F6" />
                  <Text style={styles.modalSeatMapText}>
                    Xem sơ đồ ghế {selectedShowtime.room}
                  </Text>
                </TouchableOpacity>

                {/* Nút Quản lý trong Modal chi tiết khi là Admin */}
                {isManageMode && (
                  <View style={styles.modalAdminActionsRow}>
                    <TouchableOpacity
                      style={styles.modalAdminEditBtn}
                      onPress={() => handleOpenEditModal(selectedShowtime)}>
                      <Ionicons name="create-outline" size={16} color="#3B82F6" />
                      <Text style={styles.modalAdminEditText}>
                        Sửa suất
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalAdminEditBtn, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}
                      onPress={() => {
                        const slot = selectedShowtime;
                        setSelectedShowtime(null);
                        router.push({
                          pathname: '/seats',
                          params: { theaterId: slot.theaterId, room: slot.room },
                        });
                      }}>
                      <Ionicons name="grid" size={16} color="#10B981" />
                      <Text style={[styles.modalAdminEditText, { color: '#10B981' }]}>
                        Quản lý ghế
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalAdminDeleteBtn}
                      onPress={() => {
                        const target = selectedShowtime;
                        setSelectedShowtime(null);
                        setDeleteError(null);
                        setDeletingSlot(target);
                      }}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.modalAdminDeleteText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Nút hành động Đặt vé */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setSelectedShowtime(null)}>
                    <Text style={styles.modalCancelText}>Đóng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => {
                      const st = selectedShowtime;
                      setSelectedShowtime(null);
                      setActiveBookingShowtime(st);
                      setBookingModalVisible(true);
                    }}>
                    <Ionicons name="ticket" size={16} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryText}>
                      Đặt vé & Chọn bắp nước (UC38)
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── UC38: ĐẶT VÉ & CHỌN BẮP NƯỚC (BOOKING & FOOD ORDERING MODAL) ─── */}
      <BookingFoodModal
        visible={bookingModalVisible}
        onClose={() => {
          setBookingModalVisible(false);
          setActiveBookingShowtime(null);
        }}
        movie={activeBookingMovie}
        theater={activeBookingTheater}
        showtime={activeBookingShowtime}
        dateLabel={currentDateObj.dayLabel}
        onBookingComplete={() => {
          fetchShowtimes();
        }}
      />

      {/* ─── TRUNG TÂM QUẢN TRỊ CINEMAX (UC37, UC39, UC41, UC42, UC44, UC45) ─── */}
      <AdminManagementHubModal
        visible={adminHubVisible}
        onClose={() => setAdminHubVisible(false)}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: CHI TIẾT BỘ PHIM
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(detailMovie)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailMovie(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detailMovie && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderBadge}>
                    <Ionicons name="film-outline" size={16} color="#E50914" />
                    <Text style={styles.modalHeaderBadgeText}>
                      THÔNG TIN CHI TIẾT PHIM
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setDetailMovie(null)}>
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalMovieBanner}>
                  <Image
                    source={{ uri: detailMovie.poster }}
                    style={styles.modalMoviePosterLarge}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalMovieTitle}>{detailMovie.title}</Text>
                    <Text style={styles.modalMovieOriginal}>
                      {detailMovie.originalTitle}
                    </Text>
                    <Text style={styles.modalMovieSub}>
                      Thể loại: {detailMovie.genre}
                    </Text>
                    <Text style={styles.modalMovieSub}>
                      Thời lượng: {detailMovie.durationLabel} • Đánh giá:{' '}
                      {detailMovie.rating}
                    </Text>
                    <Text style={styles.modalMovieSub}>
                      Khởi chiếu: {detailMovie.releaseDate}
                    </Text>
                    <Text style={styles.modalMovieSub}>
                      Đạo diễn: {detailMovie.director}
                    </Text>
                  </View>
                </View>

                <View style={styles.synopsisBox}>
                  <Text style={styles.synopsisHeading}>NỘI DUNG PHIM</Text>
                  <Text style={styles.synopsisText}>{detailMovie.synopsis}</Text>
                  <Text style={[styles.synopsisHeading, { marginTop: 10 }]}>
                    DIỄN VIÊN
                  </Text>
                  <Text style={styles.synopsisText}>
                    {detailMovie.cast.join(', ')}
                  </Text>
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setDetailMovie(null)}>
                    <Text style={styles.modalCancelText}>Đóng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => {
                      setSelectedMovieId(detailMovie.id);
                      setViewMode('by_movie');
                      setDetailMovie(null);
                    }}>
                    <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryText}>
                      Xem suất chiếu phim này
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: THÊM MỚI / CHỈNH SỬA SUẤT CHIẾU
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBadge}>
                <Ionicons
                  name={editingSlot ? 'create' : 'add-circle'}
                  size={18}
                  color="#F59E0B"
                />
                <Text style={[styles.modalHeaderBadgeText, { color: '#F59E0B' }]}>
                  {editingSlot ? 'CHỈNH SỬA SUẤT CHIẾU' : 'THÊM SUẤT CHIẾU MỚI'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFormModalVisible(false)}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              {formError && (
                <View style={styles.formErrorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              {/* 1. Chọn Phim */}
              <View>
                <Text style={styles.formFieldLabel}>1. CHỌN PHIM CHIẾU *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.formChipsScroll}>
                  {movies.map((m) => {
                    const active = formMovieId === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.formSelectChip,
                          active && styles.formSelectChipActive,
                        ]}
                        onPress={() => setFormMovieId(m.id)}>
                        <Text
                          style={[
                            styles.formSelectChipText,
                            active && styles.formSelectChipTextActive,
                          ]}>
                          {m.title} ({m.durationLabel})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. Chọn Cụm Rạp */}
              <View>
                <Text style={styles.formFieldLabel}>2. CHỌN CỤM RẠP *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.formChipsScroll}>
                  {theaters.map((t) => {
                    const active = formTheaterId === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.formSelectChip,
                          active && styles.formSelectChipActive,
                        ]}
                        onPress={() => setFormTheaterId(t.id)}>
                        <Text
                          style={[
                            styles.formSelectChipText,
                            active && styles.formSelectChipTextActive,
                          ]}>
                          {t.shortName} ({t.area})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 3. Chọn Ngày Chiếu */}
              <View>
                <Text style={styles.formFieldLabel}>3. CHỌN NGÀY CHIẾU *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.formChipsScroll}>
                  {dates.map((d) => {
                    const active = formDateKey === d.dateKey;
                    return (
                      <TouchableOpacity
                        key={d.dateKey}
                        style={[
                          styles.formSelectChip,
                          active && styles.formSelectChipActive,
                        ]}
                        onPress={() => setFormDateKey(d.dateKey)}>
                        <Text
                          style={[
                            styles.formSelectChipText,
                            active && styles.formSelectChipTextActive,
                          ]}>
                          {d.dayLabel} ({d.dateDisplay})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 4. Chọn Giờ Bắt Đầu & Tự động tính Giờ Kết Thúc */}
              <View>
                <View style={styles.formLabelBetween}>
                  <Text style={styles.formFieldLabel}>
                    4. GIỜ BẮT ĐẦU (HH:mm) *
                  </Text>
                  <Text style={styles.formPreviewEndText}>
                    Giờ kết thúc dự kiến:{' '}
                    <Text style={{ color: '#10B981', fontWeight: '800' }}>
                      ~
                      {previewEndTime(
                        formStartTime,
                        formSelectedMovieObj?.durationMinutes || 120
                      )}
                    </Text>
                  </Text>
                </View>

                <TextInput
                  style={styles.formTextInput}
                  value={formStartTime}
                  onChangeText={setFormStartTime}
                  placeholder="VD: 19:30"
                  placeholderTextColor="#6B7280"
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.formChipsScroll, { marginTop: 6 }]}>
                  {QUICK_START_TIMES.map((timeStr) => {
                    const active = formStartTime.trim() === timeStr;
                    return (
                      <TouchableOpacity
                        key={timeStr}
                        style={[
                          styles.formMiniChip,
                          active && styles.formMiniChipActive,
                        ]}
                        onPress={() => setFormStartTime(timeStr)}>
                        <Text
                          style={[
                            styles.formMiniChipText,
                            active && styles.formMiniChipTextActive,
                          ]}>
                          {timeStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 5. Phòng Chiếu */}
              <View>
                <Text style={styles.formFieldLabel}>5. PHÒNG CHIẾU *</Text>
                <TextInput
                  style={styles.formTextInput}
                  value={formRoom}
                  onChangeText={setFormRoom}
                  placeholder="VD: Rạp 01, Rạp 03 (IMAX)..."
                  placeholderTextColor="#6B7280"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.formChipsScroll, { marginTop: 6 }]}>
                  {QUICK_ROOMS.map((roomName) => {
                    const active = formRoom.trim() === roomName;
                    return (
                      <TouchableOpacity
                        key={roomName}
                        style={[
                          styles.formMiniChip,
                          active && styles.formMiniChipActive,
                        ]}
                        onPress={() => setFormRoom(roomName)}>
                        <Text
                          style={[
                            styles.formMiniChipText,
                            active && styles.formMiniChipTextActive,
                          ]}>
                          {roomName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 6. Định Dạng Chiếu */}
              <View>
                <Text style={styles.formFieldLabel}>6. ĐỊNH DẠNG PHÒNG CHIẾU *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.formChipsScroll}>
                  {(formats.length ? formats : (['2D Phụ đề', '2D Lồng tiếng', '3D Phụ đề', 'IMAX 3D', '4DX', 'Gold Class VIP'] as ShowtimeFormat[])).map(
                    (fmt) => {
                      const active = formFormat === fmt;
                      return (
                        <TouchableOpacity
                          key={fmt}
                          style={[
                            styles.formSelectChip,
                            active && styles.formSelectChipActive,
                          ]}
                          onPress={() => setFormFormat(fmt)}>
                          <Text
                            style={[
                              styles.formSelectChipText,
                              active && styles.formSelectChipTextActive,
                            ]}>
                            {fmt}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>

              {/* 7. Giá Vé */}
              <View>
                <Text style={styles.formFieldLabel}>7. GIÁ VÉ (VNĐ) *</Text>
                <TextInput
                  style={styles.formTextInput}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  keyboardType="numeric"
                  placeholder="VD: 105000"
                  placeholderTextColor="#6B7280"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.formChipsScroll, { marginTop: 6 }]}>
                  {QUICK_PRICES.map((p) => {
                    const active = Number(formPrice) === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.formMiniChip,
                          active && styles.formMiniChipActive,
                        ]}
                        onPress={() => setFormPrice(String(p))}>
                        <Text
                          style={[
                            styles.formMiniChipText,
                            active && styles.formMiniChipTextActive,
                          ]}>
                          {p.toLocaleString('vi-VN')}đ
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 8. Tổng Số Ghế & Ghế Trống */}
              <View style={styles.formTwoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>TỔNG SỐ GHẾ *</Text>
                  <TextInput
                    style={styles.formTextInput}
                    value={formTotalSeats}
                    onChangeText={setFormTotalSeats}
                    keyboardType="numeric"
                    placeholder="140"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>GHẾ CÒN TRỐNG *</Text>
                  <TextInput
                    style={styles.formTextInput}
                    value={formAvailableSeats}
                    onChangeText={setFormAvailableSeats}
                    keyboardType="numeric"
                    placeholder="140"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              {/* Nút chọn nhanh tình trạng ghế */}
              <View style={styles.quickSeatsRow}>
                <TouchableOpacity
                  style={styles.quickSeatBtn}
                  onPress={() => setFormAvailableSeats(formTotalSeats || '140')}>
                  <Text style={styles.quickSeatBtnText}>Còn đủ ghế</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSeatBtn}
                  onPress={() => setFormAvailableSeats('25')}>
                  <Text style={styles.quickSeatBtnText}>Sắp đầy (25)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSeatBtn}
                  onPress={() => setFormAvailableSeats('8')}>
                  <Text style={styles.quickSeatBtnText}>Còn ít (8)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSeatBtn}
                  onPress={() => setFormAvailableSeats('0')}>
                  <Text style={styles.quickSeatBtnText}>Hết vé (0)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.modalActionsRow, { marginTop: 12 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                disabled={isSubmittingForm}
                onPress={() => setFormModalVisible(false)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, isSubmittingForm && { opacity: 0.7 }]}
                disabled={isSubmittingForm}
                onPress={handleSaveShowtimeForm}>
                {isSubmittingForm ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryText}>
                      {editingSlot ? 'Lưu thay đổi' : 'Thêm suất chiếu'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: XÁC NHẬN XÓA SUẤT CHIẾU
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(deletingSlot)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingSlot(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {deletingSlot && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderBadge}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" />
                    <Text style={[styles.modalHeaderBadgeText, { color: '#EF4444' }]}>
                      XÁC NHẬN XÓA SUẤT CHIẾU
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setDeletingSlot(null)}>
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.deleteConfirmDesc}>
                  Bạn có chắc chắn muốn xóa suất chiếu này khỏi hệ thống không?
                </Text>

                <View style={styles.deleteSummaryCard}>
                  <Text style={styles.deleteSummaryTitle}>
                    🎬 {deletingSlotMovie?.title || deletingSlot.movieId}
                  </Text>
                  <Text style={styles.deleteSummaryMeta}>
                    🏢 Rạp: {deletingSlotTheater?.name || deletingSlot.theaterId}
                  </Text>
                  <Text style={styles.deleteSummaryMeta}>
                    📅 Ngày: {deletingSlot.dateStr} • ⏰ Giờ:{' '}
                    <Text style={{ color: '#F59E0B', fontWeight: '800' }}>
                      {deletingSlot.startTime} ~ {deletingSlot.endTime}
                    </Text>
                  </Text>
                  <Text style={styles.deleteSummaryMeta}>
                    💺 {deletingSlot.room} • {deletingSlot.format} •{' '}
                    {deletingSlot.priceFormatted}
                  </Text>
                </View>

                {deleteError && (
                  <View style={styles.formErrorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" />
                    <Text style={styles.formErrorText}>{deleteError}</Text>
                  </View>
                )}

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    disabled={isDeleting}
                    onPress={() => setDeletingSlot(null)}>
                    <Text style={styles.modalCancelText}>Giữ lại</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryBtn,
                      { backgroundColor: '#EF4444' },
                      isDeleting && { opacity: 0.7 },
                    ]}
                    disabled={isDeleting}
                    onPress={handleConfirmDeleteShowtime}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="trash" size={16} color="#FFFFFF" />
                        <Text style={styles.modalPrimaryText}>
                          Xóa suất chiếu
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingTop: 8,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerBadgeRow: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 3,
  },
  adminToolbarCard: {
    backgroundColor: '#161924',
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    gap: 12,
  },
  adminToolbarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  adminToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  adminIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminToolbarTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  adminToolbarSub: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 2,
  },
  addShowtimePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    gap: 5,
  },
  addShowtimePrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  adminStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adminStatBox: {
    flex: 1,
    backgroundColor: '#10131C',
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22283A',
  },
  adminStatNum: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  adminStatLabel: {
    color: '#9CA3AF',
    fontSize: 10.5,
    marginTop: 2,
  },
  crudBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  crudBannerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 4,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#232838',
    gap: 6,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#E50914',
  },
  viewModeText: {
    color: '#9CA3AF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#232838',
    paddingHorizontal: 12,
    height: 44,
    marginTop: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  filterStepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeading: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  selectedDateFullText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  clearFilterLink: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '700',
  },
  dateList: {
    gap: 10,
    marginBottom: 18,
  },
  dateChip: {
    backgroundColor: '#151821',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232838',
    minWidth: 82,
    position: 'relative',
  },
  dateChipSelected: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  weekendDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  dateLabel: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  dateLabelSelected: {
    color: '#FFFFFF',
  },
  dateSub: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  dateSubSelected: {
    color: '#FFFFFF',
  },
  movieSelectorList: {
    gap: 12,
    marginBottom: 18,
  },
  allMoviesPosterCard: {
    width: 112,
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#232838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allMoviesIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#232838',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  movieSelectorCard: {
    width: 118,
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#232838',
  },
  moviePosterCardActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  movieSelectorPosterWrap: {
    position: 'relative',
    width: '100%',
    height: 132,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 7,
  },
  movieSelectorPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F2430',
  },
  miniAgeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniAgeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  selectedCheckOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#0B0C10',
    borderRadius: 14,
  },
  movieSelectorTitle: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  movieSelectorTitleActive: {
    color: '#E50914',
  },
  movieSelectorSub: {
    color: '#9CA3AF',
    fontSize: 10.5,
    marginTop: 2,
  },
  areaChipsRow: {
    gap: 8,
    marginBottom: 10,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#232838',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  areaChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  areaChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  areaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  theaterChipsRow: {
    gap: 10,
    marginBottom: 18,
  },
  theaterFilterCard: {
    backgroundColor: '#151821',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#232838',
    minWidth: 195,
  },
  theaterFilterCardActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  theaterFilterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  theaterFilterName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  theaterFilterNameActive: {
    color: '#E50914',
  },
  theaterDistanceTag: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  theaterFilterSub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  subFiltersBox: {
    backgroundColor: '#12151E',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#1F2433',
    marginBottom: 16,
  },
  subFilterLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  formatFilterRow: {
    gap: 8,
  },
  formatChip: {
    backgroundColor: '#191D2A',
    borderWidth: 1,
    borderColor: '#2A3042',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  formatChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  formatChipText: {
    color: '#D1D5DB',
    fontSize: 11.5,
    fontWeight: '600',
  },
  formatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191D2A',
    borderWidth: 1,
    borderColor: '#2A3042',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    gap: 7,
  },
  periodChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  periodChipLabel: {
    color: '#E5E7EB',
    fontSize: 11.5,
    fontWeight: '700',
  },
  periodChipLabelActive: {
    color: '#FFFFFF',
  },
  periodChipSub: {
    color: '#9CA3AF',
    fontSize: 9.5,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151821',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  summaryText: {
    color: '#D1D5DB',
    fontSize: 12.5,
  },
  summaryHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  resetFilterText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  quickAddMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  quickAddMiniText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  loadingStateCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232838',
    marginTop: 8,
  },
  loadingStateTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  loadingStateSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  resultsList: {
    gap: 18,
  },
  movieShowtimeCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232838',
    overflow: 'hidden',
  },
  movieCardHeader: {
    flexDirection: 'row',
    padding: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2433',
    backgroundColor: '#181C26',
  },
  movieCardPoster: {
    width: 88,
    height: 128,
    borderRadius: 10,
    backgroundColor: '#0F121B',
  },
  movieCardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  movieBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  hotBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.18)',
    borderWidth: 1,
    borderColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  hotBadgeText: {
    color: '#E50914',
    fontSize: 9.5,
    fontWeight: '800',
  },
  movieRatingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  movieCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  movieCardGenre: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  movieMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaPillText: {
    color: '#D1D5DB',
    fontSize: 11.5,
    fontWeight: '600',
  },
  movieCardBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  movieDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  movieDetailBtnText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '700',
  },
  addSlotForMovieBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  addSlotForMovieText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  theaterSubGroupsWrap: {
    padding: 14,
    gap: 16,
  },
  theaterSubGroup: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2330',
  },
  theaterSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  theaterSubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  theaterSubName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    flex: 1,
  },
  theaterDistancePill: {
    backgroundColor: '#191E2B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  theaterDistanceText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  theaterSubAddress: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 3,
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: '48%',
    backgroundColor: '#171B26',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#283044',
  },
  slotCardSoldOut: {
    opacity: 0.48,
    borderColor: '#232733',
  },
  slotCardManageActive: {
    borderColor: '#333D58',
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  slotStartTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  slotTextSoldOut: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  slotEndTime: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  slotFormatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 5,
  },
  slotFormatText: {
    color: '#E50914',
    fontSize: 10.5,
    fontWeight: '700',
  },
  slotRoomText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  slotFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#22283A',
  },
  slotPriceText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  slotSeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotSeatText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  slotAdminActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#242B3D',
  },
  slotEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    paddingVertical: 4.5,
    borderRadius: 6,
    gap: 4,
  },
  slotEditBtnText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  slotDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 4.5,
    borderRadius: 6,
    gap: 4,
  },
  slotDeleteBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  theaterShowtimeCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232838',
    overflow: 'hidden',
  },
  theaterMainHeader: {
    padding: 14,
    backgroundColor: '#181C26',
    borderBottomWidth: 1,
    borderBottomColor: '#222736',
  },
  theaterMainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  theaterIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  theaterNameWithArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  theaterMainName: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  theaterMainAddress: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  theaterDistanceBadgeBig: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  theaterDistanceBigText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10131B',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
  },
  amenityTagText: {
    color: '#D1D5DB',
    fontSize: 10.5,
    fontWeight: '600',
  },
  movieSubGroupInTheater: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2330',
  },
  movieSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2230',
  },
  movieSubMiniPoster: {
    width: 44,
    height: 62,
    borderRadius: 6,
    backgroundColor: '#1F2430',
  },
  movieSubTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  movieSubMeta: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 4,
  },
  emptyStateCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232838',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#151821',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A3042',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalHeaderBadgeText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalMovieBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#10131B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2433',
    marginBottom: 14,
  },
  modalMoviePoster: {
    width: 64,
    height: 92,
    borderRadius: 8,
  },
  modalMoviePosterLarge: {
    width: 84,
    height: 122,
    borderRadius: 8,
  },
  modalMovieOriginal: {
    color: '#9CA3AF',
    fontSize: 11.5,
  },
  modalMovieTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    marginTop: 4,
  },
  modalMovieSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 3,
  },
  modalDetailsGrid: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2433',
    gap: 12,
    marginBottom: 12,
  },
  modalDetailItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
    paddingBottom: 10,
  },
  modalDetailRow2Cols: {
    flexDirection: 'row',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
    paddingBottom: 10,
  },
  modalDetailCol: {
    flex: 1,
  },
  modalDetailLabel: {
    color: '#6B7280',
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  modalDetailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalDetailSubValue: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  modalDetailHighlight: {
    color: '#E50914',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalPriceLabel: {
    color: '#D1D5DB',
    fontSize: 12.5,
    fontWeight: '600',
  },
  modalPriceValue: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
  },
  ageWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  ageWarningText: {
    color: '#F59E0B',
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
  bookingSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  bookingSuccessText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalAdminActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  modalAdminEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modalAdminEditText: {
    color: '#3B82F6',
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalAdminDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  modalAdminDeleteText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalSeatMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  modalSeatMapText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '700',
  },
  synopsisBox: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2433',
    marginBottom: 14,
  },
  synopsisHeading: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  synopsisText: {
    color: '#D1D5DB',
    fontSize: 12.5,
    lineHeight: 18,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#232838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formFieldLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formLabelBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formPreviewEndText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 6,
  },
  formTextInput: {
    backgroundColor: '#10131B',
    borderWidth: 1,
    borderColor: '#283044',
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 42,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  formChipsScroll: {
    gap: 7,
  },
  formSelectChip: {
    backgroundColor: '#10131B',
    borderWidth: 1,
    borderColor: '#283044',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },
  formSelectChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  formSelectChipText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  formSelectChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  formMiniChip: {
    backgroundColor: '#10131B',
    borderWidth: 1,
    borderColor: '#252C3F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  formMiniChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  formMiniChipText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  formMiniChipTextActive: {
    color: '#F59E0B',
  },
  formTwoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickSeatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickSeatBtn: {
    backgroundColor: '#191E2B',
    borderWidth: 1,
    borderColor: '#2A3145',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickSeatBtnText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteConfirmDesc: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  deleteSummaryCard: {
    backgroundColor: '#10131B',
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#262D40',
    gap: 5,
    marginBottom: 14,
  },
  deleteSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  deleteSummaryMeta: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});

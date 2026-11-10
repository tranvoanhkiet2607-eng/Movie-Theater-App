// Nguyễn Minh Quân - CE180048
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { SeatAPI } from '@/services/api';
import {
  GenerateRoomData,
  SeatFormData,
  SeatItem,
  SeatStatus,
  SeatSummary,
  SeatType,
} from '@/types/seat';

type ViewMode = 'map' | 'list';

export default function SeatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ theaterId?: string; room?: string }>();
  const { user, isAuthenticated } = useAuth();
  const isManageMode = Boolean(isAuthenticated && user?.role === 'admin');

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>(params.theaterId || 't1');
  const [selectedRoom, setSelectedRoom] = useState<string>(params.room || '');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRow, setSelectedRow] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  // ─── Data States ────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theaters, setTheaters] = useState<any[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [rows, setRows] = useState<string[]>([]);
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [summary, setSummary] = useState<SeatSummary>({
    total: 0,
    available: 0,
    maintenance: 0,
    reserved: 0,
    standardCount: 0,
    vipCount: 0,
    coupleCount: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Modal States ───────────────────────────────────────────────────────────
  // 1. Chi tiết ghế
  const [detailSeat, setDetailSeat] = useState<SeatItem | null>(null);

  // 2. Form Modal (Thêm mới hoặc Chỉnh sửa ghế)
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [formRow, setFormRow] = useState<string>('A');
  const [formCol, setFormCol] = useState<string>('1');
  const [formSeatCode, setFormSeatCode] = useState<string>('');
  const [formType, setFormType] = useState<SeatType>('standard');
  const [formPrice, setFormPrice] = useState<string>('90000');
  const [formStatus, setFormStatus] = useState<SeatStatus>('available');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 3. Modal Xóa ghế
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deletingSeat, setDeletingSeat] = useState<SeatItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // 4. Modal Khởi tạo nhanh sơ đồ phòng chiếu
  const [genModalVisible, setGenModalVisible] = useState<boolean>(false);
  const [genRows, setGenRows] = useState<string>('A, B, C, D, E, F');
  const [genColsPerRow, setGenColsPerRow] = useState<string>('12');
  const [genVipRows, setGenVipRows] = useState<string>('C, D, E');
  const [genCoupleRows, setGenCoupleRows] = useState<string>('F');
  const [genStandardPrice, setGenStandardPrice] = useState<string>('90000');
  const [genVipPrice, setGenVipPrice] = useState<string>('120000');
  const [genCouplePrice, setGenCouplePrice] = useState<string>('200000');
  const [genOverwrite, setGenOverwrite] = useState<boolean>(true);
  const [genSubmitting, setGenSubmitting] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // ─── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchSeats = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await SeatAPI.getSeats({
        theaterId: selectedTheaterId,
        room: selectedRoom,
        type: selectedType,
        status: selectedStatus,
        row: selectedRow,
        search: searchQuery,
      });

      if (res.theaters?.length) setTheaters(res.theaters);
      if (res.rooms?.length) {
        setRooms(res.rooms);
        if (!selectedRoom && res.activeRoom) {
          setSelectedRoom(res.activeRoom);
        }
      }
      if (res.rows) setRows(res.rows);
      if (res.summary) setSummary(res.summary);
      setSeats(res.seats || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải danh sách ghế từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedTheaterId,
    selectedRoom,
    selectedType,
    selectedStatus,
    selectedRow,
    searchQuery,
  ]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Nhận params từ route ngoài (ví dụ từ màn hình Lịch chiếu)
  useEffect(() => {
    if (params.theaterId && params.theaterId !== selectedTheaterId) {
      setSelectedTheaterId(params.theaterId);
    }
    if (params.room && params.room !== selectedRoom) {
      setSelectedRoom(params.room);
    }
  }, [params.theaterId, params.room]);

  // ─── Group Seats By Row for Seat Map ────────────────────────────────────────
  const seatsByRow = useMemo(() => {
    const map: Record<string, SeatItem[]> = {};
    seats.forEach((seat) => {
      const r = seat.row.toUpperCase();
      if (!map[r]) map[r] = [];
      map[r].push(seat);
    });

    // Sắp xếp các ghế trong mỗi hàng theo số thứ tự cột
    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => a.colNumber - b.colNumber);
    });

    // Trả về mảng các hàng đã sắp xếp theo thứ tự chữ cái A, B, C...
    const sortedRowKeys = Object.keys(map).sort();
    return sortedRowKeys.map((r) => ({
      row: r,
      items: map[r],
    }));
  }, [seats]);

  // ─── Active Theater Object ──────────────────────────────────────────────────
  const activeTheater = useMemo(
    () => theaters.find((t) => t.code === selectedTheaterId || t.id === selectedTheaterId) || theaters[0],
    [theaters, selectedTheaterId]
  );

  // ─── Form Handlers (Thêm / Sửa ghế) ─────────────────────────────────────────
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingSeatId(null);
    setFormRow('A');
    setFormCol('1');
    setFormSeatCode('A01');
    setFormType('standard');
    setFormPrice('90000');
    setFormStatus('available');
    setFormNotes('');
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleOpenEditModal = (seat: SeatItem) => {
    setIsEditing(true);
    setEditingSeatId(seat.id || seat.code);
    setFormRow(seat.row);
    setFormCol(String(seat.colNumber));
    setFormSeatCode(seat.seatCode);
    setFormType(seat.type);
    setFormPrice(String(seat.price));
    setFormStatus(seat.status);
    setFormNotes(seat.notes || '');
    setFormError(null);
    setDetailSeat(null);
    setFormModalVisible(true);
  };

  const handleSaveSeat = async () => {
    if (!formRow.trim()) {
      setFormError('Vui lòng nhập hàng ghế (ví dụ: A, B, C).');
      return;
    }
    const colNum = parseInt(formCol, 10);
    if (isNaN(colNum) || colNum <= 0) {
      setFormError('Số thứ tự ghế phải là số nguyên dương lớn hơn 0.');
      return;
    }
    const priceNum = parseInt(formPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Giá ghế không hợp lệ.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload: SeatFormData = {
        theaterId: selectedTheaterId,
        room: selectedRoom || (rooms.length > 0 ? rooms[0] : 'Rạp 01'),
        row: formRow.trim().toUpperCase(),
        colNumber: colNum,
        seatCode: formSeatCode.trim().toUpperCase() || undefined,
        type: formType,
        price: priceNum,
        status: formStatus,
        notes: formNotes.trim(),
      };

      if (isEditing && editingSeatId) {
        await SeatAPI.updateSeat(editingSeatId, payload);
      } else {
        await SeatAPI.createSeat(payload);
      }

      setFormModalVisible(false);
      await fetchSeats();
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu thông tin ghế.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Delete Handler (Xóa ghế) ───────────────────────────────────────────────
  const handleOpenDeleteModal = (seat: SeatItem) => {
    setDetailSeat(null);
    setDeletingSeat(seat);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSeat) return;
    try {
      setDeleteLoading(true);
      await SeatAPI.deleteSeat(deletingSeat.id || deletingSeat.code);
      setDeleteModalVisible(false);
      setDeletingSeat(null);
      await fetchSeats();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể xóa ghế lúc này.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Generate Room Handler (Khởi tạo sơ đồ phòng) ───────────────────────────
  const handleGenerateRoom = async () => {
    try {
      setGenSubmitting(true);
      setGenError(null);

      const parsedRows = genRows
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean);
      const cols = parseInt(genColsPerRow, 10);
      const stdPrice = parseInt(genStandardPrice, 10);
      const vipPrice = parseInt(genVipPrice, 10);
      const cplPrice = parseInt(genCouplePrice, 10);

      if (!parsedRows.length || isNaN(cols) || cols <= 0) {
        setGenError('Vui lòng kiểm tra lại danh sách hàng ghế và số cột.');
        return;
      }

      const payload: GenerateRoomData = {
        theaterId: selectedTheaterId,
        room: selectedRoom || (rooms.length > 0 ? rooms[0] : 'Rạp 01'),
        rows: parsedRows,
        colsPerRow: cols,
        vipRows: genVipRows
          .split(',')
          .map((r) => r.trim().toUpperCase())
          .filter(Boolean),
        coupleRows: genCoupleRows
          .split(',')
          .map((r) => r.trim().toUpperCase())
          .filter(Boolean),
        standardPrice: stdPrice || 90000,
        vipPrice: vipPrice || 120000,
        couplePrice: cplPrice || 200000,
        overwrite: genOverwrite,
      };

      await SeatAPI.generateRoom(payload);
      setGenModalVisible(false);
      await fetchSeats();
    } catch (err: any) {
      setGenError(err?.message || 'Không thể tạo tự động sơ đồ phòng chiếu.');
    } finally {
      setGenSubmitting(false);
    }
  };

  // ─── Helpers: Color & Labels ────────────────────────────────────────────────
  const getSeatColor = (seat: SeatItem) => {
    if (seat.status === 'maintenance') return '#EF4444'; // Đỏ bảo trì
    if (seat.status === 'reserved') return '#6B7280'; // Xám khóa
    if (seat.type === 'vip') return '#F59E0B'; // Vàng VIP
    if (seat.type === 'couple') return '#EC4899'; // Hồng Sweetbox
    return '#E5E7EB'; // Trắng ngà Standard
  };

  const getSeatTypeName = (type: SeatType) => {
    switch (type) {
      case 'vip':
        return 'VIP';
      case 'couple':
        return 'Sweetbox (Đôi)';
      default:
        return 'Thường (Standard)';
    }
  };

  const getSeatStatusName = (status: SeatStatus) => {
    switch (status) {
      case 'maintenance':
        return 'Đang bảo trì';
      case 'reserved':
        return 'Tạm khóa / Giữ chỗ';
      default:
        return 'Khả dụng';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Sơ Đồ & Quản Lý Ghế</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {activeTheater?.shortName || activeTheater?.name || 'CineMax Cinema'} • {selectedRoom || 'Phòng chiếu'}
            </Text>
          </View>

          {/* Nút chuyển đổi View Mode: Sơ đồ hoặc Danh sách */}
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'map' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.8}>
              <Ionicons
                name="grid"
                size={16}
                color={viewMode === 'map' ? '#FFFFFF' : '#9CA3AF'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}>
              <Ionicons
                name="list"
                size={16}
                color={viewMode === 'list' ? '#FFFFFF' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Bar khi là Quản trị viên (Admin) */}
        {isManageMode && (
          <View style={styles.adminActionBar}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.adminBadgeText}>Chế độ Quản Trị Viên</Text>
            </View>

            <View style={styles.adminBtnGroup}>
              <TouchableOpacity
                style={styles.adminActionBtn}
                onPress={handleOpenAddModal}
                activeOpacity={0.8}>
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.adminActionBtnText}>Thêm ghế</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adminActionBtn, styles.adminActionBtnSecondary]}
                onPress={() => {
                  setGenError(null);
                  setGenModalVisible(true);
                }}
                activeOpacity={0.8}>
                <Ionicons name="apps" size={16} color="#FFFFFF" />
                <Text style={styles.adminActionBtnText}>Khởi tạo sơ đồ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ─── 1. Selector: Cụm Rạp ───────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="business" size={18} color="#E50914" />
          <Text style={styles.sectionTitle}>Chọn cụm rạp CineMax</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          {theaters.map((t) => {
            const isSelected = t.code === selectedTheaterId || t.id === selectedTheaterId;
            return (
              <TouchableOpacity
                key={t.code || t.id}
                style={[styles.theaterChip, isSelected && styles.theaterChipActive]}
                onPress={() => {
                  setSelectedTheaterId(t.code || t.id);
                  setSelectedRoom(''); // Reset room để tự chọn phòng đầu tiên
                }}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.theaterChipText,
                    isSelected && styles.theaterChipTextActive,
                  ]}>
                  {t.shortName || t.name}
                </Text>
                <Text
                  style={[
                    styles.theaterChipArea,
                    isSelected && styles.theaterChipAreaActive,
                  ]}>
                  {t.area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 2. Selector: Phòng Chiếu ──────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="videocam" size={18} color="#3B82F6" />
          <Text style={styles.sectionTitle}>Phòng chiếu</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          {rooms.map((r) => {
            const isSelected = r === selectedRoom;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.roomChip, isSelected && styles.roomChipActive]}
                onPress={() => setSelectedRoom(r)}
                activeOpacity={0.8}>
                <Ionicons
                  name="film-outline"
                  size={14}
                  color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.roomChipText, isSelected && styles.roomChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 3. Overview Summary Stats ──────────────────────────────────────── */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{summary.total}</Text>
            <Text style={styles.statLabel}>Tổng số ghế</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>
              {summary.available}
            </Text>
            <Text style={styles.statLabel}>Khả dụng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
              {summary.vipCount}
            </Text>
            <Text style={styles.statLabel}>Ghế VIP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#EC4899' }]}>
              {summary.coupleCount}
            </Text>
            <Text style={styles.statLabel}>Sweetbox</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>
              {summary.maintenance}
            </Text>
            <Text style={styles.statLabel}>Bảo trì</Text>
          </View>
        </View>

        {/* ─── 4. Bộ lọc chi tiết & Tìm kiếm ─────────────────────────────────── */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã ghế (A01, C05, SW-F1...)"
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter loại ghế */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeFilterRow}>
            {[
              { id: 'all', label: 'Tất cả loại' },
              { id: 'standard', label: 'Ghế Thường' },
              { id: 'vip', label: 'Ghế VIP' },
              { id: 'couple', label: 'Ghế Đôi' },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.filterPill,
                  selectedType === t.id && styles.filterPillActive,
                ]}
                onPress={() => setSelectedType(t.id)}>
                <Text
                  style={[
                    styles.filterPillText,
                    selectedType === t.id && styles.filterPillTextActive,
                  ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Filter trạng thái */}
            {[
              { id: 'all', label: 'Tất cả trạng thái' },
              { id: 'available', label: 'Hoạt động' },
              { id: 'maintenance', label: 'Đang bảo trì' },
            ].map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.filterPill,
                  selectedStatus === s.id && styles.filterPillActive,
                ]}
                onPress={() => setSelectedStatus(s.id)}>
                <Text
                  style={[
                    styles.filterPillText,
                    selectedStatus === s.id && styles.filterPillTextActive,
                  ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ─── 5. Nội dung hiển thị (Seat Map hoặc Danh Sách) ────────────────── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Đang tải sơ đồ ghế...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchSeats}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : seats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>Chưa có ghế nào trong phòng này</Text>
            <Text style={styles.emptySubtitle}>
              {isManageMode
                ? 'Hãy bấm "Thêm ghế" hoặc "Khởi tạo sơ đồ" để tạo sơ đồ phòng chiếu nhanh chóng!'
                : 'Phòng chiếu này hiện chưa mở bán ghế hoặc đang cập nhật.'}
            </Text>
            {isManageMode && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => {
                  setGenError(null);
                  setGenModalVisible(true);
                }}>
                <Ionicons name="apps" size={18} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Khởi tạo sơ đồ phòng ngay</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : viewMode === 'map' ? (
          /* ── Sơ Đồ Ghế (Interactive Map) ── */
          <View style={styles.mapContainer}>
            {/* Màn hình chiếu */}
            <View style={styles.screenWrapper}>
              <View style={styles.screenCurve} />
              <Text style={styles.screenText}>MÀN HÌNH CHIẾU</Text>
            </View>

            {/* Chú thích màu ghế */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#E5E7EB' }]} />
                <Text style={styles.legendLabel}>Thường</Text>
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
                <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendLabel}>Bảo trì</Text>
              </View>
            </View>

            {/* Grid các hàng ghế */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.seatGrid}>
                {seatsByRow.map((group) => (
                  <View key={group.row} style={styles.seatRow}>
                    <Text style={styles.rowLabel}>{group.row}</Text>
                    <View style={styles.seatListInRow}>
                      {group.items.map((seat) => {
                        const isCouple = seat.type === 'couple';
                        const isMaint = seat.status === 'maintenance';
                        const seatBg = getSeatColor(seat);

                        return (
                          <TouchableOpacity
                            key={seat.id || seat.code}
                            style={[
                              styles.seatUnit,
                              isCouple && styles.seatUnitCouple,
                              { backgroundColor: seatBg },
                            ]}
                            onPress={() => setDetailSeat(seat)}
                            activeOpacity={0.75}>
                            <Text
                              style={[
                                styles.seatUnitText,
                                isCouple && styles.seatUnitCoupleText,
                                (isMaint || isCouple) && { color: '#FFFFFF' },
                              ]}
                              numberOfLines={1}>
                              {seat.colNumber}
                            </Text>
                            {isMaint && (
                              <View style={styles.maintDot}>
                                <Ionicons name="construct" size={8} color="#FFFFFF" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.rowLabel}>{group.row}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.mapHintText}>
              💡 Chạm vào từng ghế để xem thông tin chi tiết
              {isManageMode ? ' hoặc chỉnh sửa/xóa ghế.' : '.'}
            </Text>

            <TouchableOpacity
              style={styles.viewBookingMapBtn}
              onPress={() => router.push('/seat-booking')}
              activeOpacity={0.8}>
              <Ionicons name="ticket-outline" size={16} color="#E50914" />
              <Text style={styles.viewBookingMapBtnText}>
                Xem sơ đồ ghế & trạng thái đặt vé theo suất chiếu
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#E50914" />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Danh Sách Thẻ Ghế (List View) ── */
          <View style={styles.listContainer}>
            {seats.map((seat) => {
              const seatBg = getSeatColor(seat);
              return (
                <TouchableOpacity
                  key={seat.id || seat.code}
                  style={styles.seatCard}
                  onPress={() => setDetailSeat(seat)}
                  activeOpacity={0.8}>
                  <View style={[styles.seatCardBadge, { backgroundColor: seatBg }]}>
                    <Text
                      style={[
                        styles.seatCardBadgeText,
                        (seat.type === 'couple' || seat.status === 'maintenance') && {
                          color: '#FFFFFF',
                        },
                      ]}>
                      {seat.seatCode}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.seatCardTitleRow}>
                      <Text style={styles.seatCardType}>
                        {getSeatTypeName(seat.type)}
                      </Text>
                      <Text
                        style={[
                          styles.seatCardStatus,
                          seat.status === 'available'
                            ? { color: '#10B981' }
                            : { color: '#EF4444' },
                        ]}>
                        {getSeatStatusName(seat.status)}
                      </Text>
                    </View>
                    <Text style={styles.seatCardSub}>
                      Hàng {seat.row} • Cột {seat.colNumber} • {seat.priceFormatted}
                    </Text>
                    {seat.notes ? (
                      <Text style={styles.seatCardNotes} numberOfLines={1}>
                        {seat.notes}
                      </Text>
                    ) : null}
                  </View>

                  {isManageMode && (
                    <View style={styles.seatCardActions}>
                      <TouchableOpacity
                        style={styles.cardEditBtn}
                        onPress={() => handleOpenEditModal(seat)}>
                        <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardDeleteBtn}
                        onPress={() => handleOpenDeleteModal(seat)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: CHI TIẾT GHẾ
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(detailSeat)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailSeat(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            {detailSeat && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalSeatCodeCircle}>
                    <Text style={styles.modalSeatCodeText}>
                      {detailSeat.seatCode}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.modalTitle}>
                      Ghế {detailSeat.seatCode} ({getSeatTypeName(detailSeat.type)})
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {activeTheater?.shortName || activeTheater?.name} • {detailSeat.room}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailSeat(null)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vị trí:</Text>
                    <Text style={styles.detailValue}>
                      Hàng {detailSeat.row}, Ghế số {detailSeat.colNumber}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Loại ghế:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        detailSeat.type === 'vip' && { color: '#F59E0B' },
                        detailSeat.type === 'couple' && { color: '#EC4899' },
                      ]}>
                      {getSeatTypeName(detailSeat.type)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Giá vé tiêu chuẩn:</Text>
                    <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '700' }]}>
                      {detailSeat.priceFormatted}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trạng thái hiện tại:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        detailSeat.status === 'available'
                          ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
                          : { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          detailSeat.status === 'available'
                            ? { color: '#10B981' }
                            : { color: '#EF4444' },
                        ]}>
                        {getSeatStatusName(detailSeat.status)}
                      </Text>
                    </View>
                  </View>

                  {detailSeat.notes ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ghi chú:</Text>
                      <Text style={styles.detailValue}>{detailSeat.notes}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Nút hành động */}
                <View style={styles.modalActionButtons}>
                  {isManageMode ? (
                    <>
                      <TouchableOpacity
                        style={styles.modalEditBtn}
                        onPress={() => handleOpenEditModal(detailSeat)}>
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.modalEditBtnText}>Sửa thông tin</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalDeleteBtn}
                        onPress={() => handleOpenDeleteModal(detailSeat)}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={styles.modalDeleteBtnText}>Xóa ghế</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setDetailSeat(null)}>
                      <Text style={styles.modalCloseBtnText}>Đóng</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: THÊM HOẶC CHỈNH SỬA THÔNG TIN GHẾ (ADMIN)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialogLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Chỉnh Sửa Thông Tin Ghế' : 'Thêm Ghế Mới'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedRoom} • {activeTheater?.shortName || activeTheater?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {formError && (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Hàng & Cột */}
              <View style={styles.formRowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Hàng ghế (A, B, C...)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formRow}
                    onChangeText={(val) => {
                      const clean = val.toUpperCase().slice(0, 2);
                      setFormRow(clean);
                      if (!formSeatCode || !isEditing) {
                        const colNum = parseInt(formCol, 10) || 1;
                        const pad = colNum < 10 ? `0${colNum}` : `${colNum}`;
                        setFormSeatCode(`${clean}${pad}`);
                      }
                    }}
                    placeholder="VD: C"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formLabel}>Số cột (1, 2, 3...)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formCol}
                    onChangeText={(val) => {
                      setFormCol(val);
                      if (!isEditing) {
                        const colNum = parseInt(val, 10) || 1;
                        const pad = colNum < 10 ? `0${colNum}` : `${colNum}`;
                        setFormSeatCode(`${formRow}${pad}`);
                      }
                    }}
                    placeholder="VD: 5"
                    placeholderTextColor="#6B7280"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Mã ghế hiển thị */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mã định danh ghế (Seat Code)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formSeatCode}
                  onChangeText={setFormSeatCode}
                  placeholder="VD: C05, SW-F1"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                />
              </View>

              {/* Loại ghế */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Loại ghế</Text>
                <View style={styles.typeSelectorRow}>
                  {[
                    { id: 'standard', label: 'Thường', price: '90000' },
                    { id: 'vip', label: 'VIP', price: '120000' },
                    { id: 'couple', label: 'Sweetbox (Đôi)', price: '200000' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.typeOptionBtn,
                        formType === t.id && styles.typeOptionBtnActive,
                      ]}
                      onPress={() => {
                        setFormType(t.id as SeatType);
                        if (!isEditing) setFormPrice(t.price);
                      }}>
                      <Text
                        style={[
                          styles.typeOptionText,
                          formType === t.id && styles.typeOptionTextActive,
                        ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Giá vé */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Giá vé cơ sở (VNĐ)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formPrice}
                  onChangeText={setFormPrice}
                  placeholder="90000"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                />
              </View>

              {/* Trạng thái */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Trạng thái sử dụng</Text>
                <View style={styles.statusSelectorRow}>
                  {[
                    { id: 'available', label: 'Khả dụng / Bán vé' },
                    { id: 'maintenance', label: 'Bảo trì / Hỏng' },
                    { id: 'reserved', label: 'Tạm khóa' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.statusOptionBtn,
                        formStatus === s.id && styles.statusOptionBtnActive,
                      ]}
                      onPress={() => setFormStatus(s.id as SeatStatus)}>
                      <Text
                        style={[
                          styles.statusOptionText,
                          formStatus === s.id && styles.statusOptionTextActive,
                        ]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ghi chú */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ghi chú thêm</Text>
                <TextInput
                  style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Ví dụ: Ghế gần lối đi, đệm da mới thay..."
                  placeholderTextColor="#6B7280"
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFormModalVisible(false)}
                disabled={formSubmitting}>
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveSeat}
                disabled={formSubmitting}>
                {formSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>
                      {isEditing ? 'Lưu thay đổi' : 'Thêm ghế'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: XÁC NHẬN XÓA GHẾ (ADMIN)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.deleteWarningCircle}>
                <Ionicons name="trash" size={28} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Xác Nhận Xóa Ghế</Text>
              <Text style={styles.deleteNoticeText}>
                Bạn có chắc chắn muốn xóa ghế{' '}
                <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>
                  {deletingSeat?.seatCode}
                </Text>{' '}
                khỏi {deletingSeat?.room}? Hành động này sẽ được lưu ngay trên cơ sở dữ liệu.
              </Text>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleteLoading}>
                <Text style={styles.modalCancelBtnText}>Giữ lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmDeleteBtn}
                onPress={handleConfirmDelete}
                disabled={deleteLoading}>
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmDeleteText}>Xóa vĩnh viễn</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: KHỞI TẠO SƠ ĐỒ PHÒNG TỰ ĐỘNG (ADMIN BATCH GENERATE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={genModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGenModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialogLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Khởi Tạo Sơ Đồ Phòng Chiếu</Text>
                <Text style={styles.modalSubtitle}>
                  Tự động sinh ma trận ghế cho {selectedRoom}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setGenModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {genError && (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.formErrorText}>{genError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Danh sách các hàng ghế (cách nhau bởi dấu phẩy)</Text>
                <TextInput
                  style={styles.formInput}
                  value={genRows}
                  onChangeText={setGenRows}
                  placeholder="A, B, C, D, E, F"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Số ghế mỗi hàng (Cột)</Text>
                <TextInput
                  style={styles.formInput}
                  value={genColsPerRow}
                  onChangeText={setGenColsPerRow}
                  placeholder="12"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Các hàng ghế VIP (cách nhau bởi dấu phẩy)</Text>
                <TextInput
                  style={styles.formInput}
                  value={genVipRows}
                  onChangeText={setGenVipRows}
                  placeholder="C, D, E"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Các hàng ghế Sweetbox Đôi (cách nhau bởi dấu phẩy)</Text>
                <TextInput
                  style={styles.formInput}
                  value={genCoupleRows}
                  onChangeText={setGenCoupleRows}
                  placeholder="F"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formRowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Giá vé thường (đ)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={genStandardPrice}
                    onChangeText={setGenStandardPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formLabel}>Giá vé VIP (đ)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={genVipPrice}
                    onChangeText={setGenVipPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Checkbox ghi đè ghế cũ */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setGenOverwrite(!genOverwrite)}
                activeOpacity={0.8}>
                <Ionicons
                  name={genOverwrite ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={genOverwrite ? '#E50914' : '#9CA3AF'}
                />
                <Text style={styles.checkboxLabel}>
                  Xóa ghế cũ trong phòng này trước khi tạo sơ đồ mới
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setGenModalVisible(false)}
                disabled={genSubmitting}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleGenerateRoom}
                disabled={genSubmitting}>
                {genSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>Tạo sơ đồ phòng</Text>
                  </>
                )}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#18181B',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitleRow: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 8,
    padding: 3,
  },
  viewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#E50914',
  },
  adminActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  adminBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  adminActionBtnSecondary: {
    backgroundColor: '#374151',
  },
  adminActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  theaterChip: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  theaterChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  theaterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  theaterChipTextActive: {
    color: '#FFFFFF',
  },
  theaterChipArea: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  theaterChipAreaActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  roomChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roomChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  roomChipTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#18181B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  filterBar: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  typeFilterRow: {
    marginTop: 10,
    gap: 6,
  },
  filterPill: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterPillActive: {
    backgroundColor: '#E50914',
  },
  filterPillText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 13,
  },
  errorBox: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 30,
    padding: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  mapContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  screenWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  screenCurve: {
    width: '85%',
    height: 6,
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  screenText: {
    color: '#60A5FA',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
    marginTop: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 18,
    backgroundColor: '#18181B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  seatGrid: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  rowLabel: {
    width: 22,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  seatListInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 6,
  },
  seatUnit: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatUnitCouple: {
    width: 58,
  },
  seatUnitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  seatUnitCoupleText: {
    fontSize: 11,
  },
  maintDot: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  mapHintText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  viewBookingMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderWidth: 1,
    borderColor: '#E50914',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 8,
  },
  viewBookingMapBtnText: {
    color: '#E50914',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  seatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  seatCardBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatCardBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  seatCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seatCardType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seatCardStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  seatCardSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  seatCardNotes: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  seatCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  cardEditBtn: {
    padding: 6,
    backgroundColor: '#27272A',
    borderRadius: 6,
  },
  cardDeleteBtn: {
    padding: 6,
    backgroundColor: '#27272A',
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalDialogLarge: {
    width: '100%',
    maxWidth: 480,
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
  modalSeatCodeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSeatCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  detailInfoGrid: {
    backgroundColor: '#1F1F23',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  modalEditBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  modalDeleteBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteWarningCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteNoticeText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  modalConfirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  formRowTwo: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOptionBtn: {
    flex: 1,
    backgroundColor: '#27272A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeOptionBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  typeOptionText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  statusSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusOptionBtn: {
    flex: 1,
    backgroundColor: '#27272A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusOptionText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  checkboxLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#27272A',
    borderRadius: 8,
  },
  modalCancelBtnText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});


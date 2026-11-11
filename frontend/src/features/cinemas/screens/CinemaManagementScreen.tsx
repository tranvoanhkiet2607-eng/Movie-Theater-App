// Màn hình Phân hệ Quản lý Cụm Rạp & Phòng Chiếu CineMax

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { MaxContentWidth } from '@/constants/theme';
import { Theater, TheaterFormPayload } from '../types/cinema.types';
import { CinemaAPI } from '../services/cinemaApi';
import CinemaCard from '../components/CinemaCard';
import CinemaDetailModal from '../components/CinemaDetailModal';
import CinemaFormModal from '../components/CinemaFormModal';
import RoomManagementModal from '../components/RoomManagementModal';
import FacilityManagementModal from '../components/FacilityManagementModal';

const AREA_FILTER_OPTIONS = [
  'all',
  'Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Bình Dương',
];

export default function CinemaManagementScreen() {
  const { user, session } = useAuth();
  const isAdmin = Boolean(user && user.role === 'admin');
  const authToken = session?.token || '';

  // Data & Filter State
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals State
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);

  // Admin Modals
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [theaterToEdit, setTheaterToEdit] = useState<Theater | null>(null);

  const [roomModalVisible, setRoomModalVisible] = useState<boolean>(false);
  const [facilityModalVisible, setFacilityModalVisible] = useState<boolean>(false);

  // Fetch Theaters from API
  const fetchTheaters = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsLoading(true);
    setApiError(null);

    try {
      const res = await CinemaAPI.getTheaters({
        area: selectedArea,
        search: searchText,
      });
      setTheaters(res.theaters || []);
    } catch (err: any) {
      console.error('[Fetch Theaters Error]', err);
      setApiError(err.message || 'Không thể tải danh sách cụm rạp.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedArea, searchText]);

  useEffect(() => {
    fetchTheaters(true);
  }, [fetchTheaters]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTheaters(false);
  };

  // Xem chi tiết rạp
  const handleOpenDetail = (theater: Theater) => {
    setSelectedTheater(theater);
    setDetailModalVisible(true);
  };

  const handleSelectShowtimes = (theaterId: string) => {
    router.push({
      pathname: '/explore',
      params: { theaterId },
    });
  };

  // Thêm / Sửa / Xóa rạp (Admin)
  const handleOpenCreateTheater = () => {
    setTheaterToEdit(null);
    setFormModalVisible(true);
  };

  const handleOpenEditTheater = (theater: Theater) => {
    setTheaterToEdit(theater);
    setFormModalVisible(true);
  };

  const handleSaveTheater = async (payload: TheaterFormPayload, theaterId?: string) => {
    if (theaterId) {
      await CinemaAPI.updateTheater(theaterId, payload, authToken);
    } else {
      await CinemaAPI.createTheater(payload, authToken);
    }
    await fetchTheaters(false);
  };

  const handleDeleteTheater = async (theater: Theater) => {
    try {
      await CinemaAPI.deleteTheater(theater.code || theater.id, authToken);
      await fetchTheaters(false);
    } catch (err: any) {
      Alert.alert('Không thể xóa rạp', err.message || 'Lỗi khi xóa rạp.');
    }
  };

  // Quản lý phòng chiếu (Admin)
  const handleManageRooms = (theater: Theater) => {
    setSelectedTheater(theater);
    setRoomModalVisible(true);
  };

  // Quản lý tiện ích (Admin)
  const handleManageFacilities = (theater: Theater) => {
    setSelectedTheater(theater);
    setFacilityModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBox}>
              <Ionicons name="business" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Hệ Thống Cụm Rạp CineMax</Text>
              <Text style={styles.headerSub}>
                {isAdmin
                  ? '🛡️ Quản trị viên • Quản lý rạp, phòng & tiện ích'
                  : 'Xem chi tiết rạp, phòng chiếu & tiện ích'}
              </Text>
            </View>
          </View>

          <View style={styles.topRightActions}>
            {/* Nút Thêm Rạp (Chỉ Admin) */}
            {isAdmin ? (
              <TouchableOpacity
                style={styles.createTheaterBtn}
                onPress={handleOpenCreateTheater}
                activeOpacity={0.85}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.createTheaterText}>Thêm rạp</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.homeLinkBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.8}>
              <Ionicons name="home-outline" size={16} color="#E5E7EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content List */}
        <FlatList
          data={theaters}
          keyExtractor={(item) => item.id || item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#E50914"
              colors={['#E50914']}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerComponentWrap}>
              {/* Search Input Bar */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Tìm theo tên rạp, địa chỉ hoặc khu vực..."
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Area Segmented Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.areaScroll}>
                {AREA_FILTER_OPTIONS.map((areaKey) => {
                  const isSelected = selectedArea === areaKey;
                  const label = areaKey === 'all' ? 'Tất cả khu vực' : areaKey;
                  return (
                    <TouchableOpacity
                      key={areaKey}
                      style={[styles.areaChip, isSelected && styles.areaChipActive]}
                      onPress={() => setSelectedArea(areaKey)}
                      activeOpacity={0.8}>
                      <Text
                        style={[styles.areaChipText, isSelected && styles.areaChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Counter Text */}
              <View style={styles.counterRow}>
                <Text style={styles.counterText}>
                  Hiển thị <Text style={{ color: '#E50914', fontWeight: '700' }}>{theaters.length}</Text> cụm rạp
                  {selectedArea !== 'all' ? ` tại ${selectedArea}` : ' trên toàn quốc'}
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <CinemaCard
              theater={item}
              onPress={handleOpenDetail}
              onViewShowtimes={handleOpenDetail}
              isAdmin={isAdmin}
              onEditTheater={handleOpenEditTheater}
              onDeleteTheater={handleDeleteTheater}
              onManageRooms={handleManageRooms}
              onManageFacilities={handleManageFacilities}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Đang tải danh sách cụm rạp...</Text>
              </View>
            ) : apiError ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Lỗi kết nối</Text>
                <Text style={styles.emptyDesc}>{apiError}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchTheaters(true)}>
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="business-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyTitle}>Không tìm thấy rạp chiếu</Text>
                <Text style={styles.emptyDesc}>
                  Không có cụm rạp nào phù hợp với khu vực hoặc từ khóa tìm kiếm của bạn.
                </Text>
              </View>
            )
          }
        />

        {/* Chi tiết rạp Modal */}
        <CinemaDetailModal
          theater={selectedTheater}
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          onSelectShowtimes={handleSelectShowtimes}
        />

        {/* Thêm / Sửa rạp Modal (Admin) */}
        <CinemaFormModal
          visible={formModalVisible}
          onClose={() => setFormModalVisible(false)}
          theaterToEdit={theaterToEdit}
          onSave={handleSaveTheater}
        />

        {/* Quản lý phòng chiếu Modal (Admin) */}
        <RoomManagementModal
          theater={selectedTheater}
          visible={roomModalVisible}
          onClose={() => setRoomModalVisible(false)}
          token={authToken}
          onRoomsUpdated={() => fetchTheaters(false)}
        />

        {/* Quản lý tiện ích rạp Modal (Admin) */}
        <FacilityManagementModal
          theater={selectedTheater}
          visible={facilityModalVisible}
          onClose={() => setFacilityModalVisible(false)}
          token={authToken}
          onFacilitiesUpdated={() => fetchTheaters(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2333',
    backgroundColor: '#0B0C10',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: '#828B9E',
    fontSize: 11,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createTheaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createTheaterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  homeLinkBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#252C3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerComponentWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242B3C',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    paddingVertical: 0,
  },
  areaScroll: {
    gap: 8,
    paddingRight: 10,
  },
  areaChip: {
    backgroundColor: '#151821',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242B3C',
  },
  areaChipActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: '#E50914',
  },
  areaChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  areaChipTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },
  counterRow: {
    marginTop: 10,
    marginBottom: 4,
  },
  counterText: {
    color: '#828B9E',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

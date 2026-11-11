import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { ShowtimeAPI, NotificationAPI } from '@/services/api';
import { ShowtimeMovie } from '@/types/showtime';
import NotificationModal from '@/components/NotificationModal';
import AdminManagementHubModal from '@/features/admin/AdminManagementHubModal';

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuth();
  const [movies, setMovies] = useState<ShowtimeMovie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(true);

  // Notifications (UC43) & Admin Hub (UC37, 39, 41, 42, 44, 45)
  const [notifModalVisible, setNotifModalVisible] = useState<boolean>(false);
  const [adminHubVisible, setAdminHubVisible] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(() => {
    NotificationAPI.getUnreadCount(user?.id)
      .then((res) => {
        if (res.success) setUnreadCount(res.count || 0);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    let mounted = true;
    ShowtimeAPI.getShowtimes({ dateKey: 'd0' })
      .then((res) => {
        if (!mounted) return;
        setMovies(res.movies || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingMovies(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const nowShowing = movies.filter((m) => m.isNowShowing !== false);
  const comingSoon = movies.filter((m) => m.isNowShowing === false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 32 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          {/* Top Navigation Bar */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Ionicons name="film" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>CineMax</Text>
                <Text style={styles.brandSubtitle}>Hệ thống đặt vé rạp chiếu phim</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Notification Bell Button (UC43) */}
              <TouchableOpacity
                style={styles.notifBellBtn}
                onPress={() => setNotifModalVisible(true)}
                activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.notifBadgeCircle}>
                    <Text style={styles.notifBadgeNum}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {isAuthenticated && user ? (
                <TouchableOpacity
                  style={styles.userQuickChip}
                  onPress={() => router.push('/profile')}
                  activeOpacity={0.8}>
                  <Image source={{ uri: user.avatarUrl }} style={styles.userAvatarSmall} />
                  <View style={styles.userChipInfo}>
                    <Text style={styles.userChipName} numberOfLines={1}>
                      {user.fullName}
                    </Text>
                    <Text style={styles.userChipPoints}>
                      ★ {user.loyaltyPoints} điểm ({user.membershipTier})
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.authButtonGroup}>
                  <TouchableOpacity
                    style={styles.loginOutlineBtn}
                    onPress={() => router.push('/login')}
                    activeOpacity={0.8}>
                    <Text style={styles.loginOutlineText}>Đăng nhập</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Admin Management Hub Banner (UC37, UC39, UC41, UC42, UC44, UC45) - Chỉ hiển thị cho Admin */}
          {isAuthenticated && user?.role === 'admin' && (
            <TouchableOpacity
              style={styles.adminHubBanner}
              onPress={() => setAdminHubVisible(true)}
              activeOpacity={0.85}>
              <View style={styles.adminHubLeft}>
                <View style={styles.adminHubIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminHubTitle}>Trung Tâm Quản Trị Rạp & Báo Cáo</Text>
                  <Text style={styles.adminHubSub}>
                    Quản lý Đồ ăn, Khuyến mãi, Đơn hàng & Doanh thu
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
            </TouchableOpacity>
          )}

          {/* Authentication Banner */}
          {!isAuthenticated || !user ? (
            <View style={styles.authBannerCard}>
              <View style={styles.authBannerContent}>
                <View style={styles.authBannerBadge}>
                  <Text style={styles.authBannerBadgeText}>ƯU ĐÃI THÀNH VIÊN MỚI</Text>
                </View>
                <Text style={styles.authBannerTitle}>
                  Đăng ký tài khoản nhận ngay 50 điểm thưởng & Bắp nước miễn phí!
                </Text>
                <Text style={styles.authBannerDesc}>
                  Tích điểm đổi vé VIP, lưu lịch sử đặt vé và nhận thông báo phim bom tấn sớm nhất.
                </Text>

                <View style={styles.authBannerActions}>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => router.push('/register')}
                    activeOpacity={0.85}>
                    <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Đăng ký ngay</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => router.push('/login')}
                    activeOpacity={0.85}>
                    <Ionicons name="log-in-outline" size={16} color="#E5E7EB" />
                    <Text style={styles.secondaryActionText}>Đăng nhập</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.welcomeMemberCard}>
              <View style={styles.welcomeMemberLeft}>
                <Text style={styles.welcomeGreeting}>
                  Xin chào, <Text style={styles.welcomeName}>{user.fullName}</Text> 👋
                </Text>
                <Text style={styles.welcomeSub}>
                  Hạng thẻ: <Text style={styles.goldHighlight}>{user.membershipTier}</Text> • Điểm tích lũy:{' '}
                  <Text style={styles.goldHighlight}>{user.loyaltyPoints} pts</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.manageAccountBtn}
                onPress={() => router.push('/profile')}>
                <Text style={styles.manageAccountText}>Hồ sơ</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Now Showing Section */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleBlock}>
              <View style={styles.redPill} />
              <Text style={styles.sectionTitle}>PHIM ĐANG CHIẾU</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loadingMovies ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#E50914" />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalMovieList}>
              {nowShowing.map((movie) => (
                <View key={movie.id} style={styles.movieCard}>
                  <View style={styles.posterContainer}>
                    <Image source={{ uri: movie.poster }} style={styles.posterImage} />
                    {movie.badge ? (
                      <View style={styles.movieBadge}>
                        <Text style={styles.movieBadgeText}>{movie.badge}</Text>
                      </View>
                    ) : null}
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>{movie.rating}</Text>
                    </View>
                  </View>

                  <Text style={styles.movieTitle} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  <Text style={styles.movieGenre} numberOfLines={1}>
                    {movie.genre}
                  </Text>
                  <Text style={styles.movieDuration}>⏱ {movie.durationLabel}</Text>

                  <TouchableOpacity
                    style={styles.bookTicketBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/explore',
                        params: { movieId: movie.id },
                      })
                    }
                    activeOpacity={0.85}>
                    <Ionicons name="ticket-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.bookTicketText}>Đặt vé</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Coming Soon Section */}
          <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
            <View style={styles.sectionTitleBlock}>
              <View style={[styles.redPill, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.sectionTitle}>PHIM SẮP CHIẾU</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalMovieList}>
            {comingSoon.map((movie) => (
              <View key={movie.id} style={styles.movieCard}>
                <View style={styles.posterContainer}>
                  <Image source={{ uri: movie.poster }} style={styles.posterImage} />
                  {movie.badge ? (
                    <View style={[styles.movieBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={[styles.movieBadgeText, { color: '#0B0C10' }]}>
                        {movie.badge}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeText}>{movie.rating}</Text>
                  </View>
                </View>

                <Text style={styles.movieTitle} numberOfLines={2}>
                  {movie.title}
                </Text>
                <Text style={styles.movieGenre} numberOfLines={1}>
                  {movie.genre}
                </Text>
                <Text style={styles.movieDuration}>⏱ {movie.durationLabel}</Text>

                <TouchableOpacity
                  style={[styles.bookTicketBtn, styles.remindBtn]}
                  onPress={() =>
                    router.push({
                      pathname: '/explore',
                      params: { movieId: movie.id },
                    })
                  }
                  activeOpacity={0.85}>
                  <Ionicons name="calendar-outline" size={16} color="#E5E7EB" />
                  <Text style={styles.remindBtnText}>Xem lịch chiếu</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Quick Features Section */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureBox}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#E50914" />
              <Text style={styles.featureTitle}>Bảo mật tài khoản</Text>
              <Text style={styles.featureSub}>Xác thực OTP & mã hóa mật khẩu an toàn</Text>
            </View>
            <View style={styles.featureBox}>
              <Ionicons name="gift-outline" size={24} color="#F59E0B" />
              <Text style={styles.featureTitle}>Tích điểm đổi quà</Text>
              <Text style={styles.featureSub}>Nâng hạng VIP nhận ưu đãi mỗi tuần</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* UC43: View Notifications & Mark As Read */}
      <NotificationModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
        onNotificationsUpdated={fetchUnreadCount}
      />

      {/* Admin Management Hub Modal (UC37, UC39, UC41, UC42, UC44, UC45) */}
      <AdminManagementHubModal
        visible={adminHubVisible}
        onClose={() => setAdminHubVisible(false)}
      />
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(200, Math.max(160, width * 0.44));

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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
    marginBottom: 16,
  },
  notifBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#2A3040',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E50914',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0B0C10',
  },
  notifBadgeNum: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  adminHubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  adminHubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  adminHubIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminHubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminHubSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 15,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  authButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  loginOutlineBtn: {
    borderWidth: 1,
    borderColor: '#E50914',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  loginOutlineText: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '700',
  },
  userQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A3040',
    maxWidth: 190,
  },
  userAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  userChipInfo: {
    flexShrink: 1,
  },
  userChipName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  userChipPoints: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '600',
  },
  authBannerCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#282E3E',
    marginBottom: 24,
  },
  authBannerContent: {
    gap: 8,
  },
  authBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  authBannerBadgeText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  authBannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  authBannerDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
  },
  authBannerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E50914',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E2330',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#32394E',
  },
  secondaryActionText: {
    color: '#E5E7EB',
    fontSize: 13.5,
    fontWeight: '600',
  },
  welcomeMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262C3C',
    marginBottom: 24,
  },
  welcomeMemberLeft: {
    flex: 1,
    marginRight: 12,
  },
  welcomeGreeting: {
    color: '#E5E7EB',
    fontSize: 15,
  },
  welcomeName: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  welcomeSub: {
    color: '#9CA3AF',
    fontSize: 12.5,
    marginTop: 4,
  },
  goldHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  manageAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  manageAccountText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redPill: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#E50914',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  seeAllText: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '600',
  },
  horizontalMovieList: {
    gap: 14,
    paddingRight: 8,
  },
  movieCard: {
    width: CARD_WIDTH,
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#222736',
  },
  posterContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 1.35,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F2430',
  },
  movieBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  movieBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(11, 12, 16, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 38,
  },
  movieGenre: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  movieDuration: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10,
  },
  bookTicketBtn: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bookTicketText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  remindBtn: {
    backgroundColor: '#1F2432',
    borderWidth: 1,
    borderColor: '#32394D',
  },
  remindBtnText: {
    color: '#E5E7EB',
    fontSize: 12.5,
    fontWeight: '600',
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  featureBox: {
    flex: 1,
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222736',
    gap: 6,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  featureSub: {
    color: '#9CA3AF',
    fontSize: 11.5,
    lineHeight: 16,
  },
});

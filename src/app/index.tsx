import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

interface Movie {
  id: string;
  title: string;
  genre: string;
  duration: string;
  rating: string;
  poster: string;
  badge?: string;
}

const NOW_SHOWING: Movie[] = [
  {
    id: 'm1',
    title: 'Dune: Hành Tinh Cát - Phần 2',
    genre: 'Khoa học viễn tưởng, Hành động',
    duration: '166 phút',
    rating: '8.8 ★',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
    badge: 'HOT',
  },
  {
    id: 'm2',
    title: 'Godzilla x Kong: Đế Chế Mới',
    genre: 'Hành động, Phiêu lưu',
    duration: '115 phút',
    rating: '8.2 ★',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
    badge: 'IMAX 3D',
  },
  {
    id: 'm3',
    title: 'Kung Fu Panda 4',
    genre: 'Hoạt hình, Hài hước',
    duration: '94 phút',
    rating: '8.0 ★',
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500',
  },
];

const COMING_SOON: Movie[] = [
  {
    id: 'm4',
    title: 'Deadpool & Wolverine',
    genre: 'Hài hước, Siêu anh hùng',
    duration: '127 phút',
    rating: '9.0 ★',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
    badge: 'Sắp chiếu',
  },
  {
    id: 'm5',
    title: 'Joker: Folie à Deux',
    genre: 'Tâm lý, Tội phạm',
    duration: '138 phút',
    rating: '8.5 ★',
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500',
    badge: '18+',
  },
];

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 40 },
        ]}>
        <View style={styles.container}>

          {/* Top Brand Header */}
          <View style={styles.topHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Ionicons name="film" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>CINEMAX</Text>
                <Text style={styles.brandSubtitle}>Rạp Chiếu Phim Đẳng Cấp</Text>
              </View>
            </View>

            {/* User Profile or Login Button in Header */}
            {isAuthenticated && user ? (
              <TouchableOpacity
                style={styles.userHeaderBadge}
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}>
                <Ionicons name="person-circle" size={26} color="#E50914" />
                <View style={styles.userHeaderTextCol}>
                  <Text style={styles.userHeaderName} numberOfLines={1}>
                    {user.fullName}
                  </Text>
                  <Text style={styles.userHeaderTier}>
                    {user.membershipTier} • {user.loyaltyPoints} pts
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginHeaderBtn}
                onPress={() => router.push('/login')}
                activeOpacity={0.8}>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.loginHeaderBtnText}>Đăng nhập</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Authentication Banner (UC01 / UC02 Promotion) */}
          {!isAuthenticated || !user ? (
            <View style={styles.authBannerCard}>
              <View style={styles.authBannerLeft}>
                <View style={styles.giftTag}>
                  <Ionicons name="sparkles" size={14} color="#F59E0B" />
                  <Text style={styles.giftTagText}>ƯU ĐÃI THÀNH VIÊN</Text>
                </View>
                <Text style={styles.authBannerHeading}>
                  Đăng ký thành viên nhận 50 điểm & giảm 20%
                </Text>
                <Text style={styles.authBannerDesc}>
                  Tham gia ngay để tích điểm đổi vé và tận hưởng nhiều quyền lợi độc quyền.
                </Text>

                <View style={styles.authBannerActions}>
                  <TouchableOpacity
                    style={styles.bannerRegisterBtn}
                    onPress={() => router.push('/register')}
                    activeOpacity={0.85}>
                    <Text style={styles.bannerRegisterText}>Đăng ký ngay</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bannerLoginBtn}
                    onPress={() => router.push('/login')}
                    activeOpacity={0.85}>
                    <Text style={styles.bannerLoginText}>Đã có tài khoản? Đăng nhập</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.welcomeMemberCard}>
              <View style={styles.welcomeMemberLeft}>
                <Text style={styles.welcomeGreeting}>Xin chào,</Text>
                <Text style={styles.welcomeMemberName}>{user.fullName} 👋</Text>
                <Text style={styles.welcomePoints}>
                  Bạn đang có <Text style={styles.pointsHighlight}>{user.loyaltyPoints} điểm</Text> khả dụng
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewCardBtn}
                onPress={() => router.push('/profile')}>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewCardBtnText}>Thẻ thành viên</Text>
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieHorizontalList}>
            {NOW_SHOWING.map((movie) => (
              <View key={movie.id} style={styles.movieCard}>
                <View style={styles.posterContainer}>
                  <Image
                    source={{ uri: movie.poster }}
                    style={styles.moviePoster}
                  />
                  {movie.badge && (
                    <View style={styles.movieBadge}>
                      <Text style={styles.movieBadgeText}>{movie.badge}</Text>
                    </View>
                  )}
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{movie.rating}</Text>
                  </View>
                </View>

                <Text style={styles.movieTitle} numberOfLines={1}>
                  {movie.title}
                </Text>
                <Text style={styles.movieGenre} numberOfLines={1}>
                  {movie.genre}
                </Text>
                <Text style={styles.movieDuration}>🕒 {movie.duration}</Text>

                <TouchableOpacity
                  style={styles.bookTicketBtn}
                  onPress={() => {
                    if (!isAuthenticated) {
                      router.push('/login');
                    } else {
                      router.push('/profile');
                    }
                  }}
                  activeOpacity={0.85}>
                  <Ionicons name="ticket-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.bookTicketText}>Mua vé</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

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
            contentContainerStyle={styles.movieHorizontalList}>
            {COMING_SOON.map((movie) => (
              <View key={movie.id} style={styles.movieCard}>
                <View style={styles.posterContainer}>
                  <Image
                    source={{ uri: movie.poster }}
                    style={styles.moviePoster}
                  />
                  {movie.badge && (
                    <View style={[styles.movieBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.movieBadgeText}>{movie.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.movieTitle} numberOfLines={1}>
                  {movie.title}
                </Text>
                <Text style={styles.movieGenre} numberOfLines={1}>
                  {movie.genre}
                </Text>
                <Text style={styles.movieDuration}>🕒 {movie.duration}</Text>

                <TouchableOpacity
                  style={[styles.bookTicketBtn, styles.remindBtn]}
                  activeOpacity={0.85}>
                  <Ionicons name="notifications-outline" size={16} color="#E5E7EB" />
                  <Text style={styles.remindBtnText}>Nhận thông báo</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Quick Cinema Perks */}
          <View style={styles.cinemaPerksCard}>
            <Text style={styles.perksHeader}>VÌ SAO CHỌN CINEMAX?</Text>
            <View style={styles.perksRow}>
              <View style={styles.perkItem}>
                <Ionicons name="videocam" size={24} color="#E50914" />
                <Text style={styles.perkTitle}>Màn hình Laser 4K</Text>
                <Text style={styles.perkDesc}>Độ nét chuẩn rạp Hollywood</Text>
              </View>
              <View style={styles.perkItem}>
                <Ionicons name="volume-high" size={24} color="#E50914" />
                <Text style={styles.perkTitle}>Dolby Atmos</Text>
                <Text style={styles.perkDesc}>Âm thanh vòm sống động</Text>
              </View>
              <View style={styles.perkItem}>
                <Ionicons name="fast-food" size={24} color="#E50914" />
                <Text style={styles.perkTitle}>Bắp rang bơ</Text>
                <Text style={styles.perkDesc}>Pha chế nóng hổi mỗi ngày</Text>
              </View>
            </View>
          </View>

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
    paddingTop: 8,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
    marginBottom: 16,
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
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  loginHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  loginHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  userHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#232838',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    maxWidth: 170,
  },
  userHeaderTextCol: {
    flex: 1,
  },
  userHeaderName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  userHeaderTier: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '500',
  },
  authBannerCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2D3345',
    marginBottom: 24,
  },
  authBannerLeft: {
    width: '100%',
  },
  giftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
  },
  giftTagText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  authBannerHeading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 22,
  },
  authBannerDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  authBannerActions: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 10,
  },
  bannerRegisterBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRegisterText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  bannerLoginBtn: {
    backgroundColor: '#1F2430',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLoginText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
  },
  welcomeMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 24,
  },
  welcomeMemberLeft: {
    flex: 1,
  },
  welcomeGreeting: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  welcomeMemberName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  welcomePoints: {
    color: '#9CA3AF',
    fontSize: 12.5,
    marginTop: 4,
  },
  pointsHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  viewCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2430',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  viewCardBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
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
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  seeAllText: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '600',
  },
  movieHorizontalList: {
    gap: 14,
    paddingVertical: 4,
  },
  movieCard: {
    width: 170,
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#232838',
  },
  posterContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1F2430',
    marginBottom: 10,
  },
  moviePoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  movieBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#F5C518',
    fontSize: 11,
    fontWeight: '700',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  movieGenre: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginBottom: 3,
  },
  movieDuration: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 10,
  },
  bookTicketBtn: {
    backgroundColor: '#E50914',
    borderRadius: 8,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookTicketText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  remindBtn: {
    backgroundColor: '#1F2430',
    borderWidth: 1,
    borderColor: '#374151',
  },
  remindBtnText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  cinemaPerksCard: {
    marginTop: 32,
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#232838',
  },
  perksHeader: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  perkItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  perkTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  perkDesc: {
    color: '#9CA3AF',
    fontSize: 10.5,
    textAlign: 'center',
  },
});

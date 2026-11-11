// Nguyễn Minh Quân - CE180048
// UC16: View Movie Trailer - MovieTrailerModal Component
// Phát trailer YouTube ngay trong app dùng react-native-youtube-iframe
// Phân quyền: Guest/Member không thấy các nút YouTube khi trailer chưa cập nhật

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from './YoutubePlayerWrapper';
import * as WebBrowser from 'expo-web-browser';
import { Movie } from '../types/movie.types';
import { getAgeBadgeColors } from './MovieCard';

interface MovieTrailerModalProps {
  movie: Movie | null;
  visible: boolean;
  onClose: () => void;
  onBookTicket?: (movieId: string) => void;
  isAdmin?: boolean;
}

// Tách YouTube Video ID từ link bất kỳ
function getYouTubeVideoId(url?: string): string | null {
  if (!url || url.trim() === '') return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.trim().match(regExp);
  if (match && match[2].length === 11) return match[2];
  return null;
}

export default function MovieTrailerModal({
  movie,
  visible,
  onClose,
  onBookTicket,
  isAdmin = false,
}: MovieTrailerModalProps) {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  if (!movie) return null;

  const ageColors = getAgeBadgeColors(movie.ageRating);
  const youtubeVideoId = getYouTubeVideoId(movie.trailerUrl);
  const { width } = Dimensions.get('window');
  const playerWidth = Math.min(width - 20, 580);
  const playerHeight = Math.round(playerWidth * (9 / 16));

  const trailerUrl =
    movie.trailerUrl && movie.trailerUrl.trim() !== ''
      ? movie.trailerUrl.trim()
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          movie.title + ' official trailer'
        )}`;

  const handleOpenExternal = async () => {
    try {
      if (Platform.OS === 'web') {
        window.open(trailerUrl, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(trailerUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#0F1219',
          controlsColor: '#E50914',
        });
      }
    } catch {
      Linking.openURL(trailerUrl).catch(() => {});
    }
  };

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setIsPlaying(false);
    }
  }, []);

  const onReady = useCallback(() => {
    setIsPlayerReady(true);
    setPlayerError(null);
  }, []);

  const onError = useCallback((error: string) => {
    setPlayerError(error);
  }, []);

  const handleClose = () => {
    setIsPlaying(false);
    setIsPlayerReady(false);
    setPlayerError(null);
    onClose();
  };

  const hasValidTrailer = Boolean(youtubeVideoId);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.trailerIconBadge}>
                <Ionicons name="play" size={13} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Trailer: {movie.title}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Video Player Section */}
          <View style={[styles.videoPlayerBox, { height: playerHeight }]}>
            {/* Loading spinner khi player YouTube đang khởi tạo */}
            {hasValidTrailer && !isPlayerReady && !playerError && (
              <View style={styles.loadingOverlay}>
                <Image
                  source={{
                    uri: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
                  }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <View style={styles.loadingDimmer} />
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Đang tải trailer...</Text>
              </View>
            )}

            {/* KHI CHƯA CÓ LINK TRAILER HOẶC BỊ LỖI EMBED */}
            {(!hasValidTrailer || playerError) && (
              <View style={styles.errorBox}>
                {movie.poster ? (
                  <Image
                    source={{ uri: movie.poster }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    blurRadius={10}
                  />
                ) : null}
                <View style={styles.loadingDimmer} />

                {/* Biểu tượng hiển thị */}
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={!hasValidTrailer ? 'film-outline' : 'alert-circle-outline'}
                    size={36}
                    color="#E50914"
                  />
                </View>

                {/* Tiêu đề & mô tả phân biệt theo Role (Guest/Member vs Admin) */}
                <Text style={styles.errorTitle}>
                  {!hasValidTrailer
                    ? 'Trailer đang cập nhật'
                    : 'Không thể phát trailer trong app'}
                </Text>

                <Text style={styles.errorSub}>
                  {!hasValidTrailer
                    ? (isAdmin
                        ? 'Chưa nhập link trailer YouTube cho phim này.'
                        : 'Trailer chính thức cho bộ phim này đang được chuẩn bị.\nVui lòng quay lại sau!')
                    : (isAdmin
                        ? 'Video bị hạn chế nhúng bởi YouTube.'
                        : 'Trailer tạm thời không khả dụng. Bạn có thể xem tóm tắt hoặc đặt vé bên dưới.')}
                </Text>

                {/* CHỈ ADMIN MỚI THẤY NÚT TÌM TRAILER / MỞ YOUTUBE KHI KHÔNG CÓ LINK HOẶC LỖI */}
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.adminActionBtn}
                    onPress={handleOpenExternal}
                    activeOpacity={0.8}>
                    <Ionicons name="logo-youtube" size={15} color="#FFFFFF" />
                    <Text style={styles.adminActionBtnText}>
                      {!hasValidTrailer ? 'Tìm trailer trên YouTube' : 'Mở trên YouTube'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* YouTube Player nhúng trong app khi có link hợp lệ */}
            {hasValidTrailer ? (
              <YoutubePlayer
                height={playerHeight}
                width={playerWidth}
                videoId={youtubeVideoId!}
                play={isPlaying}
                onChangeState={onStateChange}
                onReady={onReady}
                onError={onError}
                allowWebViewZoom={false}
                initialPlayerParams={{
                  controls: true,
                  rel: false,
                  modestbranding: true,
                  loop: false,
                  cc_lang_pref: 'vi',
                }}
              />
            ) : null}

            {/* Nút Play to ở giữa màn hình khi player sẵn sàng và chưa play */}
            {hasValidTrailer && isPlayerReady && !isPlaying && !playerError && (
              <TouchableOpacity
                style={styles.centrePlayBtn}
                onPress={() => setIsPlaying(true)}
                activeOpacity={0.85}>
                <View style={styles.playIconCircle}>
                  <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Action Bar bên dưới player */}
          <View style={styles.quickActionRow}>
            {hasValidTrailer && !playerError ? (
              <>
                {isPlaying ? (
                  <TouchableOpacity
                    style={styles.pauseBtn}
                    onPress={() => setIsPlaying(false)}
                    activeOpacity={0.8}>
                    <Ionicons name="pause-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.pauseBtnText}>Dừng</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => setIsPlaying(true)}
                    activeOpacity={0.8}>
                    <Ionicons name="play-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.playBtnText}>
                      {isPlayerReady ? 'Phát Trailer' : 'Đang tải...'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.openYtBtn}
                  onPress={handleOpenExternal}
                  activeOpacity={0.8}>
                  <Ionicons name="logo-youtube" size={15} color="#EF4444" />
                  <Text style={styles.openYtBtnText}>Mở YouTube</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <View style={styles.formatChips}>
              {movie.formats.slice(0, 2).map((fmt, i) => (
                <View key={i} style={styles.fmtChip}>
                  <Text style={styles.fmtChipText}>{fmt}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Thông tin phim (cuộn mượt) */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.infoSection}>
              <Text style={styles.movieTitle}>{movie.title}</Text>
              {movie.originalTitle ? (
                <Text style={styles.movieOriginalTitle}>{movie.originalTitle}</Text>
              ) : null}

              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{movie.rating}</Text>
                </View>
                <View style={[styles.ageBadge, { backgroundColor: ageColors.bg }]}>
                  <Text style={[styles.ageText, { color: ageColors.text }]}>{movie.ageRating}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.metaText}>{movie.durationLabel}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.metaText}>{movie.releaseDate || 'Đang cập nhật'}</Text>
                </View>
              </View>

              {/* Nội dung tóm tắt */}
              <View style={styles.synopsisBox}>
                <Text style={styles.synopsisHeading}>Nội dung phim</Text>
                <Text style={styles.synopsisContent}>
                  {movie.synopsis && movie.synopsis.trim() !== ''
                    ? movie.synopsis
                    : 'Bộ phim hấp dẫn với nhiều tình tiết kịch tính và sâu sắc. Hứa hẹn đem đến trải nghiệm điện ảnh tuyệt vời tại hệ thống CineMax Theater.'}
                </Text>
              </View>

              {/* Chi tiết phụ */}
              {movie.director ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Đạo diễn:</Text>
                  <Text style={styles.detailVal}>{movie.director}</Text>
                </View>
              ) : null}
              {movie.cast && movie.cast.length > 0 ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diễn viên:</Text>
                  <Text style={styles.detailVal}>{movie.cast.join(', ')}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Thể loại:</Text>
                <Text style={styles.detailVal}>{movie.genre}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerBar}>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.85}
              onPress={() => {
                handleClose();
                if (onBookTicket) onBookTicket(movie.id);
              }}>
              <Ionicons name="ticket" size={18} color="#FFFFFF" />
              <Text style={styles.bookBtnText}>
                {movie.isNowShowing ? 'Đặt vé xem phim ngay' : 'Xem lịch chiếu sớm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 580,
    height: Math.min(screenHeight * 0.88, 720),
    backgroundColor: '#0F1219',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242C3E',
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2333',
    backgroundColor: '#151821',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  trailerIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#202636',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayerBox: {
    width: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 2,
  },
  loadingDimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#D1D5DB',
    fontSize: 13,
    marginTop: 4,
  },
  errorBox: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    zIndex: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSub: {
    color: '#9CA3AF',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  adminActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  centrePlayBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  playIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#141822',
    borderBottomWidth: 1,
    borderBottomColor: '#202638',
    gap: 8,
    minHeight: 44,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pauseBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  openYtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E2333',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2F384C',
  },
  openYtBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formatChips: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  fmtChip: {
    backgroundColor: '#202638',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fmtChipText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  infoSection: {
    padding: 16,
    gap: 10,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  movieOriginalTitle: {
    color: '#828B9E',
    fontSize: 12,
    fontStyle: 'italic',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  ageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ageText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#151822',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#242B3C',
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  synopsisBox: {
    gap: 6,
  },
  synopsisHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  synopsisContent: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    color: '#828B9E',
    fontSize: 12.5,
    width: 72,
  },
  detailVal: {
    color: '#E5E7EB',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  footerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E2333',
    backgroundColor: '#151821',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 10,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

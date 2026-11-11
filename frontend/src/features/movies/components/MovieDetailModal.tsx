// UC11: View Movies | UC16: View Movie Trailer - MovieDetailModal Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../types/movie.types';
import { getAgeBadgeColors } from './MovieCard';
import MovieReviewsSection from '@/features/reviews/components/MovieReviewsSection';

interface MovieDetailModalProps {
  movie: Movie | null;
  visible: boolean;
  onClose: () => void;
  onSelectShowtime?: (movieId: string) => void;
  onWatchTrailer?: (movie: Movie) => void; // UC16
}

export default function MovieDetailModal({
  movie,
  visible,
  onClose,
  onSelectShowtime,
  onWatchTrailer,
}: MovieDetailModalProps) {
  if (!movie) return null;

  const ageColors = getAgeBadgeColors(movie.ageRating);

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
            <Text style={styles.headerTitle} numberOfLines={1}>
              Thông tin chi tiết phim
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Top Banner & Poster Area */}
            <View style={styles.heroSection}>
              <Image
                source={{ uri: movie.poster }}
                style={styles.heroBackdrop}
                blurRadius={20}
              />
              <View style={styles.backdropOverlay} />

              <View style={styles.heroContent}>
                <Image
                  source={{ uri: movie.poster }}
                  style={styles.detailPoster}
                  resizeMode="cover"
                />

                <View style={styles.heroDetails}>
                  {movie.badge ? (
                    <View
                      style={[
                        styles.badgePill,
                        movie.isNowShowing
                          ? { backgroundColor: '#E50914' }
                          : { backgroundColor: '#F59E0B' },
                      ]}>
                      <Text
                        style={[
                          styles.badgePillText,
                          !movie.isNowShowing && { color: '#0B0C10' },
                        ]}>
                        {movie.badge}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.detailTitle}>{movie.title}</Text>
                  {movie.originalTitle ? (
                    <Text style={styles.detailOriginalTitle}>
                      {movie.originalTitle}
                    </Text>
                  ) : null}

                  <View style={styles.ratingRow}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>{movie.rating}</Text>
                    </View>

                    <View style={[styles.ageBadge, { backgroundColor: ageColors.bg }]}>
                      <Text style={[styles.ageText, { color: ageColors.text }]}>
                        {movie.ageRating}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: movie.isNowShowing
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          { color: movie.isNowShowing ? '#10B981' : '#F59E0B' },
                        ]}>
                        {movie.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* UC16: Nút xem Trailer lớn */}
            {onWatchTrailer ? (
              <View style={styles.trailerBarWrapper}>
                <TouchableOpacity
                  style={styles.watchTrailerBigBtn}
                  onPress={() => onWatchTrailer(movie)}
                  activeOpacity={0.85}>
                  <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.watchTrailerBigText}>Xem Video Trailer chính thức</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Age Rating Explanation Note */}
            {movie.ageDescription ? (
              <View style={styles.ageNoteBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                <Text style={styles.ageNoteText}>{movie.ageDescription}</Text>
              </View>
            ) : null}

            {/* Quick Specs Grid */}
            <View style={styles.specsGrid}>
              <View style={styles.specBox}>
                <Ionicons name="time-outline" size={18} color="#E50914" />
                <Text style={styles.specLabel}>Thời lượng</Text>
                <Text style={styles.specValue}>{movie.durationLabel}</Text>
              </View>

              <View style={styles.specBox}>
                <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
                <Text style={styles.specLabel}>Khởi chiếu</Text>
                <Text style={styles.specValue}>{movie.releaseDate || 'Đang cập nhật'}</Text>
              </View>

              <View style={styles.specBox}>
                <Ionicons name="film-outline" size={18} color="#10B981" />
                <Text style={styles.specLabel}>Thể loại</Text>
                <Text style={styles.specValue} numberOfLines={2}>
                  {movie.genre}
                </Text>
              </View>
            </View>

            {/* Formats Section */}
            {movie.formats && movie.formats.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Định dạng phòng chiếu</Text>
                <View style={styles.formatsRow}>
                  {movie.formats.map((fmt, index) => (
                    <View key={index} style={styles.formatChip}>
                      <Text style={styles.formatChipText}>{fmt}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Synopsis Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Nội dung phim</Text>
              <Text style={styles.synopsisText}>
                {movie.synopsis || 'Nội dung bộ phim đang được cập nhật.'}
              </Text>
            </View>

            {/* Director Section */}
            {movie.director ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Đạo diễn</Text>
                <View style={styles.personRow}>
                  <Ionicons name="videocam-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.personText}>{movie.director}</Text>
                </View>
              </View>
            ) : null}

            {/* Cast Section */}
            {movie.cast && movie.cast.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Diễn viên chính</Text>
                <View style={styles.castWrapper}>
                  {movie.cast.map((actor, idx) => (
                    <View key={idx} style={styles.castChip}>
                      <Ionicons name="person-outline" size={13} color="#E5E7EB" />
                      <Text style={styles.castChipText}>{actor}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Đánh giá & Xếp hạng phim */}
            <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
              <MovieReviewsSection
                movieId={movie.code || movie.id}
                movieTitle={movie.title}
              />
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.bookingActionBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                if (onSelectShowtime) {
                  onSelectShowtime(movie.id);
                }
              }}>
              <Ionicons name="ticket" size={18} color="#FFFFFF" />
              <Text style={styles.bookingActionText}>
                {movie.isNowShowing ? 'Xem lịch chiếu & Đặt vé' : 'Xem lịch chiếu sớm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F1219',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Math.min(height * 0.92, 750),
    borderWidth: 1,
    borderColor: '#222838',
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2333',
    backgroundColor: '#151821',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#23293A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    position: 'relative',
    height: 220,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 18, 25, 0.82)',
  },
  heroContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-end',
    gap: 16,
  },
  detailPoster: {
    width: 110,
    height: 160,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#30384D',
    backgroundColor: '#1E2332',
  },
  heroDetails: {
    flex: 1,
    gap: 6,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
  },
  detailOriginalTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
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
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trailerBarWrapper: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  watchTrailerBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E2436',
    borderWidth: 1,
    borderColor: '#E50914',
    paddingVertical: 10,
    borderRadius: 10,
  },
  watchTrailerBigText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ageNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    marginHorizontal: 20,
    marginTop: 14,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  ageNoteText: {
    color: '#E5E7EB',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
  },
  specBox: {
    flex: 1,
    backgroundColor: '#151822',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242B3C',
    alignItems: 'center',
    gap: 4,
  },
  specLabel: {
    color: '#828B9E',
    fontSize: 11,
  },
  specValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionBlock: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  formatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatChip: {
    backgroundColor: '#1E2333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30394E',
  },
  formatChipText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  synopsisText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  castWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  castChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#171B26',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  castChipText: {
    color: '#E5E7EB',
    fontSize: 12,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E2333',
    backgroundColor: '#151821',
  },
  bookingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E50914',
    paddingVertical: 13,
    borderRadius: 12,
  },
  bookingActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

// UC11: View Movies | UC14: Manage Movies | UC16: View Movie Trailer
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie, AgeRating } from '../types/movie.types';

interface MovieCardProps {
  movie: Movie;
  onPress: (movie: Movie) => void;
  onViewShowtimes?: (movie: Movie) => void;
  onViewTrailer?: (movie: Movie) => void; // UC16
  isAdmin?: boolean; // UC14: Phân quyền Quản trị viên
  onEditMovie?: (movie: Movie) => void; // UC14
  onDeleteMovie?: (movie: Movie) => void; // UC14
}

export function getAgeBadgeColors(ageRating: AgeRating): { bg: string; text: string } {
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
    default:
      return { bg: '#6B7280', text: '#FFFFFF' };
  }
}

export default function MovieCard({
  movie,
  onPress,
  onViewShowtimes,
  onViewTrailer,
  isAdmin = false,
  onEditMovie,
  onDeleteMovie,
}: MovieCardProps) {
  const ageColors = getAgeBadgeColors(movie.ageRating);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.88}
      onPress={() => onPress(movie)}>
      {/* Poster Image & Overlay Badges */}
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: movie.poster }}
          style={styles.posterImage}
          resizeMode="cover"
        />

        {/* Highlight Badge (HOT, BOM TẤN...) */}
        {movie.badge ? (
          <View
            style={[
              styles.highlightBadge,
              movie.isNowShowing
                ? { backgroundColor: '#E50914' }
                : { backgroundColor: '#F59E0B' },
            ]}>
            <Text
              style={[
                styles.highlightBadgeText,
                !movie.isNowShowing && { color: '#0B0C10' },
              ]}>
              {movie.badge}
            </Text>
          </View>
        ) : null}

        {/* Age Rating Badge */}
        <View style={[styles.ageBadge, { backgroundColor: ageColors.bg }]}>
          <Text style={[styles.ageBadgeText, { color: ageColors.text }]}>
            {movie.ageRating}
          </Text>
        </View>

        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>{movie.rating}</Text>
        </View>

        {/* UC16: Quick Play Trailer Button Overlay */}
        {onViewTrailer ? (
          <TouchableOpacity
            style={styles.trailerPlayOverlay}
            onPress={() => onViewTrailer(movie)}
            activeOpacity={0.8}>
            <Ionicons name="play-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        {/* Status Indicator */}
        <View
          style={[
            styles.statusTag,
            movie.isNowShowing ? styles.statusNowShowing : styles.statusComingSoon,
          ]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: movie.isNowShowing ? '#10B981' : '#F59E0B' },
            ]}
          />
          <Text style={styles.statusTagText}>
            {movie.isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
          </Text>
        </View>
      </View>

      {/* Movie Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {movie.title}
        </Text>

        {movie.originalTitle ? (
          <Text style={styles.originalTitle} numberOfLines={1}>
            {movie.originalTitle}
          </Text>
        ) : null}

        <Text style={styles.genreText} numberOfLines={1}>
          {movie.genre}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color="#9CA3AF" />
            <Text style={styles.metaText}>{movie.durationLabel}</Text>
          </View>
          {movie.releaseDate ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
              <Text style={styles.metaText}>{movie.releaseDate}</Text>
            </View>
          ) : null}
        </View>

        {/* Customer Action Buttons */}
        <View style={styles.actionRow}>
          {onViewTrailer ? (
            <TouchableOpacity
              style={styles.trailerBtn}
              onPress={() => onViewTrailer(movie)}
              activeOpacity={0.8}>
              <Ionicons name="play" size={13} color="#E50914" />
              <Text style={styles.trailerBtnText}>Trailer</Text>
            </TouchableOpacity>
          ) : null}

          {onViewShowtimes ? (
            <TouchableOpacity
              style={[
                styles.ticketBtn,
                !movie.isNowShowing && { backgroundColor: '#1E2330', borderColor: '#333D52' },
              ]}
              onPress={() => onViewShowtimes(movie)}
              activeOpacity={0.8}>
              <Ionicons
                name={movie.isNowShowing ? 'ticket-outline' : 'calendar-outline'}
                size={14}
                color={movie.isNowShowing ? '#FFFFFF' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.ticketBtnText,
                  !movie.isNowShowing && { color: '#F59E0B' },
                ]}>
                {movie.isNowShowing ? 'Đặt vé' : 'Lịch'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* UC14: Admin Action Toolbar (Chỉ hiển thị khi isAdmin === true) */}
        {isAdmin ? (
          <View style={styles.adminActionRow}>
            {onEditMovie ? (
              <TouchableOpacity
                style={styles.adminEditBtn}
                onPress={() => onEditMovie(movie)}
                activeOpacity={0.8}>
                <Ionicons name="create-outline" size={13} color="#3B82F6" />
                <Text style={styles.adminEditText}>Sửa</Text>
              </TouchableOpacity>
            ) : null}

            {onDeleteMovie ? (
              <TouchableOpacity
                style={styles.adminDeleteBtn}
                onPress={() => {
                  Alert.alert(
                    'Delete Movie',
                    `Are you sure you want to delete "${movie.title}"? This action cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => onDeleteMovie(movie),
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
                <Text style={styles.adminDeleteText}>Xóa</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#151821',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242A38',
    overflow: 'hidden',
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 6,
  },
  posterWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 2 / 2.9,
    backgroundColor: '#1E2433',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  highlightBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  highlightBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 30,
    right: 8,
    backgroundColor: 'rgba(11, 12, 16, 0.88)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  ratingBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  trailerPlayOverlay: {
    position: 'absolute',
    top: '38%',
    left: '38%',
    backgroundColor: 'rgba(229, 9, 20, 0.75)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(11, 12, 16, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusNowShowing: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 0.5,
  },
  statusComingSoon: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    color: '#E5E7EB',
    fontSize: 10,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 19,
    minHeight: 38,
  },
  originalTitle: {
    color: '#828B9E',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  genreText: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#202634',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  trailerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1F2432',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.35)',
  },
  trailerBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  ticketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#E50914',
    paddingVertical: 7,
    borderRadius: 8,
  },
  ticketBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  adminActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242B3C',
  },
  adminEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  adminEditText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  adminDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  adminDeleteText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
});

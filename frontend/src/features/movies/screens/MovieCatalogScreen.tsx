// Màn hình Phân hệ Movie Catalog & Movie Management
// UC11: View Movies | UC12: Search Movies | UC13: Filter Movies
// UC14: Manage Movies (Admin) | UC15: Manage Genres (Admin) | UC16: View Movie Trailer

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { MovieAPI } from '../services/movieApi';
import {
  Movie,
  MovieFilterState,
  MovieStatusFilter,
  MovieSortOption,
  MovieFormPayload,
} from '../types/movie.types';
import MovieCard from '../components/MovieCard';
import MovieDetailModal from '../components/MovieDetailModal';
import MovieTrailerModal from '../components/MovieTrailerModal';
import MovieFormModal from '../components/MovieFormModal';
import GenreManagementModal from '../components/GenreManagementModal';
import MovieSearchBar from '../components/MovieSearchBar';
import MovieFilterBar from '../components/MovieFilterBar';
import MovieFilterModal from '../components/MovieFilterModal';
import { MaxContentWidth } from '@/constants/theme';

export default function MovieCatalogScreen() {
  const { user, session } = useAuth();
  // Phân quyền: Chỉ admin mới có quyền thao tác CRUD
  const isAdmin = Boolean(user && user.role === 'admin');
  const authToken = session?.token || '';

  // ─── Filter State (UC12, UC13) ──────────────────────────────────────────────
  const [filters, setFilters] = useState<MovieFilterState>({
    search: '',
    status: 'all',
    genre: 'all',
    ageRating: 'all',
    format: 'all',
    sort: 'default',
  });

  // ─── Data State (UC11) ──────────────────────────────────────────────────────
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ─── Modals State ───────────────────────────────────────────────────────────
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

  // UC16: Trailer Modal
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [trailerModalVisible, setTrailerModalVisible] = useState<boolean>(false);

  // UC14: Movie Form Modal (Thêm / Sửa)
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [movieToEdit, setMovieToEdit] = useState<Movie | null>(null);

  // UC15: Genre Management Modal
  const [genreModalVisible, setGenreModalVisible] = useState<boolean>(false);

  // Tải danh sách thể loại từ database (UC13, UC15)
  const loadGenres = useCallback(async () => {
    try {
      const data = await MovieAPI.getGenres();
      setGenres(data);
    } catch (err) {
      console.log('[Fetch Genres Error]', err);
    }
  }, []);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  // Tải danh sách phim (UC11, UC12, UC13)
  const fetchMovies = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    setApiError(null);

    try {
      const response = await MovieAPI.getMovies(filters);
      setMovies(response.movies || []);
    } catch (err: any) {
      console.error('[Fetch Movies Error]', err);
      setApiError(err.message || 'Không thể tải danh sách phim. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMovies(true);
  }, [fetchMovies]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchMovies(false);
  };

  // ─── Handlers UC12 (Search) ─────────────────────────────────────────────────
  const handleSearchChange = (text: string) => {
    setFilters((prev) => ({ ...prev, search: text }));
  };

  // ─── Handlers UC13 (Filter) ─────────────────────────────────────────────────
  const handleStatusChange = (status: MovieStatusFilter) => {
    setFilters((prev) => ({ ...prev, status }));
  };

  const handleGenreChange = (genre: string) => {
    setFilters((prev) => ({ ...prev, genre }));
  };

  const handleApplyAdvancedFilters = (advFilters: {
    ageRating: string;
    format: string;
    sort: MovieSortOption;
  }) => {
    setFilters((prev) => ({
      ...prev,
      ageRating: advFilters.ageRating,
      format: advFilters.format,
      sort: advFilters.sort,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      genre: 'all',
      ageRating: 'all',
      format: 'all',
      sort: 'default',
    });
  };

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (filters.ageRating !== 'all') count++;
    if (filters.format !== 'all') count++;
    if (filters.sort !== 'default') count++;
    return count;
  }, [filters.ageRating, filters.format, filters.sort]);

  // ─── Handlers UC11 (View Movie Details) ──────────────────────────────────────
  const handleOpenDetail = (movie: Movie) => {
    setSelectedMovie(movie);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedMovie(null);
  };

  const handleViewShowtimes = (movie: Movie) => {
    router.push({
      pathname: '/explore',
      params: { movieId: movie.id },
    });
  };

  // ─── Handlers UC16 (View Trailer) ───────────────────────────────────────────
  const handleOpenTrailer = (movie: Movie) => {
    setTrailerMovie(movie);
    setTrailerModalVisible(true);
  };

  const handleCloseTrailer = () => {
    setTrailerModalVisible(false);
    setTrailerMovie(null);
  };

  // ─── Handlers UC14 (Manage Movies - CRUD) ────────────────────────────────────
  const handleOpenCreateMovie = () => {
    setMovieToEdit(null);
    setFormModalVisible(true);
  };

  const handleOpenEditMovie = (movie: Movie) => {
    setMovieToEdit(movie);
    setFormModalVisible(true);
  };

  const handleSaveMovie = async (payload: MovieFormPayload, movieId?: string) => {
    if (movieId) {
      await MovieAPI.updateMovie(movieId, payload, authToken);
    } else {
      await MovieAPI.createMovie(payload, authToken);
    }
    await fetchMovies(false);
  };

  const handleDeleteMovie = async (movie: Movie) => {
    try {
      await MovieAPI.deleteMovie(movie.code || movie.id, authToken);
      await fetchMovies(false);
    } catch (err: any) {
      Alert.alert('Không thể xóa phim', err.message || 'Lỗi khi xóa phim.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBox}>
              <Ionicons name="film" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Kho Phim CineMax</Text>
              <Text style={styles.headerSub}>
                {isAdmin ? '🛡️ Quản trị viên • Toàn quyền chỉnh sửa' : 'Xem danh sách, tìm kiếm & bộ lọc phim'}
              </Text>
            </View>
          </View>

          {/* Action Header Tools */}
          <View style={styles.topRightActions}>
            {/* UC14 & UC15: Admin Toolbar Buttons (Chỉ hiển thị khi isAdmin === true) */}
            {isAdmin ? (
              <>
                <TouchableOpacity
                  style={styles.adminActionToolBtn}
                  onPress={() => setGenreModalVisible(true)}
                  activeOpacity={0.8}>
                  <Ionicons name="pricetags" size={15} color="#F59E0B" />
                  <Text style={styles.adminActionToolText}>Thể loại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.adminActionToolBtn, styles.createMovieBtn]}
                  onPress={handleOpenCreateMovie}
                  activeOpacity={0.8}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.createMovieBtnText}>Thêm phim</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.homeLinkBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.8}>
              <Ionicons name="home-outline" size={16} color="#E5E7EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content List & Filters */}
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id || item.code}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
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
              {/* UC12: Search Bar */}
              <MovieSearchBar
                value={filters.search}
                onChangeText={handleSearchChange}
                totalResults={!isLoading ? movies.length : undefined}
              />

              {/* UC13: Filter Bar (Status & Genres) */}
              <MovieFilterBar
                currentStatus={filters.status}
                onStatusChange={handleStatusChange}
                genres={genres}
                selectedGenre={filters.genre}
                onGenreChange={handleGenreChange}
                onOpenAdvancedFilter={() => setFilterModalVisible(true)}
                activeFilterCount={activeAdvancedFilterCount}
              />

              {/* Active Filter Tags Indicator */}
              {(filters.status !== 'all' ||
                filters.genre !== 'all' ||
                filters.ageRating !== 'all' ||
                filters.format !== 'all' ||
                filters.sort !== 'default' ||
                filters.search.trim().length > 0) && (
                <View style={styles.filterSummaryRow}>
                  <Text style={styles.filterSummaryTitle}>Bộ lọc áp dụng:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                    {filters.status !== 'all' && (
                      <View style={styles.appliedTag}>
                        <Text style={styles.appliedTagText}>
                          {filters.status === 'now_showing' ? 'Đang chiếu' : 'Sắp chiếu'}
                        </Text>
                        <TouchableOpacity onPress={() => handleStatusChange('all')}>
                          <Ionicons name="close" size={13} color="#E50914" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {filters.genre !== 'all' && (
                      <View style={styles.appliedTag}>
                        <Text style={styles.appliedTagText}>{filters.genre}</Text>
                        <TouchableOpacity onPress={() => handleGenreChange('all')}>
                          <Ionicons name="close" size={13} color="#E50914" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {filters.ageRating !== 'all' && (
                      <View style={styles.appliedTag}>
                        <Text style={styles.appliedTagText}>Tuổi: {filters.ageRating}</Text>
                        <TouchableOpacity
                          onPress={() => setFilters((prev) => ({ ...prev, ageRating: 'all' }))}>
                          <Ionicons name="close" size={13} color="#E50914" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {filters.format !== 'all' && (
                      <View style={styles.appliedTag}>
                        <Text style={styles.appliedTagText}>{filters.format}</Text>
                        <TouchableOpacity
                          onPress={() => setFilters((prev) => ({ ...prev, format: 'all' }))}>
                          <Ionicons name="close" size={13} color="#E50914" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {filters.sort !== 'default' && (
                      <View style={styles.appliedTag}>
                        <Text style={styles.appliedTagText}>Sắp xếp: {filters.sort}</Text>
                        <TouchableOpacity
                          onPress={() => setFilters((prev) => ({ ...prev, sort: 'default' }))}>
                          <Ionicons name="close" size={13} color="#E50914" />
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity style={styles.clearAllBtn} onPress={handleResetFilters}>
                      <Text style={styles.clearAllBtnText}>Xóa tất cả</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              onPress={handleOpenDetail}
              onViewShowtimes={handleViewShowtimes}
              onViewTrailer={handleOpenTrailer} // UC16: Xem Trailer
              isAdmin={isAdmin} // UC14: Phân quyền Quản trị viên
              onEditMovie={handleOpenEditMovie}
              onDeleteMovie={handleDeleteMovie}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Đang tải danh sách phim từ máy chủ...</Text>
              </View>
            ) : apiError ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Lỗi kết nối</Text>
                <Text style={styles.emptyDesc}>{apiError}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchMovies(true)}
                  activeOpacity={0.8}>
                  <Ionicons name="reload" size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="film-outline" size={48} color="#6B7280" />
                <Text style={styles.emptyTitle}>Không tìm thấy phim phù hợp</Text>
                <Text style={styles.emptyDesc}>
                  Không có bộ phim nào khớp với từ khóa tìm kiếm hoặc các điều kiện bộ lọc hiện tại.
                </Text>
                <TouchableOpacity
                  style={styles.resetFiltersBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.8}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.resetFiltersText}>Đặt lại bộ lọc & tìm kiếm</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />

        {/* UC11: Chi tiết phim Modal */}
        <MovieDetailModal
          movie={selectedMovie}
          visible={detailModalVisible}
          onClose={handleCloseDetail}
          onSelectShowtime={(movieId) => {
            router.push({
              pathname: '/explore',
              params: { movieId },
            });
          }}
          onWatchTrailer={handleOpenTrailer} // UC16
        />

        {/* UC16: Phát Trailer Modal */}
        <MovieTrailerModal
          movie={trailerMovie}
          visible={trailerModalVisible}
          onClose={handleCloseTrailer}
          isAdmin={isAdmin}
          onBookTicket={(movieId) => {
            router.push({
              pathname: '/explore',
              params: { movieId },
            });
          }}
        />

        {/* UC14: Thêm / Sửa Phim Modal (Admin) */}
        <MovieFormModal
          visible={formModalVisible}
          onClose={() => setFormModalVisible(false)}
          movieToEdit={movieToEdit}
          onSave={handleSaveMovie}
          availableGenres={genres}
        />

        {/* UC15: Quản lý Thể loại Modal (Admin) */}
        <GenreManagementModal
          visible={genreModalVisible}
          onClose={() => setGenreModalVisible(false)}
          token={authToken}
          onGenresUpdated={() => {
            loadGenres();
            fetchMovies(false);
          }}
        />

        {/* UC13: Bộ lọc nâng cao Modal */}
        <MovieFilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          ageRating={filters.ageRating}
          format={filters.format}
          sort={filters.sort}
          onApply={handleApplyAdvancedFilters}
          onReset={handleResetFilters}
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
  adminActionToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2436',
    borderWidth: 1,
    borderColor: '#323E5A',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminActionToolText: {
    color: '#E5E7EB',
    fontSize: 11.5,
    fontWeight: '600',
  },
  createMovieBtn: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  createMovieBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
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
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    paddingHorizontal: 4,
  },
  filterSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterSummaryTitle: {
    color: '#828B9E',
    fontSize: 11.5,
  },
  tagsScroll: {
    flexDirection: 'row',
  },
  appliedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  appliedTagText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  clearAllBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 19,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resetFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  resetFiltersText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

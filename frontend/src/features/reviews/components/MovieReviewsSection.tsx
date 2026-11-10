// UC40: Review Movies (Review & Rating)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewAPI } from '@/services/api';
import { Review } from '@/types/review';
import { useAuth } from '@/context/auth-context';

interface MovieReviewsSectionProps {
  movieId: string;
  movieTitle?: string;
}

export default function MovieReviewsSection({
  movieId,
  movieTitle = 'Phim',
}: MovieReviewsSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [distribution, setDistribution] = useState<{ [key: number]: number }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create / Edit Review Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [commentText, setCommentText] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await ReviewAPI.getMovieReviews(movieId);
      if (res.success) {
        setReviews(res.reviews || []);
        setAverageRating(res.averageRating || 0);
        setTotalCount(res.totalCount || 0);
        setDistribution(res.distribution || {});
      }
    } catch (err) {
      console.log('[Fetch Movie Reviews Error]', err);
    } finally {
      setIsLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenCreateModal = () => {
    setEditingReview(null);
    setSelectedRating(5);
    setCommentText('');
    setReviewerName(user?.fullName || 'Khán giả CineMax');
    setErrorMsg(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (review: Review) => {
    setEditingReview(review);
    setSelectedRating(review.rating);
    setCommentText(review.comment);
    setReviewerName(review.userName);
    setErrorMsg(null);
    setModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!commentText.trim()) {
      setErrorMsg('Vui lòng nhập nội dung đánh giá của bạn.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingReview) {
        // Update review (UC40)
        const res = await ReviewAPI.updateReview(editingReview.id, {
          rating: selectedRating,
          comment: commentText.trim(),
        });
        if (res.success) {
          Alert.alert('Thành công', 'Đã cập nhật đánh giá của bạn!');
          setModalVisible(false);
          fetchReviews();
        }
      } else {
        // Create new review (UC40)
        const res = await ReviewAPI.createReview({
          movieId,
          movieTitle,
          userId: user?.id || 'guest_' + Date.now().toString(36),
          userName: reviewerName.trim() || user?.fullName || 'Khán giả CineMax',
          rating: selectedRating,
          comment: commentText.trim(),
        });
        if (res.success) {
          Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá phim!');
          setModalVisible(false);
          fetchReviews();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      'Xóa đánh giá',
      'Bạn có chắc chắn muốn xóa bài đánh giá này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await ReviewAPI.deleteReview(reviewId);
              Alert.alert('Thành công', 'Đã xóa đánh giá.');
              fetchReviews();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa đánh giá.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="star" size={20} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Đánh giá & Xếp hạng (UC40)</Text>
        </View>

        <TouchableOpacity
          style={styles.writeReviewBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}>
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.writeReviewBtnText}>Viết đánh giá</Text>
        </TouchableOpacity>
      </View>

      {/* Rating Overview Summary Box */}
      <View style={styles.ratingOverviewBox}>
        <View style={styles.ratingBigScore}>
          <Text style={styles.bigRatingText}>
            {averageRating > 0 ? averageRating.toFixed(1) : '5.0'}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name="star"
                size={14}
                color={s <= Math.round(averageRating || 5) ? '#F59E0B' : '#4B5563'}
              />
            ))}
          </View>
          <Text style={styles.totalReviewsCount}>{totalCount} lượt nhận xét</Text>
        </View>

        {/* Rating Breakdown Bars */}
        <View style={styles.distributionBox}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] || 0;
            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

            return (
              <View key={star} style={styles.distRow}>
                <Text style={styles.distStarLabel}>{star}★</Text>
                <View style={styles.distBarTrack}>
                  <View style={[styles.distBarFill, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.distCountText}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Reviews List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#E50914" />
          <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubbles-outline" size={32} color="#6B7280" />
          <Text style={styles.emptyText}>Chưa có đánh giá nào cho phim này.</Text>
          <Text style={styles.emptySubText}>
            Hãy là người đầu tiên chia sẻ cảm nhận về bộ phim nhé!
          </Text>
        </View>
      ) : (
        <View style={styles.reviewsList}>
          {reviews.map((rev) => {
            const isMyReview = user && (user.id === rev.userId || user.fullName === rev.userName);

            return (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerAvatarText}>
                      {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>

                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerNameRow}>
                      <Text style={styles.reviewerName}>{rev.userName}</Text>
                      {isMyReview && (
                        <View style={styles.myReviewBadge}>
                          <Text style={styles.myReviewBadgeText}>Bạn</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.reviewStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name="star"
                          size={12}
                          color={s <= rev.rating ? '#F59E0B' : '#4B5563'}
                        />
                      ))}
                      <Text style={styles.reviewDate}>
                        {new Date(rev.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </View>

                  {/* Actions for reviewer / admin */}
                  <View style={styles.reviewActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(rev)}
                      style={styles.reviewActionBtn}>
                      <Ionicons name="create-outline" size={15} color="#3B82F6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteReview(rev.id)}
                      style={styles.reviewActionBtn}>
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.reviewComment}>{rev.comment}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Create / Edit Review Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReview ? 'Sửa Đánh Giá Phim' : 'Đánh Giá Phim'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMovieTitle} numberOfLines={1}>
              {movieTitle}
            </Text>

            {/* Star Rating Selector */}
            <View style={styles.starSelectorBox}>
              <Text style={styles.selectorLabel}>Chấm điểm độ hay:</Text>
              <View style={styles.interactiveStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setSelectedRating(star)}
                    activeOpacity={0.7}
                    style={styles.interactiveStarBtn}>
                    <Ionicons
                      name={star <= selectedRating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= selectedRating ? '#F59E0B' : '#6B7280'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingScoreHint}>
                {selectedRating === 5 && '🌟 Tuyệt đỉnh, rất đáng xem!'}
                {selectedRating === 4 && '👍 Phim hay, kỹ xảo tốt!'}
                {selectedRating === 3 && '👌 Xem ổn, vừa vặn giải trí.'}
                {selectedRating === 2 && '👎 Phim trung bình, còn hạt sạn.'}
                {selectedRating === 1 && '💔 Rất thất vọng.'}
              </Text>
            </View>

            {/* Reviewer Name */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Tên của bạn:</Text>
              <TextInput
                style={styles.textInput}
                value={reviewerName}
                onChangeText={setReviewerName}
                placeholder="Nhập tên hiển thị"
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Comment Area */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Cảm nhận chi tiết:</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Chia sẻ cảm nghĩ về diễn xuất, kỹ xảo, âm thanh hoặc cốt truyện..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
            </View>

            {errorMsg && <Text style={styles.errorBanner}>{errorMsg}</Text>}

            {/* Submit Action */}
            <TouchableOpacity
              style={styles.submitReviewBtn}
              onPress={handleSubmitReview}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitReviewBtnText}>
                  {editingReview ? 'Lưu thay đổi' : 'Gửi đánh giá'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    backgroundColor: '#1A1D24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  writeReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingOverviewBox: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
  },
  ratingBigScore: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#262626',
    minWidth: 100,
  },
  bigRatingText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F59E0B',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  totalReviewsCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  distributionBox: {
    flex: 1,
    paddingLeft: 16,
    gap: 4,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distStarLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    width: 18,
  },
  distBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#262626',
    borderRadius: 3,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  distCountText: {
    fontSize: 10,
    color: '#6B7280',
    width: 20,
    textAlign: 'right',
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myReviewBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  myReviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 6,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  reviewComment: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
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
    maxWidth: 450,
    backgroundColor: '#1A1D24',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalMovieTitle: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 4,
    marginBottom: 16,
  },
  starSelectorBox: {
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  interactiveStarsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  interactiveStarBtn: {
    padding: 4,
  },
  ratingScoreHint: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 8,
    fontWeight: '600',
  },
  inputField: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  errorBanner: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
  },
  submitReviewBtn: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitReviewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


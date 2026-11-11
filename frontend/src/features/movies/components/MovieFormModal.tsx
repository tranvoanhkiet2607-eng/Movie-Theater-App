// Nguyễn Minh Quân - CE180048
// UC14: Manage Movies - MovieFormModal Component
// Modal Thêm mới và Chỉnh sửa thông tin phim (Admin)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie, MovieFormPayload, AgeRating } from '../types/movie.types';

interface MovieFormModalProps {
  visible: boolean;
  onClose: () => void;
  movieToEdit: Movie | null;
  onSave: (payload: MovieFormPayload, movieId?: string) => Promise<void>;
  availableGenres?: string[];
}

const AGE_RATING_OPTIONS: AgeRating[] = ['P', 'K', 'T13', 'T16', 'T18'];

export default function MovieFormModal({
  visible,
  onClose,
  movieToEdit,
  onSave,
  availableGenres = [],
}: MovieFormModalProps) {
  const isEditing = Boolean(movieToEdit);

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [rating, setRating] = useState('8.5 ★');
  const [ageRating, setAgeRating] = useState<AgeRating>('T13');
  const [ageDescription, setAgeDescription] = useState('');
  const [poster, setPoster] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [director, setDirector] = useState('');
  const [castStr, setCastStr] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [isNowShowing, setIsNowShowing] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (movieToEdit) {
      setTitle(movieToEdit.title || '');
      setOriginalTitle(movieToEdit.originalTitle || '');
      setGenre(movieToEdit.genre || '');
      setDurationMinutes(String(movieToEdit.durationMinutes || 120));
      setRating(movieToEdit.rating || '8.5 ★');
      setAgeRating(movieToEdit.ageRating || 'T13');
      setAgeDescription(movieToEdit.ageDescription || '');
      setPoster(movieToEdit.poster || '');
      setTrailerUrl(movieToEdit.trailerUrl || '');
      setBadge(movieToEdit.badge || '');
      setReleaseDate(movieToEdit.releaseDate || '');
      setDirector(movieToEdit.director || '');
      setCastStr(Array.isArray(movieToEdit.cast) ? movieToEdit.cast.join(', ') : '');
      setSynopsis(movieToEdit.synopsis || '');
      setIsNowShowing(movieToEdit.isNowShowing !== false);
    } else {
      // Giá trị mặc định khi tạo mới
      setTitle('');
      setOriginalTitle('');
      setGenre(availableGenres[0] || 'Hành động, Phiêu lưu');
      setDurationMinutes('120');
      setRating('8.5 ★');
      setAgeRating('T13');
      setAgeDescription('Phim được phổ biến đến người xem từ đủ 13 tuổi trở lên (13+)');
      setPoster('https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500');
      setTrailerUrl('https://www.youtube.com/watch?v=Way9Dexny3w');
      setBadge('HOT');
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      setReleaseDate(`${dd}/${mm}/${today.getFullYear()}`);
      setDirector('');
      setCastStr('');
      setSynopsis('');
      setIsNowShowing(true);
    }
    setErrorMessage(null);
  }, [movieToEdit, visible, availableGenres]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMessage('Tên phim không được để trống.');
      return;
    }
    if (!genre.trim()) {
      setErrorMessage('Thể loại phim không được để trống.');
      return;
    }
    if (!poster.trim()) {
      setErrorMessage('Link hình ảnh Poster không được để trống.');
      return;
    }

    const durationNum = Number(durationMinutes);
    if (isNaN(durationNum) || durationNum <= 0) {
      setErrorMessage('Thời lượng phim phải là số phút hợp lệ lớn hơn 0.');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const payload: MovieFormPayload = {
        title: title.trim(),
        originalTitle: originalTitle.trim(),
        genre: genre.trim(),
        durationMinutes: durationNum,
        rating: rating.trim(),
        ageRating,
        ageDescription: ageDescription.trim(),
        poster: poster.trim(),
        trailerUrl: trailerUrl.trim(),
        badge: badge.trim(),
        releaseDate: releaseDate.trim(),
        director: director.trim(),
        cast: castStr.split(',').map((c) => c.trim()).filter(Boolean),
        synopsis: synopsis.trim(),
        isNowShowing,
      };

      await onSave(payload, movieToEdit?.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu thông tin phim.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={isEditing ? 'create-outline' : 'add-circle-outline'} size={20} color="#E50914" />
              <Text style={styles.headerTitle}>
                {isEditing ? 'Chỉnh sửa thông tin phim' : 'Thêm phim mới vào hệ thống'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Tên phim & Tựa gốc */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên phim tiếng Việt *</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Ví dụ: Dune: Hành Tinh Cát - Phần 2"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên gốc tiếng Anh</Text>
              <TextInput
                style={styles.textInput}
                value={originalTitle}
                onChangeText={setOriginalTitle}
                placeholder="Ví dụ: Dune: Part Two"
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Thể loại & Thời lượng */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Thể loại phim *</Text>
                <TextInput
                  style={styles.textInput}
                  value={genre}
                  onChangeText={setGenre}
                  placeholder="Hành động, Phiêu lưu..."
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View style={[styles.inputGroup, { width: 110 }]}>
                <Text style={styles.inputLabel}>Thời lượng (phút) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="numeric"
                  placeholder="120"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>

            {/* Độ tuổi (P, K, T13, T16, T18) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phân loại độ tuổi</Text>
              <View style={styles.ageOptionRow}>
                {AGE_RATING_OPTIONS.map((opt) => {
                  const isSelected = ageRating === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.ageChoiceBtn, isSelected && styles.ageChoiceActive]}
                      onPress={() => setAgeRating(opt)}
                      activeOpacity={0.8}>
                      <Text style={[styles.ageChoiceText, isSelected && styles.ageChoiceTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Poster & Trailer URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Link hình ảnh Poster (URL) *</Text>
              <TextInput
                style={styles.textInput}
                value={poster}
                onChangeText={setPoster}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Link Trailer phim (YouTube URL)</Text>
              <TextInput
                style={styles.textInput}
                value={trailerUrl}
                onChangeText={setTrailerUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Đạo diễn & Diễn viên */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Đạo diễn</Text>
              <TextInput
                style={styles.textInput}
                value={director}
                onChangeText={setDirector}
                placeholder="Ví dụ: Denis Villeneuve"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Diễn viên chính (cách nhau bởi dấu phẩy)</Text>
              <TextInput
                style={styles.textInput}
                value={castStr}
                onChangeText={setCastStr}
                placeholder="Timothée Chalamet, Zendaya..."
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Trạng thái chiếu (Đang chiếu / Sắp chiếu) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trạng thái phát hành</Text>
              <View style={styles.statusToggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, isNowShowing && styles.toggleBtnActiveGreen]}
                  onPress={() => setIsNowShowing(true)}>
                  <Text style={[styles.toggleBtnText, isNowShowing && styles.toggleTextActive]}>
                    🎬 Đang chiếu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, !isNowShowing && styles.toggleBtnActiveAmber]}
                  onPress={() => setIsNowShowing(false)}>
                  <Text style={[styles.toggleBtnText, !isNowShowing && styles.toggleTextActive]}>
                    ⏳ Sắp chiếu
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tóm tắt cốt truyện */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tóm tắt nội dung (Synopsis)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={synopsis}
                onChangeText={setSynopsis}
                placeholder="Nhập tóm tắt cốt truyện của phim..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSaving}
              activeOpacity={0.85}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>{isEditing ? 'Lưu cập nhật' : 'Thêm phim'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    backgroundColor: '#12151E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252C3E',
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#202636',
    backgroundColor: '#161A26',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#E5E7EB',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#181C28',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262D3E',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  ageOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ageChoiceBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#181C28',
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  ageChoiceActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  ageChoiceText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  ageChoiceTextActive: {
    color: '#FFFFFF',
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#181C28',
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  toggleBtnActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  toggleBtnActiveAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  toggleBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#202636',
    backgroundColor: '#161A26',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#202638',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingVertical: 11,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

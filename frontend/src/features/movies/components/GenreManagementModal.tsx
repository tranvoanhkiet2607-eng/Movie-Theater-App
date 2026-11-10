// UC15: Manage Genres - GenreManagementModal Component
// Modal Quản lý danh mục Thể loại phim (Thêm, Xem, Sửa, Xóa - Admin)

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
import { GenreItem } from '../types/movie.types';
import { MovieAPI } from '../services/movieApi';

interface GenreManagementModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string;
  onGenresUpdated?: () => void;
}

export default function GenreManagementModal({
  visible,
  onClose,
  token = '',
  onGenresUpdated,
}: GenreManagementModalProps) {
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Thêm / Sửa
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingGenre, setEditingGenre] = useState<GenreItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGenres = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await MovieAPI.getGenresList();
      setGenres(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải danh sách thể loại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchGenres();
      setEditingGenre(null);
      setName('');
      setDescription('');
    }
  }, [visible]);

  const handleStartEdit = (genre: GenreItem) => {
    setEditingGenre(genre);
    setName(genre.name);
    setDescription(genre.description || '');
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingGenre(null);
    setName('');
    setDescription('');
    setErrorMessage(null);
  };

  const handleSaveGenre = async () => {
    if (!name.trim()) {
      setErrorMessage('Tên thể loại không được rỗng.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingGenre) {
        // Cập nhật thể loại
        await MovieAPI.updateGenre(editingGenre.code, { name: name.trim(), description: description.trim() }, token);
      } else {
        // Thêm thể loại mới
        await MovieAPI.createGenre({ name: name.trim(), description: description.trim() }, token);
      }

      setName('');
      setDescription('');
      setEditingGenre(null);
      await fetchGenres();
      if (onGenresUpdated) onGenresUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu thể loại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGenre = async (genre: GenreItem) => {
    if (genre.movieCount && genre.movieCount > 0) {
      setErrorMessage(`Không thể xóa thể loại '${genre.name}' vì đang có ${genre.movieCount} bộ phim thuộc thể loại này.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await MovieAPI.deleteGenre(genre.code, token);
      await fetchGenres();
      if (onGenresUpdated) onGenresUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa thể loại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="pricetags" size={20} color="#E50914" />
              <Text style={styles.headerTitle}>Quản lý Thể loại Phim (Genres)</Text>
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

            {/* Input Form Box (Thêm / Sửa) */}
            <View style={styles.formBox}>
              <Text style={styles.formBoxTitle}>
                {editingGenre ? `Chỉnh sửa thể loại: "${editingGenre.name}"` : 'Thêm thể loại phim mới'}
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Tên thể loại (Ví dụ: Kinh dị, Giật gân...)"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Mô tả ngắn về thể loại..."
                placeholderTextColor="#6B7280"
              />

              <View style={styles.formActionRow}>
                {editingGenre ? (
                  <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancelEdit}>
                    <Text style={styles.cancelEditText}>Hủy sửa</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.saveGenreBtn}
                  onPress={handleSaveGenre}
                  disabled={isSubmitting}
                  activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name={editingGenre ? 'checkmark' : 'add'} size={16} color="#FFFFFF" />
                      <Text style={styles.saveGenreText}>{editingGenre ? 'Lưu cập nhật' : 'Thêm thể loại'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Danh sách các thể loại */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Danh mục thể loại hiện có ({genres.length})</Text>
              <TouchableOpacity onPress={fetchGenres}>
                <Ionicons name="refresh" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#E50914" />
                <Text style={styles.loadingText}>Đang tải thể loại...</Text>
              </View>
            ) : (
              <View style={styles.genresGrid}>
                {genres.map((g) => (
                  <View key={g.code} style={styles.genreCard}>
                    <View style={styles.genreCardLeft}>
                      <View style={styles.nameRow}>
                        <Text style={styles.genreName}>{g.name}</Text>
                        <View style={styles.movieCountBadge}>
                          <Text style={styles.movieCountText}>{g.movieCount || 0} phim</Text>
                        </View>
                      </View>
                      {g.description ? (
                        <Text style={styles.genreDesc} numberOfLines={2}>
                          {g.description}
                        </Text>
                      ) : null}
                    </View>

                    {/* Action Buttons (Edit / Delete) */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => handleStartEdit(g)}>
                        <Ionicons name="pencil" size={15} color="#3B82F6" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconActionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteGenre(g)}>
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerBar}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterText}>Đóng</Text>
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
  formBox: {
    backgroundColor: '#171B26',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242B3C',
    marginBottom: 18,
  },
  formBoxTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    backgroundColor: '#12151E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3348',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#202636',
  },
  cancelEditText: {
    color: '#9CA3AF',
    fontSize: 12.5,
  },
  saveGenreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveGenreText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listTitle: {
    color: '#E5E7EB',
    fontSize: 13.5,
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  genresGrid: {
    gap: 8,
  },
  genreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181C28',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242B3C',
  },
  genreCardLeft: {
    flex: 1,
    marginRight: 10,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  movieCountBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  movieCountText: {
    color: '#E50914',
    fontSize: 10.5,
    fontWeight: '700',
  },
  genreDesc: {
    color: '#828B9E',
    fontSize: 11.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1F2536',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  footerBar: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#202636',
    backgroundColor: '#161A26',
    alignItems: 'flex-end',
  },
  closeFooterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#202638',
  },
  closeFooterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

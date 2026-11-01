// UC13: Filter Movies - MovieFilterModal Component (Advanced Filter)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AgeRating, MovieSortOption } from '../types/movie.types';

interface MovieFilterModalProps {
  visible: boolean;
  onClose: () => void;
  ageRating: string;
  format: string;
  sort: MovieSortOption;
  onApply: (filters: { ageRating: string; format: string; sort: MovieSortOption }) => void;
  onReset: () => void;
}

const AGE_OPTIONS: { label: string; value: string; desc: string }[] = [
  { label: 'Tất cả độ tuổi', value: 'all', desc: 'Không giới hạn' },
  { label: 'P - Mọi lứa tuổi', value: 'P', desc: 'Phổ biến cho mọi đối tượng' },
  { label: 'K - Dưới 13 tuổi', value: 'K', desc: 'Có phụ huynh/giám hộ đi cùng' },
  { label: 'T13 - Từ 13 tuổi', value: 'T13', desc: 'Dành cho khán giả từ đủ 13 tuổi' },
  { label: 'T16 - Từ 16 tuổi', value: 'T16', desc: 'Dành cho khán giả từ đủ 16 tuổi' },
  { label: 'T18 - Từ 18 tuổi', value: 'T18', desc: 'Dành cho khán giả từ đủ 18 tuổi' },
];

const FORMAT_OPTIONS = [
  'all',
  '2D Phụ đề',
  '2D Lồng tiếng',
  '3D Phụ đề',
  'IMAX 3D',
  '4DX',
  'Gold Class VIP',
];

const SORT_OPTIONS: { label: string; value: MovieSortOption; icon: string }[] = [
  { label: 'Mặc định', value: 'default', icon: 'shuffle-outline' },
  { label: 'Đánh giá cao nhất', value: 'rating', icon: 'star-outline' },
  { label: 'Khởi chiếu mới nhất', value: 'newest', icon: 'calendar-outline' },
  { label: 'Tên phim (A → Z)', value: 'title_asc', icon: 'text-outline' },
  { label: 'Thời lượng dài nhất', value: 'duration_desc', icon: 'time-outline' },
];

export default function MovieFilterModal({
  visible,
  onClose,
  ageRating,
  format,
  sort,
  onApply,
  onReset,
}: MovieFilterModalProps) {
  const [localAge, setLocalAge] = useState(ageRating);
  const [localFormat, setLocalFormat] = useState(format);
  const [localSort, setLocalSort] = useState(sort);

  useEffect(() => {
    setLocalAge(ageRating);
    setLocalFormat(format);
    setLocalSort(sort);
  }, [ageRating, format, sort, visible]);

  const handleApply = () => {
    onApply({
      ageRating: localAge,
      format: localFormat,
      sort: localSort,
    });
    onClose();
  };

  const handleReset = () => {
    setLocalAge('all');
    setLocalFormat('all');
    setLocalSort('default');
    onReset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="options" size={20} color="#E50914" />
              <Text style={styles.headerTitle}>Bộ lọc nâng cao</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Phân loại độ tuổi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Phân loại độ tuổi</Text>
              <View style={styles.optionsCol}>
                {AGE_OPTIONS.map((item) => {
                  const isSelected = localAge === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.radioItem, isSelected && styles.radioItemActive]}
                      onPress={() => setLocalAge(item.value)}
                      activeOpacity={0.8}>
                      <View style={styles.radioInfo}>
                        <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                          {item.label}
                        </Text>
                        <Text style={styles.radioDesc}>{item.desc}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={isSelected ? '#E50914' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Định dạng chiếu */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Định dạng chiếu</Text>
              <View style={styles.chipsWrap}>
                {FORMAT_OPTIONS.map((fmt) => {
                  const isSelected = localFormat === fmt;
                  return (
                    <TouchableOpacity
                      key={fmt}
                      style={[styles.chipItem, isSelected && styles.chipItemActive]}
                      onPress={() => setLocalFormat(fmt)}
                      activeOpacity={0.8}>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {fmt === 'all' ? 'Tất cả định dạng' : fmt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sắp xếp */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sắp xếp danh sách</Text>
              <View style={styles.sortCol}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = localSort === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.sortItem, isSelected && styles.sortItemActive]}
                      onPress={() => setLocalSort(opt.value)}
                      activeOpacity={0.8}>
                      <View style={styles.sortItemLeft}>
                        <Ionicons
                          name={opt.icon as any}
                          size={18}
                          color={isSelected ? '#E50914' : '#9CA3AF'}
                        />
                        <Text style={[styles.sortLabel, isSelected && styles.sortLabelActive]}>
                          {opt.label}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? '#E50914' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={16} color="#E5E7EB" />
              <Text style={styles.resetBtnText}>Đặt lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}>
              <Text style={styles.applyBtnText}>Áp dụng bộ lọc</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
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
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  optionsCol: {
    gap: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181C28',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  radioItemActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
    borderColor: '#E50914',
  },
  radioInfo: {
    flex: 1,
    marginRight: 10,
  },
  radioLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  radioLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  radioDesc: {
    color: '#828B9E',
    fontSize: 11,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipItem: {
    backgroundColor: '#181C28',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  chipItemActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortCol: {
    gap: 8,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181C28',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  sortItemActive: {
    borderColor: 'rgba(229, 9, 20, 0.4)',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  sortItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortLabel: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  sortLabelActive: {
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
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#202638',
    gap: 6,
    borderWidth: 1,
    borderColor: '#30394F',
  },
  resetBtnText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#E50914',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

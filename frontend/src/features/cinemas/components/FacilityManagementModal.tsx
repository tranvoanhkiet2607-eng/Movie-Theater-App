// Quản lý tiện ích và thông tin hoạt động của rạp chiếu CineMax (Admin)

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theater } from '../types/cinema.types';
import { CinemaAPI } from '../services/cinemaApi';

interface FacilityManagementModalProps {
  theater: Theater | null;
  visible: boolean;
  onClose: () => void;
  token?: string;
  onFacilitiesUpdated?: () => void;
}

const COMMON_FACILITIES = [
  'Bãi giữ xe ô tô & xe máy',
  'Quầy bắp nước cao cấp',
  'Wifi tốc độ cao miễn phí',
  'Ghế massage thư giãn',
  'Thang máy cho người khuyết tật',
  'Quầy thanh toán thẻ & Ví điện tử',
  'Phòng chờ VIP sang trọng',
  'Cửa hàng quà tặng lưu niệm',
  'Máy lạnh khử khuẩn lọc khí',
];

export default function FacilityManagementModal({
  theater,
  visible,
  onClose,
  token = '',
  onFacilitiesUpdated,
}: FacilityManagementModalProps) {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [hotline, setHotline] = useState('1900 6017');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && theater) {
      setSelectedAmenities(theater.amenities || []);
      setHotline(theater.hotline || '1900 6017');
      setCustomAmenity('');
      setErrorMessage(null);
    }
  }, [visible, theater]);

  const toggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (trimmed && !selectedAmenities.includes(trimmed)) {
      setSelectedAmenities([...selectedAmenities, trimmed]);
      setCustomAmenity('');
    }
  };

  const handleSave = async () => {
    if (!theater) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await CinemaAPI.updateFacilities(
        theater.code || theater.id,
        {
          amenities: selectedAmenities,
          hotline: hotline.trim(),
        },
        token
      );
      if (onFacilitiesUpdated) onFacilitiesUpdated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cập nhật tiện ích.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!theater) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="construct" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Tiện ích: {theater.shortName}
                </Text>
                <Text style={styles.headerSub}>Cập nhật tiện ích & dịch vụ hoạt động</Text>
              </View>
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

            {/* Thông tin liên hệ */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hotline rạp</Text>
                <TextInput
                  style={styles.textInput}
                  value={hotline}
                  onChangeText={setHotline}
                  placeholder="1900 6017"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>

            {/* Danh sách tiện ích hoạt động */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Danh sách tiện ích đang cung cấp ({selectedAmenities.length})
              </Text>
              <Text style={styles.sectionSub}>Bấm chọn các tiện ích rạp đang phục vụ khách:</Text>

              <View style={styles.amenitiesCol}>
                {COMMON_FACILITIES.map((item) => {
                  const isChecked = selectedAmenities.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.amenityRow, isChecked && styles.amenityRowChecked]}
                      onPress={() => toggleAmenity(item)}
                      activeOpacity={0.8}>
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isChecked ? '#E50914' : '#6B7280'}
                      />
                      <Text style={[styles.amenityLabel, isChecked && styles.amenityLabelChecked]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Thêm tiện ích tùy chỉnh */}
              <View style={styles.customAddRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={customAmenity}
                  onChangeText={setCustomAmenity}
                  placeholder="Thêm tiện ích khác..."
                  placeholderTextColor="#6B7280"
                />
                <TouchableOpacity
                  style={styles.addCustomBtn}
                  onPress={handleAddCustomAmenity}
                  activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addCustomText}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu tiện ích</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSub: {
    color: '#828B9E',
    fontSize: 11,
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
  sectionCard: {
    backgroundColor: '#171B26',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242B3C',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSub: {
    color: '#828B9E',
    fontSize: 11.5,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
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
  amenitiesCol: {
    gap: 8,
    marginBottom: 12,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#12151E',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242B3C',
  },
  amenityRowChecked: {
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  amenityLabel: {
    color: '#9CA3AF',
    fontSize: 12.5,
  },
  amenityLabelChecked: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customAddRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2436',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#323E5A',
  },
  addCustomText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
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
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingVertical: 11,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

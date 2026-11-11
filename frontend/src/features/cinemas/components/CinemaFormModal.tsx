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
import { Theater, TheaterFormPayload } from '../types/cinema.types';
import {
  autoCalculateCinemaDistance,
  getCurrentDeviceLocation,
  Coordinates,
} from '../utils/locationService';

interface CinemaFormModalProps {
  visible: boolean;
  onClose: () => void;
  theaterToEdit: Theater | null;
  onSave: (payload: TheaterFormPayload, theaterId?: string) => Promise<void>;
}

const AREA_OPTIONS = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Bình Dương'];

const ALL_FORMAT_OPTIONS = [
  '2D Phụ đề',
  '2D Lồng tiếng',
  '3D Phụ đề',
  'IMAX 3D',
  '4DX',
  'Gold Class VIP',
];

export default function CinemaFormModal({
  visible,
  onClose,
  theaterToEdit,
  onSave,
}: CinemaFormModalProps) {
  const isEditing = Boolean(theaterToEdit);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [area, setArea] = useState('Hồ Chí Minh');
  const [address, setAddress] = useState('');
  const [distance, setDistance] = useState('Cách bạn 2.5 km');
  const [hotline, setHotline] = useState('1900 6017');
  const [totalRooms, setTotalRooms] = useState('6');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    '2D Phụ đề',
    '3D Phụ đề',
    'IMAX 3D',
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<Coordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (theaterToEdit) {
      setName(theaterToEdit.name || '');
      setShortName(theaterToEdit.shortName || '');
      setArea(theaterToEdit.area || 'Hồ Chí Minh');
      setAddress(theaterToEdit.address || '');
      setDistance(theaterToEdit.distance || autoCalculateCinemaDistance(theaterToEdit.address || '', theaterToEdit.area || 'Hồ Chí Minh'));
      setHotline(theaterToEdit.hotline || '1900 6017');
      setTotalRooms(String(theaterToEdit.totalRooms || 6));
      setSelectedFormats(theaterToEdit.supportedFormats || ['2D Phụ đề']);
      setLocationStatus(null);
    } else {
      setName('');
      setShortName('');
      setArea('Hồ Chí Minh');
      setAddress('');
      const defaultDist = autoCalculateCinemaDistance('', 'Hồ Chí Minh');
      setDistance(defaultDist);
      setHotline('1900 6017');
      setTotalRooms('6');
      setSelectedFormats(['2D Phụ đề', '3D Phụ đề', 'IMAX 3D']);
      setLocationStatus(null);

      // Thử tự động lấy GPS thiết bị ngầm để tính toán chính xác
      getCurrentDeviceLocation().then((coords) => {
        if (coords) {
          setDeviceCoords(coords);
          const liveDist = autoCalculateCinemaDistance('', 'Hồ Chí Minh', coords);
          setDistance(liveDist);
          setLocationStatus(`Đã tự động định vị theo GPS thiết bị (${liveDist})`);
        }
      });
    }
    setErrorMessage(null);
  }, [theaterToEdit, visible]);

  const toggleFormat = (fmt: string) => {
    if (selectedFormats.includes(fmt)) {
      if (selectedFormats.length === 1) return; // Giữ ít nhất 1 định dạng
      setSelectedFormats(selectedFormats.filter((f) => f !== fmt));
    } else {
      setSelectedFormats([...selectedFormats, fmt]);
    }
  };

  const handleSelectArea = (selectedArea: string) => {
    setArea(selectedArea);
    const updatedDist = autoCalculateCinemaDistance(address, selectedArea, deviceCoords);
    setDistance(updatedDist);
    setLocationStatus(`Tự động cập nhật khoảng cách tại ${selectedArea}: ${updatedDist}`);
  };

  const handleAddressChange = (text: string) => {
    setAddress(text);
    if (text.trim().length > 6) {
      const updatedDist = autoCalculateCinemaDistance(text, area, deviceCoords);
      setDistance(updatedDist);
    }
  };

  const handleAutoLocate = async () => {
    setIsLocating(true);
    setLocationStatus(null);
    try {
      const coords = await getCurrentDeviceLocation();
      if (coords) {
        setDeviceCoords(coords);
        const dist = autoCalculateCinemaDistance(address, area, coords);
        setDistance(dist);
        setLocationStatus(`Đã định vị GPS chính xác: ${dist}`);
      } else {
        const dist = autoCalculateCinemaDistance(address, area, null);
        setDistance(dist);
        setLocationStatus(`Đã tính khoảng cách tự động theo địa chỉ tại ${area}: ${dist}`);
      }
    } catch {
      const dist = autoCalculateCinemaDistance(address, area, null);
      setDistance(dist);
      setLocationStatus(`Đã tính khoảng cách tự động theo vị trí rạp tại ${area}: ${dist}`);
    } finally {
      setIsLocating(false);
    }
  };

  const handleRecalculateFromAddress = () => {
    const dist = autoCalculateCinemaDistance(address, area, deviceCoords);
    setDistance(dist);
    setLocationStatus(`Đã cập nhật tự động theo địa chỉ (${dist})`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMessage('Tên rạp không được để trống.');
      return;
    }
    if (!shortName.trim()) {
      setErrorMessage('Tên rút gọn không được để trống.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Địa chỉ cụm rạp không được để trống.');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const resolvedDistance = distance.trim() || autoCalculateCinemaDistance(address, area, deviceCoords);
      const payload: TheaterFormPayload = {
        name: name.trim(),
        shortName: shortName.trim(),
        area: area.trim(),
        address: address.trim(),
        distance: resolvedDistance,
        hotline: hotline.trim(),
        totalRooms: Number(totalRooms) || 6,
        supportedFormats: selectedFormats,
      };

      await onSave(payload, theaterToEdit?.code || theaterToEdit?.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu thông tin rạp.');
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
              <Ionicons
                name={isEditing ? 'create-outline' : 'business-outline'}
                size={20}
                color="#E50914"
              />
              <Text style={styles.headerTitle}>
                {isEditing ? 'Chỉnh sửa cụm rạp' : 'Thêm mới cụm rạp CineMax'}
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

            {/* Tên rạp & Tên rút gọn */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên cụm rạp đầy đủ *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Ví dụ: CineMax Landmark 81"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên rút gọn (hiển thị trên thẻ) *</Text>
              <TextInput
                style={styles.textInput}
                value={shortName}
                onChangeText={setShortName}
                placeholder="Ví dụ: CineMax L81"
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Khu vực (Area) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Khu vực thành phố</Text>
              <View style={styles.areaRow}>
                {AREA_OPTIONS.map((a) => {
                  const isSelected = area === a;
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[styles.areaChip, isSelected && styles.areaChipActive]}
                      onPress={() => handleSelectArea(a)}>
                      <Text style={[styles.areaChipText, isSelected && styles.areaChipTextActive]}>
                        {a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Địa chỉ */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Địa chỉ chi tiết *</Text>
              <TextInput
                style={[styles.textInput, styles.addressInput]}
                value={address}
                onChangeText={handleAddressChange}
                placeholder="Tầng B1, TTTM Vincom Center Landmark 81, 720A Điện Biên Phủ, P.22, Bình Thạnh..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Hotline & Khoảng cách */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Hotline liên hệ</Text>
                <TextInput
                  style={styles.textInput}
                  value={hotline}
                  onChangeText={setHotline}
                  placeholder="1900 6017"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1.25 }]}>
                <View style={styles.labelWithAction}>
                  <Text style={styles.inputLabel}>Khoảng cách hiển thị</Text>
                  <TouchableOpacity
                    style={styles.autoLocateBtn}
                    onPress={handleAutoLocate}
                    disabled={isLocating}
                    activeOpacity={0.75}>
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                      <>
                        <Ionicons name="navigate" size={11} color="#3B82F6" />
                        <Text style={styles.autoLocateBtnText}>Định vị GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.distanceInputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.distanceInput]}
                    value={distance}
                    onChangeText={setDistance}
                    placeholder="Tự động tính từ định vị..."
                    placeholderTextColor="#6B7280"
                  />
                  <TouchableOpacity
                    style={styles.refreshLocateBtn}
                    onPress={handleRecalculateFromAddress}
                    activeOpacity={0.7}>
                    <Ionicons name="refresh" size={15} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Ghi chú trạng thái định vị */}
            {locationStatus ? (
              <View style={styles.locationNotice}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.locationNoticeText}>{locationStatus}</Text>
              </View>
            ) : (
              <Text style={styles.locationHintText}>
                📍 Khoảng cách được tự động định vị và tính toán chuẩn xác từ tọa độ GPS và địa chỉ cụm rạp.
              </Text>
            )}

            {/* Định dạng hỗ trợ */}
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={styles.inputLabel}>Định dạng phòng chiếu hỗ trợ</Text>
              <View style={styles.formatsGrid}>
                {ALL_FORMAT_OPTIONS.map((fmt) => {
                  const isChecked = selectedFormats.includes(fmt);
                  return (
                    <TouchableOpacity
                      key={fmt}
                      style={[styles.formatToggleBtn, isChecked && styles.formatToggleBtnActive]}
                      onPress={() => toggleFormat(fmt)}>
                      <Ionicons
                        name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={isChecked ? '#E50914' : '#6B7280'}
                      />
                      <Text style={[styles.formatToggleText, isChecked && styles.formatToggleTextActive]}>
                        {fmt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
                  <Text style={styles.submitBtnText}>{isEditing ? 'Lưu cập nhật' : 'Thêm rạp'}</Text>
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
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  areaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    backgroundColor: '#181C28',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  areaChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  areaChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  areaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  autoLocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  autoLocateBtnText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181C28',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262D3E',
    overflow: 'hidden',
  },
  distanceInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingRight: 8,
  },
  refreshLocateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  locationNoticeText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '600',
  },
  locationHintText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 5,
    fontStyle: 'italic',
  },
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#181C28',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  formatToggleBtnActive: {
    borderColor: 'rgba(229, 9, 20, 0.4)',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  formatToggleText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  formatToggleTextActive: {
    color: '#FFFFFF',
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

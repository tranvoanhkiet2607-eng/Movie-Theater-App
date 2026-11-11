// Quản lý thông tin và danh sách phòng chiếu của cụm rạp CineMax (Admin)

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
import { Theater, Room, RoomFormPayload } from '../types/cinema.types';
import { CinemaAPI } from '../services/cinemaApi';

interface RoomManagementModalProps {
  theater: Theater | null;
  visible: boolean;
  onClose: () => void;
  token?: string;
  onRoomsUpdated?: () => void;
}

const ROOM_FORMATS = [
  '2D Phụ đề',
  '2D Lồng tiếng',
  '3D Phụ đề',
  'IMAX 3D',
  '4DX',
  'Gold Class VIP',
];

export default function RoomManagementModal({
  theater,
  visible,
  onClose,
  token = '',
  onRoomsUpdated,
}: RoomManagementModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Thêm / Sửa
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('');
  const [format, setFormat] = useState('2D Phụ đề');
  const [status, setStatus] = useState<'active' | 'maintenance'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRooms = async () => {
    if (!theater) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await CinemaAPI.getRooms(theater.code || theater.id);
      setRooms(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tải danh sách phòng chiếu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && theater) {
      fetchRooms();
      handleCancelEdit();
    }
  }, [visible, theater]);

  const handleStartEdit = (room: Room) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setFormat(room.format);
    setStatus(room.status || 'active');
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
    setRoomName('');
    setFormat('2D Phụ đề');
    setStatus('active');
    setErrorMessage(null);
  };

  const handleSaveRoom = async () => {
    if (!roomName.trim()) {
      setErrorMessage('Tên phòng chiếu không được để trống.');
      return;
    }

    if (!theater) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: RoomFormPayload = {
        name: roomName.trim(),
        format,
        totalSeats: editingRoom?.totalSeats || 120,
        status,
      };

      if (editingRoom) {
        await CinemaAPI.updateRoom(theater.code || theater.id, editingRoom.code || editingRoom.id, payload, token);
      } else {
        await CinemaAPI.createRoom(theater.code || theater.id, payload, token);
      }

      handleCancelEdit();
      await fetchRooms();
      if (onRoomsUpdated) onRoomsUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu phòng chiếu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    if (!theater) return;
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            setErrorMessage(null);
            try {
              await CinemaAPI.deleteRoom(theater.code || theater.id, room.code || room.id, token);
              await fetchRooms();
              if (onRoomsUpdated) onRoomsUpdated();
            } catch (err: any) {
              setErrorMessage(err.message || 'Lỗi khi xóa phòng chiếu.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
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
                <Ionicons name="albums" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Quản lý phòng chiếu: {theater.shortName}
                </Text>
                <Text style={styles.headerSub}>Thêm, xem, sửa & xóa phòng chiếu</Text>
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

            {/* Input Form Box */}
            <View style={styles.formBox}>
              <Text style={styles.formTitle}>
                {editingRoom ? `Chỉnh sửa: ${editingRoom.name}` : 'Thêm phòng chiếu mới'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên phòng *</Text>
                <TextInput
                  style={styles.textInput}
                  value={roomName}
                  onChangeText={setRoomName}
                  placeholder="Ví dụ: Rạp 07, Rạp IMAX 2"
                  placeholderTextColor="#6B7280"
                />
              </View>

              {/* Định dạng */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Định dạng phòng</Text>
                <View style={styles.formatChips}>
                  {ROOM_FORMATS.map((f) => {
                    const isSelected = format === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[styles.fmtChip, isSelected && styles.fmtChipActive]}
                        onPress={() => setFormat(f)}>
                        <Text style={[styles.fmtChipText, isSelected && styles.fmtChipTextActive]}>
                          {f}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Trạng thái hoạt động */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Trạng thái</Text>
                <View style={styles.statusRow}>
                  <TouchableOpacity
                    style={[styles.statusToggle, status === 'active' && styles.statusToggleGreen]}
                    onPress={() => setStatus('active')}>
                    <Text style={[styles.statusToggleText, status === 'active' && styles.textActive]}>
                      Hoạt động
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusToggle, status === 'maintenance' && styles.statusToggleAmber]}
                    onPress={() => setStatus('maintenance')}>
                    <Text style={[styles.statusToggleText, status === 'maintenance' && styles.textActive]}>
                      Bảo trì
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.formBtnRow}>
                {editingRoom ? (
                  <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancelEdit}>
                    <Text style={styles.cancelEditText}>Hủy sửa</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.saveRoomBtn}
                  onPress={handleSaveRoom}
                  disabled={isSubmitting}
                  activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name={editingRoom ? 'checkmark' : 'add'} size={16} color="#FFFFFF" />
                      <Text style={styles.saveRoomText}>
                        {editingRoom ? 'Lưu cập nhật' : 'Thêm phòng'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Danh sách phòng hiện có */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Danh sách phòng chiếu ({rooms.length})</Text>
              <TouchableOpacity onPress={fetchRooms}>
                <Ionicons name="refresh" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#E50914" />
                <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
              </View>
            ) : rooms.length > 0 ? (
              <View style={styles.roomsGrid}>
                {rooms.map((r) => {
                  const isMaint = r.status === 'maintenance';
                  return (
                    <View key={r.code || r.id} style={styles.roomCard}>
                      <View style={styles.roomCardLeft}>
                        <View style={styles.roomTitleRow}>
                          <Text style={styles.roomCardName}>{r.name}</Text>
                          <View
                            style={[
                              styles.statusPill,
                              isMaint ? styles.pillMaint : styles.pillActive,
                            ]}>
                            <Text
                              style={[
                                styles.pillText,
                                isMaint ? { color: '#F59E0B' } : { color: '#10B981' },
                              ]}>
                              {isMaint ? 'Bảo trì' : 'Hoạt động'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.roomCardSub}>
                          Định dạng: <Text style={{ color: '#E50914', fontWeight: '700' }}>{r.format}</Text>
                        </Text>
                      </View>

                      <View style={styles.roomCardActions}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleStartEdit(r)}>
                          <Ionicons name="pencil" size={15} color="#3B82F6" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.iconBtn, styles.deleteBtn]}
                          onPress={() => handleDeleteRoom(r)}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>Rạp chưa có phòng chiếu nào.</Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerBar}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterText}>Hoàn tất & Đóng</Text>
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
    maxWidth: 600,
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
    backgroundColor: '#10B981',
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
  formBox: {
    backgroundColor: '#171B26',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242B3C',
    marginBottom: 18,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
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
  formatChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fmtChip: {
    backgroundColor: '#12151E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#283144',
  },
  fmtChipActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: '#E50914',
  },
  fmtChipText: {
    color: '#9CA3AF',
    fontSize: 11.5,
  },
  fmtChipTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusToggle: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#12151E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#283144',
  },
  statusToggleGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  statusToggleAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  statusToggleText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formBtnRow: {
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
    fontSize: 12,
  },
  saveRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveRoomText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  roomsGrid: {
    gap: 8,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181C28',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  roomCardLeft: {
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomCardName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  pillMaint: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roomCardSub: {
    color: '#9CA3AF',
    fontSize: 11.5,
  },
  roomCardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
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
  emptyText: {
    color: '#828B9E',
    fontSize: 12,
    fontStyle: 'italic',
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

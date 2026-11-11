// Hiển thị chi tiết thông tin, tiện ích và phòng chiếu của cụm rạp CineMax

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theater, Room } from '../types/cinema.types';
import { CinemaAPI } from '../services/cinemaApi';

interface CinemaDetailModalProps {
  theater: Theater | null;
  visible: boolean;
  onClose: () => void;
  onSelectShowtimes?: (theaterId: string) => void;
}

export default function CinemaDetailModal({
  theater,
  visible,
  onClose,
  onSelectShowtimes,
}: CinemaDetailModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(true);

  useEffect(() => {
    if (visible && theater) {
      setLoadingRooms(true);
      CinemaAPI.getRooms(theater.code || theater.id)
        .then((data) => setRooms(data))
        .catch(() => setRooms(theater.rooms || []))
        .finally(() => setLoadingRooms(false));
    }
  }, [visible, theater]);

  if (!theater) return null;

  const handleCallHotline = () => {
    if (theater.hotline) {
      Linking.openURL(`tel:${theater.hotline.replace(/\s+/g, '')}`).catch(() => {});
    }
  };

  const handleOpenMap = () => {
    const query = encodeURIComponent(`${theater.name}, ${theater.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="business" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {theater.name}
                </Text>
                <Text style={styles.headerSub}>Thông tin chi tiết cụm rạp</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Address & Contact Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Địa chỉ & Liên hệ</Text>

              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#E50914" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoValue}>{theater.address}</Text>
                  <Text style={styles.areaTag}>Khu vực: {theater.area}</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                {theater.hotline ? (
                  <TouchableOpacity
                    style={styles.actionContactBtn}
                    onPress={handleCallHotline}
                    activeOpacity={0.8}>
                    <Ionicons name="call" size={15} color="#10B981" />
                    <Text style={styles.actionContactText}>Hotline: {theater.hotline}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionContactBtn, styles.mapBtn]}
                  onPress={handleOpenMap}
                  activeOpacity={0.8}>
                  <Ionicons name="map-outline" size={15} color="#3B82F6" />
                  <Text style={[styles.actionContactText, { color: '#3B82F6' }]}>Xem bản đồ</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* UC20: Tiện ích hoạt động của rạp (Facilities & Amenities) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={styles.sectionCardTitle}>Tiện ích rạp hoạt động</Text>
              </View>

              {theater.amenities && theater.amenities.length > 0 ? (
                <View style={styles.amenitiesGrid}>
                  {theater.amenities.map((item, idx) => (
                    <View key={idx} style={styles.amenityChip}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.amenityChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Rạp đang cập nhật thông tin tiện ích.</Text>
              )}
            </View>

            {/* Định dạng phòng chiếu hỗ trợ */}
            {theater.supportedFormats && theater.supportedFormats.length > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Công nghệ & Định dạng chiếu</Text>
                <View style={styles.formatsWrap}>
                  {theater.supportedFormats.map((fmt, idx) => (
                    <View key={idx} style={styles.formatBadge}>
                      <Text style={styles.formatBadgeText}>{fmt}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Danh sách phòng chiếu (Rooms) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="film-outline" size={16} color="#E50914" />
                <Text style={styles.sectionCardTitle}>
                  Danh sách phòng chiếu ({loadingRooms ? '...' : rooms.length})
                </Text>
              </View>

              {loadingRooms ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#E50914" />
                </View>
              ) : rooms.length > 0 ? (
                <View style={styles.roomsList}>
                  {rooms.map((room) => {
                    const isMaint = room.status === 'maintenance';
                    return (
                      <View key={room.id || room.code} style={styles.roomItem}>
                        <View style={styles.roomItemLeft}>
                          <View style={styles.roomIcon}>
                            <Ionicons name="desktop-outline" size={16} color="#FFFFFF" />
                          </View>
                          <View>
                            <Text style={styles.roomName}>{room.name}</Text>
                            <Text style={styles.roomSub}>
                              Định dạng: <Text style={styles.roomFmt}>{room.format}</Text>
                            </Text>
                          </View>
                        </View>

                        <View style={styles.roomItemRight}>
                          <View style={styles.seatsBadge}>
                            <Ionicons name="people-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.seatsText}>{room.totalSeats} ghế</Text>
                          </View>

                          <View
                            style={[
                              styles.roomStatusTag,
                              isMaint ? styles.statusMaint : styles.statusActive,
                            ]}>
                            <Text
                              style={[
                                styles.roomStatusText,
                                isMaint ? { color: '#F59E0B' } : { color: '#10B981' },
                              ]}>
                              {isMaint ? 'Bảo trì' : 'Hoạt động'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Chưa có thông tin phòng chiếu.</Text>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerBar}>
            <TouchableOpacity
              style={styles.showtimesActionBtn}
              onPress={() => {
                onClose();
                if (onSelectShowtimes) {
                  onSelectShowtimes(theater.id || theater.code);
                }
              }}
              activeOpacity={0.85}>
              <Ionicons name="calendar" size={16} color="#FFFFFF" />
              <Text style={styles.showtimesActionText}>Xem lịch chiếu tại rạp này</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F1219',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#242C3E',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
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
  },
  headerSub: {
    color: '#828B9E',
    fontSize: 11,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#202636',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    padding: 18,
  },
  sectionCard: {
    backgroundColor: '#151822',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242B3C',
    marginBottom: 14,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  infoValue: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
  },
  areaTag: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E2333',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2B3548',
  },
  mapBtn: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  actionContactText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1F2C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#293245',
  },
  amenityChipText: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  formatsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  formatBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  roomsList: {
    gap: 8,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1F2C',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262E40',
  },
  roomItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#232A3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  roomSub: {
    color: '#828B9E',
    fontSize: 11,
  },
  roomFmt: {
    color: '#E50914',
    fontWeight: '600',
  },
  roomItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  seatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seatsText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  roomStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusMaint: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  roomStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    color: '#828B9E',
    fontSize: 12,
    fontStyle: 'italic',
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E2333',
    backgroundColor: '#151821',
  },
  showtimesActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 10,
  },
  showtimesActionText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

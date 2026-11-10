// UC17: Manage Cinemas | UC18: Manage Rooms
// UC19: View Cinema Details | UC20: Manage Cinema Facilities
// CinemaCard Component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theater } from '../types/cinema.types';

interface CinemaCardProps {
  theater: Theater;
  onPress: (theater: Theater) => void;
  onViewShowtimes?: (theater: Theater) => void;
  isAdmin?: boolean;
  onEditTheater?: (theater: Theater) => void;
  onDeleteTheater?: (theater: Theater) => void;
  onManageRooms?: (theater: Theater) => void;
  onManageFacilities?: (theater: Theater) => void;
}

export default function CinemaCard({
  theater,
  onPress,
  onViewShowtimes,
  isAdmin = false,
  onEditTheater,
  onDeleteTheater,
  onManageRooms,
  onManageFacilities,
}: CinemaCardProps) {
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardHeaderArea}
        onPress={() => onPress(theater)}
        activeOpacity={0.88}>
        <View style={styles.topRow}>
          <View style={styles.titleInfo}>
            <View style={styles.theaterIconBadge}>
              <Ionicons name="business" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.theaterName} numberOfLines={1}>
                {theater.name}
              </Text>
              <Text style={styles.theaterArea}>
                Khu vực: <Text style={styles.areaHighlight}>{theater.area}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.roomCountBadge}>
            <Ionicons name="grid-outline" size={12} color="#E50914" />
            <Text style={styles.roomCountText}>{theater.totalRooms} Phòng chiếu</Text>
          </View>
        </View>

        {/* Address & Hotline */}
        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaAddress} numberOfLines={2}>
              {theater.address}
            </Text>
          </View>

          <View style={styles.bottomMetaRow}>
            {theater.hotline ? (
              <View style={styles.metaInline}>
                <Ionicons name="call-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaSubText}>{theater.hotline}</Text>
              </View>
            ) : null}

            {theater.distance ? (
              <View style={styles.metaInline}>
                <Ionicons name="navigate-outline" size={13} color="#3B82F6" />
                <Text style={[styles.metaSubText, { color: '#3B82F6' }]}>{theater.distance}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Supported Formats */}
        {theater.supportedFormats && theater.supportedFormats.length > 0 ? (
          <View style={styles.formatsWrap}>
            {theater.supportedFormats.map((fmt, i) => (
              <View key={i} style={styles.fmtChip}>
                <Text style={styles.fmtChipText}>{fmt}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Amenities Highlights */}
        {theater.amenities && theater.amenities.length > 0 ? (
          <View style={styles.amenitiesPreview}>
            <Ionicons name="sparkles" size={12} color="#F59E0B" />
            <Text style={styles.amenityText} numberOfLines={1}>
              {theater.amenities.slice(0, 3).join(' • ')}
              {theater.amenities.length > 3 ? ` (+${theater.amenities.length - 3})` : ''}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Customer Action Bar */}
      <View style={styles.customerActionRow}>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => onPress(theater)}
          activeOpacity={0.8}>
          <Ionicons name="information-circle-outline" size={15} color="#E5E7EB" />
          <Text style={styles.detailBtnText}>Chi tiết & Phòng</Text>
        </TouchableOpacity>

        {onViewShowtimes ? (
          <TouchableOpacity
            style={styles.showtimesBtn}
            onPress={() => onViewShowtimes(theater)}
            activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
            <Text style={styles.showtimesBtnText}>Xem lịch chiếu</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Admin Management Tools (Chỉ hiển thị khi isAdmin === true) */}
      {isAdmin ? (
        <View style={styles.adminBar}>
          <View style={styles.adminLabelBadge}>
            <Text style={styles.adminLabelText}>QUẢN TRỊ</Text>
          </View>

          <View style={styles.adminButtonsGroup}>
            {onManageRooms ? (
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => onManageRooms(theater)}
                activeOpacity={0.8}>
                <Ionicons name="albums-outline" size={13} color="#10B981" />
                <Text style={[styles.adminBtnText, { color: '#10B981' }]}>Phòng chiếu</Text>
              </TouchableOpacity>
            ) : null}

            {onManageFacilities ? (
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => onManageFacilities(theater)}
                activeOpacity={0.8}>
                <Ionicons name="construct-outline" size={13} color="#F59E0B" />
                <Text style={[styles.adminBtnText, { color: '#F59E0B' }]}>Tiện ích</Text>
              </TouchableOpacity>
            ) : null}

            {onEditTheater ? (
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => onEditTheater(theater)}
                activeOpacity={0.8}>
                <Ionicons name="create-outline" size={13} color="#3B82F6" />
                <Text style={[styles.adminBtnText, { color: '#3B82F6' }]}>Sửa</Text>
              </TouchableOpacity>
            ) : null}

            {onDeleteTheater ? (
              <TouchableOpacity
                style={[styles.adminBtn, styles.deleteBtn]}
                onPress={() => {
                  Alert.alert(
                    'Delete Cinema',
                    `Are you sure you want to delete "${theater.name}"? This action cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => onDeleteTheater(theater),
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
                <Text style={[styles.adminBtnText, { color: '#EF4444' }]}>Xóa</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
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
  },
  cardHeaderArea: {
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  theaterIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  theaterName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  theaterArea: {
    color: '#828B9E',
    fontSize: 11.5,
    marginTop: 2,
  },
  areaHighlight: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  roomCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomCountText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '700',
  },
  metaBox: {
    backgroundColor: '#191D2A',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
  },
  metaAddress: {
    color: '#D1D5DB',
    fontSize: 12.5,
    lineHeight: 17,
    flex: 1,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#252C3E',
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaSubText: {
    color: '#9CA3AF',
    fontSize: 11.5,
  },
  formatsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fmtChip: {
    backgroundColor: '#1E2333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2F384C',
  },
  fmtChipText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  amenitiesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  amenityText: {
    color: '#F59E0B',
    fontSize: 11.5,
    flex: 1,
  },
  customerActionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#202636',
    backgroundColor: '#141722',
    gap: 10,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1F2432',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30394D',
  },
  detailBtnText: {
    color: '#E5E7EB',
    fontSize: 12.5,
    fontWeight: '600',
  },
  showtimesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingVertical: 9,
    borderRadius: 8,
  },
  showtimesBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  adminBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0F1219',
    borderTopWidth: 1,
    borderTopColor: '#202535',
  },
  adminLabelBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminLabelText: {
    color: '#F59E0B',
    fontSize: 9.5,
    fontWeight: '800',
  },
  adminButtonsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#181C28',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262D3E',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  adminBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

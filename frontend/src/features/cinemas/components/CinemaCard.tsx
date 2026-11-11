// Nguyễn Minh Quân - CE180048
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
            <Text style={styles.roomCountText}>
              {theater.totalRooms > 0 ? `${theater.totalRooms} Phòng chiếu` : 'Chưa có phòng chiếu'}
            </Text>
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

          {theater.hotline ? (
            <View style={styles.bottomMetaRow}>
              <View style={styles.metaInline}>
                <Ionicons name="call-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaSubText}>{theater.hotline}</Text>
              </View>
            </View>
          ) : null}
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

      {/* Action Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => onPress(theater)}
          activeOpacity={0.8}>
          <Ionicons name="information-circle-outline" size={15} color="#E5E7EB" />
          <Text style={styles.detailBtnText}>Chi tiết rạp</Text>
        </TouchableOpacity>

        {onViewShowtimes ? (
          <TouchableOpacity
            style={styles.showtimesBtn}
            onPress={() => onViewShowtimes(theater)}
            activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
            <Text style={styles.showtimesBtnText}>Lịch chiếu</Text>
          </TouchableOpacity>
        ) : null}

        {isAdmin ? (
          <View style={styles.adminActionGroup}>
            {onManageRooms ? (
              <TouchableOpacity
                style={styles.adminIconBtn}
                onPress={() => onManageRooms(theater)}
                accessibilityLabel="Quản lý phòng chiếu">
                <Ionicons name="grid-outline" size={14} color="#60A5FA" />
              </TouchableOpacity>
            ) : null}

            {onManageFacilities ? (
              <TouchableOpacity
                style={styles.adminIconBtn}
                onPress={() => onManageFacilities(theater)}
                accessibilityLabel="Quản lý tiện ích">
                <Ionicons name="construct-outline" size={13} color="#F59E0B" />
              </TouchableOpacity>
            ) : null}

            {onEditTheater ? (
              <TouchableOpacity
                style={styles.adminIconBtn}
                onPress={() => onEditTheater(theater)}
                accessibilityLabel="Sửa thông tin rạp">
                <Ionicons name="create-outline" size={14} color="#E5E7EB" />
              </TouchableOpacity>
            ) : null}

            {onDeleteTheater ? (
              <TouchableOpacity
                style={[styles.adminIconBtn, styles.deleteBtn]}
                onPress={() => {
                  Alert.alert(
                    'Xác nhận xóa rạp',
                    `Bạn có chắc chắn muốn xóa rạp "${theater.name}" khỏi hệ thống không?`,
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Xóa ngay',
                        style: 'destructive',
                        onPress: () => onDeleteTheater(theater),
                      },
                    ]
                  );
                }}
                accessibilityLabel="Xóa rạp">
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#161A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252C3E',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeaderArea: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  theaterIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  theaterName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  theaterArea: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  areaHighlight: {
    color: '#E50914',
    fontWeight: '600',
  },
  roomCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.25)',
  },
  roomCountText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '600',
  },
  metaBox: {
    marginTop: 12,
    backgroundColor: '#12151E',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  metaAddress: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    marginTop: 10,
  },
  fmtChip: {
    backgroundColor: '#1F2637',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fmtChipText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '500',
  },
  amenitiesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amenityText: {
    color: '#FBBF24',
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#141824',
    borderTopWidth: 1,
    borderTopColor: '#202636',
    gap: 8,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E2433',
  },
  detailBtnText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  showtimesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E50914',
  },
  showtimesBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  adminActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  adminIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#1E2433',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
});

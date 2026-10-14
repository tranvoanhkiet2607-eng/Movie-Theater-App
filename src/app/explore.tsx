import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

interface Theater {
  id: string;
  name: string;
  address: string;
  distance: string;
  rooms: string[];
  formats: string[];
}

const THEATERS: Theater[] = [
  {
    id: 't1',
    name: 'CineMax Vincom Center Đồng Khởi',
    address: 'Tầng 3, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. HCM',
    distance: '1.2 km',
    rooms: ['Rạp 1', 'Rạp 2', 'Rạp 3 (IMAX)', 'Rạp Gold Class'],
    formats: ['2D', '3D', 'IMAX Laser', 'Dolby Atmos'],
  },
  {
    id: 't2',
    name: 'CineMax Landmark 81',
    address: 'Tầng B1, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. HCM',
    distance: '3.8 km',
    rooms: ['Rạp 1', 'Rạp 2', 'Rạp 4DX', 'Rạp VIP Sweetbox'],
    formats: ['2D', '4DX', 'ScreenX'],
  },
  {
    id: 't3',
    name: 'CineMax Crescent Mall',
    address: 'Tầng 5, 101 Tôn Dật Tiên, Tân Phú, Quận 7, TP. HCM',
    distance: '6.5 km',
    rooms: ['Rạp 1', 'Rạp 2', 'Rạp 3', 'Rạp Premium'],
    formats: ['2D', '3D', 'Dolby Atmos'],
  },
];

const SHOWTIMES = [
  { time: '10:15', room: 'Rạp 01', type: '2D Phụ đề', price: '90.000đ' },
  { time: '13:30', room: 'Rạp 03 (IMAX)', type: 'IMAX 3D', price: '160.000đ' },
  { time: '16:45', room: 'Rạp 02', type: '2D Lồng tiếng', price: '90.000đ' },
  { time: '19:30', room: 'Rạp 03 (IMAX)', type: 'IMAX 3D', price: '180.000đ' },
  { time: '22:15', room: 'Rạp Gold Class', type: '2D VIP Luxury', price: '250.000đ' },
];

export default function ExploreScreen() {
  const { isAuthenticated } = useAuth();
  const [selectedTheater, setSelectedTheater] = useState<string>('t1');
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);

  const dates = [
    { label: 'Hôm nay', date: '15/10' },
    { label: 'Ngày mai', date: '16/10' },
    { label: 'Thứ 6', date: '17/10' },
    { label: 'Thứ 7', date: '18/10' },
    { label: 'Chủ nhật', date: '19/10' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 40 },
        ]}>
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Hệ Thống Cụm Rạp & Lịch Chiếu</Text>
              <Text style={styles.headerSubtitle}>
                Chọn cụm rạp gần bạn nhất để xem lịch chiếu hôm nay
              </Text>
            </View>
          </View>

          {/* Date Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}>
            {dates.map((d, index) => {
              const isSelected = selectedDateIndex === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateChip,
                    isSelected && styles.dateChipSelected,
                  ]}
                  onPress={() => setSelectedDateIndex(index)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.dateLabel,
                      isSelected && styles.dateLabelSelected,
                    ]}>
                    {d.label}
                  </Text>
                  <Text
                    style={[
                      styles.dateSub,
                      isSelected && styles.dateSubSelected,
                    ]}>
                    {d.date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Theaters List */}
          <Text style={styles.sectionHeading}>DANH SÁCH RẠP CHIẾU</Text>
          <View style={styles.theatersList}>
            {THEATERS.map((t) => {
              const isSelected = selectedTheater === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.theaterCard,
                    isSelected && styles.theaterCardSelected,
                  ]}
                  onPress={() => setSelectedTheater(t.id)}
                  activeOpacity={0.85}>
                  <View style={styles.theaterTopRow}>
                    <View style={styles.theaterTitleRow}>
                      <Ionicons
                        name="location-sharp"
                        size={18}
                        color={isSelected ? '#E50914' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.theaterName,
                          isSelected && styles.theaterNameSelected,
                        ]}>
                        {t.name}
                      </Text>
                    </View>
                    <Text style={styles.theaterDistance}>{t.distance}</Text>
                  </View>

                  <Text style={styles.theaterAddress}>{t.address}</Text>

                  {/* Formats Tags */}
                  <View style={styles.formatsRow}>
                    {t.formats.map((fmt, i) => (
                      <View key={i} style={styles.formatBadge}>
                        <Text style={styles.formatText}>{fmt}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Showtimes for selected theater */}
          <Text style={[styles.sectionHeading, { marginTop: 24 }]}>
            LỊCH CHIẾU PHIM: DUNE 2
          </Text>

          <View style={styles.showtimesGrid}>
            {SHOWTIMES.map((st, i) => (
              <TouchableOpacity
                key={i}
                style={styles.showtimeSlot}
                onPress={() => {
                  if (!isAuthenticated) {
                    router.push('/login');
                  } else {
                    router.push('/profile');
                  }
                }}
                activeOpacity={0.8}>
                <Text style={styles.slotTime}>{st.time}</Text>
                <Text style={styles.slotType}>{st.type}</Text>
                <Text style={styles.slotRoom}>{st.room}</Text>
                <Text style={styles.slotPrice}>{st.price}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 3,
  },
  dateList: {
    gap: 10,
    marginBottom: 20,
  },
  dateChip: {
    backgroundColor: '#151821',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232838',
    minWidth: 80,
  },
  dateChipSelected: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  dateLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateLabelSelected: {
    color: '#FFFFFF',
  },
  dateSub: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  dateSubSelected: {
    color: '#FFFFFF',
  },
  sectionHeading: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  theatersList: {
    gap: 12,
  },
  theaterCard: {
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
  },
  theaterCardSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.05)',
  },
  theaterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  theaterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  theaterName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  theaterNameSelected: {
    color: '#E50914',
  },
  theaterDistance: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  theaterAddress: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  formatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formatBadge: {
    backgroundColor: '#0F121B',
    borderWidth: 1,
    borderColor: '#2D3345',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  showtimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  showtimeSlot: {
    width: '48%',
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#232838',
    alignItems: 'center',
  },
  slotTime: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  slotType: {
    color: '#E50914',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  slotRoom: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  slotPrice: {
    color: '#F59E0B',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 6,
  },
});

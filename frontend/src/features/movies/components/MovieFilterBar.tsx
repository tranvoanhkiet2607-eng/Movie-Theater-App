// UC13: Filter Movies - MovieFilterBar Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MovieStatusFilter } from '../types/movie.types';

interface MovieFilterBarProps {
  currentStatus: MovieStatusFilter;
  onStatusChange: (status: MovieStatusFilter) => void;
  genres: string[];
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  onOpenAdvancedFilter: () => void;
  activeFilterCount: number;
}

export default function MovieFilterBar({
  currentStatus,
  onStatusChange,
  genres,
  selectedGenre,
  onGenreChange,
  onOpenAdvancedFilter,
  activeFilterCount,
}: MovieFilterBarProps) {
  return (
    <View style={styles.container}>
      {/* Status Segmented Tabs & Advanced Filter Button */}
      <View style={styles.topRow}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              currentStatus === 'all' && styles.segmentBtnActive,
            ]}
            onPress={() => onStatusChange('all')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.segmentText,
                currentStatus === 'all' && styles.segmentTextActive,
              ]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              currentStatus === 'now_showing' && styles.segmentBtnActive,
            ]}
            onPress={() => onStatusChange('now_showing')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.segmentText,
                currentStatus === 'now_showing' && styles.segmentTextActive,
              ]}>
              Đang chiếu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              currentStatus === 'coming_soon' && styles.segmentBtnActive,
            ]}
            onPress={() => onStatusChange('coming_soon')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.segmentText,
                currentStatus === 'coming_soon' && styles.segmentTextActive,
              ]}>
              Sắp chiếu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Modal Trigger Button */}
        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            activeFilterCount > 0 && styles.filterTriggerBtnActive,
          ]}
          onPress={onOpenAdvancedFilter}
          activeOpacity={0.8}>
          <Ionicons
            name="options-outline"
            size={16}
            color={activeFilterCount > 0 ? '#FFFFFF' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.filterTriggerText,
              activeFilterCount > 0 && styles.filterTriggerTextActive,
            ]}>
            Bộ lọc
          </Text>
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Horizontal Genres Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genresScroll}>
        <TouchableOpacity
          style={[
            styles.genreChip,
            selectedGenre === 'all' && styles.genreChipActive,
          ]}
          onPress={() => onGenreChange('all')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.genreChipText,
              selectedGenre === 'all' && styles.genreChipTextActive,
            ]}>
            Tất cả thể loại
          </Text>
        </TouchableOpacity>

        {genres.map((g) => {
          const isSelected = selectedGenre === g;
          return (
            <TouchableOpacity
              key={g}
              style={[styles.genreChip, isSelected && styles.genreChipActive]}
              onPress={() => onGenreChange(isSelected ? 'all' : g)}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.genreChipText,
                  isSelected && styles.genreChipTextActive,
                ]}>
                {g}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#242B3C',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#E50914',
  },
  segmentText: {
    color: '#9CA3AF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242B3C',
    gap: 6,
  },
  filterTriggerBtnActive: {
    backgroundColor: '#1E2436',
    borderColor: '#E50914',
  },
  filterTriggerText: {
    color: '#9CA3AF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  filterTriggerTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: '#E50914',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  genresScroll: {
    gap: 8,
    paddingRight: 10,
  },
  genreChip: {
    backgroundColor: '#151821',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242B3C',
  },
  genreChipActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: '#E50914',
  },
  genreChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  genreChipTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },
});

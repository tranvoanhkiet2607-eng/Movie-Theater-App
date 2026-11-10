// UC12: Search Movies - MovieSearchBar Component
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MovieSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  totalResults?: number;
}

export default function MovieSearchBar({
  value,
  onChangeText,
  placeholder = 'Tìm tên phim, diễn viên, đạo diễn...',
  totalResults,
}: MovieSearchBarProps) {
  const [localText, setLocalText] = useState(value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đồng bộ khi prop bên ngoài thay đổi (ví dụ khi reset filter)
  useEffect(() => {
    setLocalText(value);
  }, [value]);

  const handleTextChange = (text: string) => {
    setLocalText(text);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onChangeText(text);
    }, 350);
  };

  const handleClear = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setLocalText('');
    onChangeText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={localText}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {localText.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClear}
            activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {totalResults !== undefined ? (
        <View style={styles.resultInfoRow}>
          <Text style={styles.resultText}>
            Tìm thấy <Text style={styles.highlightText}>{totalResults}</Text> bộ phim
            {value.trim() ? (
              <Text style={styles.queryNote}> cho từ khóa &quot;{value}&quot;</Text>
            ) : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242B3C',
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  resultInfoRow: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  resultText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  highlightText: {
    color: '#E50914',
    fontWeight: '700',
  },
  queryNote: {
    color: '#E5E7EB',
    fontStyle: 'italic',
  },
});

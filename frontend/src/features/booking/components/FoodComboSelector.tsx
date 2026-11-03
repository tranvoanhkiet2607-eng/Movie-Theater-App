// Anh Kiệt - CE180795
// UC32: Chọn bắp nước & combo kèm theo vé (Food & Beverage Combos)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SelectedFoodItem } from '../types/booking.types';

export const AVAILABLE_FOOD_COMBOS: Omit<SelectedFoodItem, 'quantity'>[] = [
  {
    foodId: 'fnb_01',
    name: 'CineMax Solo Combo',
    category: 'combo',
    price: 85000,
    size: 'Tiêu chuẩn',
    imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=400',
  },
  {
    foodId: 'fnb_02',
    name: 'Couple Sweet Combo',
    category: 'combo',
    price: 129000,
    size: 'Lớn (L)',
    imageUrl: 'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=400',
  },
  {
    foodId: 'fnb_03',
    name: 'Family Blockbuster Combo',
    category: 'combo',
    price: 219000,
    size: 'Gia đình (XL)',
    imageUrl: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=400',
  },
  {
    foodId: 'fnb_04',
    name: 'Bắp Rang Bơ Phô Mai',
    category: 'popcorn',
    price: 55000,
    size: '60oz',
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400',
  },
  {
    foodId: 'fnb_05',
    name: 'Coca-Cola Tươi Lạnh 32oz',
    category: 'drink',
    price: 35000,
    size: '32oz',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
  },
];

interface FoodComboSelectorProps {
  selectedFoodItems: SelectedFoodItem[];
  onChangeQuantity: (foodItem: Omit<SelectedFoodItem, 'quantity'>, delta: number) => void;
}

export default function FoodComboSelector({
  selectedFoodItems,
  onChangeQuantity,
}: FoodComboSelectorProps) {
  const getQuantity = (foodId: string) => {
    const item = selectedFoodItems.find((f) => f.foodId === foodId);
    return item ? item.quantity : 0;
  };

  const totalFoodPrice = selectedFoodItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="fast-food" size={20} color="#F59E0B" />
          <Text style={styles.headerTitle}>Combo Bắp Nước Ưu Đãi</Text>
        </View>
        <Text style={styles.headerSubtitle}>Tùy chọn thêm</Text>
      </View>

      <View style={styles.comboList}>
        {AVAILABLE_FOOD_COMBOS.map((combo) => {
          const qty = getQuantity(combo.foodId);

          return (
            <View key={combo.foodId} style={styles.comboCard}>
              <Image source={{ uri: combo.imageUrl }} style={styles.comboImage} />

              <View style={styles.comboInfo}>
                <Text style={styles.comboName} numberOfLines={1}>
                  {combo.name}
                </Text>
                <Text style={styles.comboSize}>{combo.size}</Text>
                <Text style={styles.comboPrice}>
                  {combo.price.toLocaleString('vi-VN')}đ
                </Text>
              </View>

              {/* Quantity Counter Buttons */}
              <View style={styles.counterRow}>
                <TouchableOpacity
                  disabled={qty <= 0}
                  onPress={() => onChangeQuantity(combo, -1)}
                  style={[styles.counterBtn, qty <= 0 && styles.counterBtnDisabled]}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="remove"
                    size={16}
                    color={qty <= 0 ? '#6B7280' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                <Text style={styles.counterText}>{qty}</Text>

                <TouchableOpacity
                  onPress={() => onChangeQuantity(combo, 1)}
                  style={[styles.counterBtn, styles.counterBtnAdd]}
                  activeOpacity={0.7}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Subtotal bắp nước */}
      {totalFoodPrice > 0 && (
        <View style={styles.subtotalBox}>
          <Text style={styles.subtotalLabel}>Tiền bắp nước tạm tính:</Text>
          <Text style={styles.subtotalValue}>
            {totalFoodPrice.toLocaleString('vi-VN')}đ
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  comboList: {
    gap: 12,
  },
  comboCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  comboImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  comboInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  comboName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  comboSize: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 4,
  },
  comboPrice: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 4,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnAdd: {
    backgroundColor: '#E50914',
  },
  counterBtnDisabled: {
    backgroundColor: '#1F2937',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 10,
    minWidth: 16,
    textAlign: 'center',
  },
  subtotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  subtotalLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
  },
  subtotalValue: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '800',
  },
});


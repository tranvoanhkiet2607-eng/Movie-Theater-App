// Anh Kiệt - CE180795
// UC31: Áp dụng mã khuyến mãi (Apply Promotion)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromotionInfo } from '../types/booking.types';
import { BookingAPI } from '../services/bookingApi';

interface PromotionSectionProps {
  orderSubtotal: number;
  appliedPromo: PromotionInfo | null;
  discountAmount: number;
  onApplySuccess: (promo: PromotionInfo, discount: number) => void;
  onRemovePromo: () => void;
}

export default function PromotionSection({
  orderSubtotal,
  appliedPromo,
  discountAmount,
  onApplySuccess,
  onRemovePromo,
}: PromotionSectionProps) {
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [availablePromos, setAvailablePromos] = useState<PromotionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    BookingAPI.getActivePromotions()
      .then((data) => setAvailablePromos(data))
      .catch(() => {});
  }, []);

  const handleApply = async (codeToApply?: string) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setErrorMessage('Vui lòng nhập mã khuyến mãi.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await BookingAPI.applyPromotion(code, orderSubtotal);
      if (res.success && res.promotion) {
        setSuccessMessage(res.message);
        onApplySuccess(res.promotion, res.discountAmount);
        setPromoCodeInput('');
      } else {
        setErrorMessage(res.message || 'Mã khuyến mãi không hợp lệ.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi kiểm tra mã khuyến mãi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="pricetag" size={20} color="#10B981" />
        <Text style={styles.headerTitle}>Mã Khuyến Mãi / Voucher</Text>
      </View>

      {/* Đã áp dụng mã */}
      {appliedPromo ? (
        <View style={styles.appliedCard}>
          <View style={styles.appliedLeft}>
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedBadgeText}>{appliedPromo.code}</Text>
            </View>
            <View style={styles.appliedInfo}>
              <Text style={styles.appliedTitle}>{appliedPromo.title}</Text>
              <Text style={styles.appliedDiscount}>
                Được giảm: -{discountAmount.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onRemovePromo}
            style={styles.removeBtn}
            activeOpacity={0.7}>
            <Ionicons name="close-circle" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        /* Ô nhập mã khuyến mãi */
        <View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã voucher (VD: CINEMA50)"
              placeholderTextColor="#6B7280"
              value={promoCodeInput}
              onChangeText={(text) => {
                setPromoCodeInput(text.toUpperCase());
                setErrorMessage(null);
              }}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              onPress={() => handleApply()}
              disabled={isLoading || !promoCodeInput.trim()}
              style={[
                styles.applyBtn,
                (!promoCodeInput.trim() || isLoading) && styles.applyBtnDisabled,
              ]}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Gợi ý mã có sẵn */}
          {availablePromos.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Voucher gợi ý cho bạn:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsList}>
                {availablePromos.map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    onPress={() => handleApply(p.code)}
                    style={styles.suggestionTag}
                    activeOpacity={0.75}>
                    <Text style={styles.suggestionCode}>{p.code}</Text>
                    <Text style={styles.suggestionDesc} numberOfLines={1}>
                      {p.discountType === 'percentage'
                        ? `Giảm ${p.discountValue}%`
                        : `Giảm ${p.discountValue.toLocaleString('vi-VN')}đ`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Thông báo lỗi */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Thông báo thành công */}
          {successMessage && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#374151',
  },
  applyBtn: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: '#10B981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: '#374151',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  appliedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  appliedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  appliedInfo: {
    flex: 1,
  },
  appliedTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  appliedDiscount: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  suggestionsContainer: {
    marginTop: 14,
  },
  suggestionsTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionTag: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  suggestionCode: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  suggestionDesc: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#451A1A',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  successText: {
    color: '#34D399',
    fontSize: 12,
    flex: 1,
  },
});


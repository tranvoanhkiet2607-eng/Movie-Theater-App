// Anh Kiệt - CE180795
// UC33: Thanh toán giả lập và cập nhật trạng thái thanh toán (Make Payment)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod } from '../types/booking.types';

interface PaymentModalProps {
  visible: boolean;
  totalAmount: number;
  onClose: () => void;
  onPaySuccess: (method: PaymentMethod) => Promise<void>;
}

const PAYMENT_METHODS: {
  id: PaymentMethod;
  name: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    id: 'momo',
    name: 'Ví MoMo',
    desc: 'Thanh toán tức thì qua ví điện tử MoMo',
    icon: 'wallet-outline',
    color: '#A50064',
  },
  {
    id: 'vnpay',
    name: 'VNPay QR',
    desc: 'Quét mã VNPAY-QR qua ứng dụng ngân hàng',
    icon: 'qr-code-outline',
    color: '#005BAA',
  },
  {
    id: 'zalopay',
    name: 'Ví ZaloPay',
    desc: 'Thanh toán siêu nhanh qua ZaloPay',
    icon: 'flash-outline',
    color: '#0088FF',
  },
  {
    id: 'card',
    name: 'Thẻ ATM / Visa / Mastercard',
    desc: 'Hỗ trợ tất cả ngân hàng nội địa & quốc tế',
    icon: 'card-outline',
    color: '#10B981',
  },
  {
    id: 'counter',
    name: 'Thanh toán tại quầy',
    desc: 'Nhận vé và thanh toán tiền mặt trực tiếp tại rạp',
    icon: 'storefront-outline',
    color: '#F59E0B',
  },
];

export default function PaymentModal({
  visible,
  totalAmount,
  onClose,
  onPaySuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('momo');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleExecutePayment = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Đang kết nối cổng thanh toán an toàn...');

      await new Promise((resolve) => setTimeout(resolve, 800));
      setProcessingStatus('Đang xác thực giao dịch...');

      await new Promise((resolve) => setTimeout(resolve, 800));
      setProcessingStatus('Thanh toán thành công! Đang xuất vé điện tử...');

      await onPaySuccess(selectedMethod);
    } catch (error) {
      console.error('Lỗi thanh toán:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Cổng Thanh Toán (UC33)</Text>
              <Text style={styles.modalSubtitle}>Chọn phương thức thanh toán an toàn</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isProcessing} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Tổng tiền cần trả */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Số tiền cần thanh toán:</Text>
            <Text style={styles.amountValue}>
              {totalAmount.toLocaleString('vi-VN')}đ
            </Text>
          </View>

          {/* Danh sách phương thức */}
          <ScrollView style={styles.methodsList} showsVerticalScrollIndicator={false}>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;

              return (
                <TouchableOpacity
                  key={method.id}
                  disabled={isProcessing}
                  onPress={() => setSelectedMethod(method.id)}
                  style={[
                    styles.methodCard,
                    isSelected && styles.methodCardSelected,
                  ]}
                  activeOpacity={0.75}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${method.color}20` },
                    ]}>
                    <Ionicons name={method.icon} size={22} color={method.color} />
                  </View>

                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDesc}>{method.desc}</Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Loading status */}
          {isProcessing && (
            <View style={styles.processingBox}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={styles.processingText}>{processingStatus}</Text>
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity
            disabled={isProcessing}
            onPress={handleExecutePayment}
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            activeOpacity={0.85}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.payButtonText}>
                  Xác Nhận Thanh Toán ({totalAmount.toLocaleString('vi-VN')}đ)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  amountLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  amountValue: {
    color: '#E50914',
    fontSize: 20,
    fontWeight: '900',
  },
  methodsList: {
    maxHeight: 280,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 12,
    marginVertical: 5,
    borderWidth: 1.5,
    borderColor: '#374151',
  },
  methodCardSelected: {
    borderColor: '#E50914',
    backgroundColor: '#1F1E2E',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  methodDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioCircleSelected: {
    borderColor: '#E50914',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E50914',
  },
  processingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  processingText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  payButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});


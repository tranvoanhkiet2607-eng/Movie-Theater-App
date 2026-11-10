// Nguyễn Minh Quân - CE180048
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PricingAPI } from '@/services/api';
import {
  AdjustmentType,
  PricingCalculatePreviewPayload,
  PricingCalculatePreviewResponse,
  PricingCategory,
  PricingRuleFormData,
  PricingRuleItem,
  PricingRuleSummaryResponse,
} from '@/types/pricing';

interface PricingManagementTabProps {
  isManageMode: boolean;
}

const CATEGORY_TABS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'all', label: 'Tất cả', icon: 'apps-outline' },
  { key: 'format', label: 'Định dạng', icon: 'film-outline' },
  { key: 'seat_type', label: 'Loại ghế', icon: 'grid-outline' },
  { key: 'day_of_week', label: 'Ngày chiếu', icon: 'calendar-outline' },
  { key: 'time_slot', label: 'Khung giờ', icon: 'time-outline' },
  { key: 'audience', label: 'Đối tượng', icon: 'people-outline' },
];

const ADJUSTMENT_OPTIONS: Array<{ key: AdjustmentType; label: string; prefix: string; unit: string }> = [
  { key: 'fixed_surcharge', label: 'Phụ thu cố định (+VNĐ)', prefix: '+', unit: 'đ' },
  { key: 'fixed_discount', label: 'Giảm trừ cố định (-VNĐ)', prefix: '-', unit: 'đ' },
  { key: 'percentage_surcharge', label: 'Tăng theo phần trăm (+%)', prefix: '+', unit: '%' },
  { key: 'percentage_discount', label: 'Giảm theo phần trăm (-%)', prefix: '-', unit: '%' },
  { key: 'fixed_price', label: 'Đồng giá vé (VNĐ)', prefix: '=', unit: 'đ' },
];

const AUDIENCE_OPTIONS: Array<{ key: 'all' | 'adult' | 'student' | 'child' | 'senior' | 'member'; label: string }> = [
  { key: 'all', label: 'Tất cả khách hàng' },
  { key: 'student', label: 'Học sinh / Sinh viên (U22)' },
  { key: 'child', label: 'Trẻ em (< 1.3m)' },
  { key: 'senior', label: 'Người cao tuổi (> 60t)' },
  { key: 'member', label: 'Thành viên VIP CineMax' },
  { key: 'adult', label: 'Người lớn tiêu chuẩn' },
];

const DAYS_OF_WEEK = [
  { val: 1, label: 'T2' },
  { val: 2, label: 'T3' },
  { val: 3, label: 'T4' },
  { val: 4, label: 'T5' },
  { val: 5, label: 'T6' },
  { val: 6, label: 'T7' },
  { val: 0, label: 'CN' },
];

function formatCurrency(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  return `${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

export default function PricingManagementTab({ isManageMode }: PricingManagementTabProps) {
  // ─── States Danh sách & Bộ lọc ──────────────────────────────────────────────
  const [rules, setRules] = useState<PricingRuleItem[]>([]);
  const [summary, setSummary] = useState<PricingRuleSummaryResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all'); // 'all' | 'true' | 'false'

  // ─── States Live Preview Calculator ─────────────────────────────────────────
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcFormat, setCalcFormat] = useState<string>('2D');
  const [calcDay, setCalcDay] = useState<number>(1);
  const [calcTime, setCalcTime] = useState<string>('19:30');
  const [calcSeatType, setCalcSeatType] = useState<string>('standard');
  const [calcAudience, setCalcAudience] = useState<string>('adult');
  const [calcPreview, setCalcPreview] = useState<PricingCalculatePreviewResponse['preview'] | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // ─── States Form Modal (Thêm / Sửa) ─────────────────────────────────────────
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<PricingCategory>('format');
  const [formAdjType, setFormAdjType] = useState<AdjustmentType>('fixed_surcharge');
  const [formAdjValue, setFormAdjValue] = useState<string>('30000');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPriority, setFormPriority] = useState<string>('10');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formFormats, setFormFormats] = useState<string[]>([]);
  const [formDays, setFormDays] = useState<number[]>([]);
  const [formTimeFrom, setFormTimeFrom] = useState<string>('');
  const [formTimeTo, setFormTimeTo] = useState<string>('');
  const [formSeatTypes, setFormSeatTypes] = useState<string[]>([]);
  const [formAudience, setFormAudience] = useState<'all' | 'adult' | 'student' | 'child' | 'senior' | 'member'>('all');

  // ─── States Delete Modal ────────────────────────────────────────────────────
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deletingRule, setDeletingRule] = useState<PricingRuleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchPricingRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const [rulesRes, summaryRes] = await Promise.all([
        PricingAPI.getRules({
          category: selectedCategory,
          isActive: activeFilter,
          search: searchQuery,
        }),
        PricingAPI.getSummary(),
      ]);

      if (rulesRes && rulesRes.success) {
        setRules(rulesRes.rules || []);
      }
      if (summaryRes && summaryRes.success) {
        setSummary(summaryRes.summary);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách quy tắc giá vé:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, activeFilter, searchQuery]);

  useEffect(() => {
    fetchPricingRules();
  }, [fetchPricingRules]);

  // ─── Live Price Calculator Handler ──────────────────────────────────────────
  const handleCalculatePreview = useCallback(async () => {
    try {
      setIsCalculating(true);
      const res = await PricingAPI.calculatePreview({
        basePrice: 90000,
        format: calcFormat,
        dayOfWeek: calcDay,
        time: calcTime,
        seatType: calcSeatType,
        targetAudience: calcAudience,
      });
      if (res && res.success) {
        setCalcPreview(res.preview);
      }
    } catch (err) {
      console.error('Lỗi khi tính toán giá thử nghiệm:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [calcFormat, calcDay, calcTime, calcSeatType, calcAudience]);

  useEffect(() => {
    if (showCalculator) {
      handleCalculatePreview();
    }
  }, [showCalculator, handleCalculatePreview]);

  // ─── Fast Toggle Active Status ──────────────────────────────────────────────
  const handleToggleRule = async (rule: PricingRuleItem) => {
    if (!isManageMode) return;
    try {
      const res = await PricingAPI.toggleRule(rule.id);
      if (res && res.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, isActive: res.rule.isActive } : r))
        );
        fetchPricingRules();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể thay đổi trạng thái quy tắc');
    }
  };

  // ─── Open Create Modal ──────────────────────────────────────────────────────
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormCode(`RULE_${Date.now().toString().slice(-6)}`);
    setFormName('');
    setFormCategory('format');
    setFormAdjType('fixed_surcharge');
    setFormAdjValue('20000');
    setFormDescription('');
    setFormPriority('10');
    setFormIsActive(true);
    setFormFormats(['2D']);
    setFormDays([]);
    setFormTimeFrom('');
    setFormTimeTo('');
    setFormSeatTypes([]);
    setFormAudience('all');
    setFormError(null);
    setFormModalVisible(true);
  };

  // ─── Open Edit Modal ────────────────────────────────────────────────────────
  const handleOpenEditModal = (rule: PricingRuleItem) => {
    setIsEditing(true);
    setEditingId(rule.id);
    setFormCode(rule.code);
    setFormName(rule.name);
    setFormCategory(rule.category);
    setFormAdjType(rule.adjustmentType);
    setFormAdjValue(String(Math.abs(rule.adjustmentValue)));
    setFormDescription(rule.description || '');
    setFormPriority(String(rule.priority || 10));
    setFormIsActive(rule.isActive);
    setFormFormats(rule.applicableFormats || []);
    setFormDays(rule.applicableDays || []);
    setFormTimeFrom(rule.applicableTimeFrom || '');
    setFormTimeTo(rule.applicableTimeTo || '');
    setFormSeatTypes(rule.applicableSeatTypes || []);
    setFormAudience(rule.targetAudience || 'all');
    setFormError(null);
    setFormModalVisible(true);
  };

  // ─── Save / Submit Form ─────────────────────────────────────────────────────
  const handleSaveRule = async () => {
    if (!formName.trim()) {
      setFormError('Vui lòng nhập tên quy tắc giá vé');
      return;
    }

    const valNum = parseFloat(formAdjValue);
    if (isNaN(valNum) || valNum <= 0) {
      setFormError('Giá trị điều chỉnh phải là một số dương hợp lệ');
      return;
    }

    let finalVal = valNum;
    if (formAdjType === 'fixed_discount' || formAdjType === 'percentage_discount') {
      finalVal = -Math.abs(valNum);
    }

    const payload: PricingRuleFormData = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory,
      adjustmentType: formAdjType,
      adjustmentValue: finalVal,
      description: formDescription.trim(),
      priority: parseInt(formPriority, 10) || 10,
      isActive: formIsActive,
      applicableFormats: formFormats,
      applicableDays: formDays,
      applicableTimeFrom: formTimeFrom.trim(),
      applicableTimeTo: formTimeTo.trim(),
      applicableSeatTypes: formSeatTypes,
      targetAudience: formAudience,
    };

    try {
      setFormSubmitting(true);
      setFormError(null);

      if (isEditing && editingId) {
        await PricingAPI.updateRule(editingId, payload);
      } else {
        await PricingAPI.createRule(payload);
      }

      setFormModalVisible(false);
      fetchPricingRules();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu quy tắc giá vé');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Open Delete Confirm ────────────────────────────────────────────────────
  const handleOpenDelete = (rule: PricingRuleItem) => {
    setDeletingRule(rule);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRule) return;
    try {
      setIsDeleting(true);
      await PricingAPI.deleteRule(deletingRule.id);
      setDeleteModalVisible(false);
      setDeletingRule(null);
      fetchPricingRules();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể xóa quy tắc');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Reset Defaults ─────────────────────────────────────────────────────────
  const handleResetDefaults = () => {
    Alert.alert(
      'Khôi phục quy tắc niêm yết',
      'Bạn có chắc chắn muốn khôi phục lại 12 quy tắc giá vé tiêu chuẩn của hệ thống rạp?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await PricingAPI.resetDefaults();
              fetchPricingRules();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể khôi phục');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // ─── Helper màu sắc & nhãn của Category ─────────────────────────────────────
  const getCategoryMeta = (cat: PricingCategory) => {
    switch (cat) {
      case 'format':
        return { label: 'ĐỊNH DẠNG', color: '#3B82F6', icon: 'film' };
      case 'seat_type':
        return { label: 'LOẠI GHẾ', color: '#F59E0B', icon: 'grid' };
      case 'day_of_week':
        return { label: 'NGÀY CHIẾU', color: '#EC4899', icon: 'calendar' };
      case 'time_slot':
        return { label: 'KHUNG GIỜ', color: '#8B5CF6', icon: 'time' };
      case 'audience':
        return { label: 'ĐỐI TƯỢNG', color: '#10B981', icon: 'people' };
      default:
        return { label: 'QUY TẮC', color: '#9CA3AF', icon: 'pricetag' };
    }
  };

  const getAdjustmentBadgeStyle = (type: AdjustmentType) => {
    switch (type) {
      case 'fixed_surcharge':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.35)' };
      case 'fixed_discount':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.35)' };
      case 'percentage_surcharge':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.35)' };
      case 'percentage_discount':
        return { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899', border: 'rgba(236, 72, 153, 0.35)' };
      case 'fixed_price':
        return { bg: 'rgba(139, 92, 246, 0.18)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.4)' };
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. BẢNG THỐNG KÊ TỔNG QUAN (SUMMARY CARDS) ─── */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="pricetags" size={16} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.summaryValue}>{summary?.total || rules.length}</Text>
            <Text style={styles.summaryLabel}>Tổng quy tắc</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              {summary?.active ?? rules.filter((r) => r.isActive).length}
            </Text>
            <Text style={styles.summaryLabel}>Đang áp dụng</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="film" size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.summaryValue}>
              {(summary?.byCategory?.format || 0) + (summary?.byCategory?.seat_type || 0)}
            </Text>
            <Text style={styles.summaryLabel}>Định dạng & Ghế</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
            <Ionicons name="gift" size={16} color="#EC4899" />
          </View>
          <View>
            <Text style={styles.summaryValue}>
              {(summary?.byCategory?.audience || 0) + (summary?.byCategory?.day_of_week || 0)}
            </Text>
            <Text style={styles.summaryLabel}>Ưu đãi & Giảm giá</Text>
          </View>
        </View>
      </View>

      {/* ─── 2. THANH CÔNG CỤ & TÌM KIẾM ─── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, mã quy tắc hoặc mô tả..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút bật/tắt máy tính thử giá */}
        <TouchableOpacity
          style={[styles.calcToggleBtn, showCalculator && styles.calcToggleBtnActive]}
          onPress={() => setShowCalculator((prev) => !prev)}
          activeOpacity={0.8}>
          <Ionicons
            name="calculator"
            size={16}
            color={showCalculator ? '#FFFFFF' : '#F59E0B'}
          />
          <Text style={[styles.calcToggleText, showCalculator && { color: '#FFFFFF' }]}>
            {showCalculator ? 'Ẩn tính giá' : 'Thử tính giá'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── 3. BỘ LỌC DANH MỤC (CATEGORY TABS) ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}>
        {CATEGORY_TABS.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(cat.key)}
              activeOpacity={0.75}>
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : '#9CA3AF'}
              />
              <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── 4. MÁY TÍNH XEM TRƯỚC GIÁ VÉ THEO QUY TẮC (LIVE CALCULATOR) ─── */}
      {showCalculator && (
        <View style={styles.calcCard}>
          <View style={styles.calcHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calculator" size={16} color="#F59E0B" />
              <Text style={styles.calcTitle}>Mô Phỏng Tính Giá Vé Tự Động Theo Quy Tắc</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCalculator(false)}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Chọn điều kiện thử nghiệm */}
          <View style={styles.calcInputsRow}>
            {/* Định dạng */}
            <View style={styles.calcInputCol}>
              <Text style={styles.calcColLabel}>Định dạng</Text>
              <View style={styles.calcChips}>
                {['2D', '3D', 'IMAX'].map((fmt) => (
                  <TouchableOpacity
                    key={fmt}
                    style={[styles.calcChip, calcFormat === fmt && styles.calcChipActive]}
                    onPress={() => setCalcFormat(fmt)}>
                    <Text style={[styles.calcChipText, calcFormat === fmt && styles.calcChipTextActive]}>
                      {fmt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ngày chiếu */}
            <View style={styles.calcInputCol}>
              <Text style={styles.calcColLabel}>Ngày chiếu</Text>
              <View style={styles.calcChips}>
                {[
                  { d: 1, l: 'T2 (Thường)' },
                  { d: 3, l: 'T4 (Happy)' },
                  { d: 6, l: 'T7 (Cuối tuần)' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.d}
                    style={[styles.calcChip, calcDay === item.d && styles.calcChipActive]}
                    onPress={() => setCalcDay(item.d)}>
                    <Text style={[styles.calcChipText, calcDay === item.d && styles.calcChipTextActive]}>
                      {item.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.calcInputsRow}>
            {/* Khung giờ */}
            <View style={styles.calcInputCol}>
              <Text style={styles.calcColLabel}>Khung giờ</Text>
              <View style={styles.calcChips}>
                {[
                  { t: '10:00', l: '10h (Sớm)' },
                  { t: '15:00', l: '15h (Chiều)' },
                  { t: '19:30', l: '19h30 (Vàng)' },
                  { t: '22:30', l: '22h30 (Khuya)' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.t}
                    style={[styles.calcChip, calcTime === item.t && styles.calcChipActive]}
                    onPress={() => setCalcTime(item.t)}>
                    <Text style={[styles.calcChipText, calcTime === item.t && styles.calcChipTextActive]}>
                      {item.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Loại ghế */}
            <View style={styles.calcInputCol}>
              <Text style={styles.calcColLabel}>Loại ghế</Text>
              <View style={styles.calcChips}>
                {[
                  { k: 'standard', l: 'Thường' },
                  { k: 'vip', l: 'VIP' },
                  { k: 'couple', l: 'Đôi' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.k}
                    style={[styles.calcChip, calcSeatType === item.k && styles.calcChipActive]}
                    onPress={() => setCalcSeatType(item.k)}>
                    <Text style={[styles.calcChipText, calcSeatType === item.k && styles.calcChipTextActive]}>
                      {item.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Đối tượng */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.calcColLabel}>Đối tượng khán giả</Text>
            <View style={styles.calcChips}>
              {[
                { k: 'adult', l: 'Người lớn' },
                { k: 'student', l: 'HSSV (U22)' },
                { k: 'child', l: 'Trẻ em / Cao tuổi' },
                { k: 'member', l: 'CineMax VIP' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.k}
                  style={[styles.calcChip, calcAudience === item.k && styles.calcChipActive]}
                  onPress={() => setCalcAudience(item.k)}>
                  <Text style={[styles.calcChipText, calcAudience === item.k && styles.calcChipTextActive]}>
                    {item.l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Kết quả tính toán */}
          <View style={styles.calcResultBox}>
            <View style={styles.calcResultTop}>
              <Text style={styles.calcResultLabel}>Giá vé tính toán:</Text>
              <Text style={styles.calcResultPrice}>
                {calcPreview?.calculatedPriceFormatted || '90.000đ'}
              </Text>
            </View>
            {calcPreview?.appliedRules && calcPreview.appliedRules.length > 0 ? (
              <View style={styles.calcAppliedList}>
                <Text style={styles.calcAppliedHeader}>Quy tắc được áp dụng tự động:</Text>
                {calcPreview.appliedRules.map((r, rIdx) => (
                  <View key={rIdx} style={styles.calcAppliedItem}>
                    <Text style={styles.calcAppliedName}>• {r.name}</Text>
                    <Text style={styles.calcAppliedImpact}>{r.impact}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.calcBaseHint}>* Áp dụng theo giá vé gốc tiêu chuẩn (90.000đ)</Text>
            )}
          </View>
        </View>
      )}

      {/* ─── 5. NÚT TÁC VỤ QUẢN TRỊ (ADMIN ACTION BAR) ─── */}
      {isManageMode && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}>
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Thêm quy tắc mới</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetDefaults}
            activeOpacity={0.8}>
            <Ionicons name="refresh" size={15} color="#9CA3AF" />
            <Text style={styles.resetBtnText}>Khôi phục chuẩn</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── 6. DANH SÁCH QUY TẮC GIÁ VÉ (RULE CARDS) ─── */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Đang tải danh sách quy tắc giá vé...</Text>
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="pricetags-outline" size={48} color="#4B5563" />
          <Text style={styles.emptyTitle}>Không tìm thấy quy tắc giá vé</Text>
          <Text style={styles.emptySub}>
            Thử thay đổi bộ lọc danh mục hoặc nhấn &quot;Khôi phục chuẩn&quot; để thiết lập lại các quy tắc niêm yết của rạp.
          </Text>
          {isManageMode && (
            <TouchableOpacity style={styles.emptyResetBtn} onPress={handleResetDefaults}>
              <Text style={styles.emptyResetText}>Khôi phục 12 quy tắc chuẩn</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.ruleList}>
          {rules.map((rule) => {
            const meta = getCategoryMeta(rule.category);
            const badgeStyle = getAdjustmentBadgeStyle(rule.adjustmentType);

            return (
              <View
                key={rule.id}
                style={[
                  styles.ruleCard,
                  !rule.isActive && styles.ruleCardInactive,
                ]}>
                {/* Header thẻ quy tắc */}
                <View style={styles.ruleCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.categoryBadge, { backgroundColor: `${meta.color}20` }]}>
                      <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[styles.categoryBadgeText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>
                    <Text style={styles.priorityText}>Ưu tiên #{rule.priority}</Text>
                  </View>

                  {/* Switch Toggle nhanh trạng thái */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: rule.isActive ? '#10B981' : '#6B7280' },
                      ]}>
                      {rule.isActive ? 'Đang bật' : 'Tắt'}
                    </Text>
                    {isManageMode ? (
                      <Switch
                        value={rule.isActive}
                        onValueChange={() => handleToggleRule(rule)}
                        trackColor={{ false: '#374151', true: '#059669' }}
                        thumbColor={rule.isActive ? '#10B981' : '#9CA3AF'}
                      />
                    ) : null}
                  </View>
                </View>

                {/* Tiêu đề & Mã code */}
                <View style={styles.ruleTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, !rule.isActive && { color: '#9CA3AF' }]}>
                      {rule.name}
                    </Text>
                    <Text style={styles.ruleCode}>{rule.code}</Text>
                  </View>

                  {/* Badge giá trị điều chỉnh nổi bật */}
                  <View
                    style={[
                      styles.adjustmentBadge,
                      {
                        backgroundColor: badgeStyle.bg,
                        borderColor: badgeStyle.border,
                      },
                    ]}>
                    <Text style={[styles.adjustmentBadgeText, { color: badgeStyle.text }]}>
                      {rule.adjustmentFormatted || `${rule.adjustmentValue}`}
                    </Text>
                  </View>
                </View>

                {/* Mô tả chi tiết */}
                {rule.description ? (
                  <Text style={styles.ruleDesc}>{rule.description}</Text>
                ) : null}

                {/* Chips điều kiện chi tiết */}
                <View style={styles.scopeChipsRow}>
                  {rule.applicableFormats && rule.applicableFormats.length > 0 && (
                    <View style={styles.scopeChip}>
                      <Ionicons name="film-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.scopeChipText}>
                        Định dạng: {rule.applicableFormats.join(', ')}
                      </Text>
                    </View>
                  )}
                  {rule.applicableDays && rule.applicableDays.length > 0 && (
                    <View style={styles.scopeChip}>
                      <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.scopeChipText}>
                        Ngày: {rule.applicableDays.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ')}
                      </Text>
                    </View>
                  )}
                  {(rule.applicableTimeFrom || rule.applicableTimeTo) && (
                    <View style={styles.scopeChip}>
                      <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.scopeChipText}>
                        Khung giờ: {rule.applicableTimeFrom || '00:00'} ~ {rule.applicableTimeTo || '23:59'}
                      </Text>
                    </View>
                  )}
                  {rule.applicableSeatTypes && rule.applicableSeatTypes.length > 0 && (
                    <View style={styles.scopeChip}>
                      <Ionicons name="grid-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.scopeChipText}>
                        Ghế: {rule.applicableSeatTypes.map((t) => (t === 'vip' ? 'VIP' : t === 'couple' ? 'Đôi' : 'Thường')).join(', ')}
                      </Text>
                    </View>
                  )}
                  {rule.targetAudience && rule.targetAudience !== 'all' && (
                    <View style={styles.scopeChip}>
                      <Ionicons name="people-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.scopeChipText}>
                        Khách: {AUDIENCE_OPTIONS.find((a) => a.key === rule.targetAudience)?.label || rule.targetAudience}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action buttons (Sửa / Xóa) */}
                {isManageMode && (
                  <View style={styles.ruleActionsRow}>
                    <TouchableOpacity
                      style={styles.ruleActionBtn}
                      onPress={() => handleOpenEditModal(rule)}
                      activeOpacity={0.75}>
                      <Ionicons name="pencil" size={14} color="#60A5FA" />
                      <Text style={[styles.ruleActionBtnText, { color: '#60A5FA' }]}>
                        Chỉnh sửa
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.ruleActionBtn}
                      onPress={() => handleOpenDelete(rule)}
                      activeOpacity={0.75}>
                      <Ionicons name="trash" size={14} color="#EF4444" />
                      <Text style={[styles.ruleActionBtnText, { color: '#EF4444' }]}>
                        Xóa
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ─── 7. MODAL THÊM / SỬA QUY TẮC GIÁ VÉ ─── */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name={isEditing ? 'pencil' : 'add'} size={18} color="#E50914" />
                </View>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Chỉnh Sửa Quy Tắc Giá Vé' : 'Thêm Quy Tắc Giá Vé Mới'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFormModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Tên quy tắc */}
              <View>
                <Text style={styles.formLabel}>Tên quy tắc giá vé *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Phụ thu Suất chiếu 3D, Ưu đãi HSSV..."
                  placeholderTextColor="#6B7280"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* Mã code */}
              <View>
                <Text style={styles.formLabel}>Mã định danh quy tắc (Code) *</Text>
                <TextInput
                  style={[styles.formInput, isEditing && { backgroundColor: '#1A1E29', color: '#9CA3AF' }]}
                  placeholder="RULE_CUSTOM_01"
                  placeholderTextColor="#6B7280"
                  value={formCode}
                  onChangeText={setFormCode}
                  editable={!isEditing}
                  autoCapitalize="characters"
                />
              </View>

              {/* Danh mục (Category) */}
              <View>
                <Text style={styles.formLabel}>Danh mục quy tắc</Text>
                <View style={styles.formPillsRow}>
                  {CATEGORY_TABS.filter((c) => c.key !== 'all').map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.formPill, formCategory === c.key && styles.formPillActive]}
                      onPress={() => setFormCategory(c.key as PricingCategory)}>
                      <Ionicons
                        name={c.icon as any}
                        size={13}
                        color={formCategory === c.key ? '#FFFFFF' : '#9CA3AF'}
                      />
                      <Text style={[styles.formPillText, formCategory === c.key && styles.formPillTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Loại điều chỉnh giá */}
              <View>
                <Text style={styles.formLabel}>Hình thức điều chỉnh giá vé</Text>
                {ADJUSTMENT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.formRadioRow, formAdjType === opt.key && styles.formRadioRowActive]}
                    onPress={() => setFormAdjType(opt.key)}>
                    <Ionicons
                      name={formAdjType === opt.key ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={formAdjType === opt.key ? '#E50914' : '#6B7280'}
                    />
                    <Text style={[styles.formRadioText, formAdjType === opt.key && styles.formRadioTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Giá trị điều chỉnh */}
              <View>
                <Text style={styles.formLabel}>
                  Giá trị điều chỉnh ({formAdjType.includes('percentage') ? '%' : 'VNĐ'}) *
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={formAdjType.includes('percentage') ? 'Ví dụ: 10, 15, 20...' : 'Ví dụ: 20000, 30000, 65000...'}
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={formAdjValue}
                  onChangeText={setFormAdjValue}
                />
              </View>

              {/* Điều kiện Định dạng */}
              {formCategory === 'format' && (
                <View>
                  <Text style={styles.formLabel}>Định dạng phim áp dụng</Text>
                  <View style={styles.formPillsRow}>
                    {['2D', '3D', 'IMAX'].map((fmt) => {
                      const isSelected = formFormats.includes(fmt);
                      return (
                        <TouchableOpacity
                          key={fmt}
                          style={[styles.formPill, isSelected && styles.formPillActive]}
                          onPress={() => {
                            if (isSelected) {
                              setFormFormats((prev) => prev.filter((f) => f !== fmt));
                            } else {
                              setFormFormats((prev) => [...prev, fmt]);
                            }
                          }}>
                          <Text style={[styles.formPillText, isSelected && styles.formPillTextActive]}>
                            {fmt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Điều kiện Ngày trong tuần */}
              {formCategory === 'day_of_week' && (
                <View>
                  <Text style={styles.formLabel}>Ngày chiếu trong tuần</Text>
                  <View style={styles.formPillsRow}>
                    {DAYS_OF_WEEK.map((item) => {
                      const isSelected = formDays.includes(item.val);
                      return (
                        <TouchableOpacity
                          key={item.val}
                          style={[styles.formPill, isSelected && styles.formPillActive]}
                          onPress={() => {
                            if (isSelected) {
                              setFormDays((prev) => prev.filter((d) => d !== item.val));
                            } else {
                              setFormDays((prev) => [...prev, item.val]);
                            }
                          }}>
                          <Text style={[styles.formPillText, isSelected && styles.formPillTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Điều kiện Khung giờ */}
              {formCategory === 'time_slot' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Từ giờ (HH:MM)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="18:00"
                      placeholderTextColor="#6B7280"
                      value={formTimeFrom}
                      onChangeText={setFormTimeFrom}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Đến giờ (HH:MM)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="22:00"
                      placeholderTextColor="#6B7280"
                      value={formTimeTo}
                      onChangeText={setFormTimeTo}
                    />
                  </View>
                </View>
              )}

              {/* Điều kiện Loại ghế */}
              {formCategory === 'seat_type' && (
                <View>
                  <Text style={styles.formLabel}>Loại ghế áp dụng</Text>
                  <View style={styles.formPillsRow}>
                    {[
                      { k: 'standard', l: 'Ghế Thường' },
                      { k: 'vip', l: 'Ghế VIP' },
                      { k: 'couple', l: 'Ghế Đôi Sweetbox' },
                    ].map((st) => {
                      const isSelected = formSeatTypes.includes(st.k);
                      return (
                        <TouchableOpacity
                          key={st.k}
                          style={[styles.formPill, isSelected && styles.formPillActive]}
                          onPress={() => {
                            if (isSelected) {
                              setFormSeatTypes((prev) => prev.filter((t) => t !== st.k));
                            } else {
                              setFormSeatTypes((prev) => [...prev, st.k]);
                            }
                          }}>
                          <Text style={[styles.formPillText, isSelected && styles.formPillTextActive]}>
                            {st.l}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Điều kiện Khách hàng */}
              {formCategory === 'audience' && (
                <View>
                  <Text style={styles.formLabel}>Đối tượng khách hàng</Text>
                  <View style={styles.formPillsRow}>
                    {AUDIENCE_OPTIONS.map((aud) => (
                      <TouchableOpacity
                        key={aud.key}
                        style={[styles.formPill, formAudience === aud.key && styles.formPillActive]}
                        onPress={() => setFormAudience(aud.key)}>
                        <Text style={[styles.formPillText, formAudience === aud.key && styles.formPillTextActive]}>
                          {aud.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Mô tả */}
              <View>
                <Text style={styles.formLabel}>Mô tả chi tiết quy tắc</Text>
                <TextInput
                  style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Mô tả chính sách áp dụng cho nhân viên và khách hàng..."
                  placeholderTextColor="#6B7280"
                  multiline
                  value={formDescription}
                  onChangeText={setFormDescription}
                />
              </View>

              {/* Độ ưu tiên & Công tắc bật tắt */}
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Độ ưu tiên (Số nhỏ ưu tiên trước)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="10"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formPriority}
                    onChangeText={setFormPriority}
                  />
                </View>

                <View style={{ alignItems: 'center', marginTop: 14 }}>
                  <Text style={styles.formLabel}>Kích hoạt ngay</Text>
                  <Switch
                    value={formIsActive}
                    onValueChange={setFormIsActive}
                    trackColor={{ false: '#374151', true: '#059669' }}
                    thumbColor={formIsActive ? '#10B981' : '#9CA3AF'}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFormModalVisible(false)}
                disabled={formSubmitting}>
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveRule}
                disabled={formSubmitting}>
                {formSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitText}>
                      {isEditing ? 'Lưu thay đổi' : 'Tạo quy tắc'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 8. MODAL XÁC NHẬN XÓA QUY TẮC ─── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Xác Nhận Xóa Quy Tắc Giá Vé</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.deleteConfirmDesc}>
              Bạn có chắc chắn muốn xóa quy tắc giá vé sau khỏi hệ thống cơ sở dữ liệu MongoDB Atlas?
            </Text>

            {deletingRule && (
              <View style={styles.deleteSummaryCard}>
                <Text style={styles.deleteSummaryTitle}>{deletingRule.name}</Text>
                <Text style={styles.deleteSummaryMeta}>
                  Mã: {deletingRule.code} • Điều chỉnh: {deletingRule.adjustmentFormatted}
                </Text>
                {deletingRule.description ? (
                  <Text style={[styles.deleteSummaryMeta, { color: '#9CA3AF', marginTop: 4 }]}>
                    {deletingRule.description}
                  </Text>
                ) : null}
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}>
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitText}>Xác nhận xóa</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#262D40',
  },
  summaryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  // Search & Calculator Toggle
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#262D40',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  calcToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
  },
  calcToggleBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  calcToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  // Category Scroll
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#151821',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262D40',
  },
  categoryTabActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  categoryTabText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Live Calculator Card
  calcCard: {
    backgroundColor: '#131722',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  calcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#262D40',
    paddingBottom: 8,
  },
  calcTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  calcInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  calcInputCol: {
    flex: 1,
  },
  calcColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  calcChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  calcChip: {
    backgroundColor: '#1C2230',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2C3549',
  },
  calcChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  calcChipText: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  calcChipTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  calcResultBox: {
    backgroundColor: '#0B0D13',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#262D40',
    marginTop: 4,
  },
  calcResultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcResultLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calcResultPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  calcAppliedList: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1F2433',
    gap: 3,
  },
  calcAppliedHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  calcAppliedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcAppliedName: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  calcAppliedImpact: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '700',
  },
  calcBaseHint: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 4,
  },
  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingVertical: 10,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2D3748',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Loading & Empty
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#151821',
    borderRadius: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#262D40',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  emptyResetBtn: {
    marginTop: 14,
    backgroundColor: '#E50914',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyResetText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  // Rule List & Cards
  ruleList: {
    gap: 10,
  },
  ruleCard: {
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#262D40',
    gap: 8,
  },
  ruleCardInactive: {
    opacity: 0.65,
    borderColor: '#1F2433',
  },
  ruleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priorityText: {
    fontSize: 10.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  ruleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  ruleTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ruleCode: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  adjustmentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  adjustmentBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  ruleDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16.5,
  },
  scopeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F121C',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#22293A',
  },
  scopeChipText: {
    fontSize: 10.5,
    color: '#D1D5DB',
  },
  ruleActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2433',
    marginTop: 2,
  },
  ruleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2330',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ruleActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  // Modal Base
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#151821',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3042',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  formLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D1D5DB',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#0F121C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262D40',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
  },
  formPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F121C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#262D40',
  },
  formPillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  formPillText: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  formPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F121C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#262D40',
    marginBottom: 5,
  },
  formRadioRowActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  formRadioText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  formRadioTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1E2330',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: '#E50914',
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Delete confirm
  deleteConfirmDesc: {
    fontSize: 12.5,
    color: '#D1D5DB',
    lineHeight: 18,
    marginBottom: 10,
  },
  deleteSummaryCard: {
    backgroundColor: '#0F121C',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#262D40',
    marginBottom: 12,
  },
  deleteSummaryTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteSummaryMeta: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
  },
});

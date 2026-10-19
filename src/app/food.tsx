import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  FoodItem,
  FoodCategory,
  FoodCategoryFilter,
  FoodFormData,
  FoodFormErrors,
  FoodSortOption,
} from '@/types/food';
import {
  getAllFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  toggleFoodAvailability,
  resetDefaultFoodItems,
} from '@/services/food-service';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  formatVND,
  validateFoodForm,
  PRESET_FOOD_IMAGES,
} from '@/utils/food-helpers';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const EMPTY_FORM: FoodFormData = {
  name: '',
  category: 'popcorn',
  price: '',
  originalPrice: '',
  description: '',
  imageUrl: '',
  size: 'Tiêu chuẩn',
  calories: '',
  stockQuantity: '100',
  isAvailable: true,
  isBestSeller: false,
  preparationTime: '2 - 3 phút',
};

export default function FoodManagementScreen() {
  // Main Data States
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // View Mode: 'admin' (Quản lý) or 'customer' (Khách hàng xem)
  const [viewMode, setViewMode] = useState<'admin' | 'customer'>('admin');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategoryFilter>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [onlyBestSeller, setOnlyBestSeller] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<FoodSortOption>('default');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Form Modal States (Add & Edit)
  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [formData, setFormData] = useState<FoodFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FoodFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Detail Modal States
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  // Delete Confirm Modal States
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<FoodItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Reset Default Modal States
  const [resetModalVisible, setResetModalVisible] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Feedback Notification Toast/Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAllFoodItems()
      .then((items) => {
        if (isMounted) {
          setFoodItems(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load items:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const items = await getAllFoodItems();
      setFoodItems(items);
    } catch (err) {
      console.error('Failed to refresh items:', err);
      showToast('Không thể làm mới danh sách', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = foodItems.length;
    const available = foodItems.filter((i) => i.isAvailable).length;
    const outOfStock = total - available;
    const combos = foodItems.filter((i) => i.category === 'combo').length;
    return { total, available, outOfStock, combos };
  }, [foodItems]);

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    let result = [...foodItems];

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          CATEGORY_LABELS[item.category].toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Availability toggle
    if (onlyAvailable) {
      result = result.filter((item) => item.isAvailable);
    }

    // Best seller toggle
    if (onlyBestSeller) {
      result = result.filter((item) => item.isBestSeller);
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'best-seller':
        result.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
      case 'default':
      default:
        // Keep initial or creation order
        break;
    }

    return result;
  }, [foodItems, searchQuery, selectedCategory, onlyAvailable, onlyBestSeller, sortBy]);

  // Open Form to Add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormModalVisible(true);
  };

  // Open Form to Edit
  const handleOpenEdit = (item: FoodItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
      description: item.description,
      imageUrl: item.imageUrl,
      size: item.size || 'Tiêu chuẩn',
      calories: item.calories ? item.calories.toString() : '',
      stockQuantity: item.stockQuantity !== undefined ? item.stockQuantity.toString() : '100',
      isAvailable: item.isAvailable,
      isBestSeller: !!item.isBestSeller,
      preparationTime: item.preparationTime || '2 - 3 phút',
    });
    setFormErrors({});
    setFormModalVisible(true);
  };

  // Handle Form Submit (Add or Edit)
  const handleSaveForm = async () => {
    const validation = validateFoodForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast('Vui lòng kiểm tra lại các trường thông tin lỗi', 'error');
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const priceNum = Number(formData.price.replace(/[^\d]/g, ''));
      const origPriceNum = formData.originalPrice.trim()
        ? Number(formData.originalPrice.replace(/[^\d]/g, ''))
        : undefined;
      const stockNum = formData.stockQuantity.trim() ? Number(formData.stockQuantity) : 0;
      const calNum = formData.calories.trim() ? Number(formData.calories) : undefined;

      if (editingItem) {
        // Update existing item
        const updated = await updateFoodItem(editingItem.id, {
          name: formData.name.trim(),
          category: formData.category,
          price: priceNum,
          originalPrice: origPriceNum,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          size: formData.size.trim() || 'Tiêu chuẩn',
          calories: calNum,
          stockQuantity: stockNum,
          isAvailable: formData.isAvailable,
          isBestSeller: formData.isBestSeller,
          preparationTime: formData.preparationTime.trim() || '2 - 3 phút',
        });

        setFoodItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        if (selectedItem?.id === updated.id) {
          setSelectedItem(updated);
        }
        showToast(`Đã cập nhật món "${updated.name}" thành công!`);
      } else {
        // Create new item
        const created = await createFoodItem({
          name: formData.name.trim(),
          category: formData.category,
          price: priceNum,
          originalPrice: origPriceNum,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          size: formData.size.trim() || 'Tiêu chuẩn',
          calories: calNum,
          stockQuantity: stockNum,
          isAvailable: formData.isAvailable,
          isBestSeller: formData.isBestSeller,
          preparationTime: formData.preparationTime.trim() || '2 - 3 phút',
        });

        setFoodItems((prev) => [created, ...prev]);
        showToast(`Đã thêm món "${created.name}" vào thực đơn!`);
      }

      setFormModalVisible(false);
      setEditingItem(null);
      setFormData(EMPTY_FORM);
    } catch (err) {
      console.error('Error saving food item:', err);
      showToast('Có lỗi xảy ra khi lưu món ăn. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Detail View
  const handleOpenDetail = (item: FoodItem) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  // Open Delete Confirmation
  const handleConfirmDelete = (item: FoodItem) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  // Execute Delete
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const success = await deleteFoodItem(itemToDelete.id);
      if (success) {
        setFoodItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
        if (selectedItem?.id === itemToDelete.id) {
          setDetailModalVisible(false);
          setSelectedItem(null);
        }
        showToast(`Đã xóa món "${itemToDelete.name}" thành công!`);
      } else {
        showToast('Không tìm thấy món cần xóa', 'error');
      }
    } catch (err) {
      console.error('Error deleting food item:', err);
      showToast('Xóa món thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  // Quick Toggle Stock / In-Store Availability
  const handleToggleAvailability = async (item: FoodItem) => {
    try {
      const updated = await toggleFoodAvailability(item.id);
      setFoodItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (selectedItem?.id === updated.id) {
        setSelectedItem(updated);
      }
      showToast(
        updated.isAvailable
          ? `Món "${updated.name}" hiện ĐANG KINH DOANH.`
          : `Món "${updated.name}" đã chuyển sang TẠM HẾT HÀNG.`
      );
    } catch (err) {
      console.error('Error toggling availability:', err);
      showToast('Không thể cập nhật trạng thái kho', 'error');
    }
  };

  // Reset to Default Menu
  const handleResetDefaults = async () => {
    setIsResetting(true);
    try {
      const defaults = await resetDefaultFoodItems();
      setFoodItems(defaults);
      showToast('Đã khôi phục thực đơn bắp nước CineMax mặc định!');
      setResetModalVisible(false);
    } catch (err) {
      console.error('Error resetting defaults:', err);
      showToast('Khôi phục thất bại', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Helper for preset image selection
  const handleSelectPresetImage = (url: string, cat: FoodCategory) => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: url,
      category: prev.name === '' ? cat : prev.category,
    }));
    setFormErrors((prev) => ({ ...prev, imageUrl: undefined }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Đang tải danh mục Bắp & Nước CineMax...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Toast Notification */}
      {toastMessage && (
        <View
          style={[
            styles.toastContainer,
            toastMessage.type === 'error' ? styles.toastError : styles.toastSuccess,
          ]}>
          <Ionicons
            name={toastMessage.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toastMessage.text}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" />
        }>
        {/* Main Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.ucBadge}>
                <Ionicons name="fast-food" size={14} color="#E50914" />
                <Text style={styles.ucBadgeText}>UC37 • FOOD MANAGEMENT</Text>
              </View>
              <Text style={styles.screenTitle}>Bắp & Nước CineMax</Text>
              <Text style={styles.screenSubtitle}>
                Hệ thống quản lý thực đơn, giá bán, kho hàng và combo rạp chiếu
              </Text>
            </View>

            {/* Back to Home or Navigate */}
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.8}>
              <Ionicons name="home-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher: Admin (Quản trị CRUD) vs Customer (Menu thực đơn) */}
          <View style={styles.modeSwitcherContainer}>
            <TouchableOpacity
              style={[styles.modeTab, viewMode === 'admin' && styles.modeTabActive]}
              onPress={() => setViewMode('admin')}
              activeOpacity={0.85}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={viewMode === 'admin' ? '#FFFFFF' : '#9CA3AF'}
              />
              <Text style={[styles.modeTabText, viewMode === 'admin' && styles.modeTabTextActive]}>
                Chế độ Quản Lý (CRUD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, viewMode === 'customer' && styles.modeTabActive]}
              onPress={() => setViewMode('customer')}
              activeOpacity={0.85}>
              <Ionicons
                name="eye-outline"
                size={16}
                color={viewMode === 'customer' ? '#FFFFFF' : '#9CA3AF'}
              />
              <Text
                style={[styles.modeTabText, viewMode === 'customer' && styles.modeTabTextActive]}>
                Menu Khách Hàng (Preview)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Summary Dashboard Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]}>
                <Ionicons name="restaurant" size={20} color="#E50914" />
              </View>
              <Text style={styles.metricValue}>{metrics.total}</Text>
              <Text style={styles.metricLabel}>Tổng Số Món</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>{metrics.available}</Text>
              <Text style={styles.metricLabel}>Đang Bán</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="pause-circle" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>{metrics.outOfStock}</Text>
              <Text style={styles.metricLabel}>Tạm Hết Hàng</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="flame" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{metrics.combos}</Text>
              <Text style={styles.metricLabel}>Combo Rạp</Text>
            </View>
          </View>

          {/* Quick Action Buttons (Admin view) */}
          {viewMode === 'admin' && (
            <View style={styles.adminActionRow}>
              <TouchableOpacity
                style={styles.primaryAddBtn}
                onPress={handleOpenAdd}
                activeOpacity={0.85}>
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text style={styles.primaryAddBtnText}>Thêm Món Mới</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryResetBtn}
                onPress={() => setResetModalVisible(true)}
                activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color="#9CA3AF" />
                <Text style={styles.secondaryResetBtnText}>Khôi Phục Mẫu</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên bắp, nước, combo..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.filterToggleBtn, showFilterDrawer && styles.filterToggleBtnActive]}
              onPress={() => setShowFilterDrawer(!showFilterDrawer)}>
              <Ionicons
                name="options-outline"
                size={18}
                color={showFilterDrawer ? '#E50914' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>

          {/* Horizontal Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsList}>
            {(['all', 'combo', 'popcorn', 'drink', 'snack'] as FoodCategoryFilter[]).map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'all'
                  ? foodItems.length
                  : foodItems.filter((i) => i.category === cat).length;

              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}>
                  {cat !== 'all' && (
                    <Ionicons
                      name={CATEGORY_ICONS[cat as FoodCategory] as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}>
                    {cat === 'all' ? 'Tất cả' : CATEGORY_LABELS[cat as FoodCategory]}
                  </Text>
                  <View
                    style={[
                      styles.categoryPillCount,
                      isSelected && styles.categoryPillCountActive,
                    ]}>
                    <Text
                      style={[
                        styles.categoryPillCountText,
                        isSelected && styles.categoryPillCountTextActive,
                      ]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Filter Drawer: Extra filters & sorting */}
          {showFilterDrawer && (
            <View style={styles.filterDrawer}>
              <View style={styles.filterDrawerRow}>
                <Text style={styles.filterDrawerLabel}>Bộ lọc nâng cao:</Text>
                <TouchableOpacity
                  onPress={() => {
                    setOnlyAvailable(false);
                    setOnlyBestSeller(false);
                    setSortBy('default');
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}>
                  <Text style={styles.filterResetLink}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterTagsRow}>
                <TouchableOpacity
                  style={[styles.filterTag, onlyAvailable && styles.filterTagActive]}
                  onPress={() => setOnlyAvailable(!onlyAvailable)}>
                  <Ionicons
                    name={onlyAvailable ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={onlyAvailable ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.filterTagText, onlyAvailable && styles.filterTagTextActive]}>
                    Chỉ món còn hàng
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTag, onlyBestSeller && styles.filterTagActive]}
                  onPress={() => setOnlyBestSeller(!onlyBestSeller)}>
                  <Ionicons
                    name={onlyBestSeller ? 'flame' : 'flame-outline'}
                    size={16}
                    color={onlyBestSeller ? '#F59E0B' : '#9CA3AF'}
                  />
                  <Text style={[styles.filterTagText, onlyBestSeller && styles.filterTagTextActive]}>
                    Món bán chạy (Hot)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.filterDrawerLabel, { marginTop: 12 }]}>Sắp xếp theo:</Text>
              <View style={styles.sortOptionsRow}>
                {[
                  { id: 'default', label: 'Mặc định' },
                  { id: 'price-asc', label: 'Giá tăng dần' },
                  { id: 'price-desc', label: 'Giá giảm dần' },
                  { id: 'name-asc', label: 'Tên A-Z' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sortChip, sortBy === s.id && styles.sortChipActive]}
                    onPress={() => setSortBy(s.id as FoodSortOption)}>
                    <Text
                      style={[styles.sortChipText, sortBy === s.id && styles.sortChipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Catalog List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderText}>
            Hiển thị <Text style={styles.listHeaderHighlight}>{filteredItems.length}</Text> món
          </Text>
          {viewMode === 'admin' ? (
            <Text style={styles.adminTipText}>
              💡 Chạm vào nút thao tác để Sửa, Xóa hoặc bật tắt kho
            </Text>
          ) : (
            <Text style={styles.adminTipText}>🎬 Phục vụ trực tiếp tại quầy bắp nước</Text>
          )}
        </View>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="fast-food-outline" size={64} color="#4B5563" />
            <Text style={styles.emptyTitle}>Không tìm thấy món nào</Text>
            <Text style={styles.emptySubtitle}>
              Thử tìm kiếm với từ khóa khác hoặc xóa bớt các tiêu chí lọc đang chọn
            </Text>
            {viewMode === 'admin' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenAdd}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Thêm Món Mới Ngay</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Food Items List */}
        <View style={styles.foodList}>
          {filteredItems.map((item) => {
            const catColors = CATEGORY_COLORS[item.category];
            const hasDiscount = item.originalPrice && item.originalPrice > item.price;
            const discountPercent = hasDiscount
              ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
              : 0;

            return (
              <View
                key={item.id}
                style={[styles.foodCard, !item.isAvailable && styles.foodCardDisabled]}>
                {/* Image Section */}
                <TouchableOpacity
                  style={styles.cardImageContainer}
                  onPress={() => handleOpenDetail(item)}
                  activeOpacity={0.9}>
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />

                  {/* Gradient Overlay for badges */}
                  <View style={styles.imageBadgeRow}>
                    {/* Category Badge */}
                    <View
                      style={[
                        styles.badgePill,
                        { backgroundColor: catColors.bg, borderColor: catColors.border },
                      ]}>
                      <Ionicons
                        name={CATEGORY_ICONS[item.category] as any}
                        size={11}
                        color={catColors.text}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.badgePillText, { color: catColors.text }]}>
                        {CATEGORY_LABELS[item.category]}
                      </Text>
                    </View>

                    {/* Best Seller Badge */}
                    {item.isBestSeller && (
                      <View style={styles.bestSellerBadge}>
                        <Ionicons name="flame" size={11} color="#FFFFFF" />
                        <Text style={styles.bestSellerBadgeText}>HOT</Text>
                      </View>
                    )}
                  </View>

                  {/* Out of Stock Ribbon */}
                  {!item.isAvailable && (
                    <View style={styles.outOfStockOverlay}>
                      <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.outOfStockText}>TẠM HẾT HÀNG</Text>
                    </View>
                  )}

                  {/* Discount Tag */}
                  {hasDiscount && item.isAvailable && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Info Section */}
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <TouchableOpacity
                      onPress={() => handleOpenDetail(item)}
                      style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                    {item.size && (
                      <View style={styles.sizeBadge}>
                        <Text style={styles.sizeBadgeText}>{item.size}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>

                  {/* Pricing Row */}
                  <View style={styles.cardPriceRow}>
                    <View>
                      <Text style={styles.cardPrice}>{formatVND(item.price)}</Text>
                      {hasDiscount && (
                        <Text style={styles.cardOriginalPrice}>
                          {formatVND(item.originalPrice!)}
                        </Text>
                      )}
                    </View>

                    {/* Stock Status Pill */}
                    <View
                      style={[
                        styles.stockIndicator,
                        item.isAvailable ? styles.stockInStock : styles.stockOut,
                      ]}>
                      <View
                        style={[
                          styles.stockDot,
                          { backgroundColor: item.isAvailable ? '#10B981' : '#EF4444' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.stockText,
                          { color: item.isAvailable ? '#10B981' : '#EF4444' },
                        ]}>
                        {item.isAvailable ? `Còn hàng (${item.stockQuantity})` : 'Hết hàng'}
                      </Text>
                    </View>
                  </View>

                  {/* Meta Specs */}
                  <View style={styles.cardMetaRow}>
                    {item.calories ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="speedometer-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.metaChipText}>{item.calories} kcal</Text>
                      </View>
                    ) : null}
                    {item.preparationTime ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.metaChipText}>{item.preparationTime}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* ADMIN ACTION CONTROLS */}
                  {viewMode === 'admin' ? (
                    <View style={styles.cardAdminActions}>
                      {/* Availability Quick Toggle */}
                      <TouchableOpacity
                        style={[
                          styles.actionToggleBtn,
                          item.isAvailable
                            ? styles.actionToggleBtnActive
                            : styles.actionToggleBtnInactive,
                        ]}
                        onPress={() => handleToggleAvailability(item)}
                        activeOpacity={0.8}>
                        <Ionicons
                          name={item.isAvailable ? 'pause-outline' : 'play-outline'}
                          size={15}
                          color={item.isAvailable ? '#F59E0B' : '#10B981'}
                        />
                        <Text
                          style={[
                            styles.actionToggleText,
                            { color: item.isAvailable ? '#F59E0B' : '#10B981' },
                          ]}>
                          {item.isAvailable ? 'Báo hết hàng' : 'Mở bán lại'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.actionIconGroup}>
                        {/* Detail button */}
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenDetail(item)}
                          activeOpacity={0.75}>
                          <Ionicons name="eye-outline" size={18} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Edit button */}
                        <TouchableOpacity
                          style={[styles.actionIconBtn, styles.actionIconBtnEdit]}
                          onPress={() => handleOpenEdit(item)}
                          activeOpacity={0.75}>
                          <Ionicons name="pencil" size={17} color="#3B82F6" />
                        </TouchableOpacity>

                        {/* Delete button */}
                        <TouchableOpacity
                          style={[styles.actionIconBtn, styles.actionIconBtnDelete]}
                          onPress={() => handleConfirmDelete(item)}
                          activeOpacity={0.75}>
                          <Ionicons name="trash-outline" size={17} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* CUSTOMER ORDER ACTION */
                    <View style={styles.cardCustomerActions}>
                      <TouchableOpacity
                        style={[
                          styles.customerOrderBtn,
                          !item.isAvailable && styles.customerOrderBtnDisabled,
                        ]}
                        disabled={!item.isAvailable}
                        onPress={() => {
                          showToast(`Đã chọn thêm món "${item.name}" vào đơn bắp nước!`);
                        }}
                        activeOpacity={0.85}>
                        <Ionicons
                          name="cart-outline"
                          size={18}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.customerOrderBtnText}>
                          {item.isAvailable ? 'Thêm Vào Combo' : 'Tạm Hết Món'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.customerDetailBtn}
                        onPress={() => handleOpenDetail(item)}
                        activeOpacity={0.8}>
                        <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: BottomTabInset + 40 }} />
      </ScrollView>

      {/* ======================================================= */}
      {/* MODAL 1: ADD / EDIT FOOD ITEM (UC37 CREATE & UPDATE) */}
      {/* ======================================================= */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons
                  name={editingItem ? 'create-outline' : 'add-circle-outline'}
                  size={24}
                  color="#E50914"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Chỉnh Sửa Món Ăn/Nước' : 'Thêm Món Mới Vào Menu'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFormModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled">
              {/* Category Picker */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Danh Mục Món *</Text>
                <View style={styles.formCategoryGrid}>
                  {(['popcorn', 'drink', 'combo', 'snack'] as FoodCategory[]).map((cat) => {
                    const isSelected = formData.category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.formCategoryItem,
                          isSelected && styles.formCategoryItemActive,
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                        activeOpacity={0.8}>
                        <Ionicons
                          name={CATEGORY_ICONS[cat] as any}
                          size={18}
                          color={isSelected ? '#E50914' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.formCategoryText,
                            isSelected && styles.formCategoryTextActive,
                          ]}>
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Item Name */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Tên Món Ăn / Thức Uống *</Text>
                <TextInput
                  style={[styles.formInput, formErrors.name && styles.formInputError]}
                  placeholder="Ví dụ: Bắp Rang Bơ Phô Mai Lớn 85oz"
                  placeholderTextColor="#6B7280"
                  value={formData.name}
                  onChangeText={(val) => {
                    setFormData({ ...formData, name: val });
                    setFormErrors({ ...formErrors, name: undefined });
                  }}
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>

              {/* Pricing Row: Price & Original Price */}
              <View style={styles.formTwoColRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Giá Bán (VNĐ) *</Text>
                  <TextInput
                    style={[styles.formInput, formErrors.price && styles.formInputError]}
                    placeholder="VD: 55000"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formData.price}
                    onChangeText={(val) => {
                      setFormData({ ...formData, price: val });
                      setFormErrors({ ...formErrors, price: undefined });
                    }}
                  />
                  {formErrors.price && <Text style={styles.errorText}>{formErrors.price}</Text>}
                </View>

                <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Giá Gốc (Để giảm giá)</Text>
                  <TextInput
                    style={[styles.formInput, formErrors.originalPrice && styles.formInputError]}
                    placeholder="VD: 65000"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formData.originalPrice}
                    onChangeText={(val) => {
                      setFormData({ ...formData, originalPrice: val });
                      setFormErrors({ ...formErrors, originalPrice: undefined });
                    }}
                  />
                  {formErrors.originalPrice && (
                    <Text style={styles.errorText}>{formErrors.originalPrice}</Text>
                  )}
                </View>
              </View>

              {/* Size & Stock Quantity */}
              <View style={styles.formTwoColRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Kích Cỡ / Định Lượng</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Vừa (M), Lớn (85oz)"
                    placeholderTextColor="#6B7280"
                    value={formData.size}
                    onChangeText={(val) => setFormData({ ...formData, size: val })}
                  />
                </View>

                <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Số Lượng Tồn Kho</Text>
                  <TextInput
                    style={[styles.formInput, formErrors.stockQuantity && styles.formInputError]}
                    placeholder="VD: 150"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formData.stockQuantity}
                    onChangeText={(val) => {
                      setFormData({ ...formData, stockQuantity: val });
                      setFormErrors({ ...formErrors, stockQuantity: undefined });
                    }}
                  />
                  {formErrors.stockQuantity && (
                    <Text style={styles.errorText}>{formErrors.stockQuantity}</Text>
                  )}
                </View>
              </View>

              {/* Calories & Prep Time */}
              <View style={styles.formTwoColRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Lượng Năng Lượng (kcal)</Text>
                  <TextInput
                    style={[styles.formInput, formErrors.calories && styles.formInputError]}
                    placeholder="VD: 450"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={formData.calories}
                    onChangeText={(val) => {
                      setFormData({ ...formData, calories: val });
                      setFormErrors({ ...formErrors, calories: undefined });
                    }}
                  />
                  {formErrors.calories && (
                    <Text style={styles.errorText}>{formErrors.calories}</Text>
                  )}
                </View>

                <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Thời Gian Chuẩn Bị</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 2 - 3 phút"
                    placeholderTextColor="#6B7280"
                    value={formData.preparationTime}
                    onChangeText={(val) => setFormData({ ...formData, preparationTime: val })}
                  />
                </View>
              </View>

              {/* Image URL & Quick Presets */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Đường Link Hình Ảnh (URL) *</Text>
                <TextInput
                  style={[styles.formInput, formErrors.imageUrl && styles.formInputError]}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#6B7280"
                  value={formData.imageUrl}
                  onChangeText={(val) => {
                    setFormData({ ...formData, imageUrl: val });
                    setFormErrors({ ...formErrors, imageUrl: undefined });
                  }}
                  autoCapitalize="none"
                />
                {formErrors.imageUrl && <Text style={styles.errorText}>{formErrors.imageUrl}</Text>}

                {/* Quick Presets Picker */}
                <Text style={styles.presetSectionTitle}>Hoặc chọn nhanh ảnh mẫu rạp phim chuẩn:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsList}>
                  {PRESET_FOOD_IMAGES.map((preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.presetCard,
                        formData.imageUrl === preset.url && styles.presetCardActive,
                      ]}
                      onPress={() => handleSelectPresetImage(preset.url, preset.category)}
                      activeOpacity={0.8}>
                      <Image source={{ uri: preset.url }} style={styles.presetImage} />
                      <Text style={styles.presetText} numberOfLines={1}>
                        {preset.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Image Live Preview */}
              {formData.imageUrl.trim() !== '' && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Xem Trước Ảnh:</Text>
                  <View style={styles.imagePreviewWrap}>
                    <Image source={{ uri: formData.imageUrl }} style={styles.imagePreview} />
                  </View>
                </View>
              )}

              {/* Description */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Mô Tả Chi Tiết Món *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.formTextArea,
                    formErrors.description && styles.formInputError,
                  ]}
                  placeholder="Mô tả hương vị, thành phần, ưu đãi combo..."
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(val) => {
                    setFormData({ ...formData, description: val });
                    setFormErrors({ ...formErrors, description: undefined });
                  }}
                />
                {formErrors.description && (
                  <Text style={styles.errorText}>{formErrors.description}</Text>
                )}
              </View>

              {/* Switch Toggles */}
              <View style={styles.switchGroupCard}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Trạng thái kinh doanh</Text>
                    <Text style={styles.switchDesc}>Bật để hiển thị món còn hàng cho khách</Text>
                  </View>
                  <Switch
                    value={formData.isAvailable}
                    onValueChange={(val) => setFormData({ ...formData, isAvailable: val })}
                    trackColor={{ false: '#374151', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.switchRow, { borderTopWidth: 1, borderColor: '#212225' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Gắn nhãn Bán Chạy (Best Seller)</Text>
                    <Text style={styles.switchDesc}>Hiển thị huy hiệu HOT trên thẻ sản phẩm</Text>
                  </View>
                  <Switch
                    value={formData.isBestSeller}
                    onValueChange={(val) => setFormData({ ...formData, isBestSeller: val })}
                    trackColor={{ false: '#374151', true: '#F59E0B' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Form Buttons */}
              <View style={styles.formActionButtons}>
                <TouchableOpacity
                  style={styles.formCancelBtn}
                  onPress={() => setFormModalVisible(false)}
                  disabled={isSubmitting}>
                  <Text style={styles.formCancelBtnText}>Hủy Bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formSubmitBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleSaveForm}
                  disabled={isSubmitting}
                  activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingItem ? 'checkmark-circle' : 'add'}
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.formSubmitBtnText}>
                        {editingItem ? 'Cập Nhật Món' : 'Thêm Vào Menu'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================= */}
      {/* MODAL 2: ITEM DETAIL VIEW (UC37 VIEW DETAIL) */}
      {/* ======================================================= */}
      <Modal
        visible={detailModalVisible && selectedItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          {selectedItem && (
            <View style={styles.detailModalSheet}>
              {/* Detail Banner Image */}
              <View style={styles.detailImageWrap}>
                <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} />
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setDetailModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                {selectedItem.isBestSeller && (
                  <View style={styles.detailBestSellerBadge}>
                    <Ionicons name="flame" size={14} color="#FFFFFF" />
                    <Text style={styles.detailBestSellerText}>MÓN BÁN CHẠY</Text>
                  </View>
                )}
              </View>

              <ScrollView contentContainerStyle={styles.detailBody}>
                {/* Category & Status Row */}
                <View style={styles.detailCatRow}>
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: CATEGORY_COLORS[selectedItem.category].bg,
                        borderColor: CATEGORY_COLORS[selectedItem.category].border,
                      },
                    ]}>
                    <Ionicons
                      name={CATEGORY_ICONS[selectedItem.category] as any}
                      size={13}
                      color={CATEGORY_COLORS[selectedItem.category].text}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.badgePillText,
                        { color: CATEGORY_COLORS[selectedItem.category].text },
                      ]}>
                      {CATEGORY_LABELS[selectedItem.category]}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.stockIndicator,
                      selectedItem.isAvailable ? styles.stockInStock : styles.stockOut,
                    ]}>
                    <View
                      style={[
                        styles.stockDot,
                        { backgroundColor: selectedItem.isAvailable ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stockText,
                        { color: selectedItem.isAvailable ? '#10B981' : '#EF4444' },
                      ]}>
                      {selectedItem.isAvailable ? 'Đang kinh doanh' : 'Tạm hết hàng'}
                    </Text>
                  </View>
                </View>

                {/* Name */}
                <Text style={styles.detailTitle}>{selectedItem.name}</Text>

                {/* Price Display */}
                <View style={styles.detailPriceRow}>
                  <Text style={styles.detailPrice}>{formatVND(selectedItem.price)}</Text>
                  {selectedItem.originalPrice &&
                    selectedItem.originalPrice > selectedItem.price && (
                      <View style={styles.detailDiscountWrap}>
                        <Text style={styles.detailOriginalPrice}>
                          {formatVND(selectedItem.originalPrice)}
                        </Text>
                        <Text style={styles.detailDiscountTag}>
                          Tiết kiệm{' '}
                          {Math.round(
                            ((selectedItem.originalPrice - selectedItem.price) /
                              selectedItem.originalPrice) *
                              100
                          )}
                          %
                        </Text>
                      </View>
                    )}
                </View>

                {/* Description */}
                <Text style={styles.detailDescTitle}>Giới thiệu & Thành phần:</Text>
                <Text style={styles.detailDescText}>{selectedItem.description}</Text>

                {/* Specs Grid */}
                <View style={styles.detailSpecsGrid}>
                  <View style={styles.detailSpecItem}>
                    <Ionicons name="resize-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.detailSpecLabel}>Kích Cỡ</Text>
                    <Text style={styles.detailSpecValue}>{selectedItem.size || 'Tiêu chuẩn'}</Text>
                  </View>

                  <View style={styles.detailSpecItem}>
                    <Ionicons name="speedometer-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.detailSpecLabel}>Năng Lượng</Text>
                    <Text style={styles.detailSpecValue}>
                      {selectedItem.calories ? `${selectedItem.calories} kcal` : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailSpecItem}>
                    <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.detailSpecLabel}>Tồn Kho</Text>
                    <Text style={styles.detailSpecValue}>
                      {selectedItem.stockQuantity} phần
                    </Text>
                  </View>

                  <View style={styles.detailSpecItem}>
                    <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.detailSpecLabel}>Thời Gian Làm</Text>
                    <Text style={styles.detailSpecValue}>
                      {selectedItem.preparationTime || '2 - 3 phút'}
                    </Text>
                  </View>
                </View>

                {/* Admin Direct Actions */}
                {viewMode === 'admin' && (
                  <View style={styles.detailActionGrid}>
                    <TouchableOpacity
                      style={styles.detailEditBtn}
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleOpenEdit(selectedItem);
                      }}>
                      <Ionicons name="pencil" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.detailEditBtnText}>Sửa Món Này</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.detailToggleBtn}
                      onPress={() => handleToggleAvailability(selectedItem)}>
                      <Ionicons
                        name={selectedItem.isAvailable ? 'pause-circle' : 'play-circle'}
                        size={18}
                        color="#F59E0B"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.detailToggleBtnText}>
                        {selectedItem.isAvailable ? 'Báo Hết Hàng' : 'Mở Bán Lại'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.detailDeleteBtn}
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleConfirmDelete(selectedItem);
                      }}>
                      <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={styles.detailDeleteBtnText}>Xóa Khỏi Menu</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* ======================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION (UC37 DELETE) */}
      {/* ======================================================= */}
      <Modal
        visible={deleteModalVisible && itemToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash" size={32} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Xác Nhận Xóa Món</Text>
            <Text style={styles.confirmDesc}>
              Bạn có chắc chắn muốn xóa món{' '}
              <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>
                {`"${itemToDelete?.name}"`}
              </Text>{' '}
              khỏi thực đơn rạp không? Thao tác này không thể hoàn tác.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}>
                <Text style={styles.confirmCancelText}>Hủy Bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteBtn, isDeleting && { opacity: 0.7 }]}
                onPress={handleDeleteItem}
                disabled={isDeleting}
                activeOpacity={0.85}>
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Xóa Vĩnh Viễn</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================= */}
      {/* MODAL 4: RESET DEFAULTS CONFIRMATION */}
      {/* ======================================================= */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="refresh" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.confirmTitle}>Khôi Phục Thực Đơn Gốc</Text>
            <Text style={styles.confirmDesc}>
              Hệ thống sẽ tải lại 15 món bắp, nước, combo chuẩn của rạp CineMax. Mọi dữ liệu tự thêm
              sẽ được đặt lại về mặc định.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setResetModalVisible(false)}
                disabled={isResetting}>
                <Text style={styles.confirmCancelText}>Hủy Bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  { backgroundColor: '#F59E0B' },
                  isResetting && { opacity: 0.7 },
                ]}
                onPress={handleResetDefaults}
                disabled={isResetting}
                activeOpacity={0.85}>
                {isResetting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Khôi Phục Ngay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1014',
  },
  scrollContent: {
    paddingBottom: Spacing.four,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1014',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    color: '#9CA3AF',
    fontSize: 14,
  },

  /* Toast Notification */
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  toastSuccess: {
    backgroundColor: '#065F46',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  toastError: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },

  /* Header Section */
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#212225',
    backgroundColor: '#14151B',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  ucBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
  },
  ucBadgeText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 3,
    lineHeight: 17,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#212225',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Mode Switcher */
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B0D12',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#26282E',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Metrics Grid */
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E2026',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2E35',
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },

  /* Admin Action Buttons */
  adminActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryAddBtn: {
    flex: 1,
    backgroundColor: '#E50914',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryResetBtn: {
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryResetBtnText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },

  /* Search & Filter Bar */
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1014',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#2D3039',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  filterToggleBtn: {
    padding: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  filterToggleBtnActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },

  /* Category Horizontal Pills */
  categoryPillsList: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2026',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E313A',
  },
  categoryPillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  categoryPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryPillCount: {
    backgroundColor: '#2A2D35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  categoryPillCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryPillCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  categoryPillCountTextActive: {
    color: '#FFFFFF',
  },

  /* Filter Drawer */
  filterDrawer: {
    backgroundColor: '#1B1C22',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2A2C34',
  },
  filterDrawerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterDrawerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  filterResetLink: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '600',
  },
  filterTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252730',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  filterTagActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  filterTagText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  filterTagTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  sortChip: {
    backgroundColor: '#252730',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sortChipActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  sortChipText: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },

  /* List Header */
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  listHeaderHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adminTipText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  /* Food Cards List */
  foodList: {
    paddingHorizontal: 16,
    gap: 14,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  foodCard: {
    backgroundColor: '#16181F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252830',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  foodCardDisabled: {
    opacity: 0.7,
    borderColor: '#2A2C34',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#0F1014',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  bestSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 3,
  },
  bestSellerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#F59E0B',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  discountBadgeText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 11,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },

  /* Card Info */
  cardInfo: {
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  sizeBadge: {
    backgroundColor: '#252832',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sizeBadgeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 12.5,
    color: '#9CA3AF',
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 10,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E50914',
    letterSpacing: -0.2,
  },
  cardOriginalPrice: {
    fontSize: 12,
    color: '#6B7280',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  stockInStock: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  stockOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252830',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11.5,
    color: '#9CA3AF',
  },

  /* Card Admin Actions */
  cardAdminActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  actionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  actionToggleBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  actionToggleBtnInactive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  actionToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionIconGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#21242C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtnEdit: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  actionIconBtnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },

  /* Customer Order Actions */
  cardCustomerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  customerOrderBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#E50914',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerOrderBtnDisabled: {
    backgroundColor: '#374151',
  },
  customerOrderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  customerDetailBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#21242C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#16181F',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252830',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Modal Generic */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalCloseBtn: {
    padding: 6,
  },

  /* Form Modal Sheet */
  formModalSheet: {
    backgroundColor: '#16181F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252830',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formScroll: {
    maxHeight: '100%',
  },
  formScrollContent: {
    padding: 18,
    gap: 14,
  },
  formField: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  formInput: {
    backgroundColor: '#0F1014',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2F323D',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
  },
  formInputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '500',
  },
  formTextArea: {
    height: 75,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  formTwoColRow: {
    flexDirection: 'row',
  },
  formCategoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  formCategoryItem: {
    flex: 1,
    backgroundColor: '#0F1014',
    borderWidth: 1,
    borderColor: '#2A2D36',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  formCategoryItemActive: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  formCategoryText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  formCategoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetSectionTitle: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 4,
  },
  presetsList: {
    gap: 8,
    paddingVertical: 4,
  },
  presetCard: {
    width: 80,
    borderRadius: 8,
    backgroundColor: '#0F1014',
    borderWidth: 1,
    borderColor: '#2A2D36',
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 4,
  },
  presetCardActive: {
    borderColor: '#E50914',
    borderWidth: 2,
  },
  presetImage: {
    width: '100%',
    height: 50,
    resizeMode: 'cover',
  },
  presetText: {
    fontSize: 9.5,
    color: '#D1D5DB',
    paddingHorizontal: 2,
    marginTop: 3,
  },
  imagePreviewWrap: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2D36',
    backgroundColor: '#0F1014',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  switchGroupCard: {
    backgroundColor: '#0F1014',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#252830',
    paddingHorizontal: 14,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  formActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  formCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#21242C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  formCancelBtnText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 14,
  },
  formSubmitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#E50914',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Detail Modal Sheet */
  detailModalSheet: {
    backgroundColor: '#16181F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  detailImageWrap: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#000000',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBestSellerBadge: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
  },
  detailBestSellerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  detailBody: {
    padding: 18,
    gap: 12,
  },
  detailCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E50914',
  },
  detailDiscountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailOriginalPrice: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  detailDiscountTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  detailDescTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1D5DB',
    marginTop: 6,
  },
  detailDescText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  detailSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#0F1014',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#252830',
    marginTop: 6,
  },
  detailSpecItem: {
    width: '47%',
    gap: 3,
  },
  detailSpecLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  detailSpecValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailActionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 20,
  },
  detailEditBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEditBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  detailToggleBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#21242C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailToggleBtnText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 12.5,
  },
  detailDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  detailDeleteBtnText: {
    display: 'none',
  },

  /* Confirm Card */
  confirmCard: {
    backgroundColor: '#16181F',
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2C35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#21242C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  confirmCancelText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
});

// Admin Management Hub:
// UC37 (Manage Food & Drinks), UC39 (Manage Promotions), UC41 (Manage Reviews),
// UC42 (Manage Notifications), UC44 (Manage Food Orders), UC45 (View Reports)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import {
  FoodAPI,
  PromotionAPI,
  ReviewAPI,
  NotificationAPI,
  OrderAPI,
  ReportAPI,
} from '@/services/api';
import { FoodItem } from '@/types/food';
import { Promotion } from '@/types/promotion';
import { Review } from '@/types/review';
import { NotificationItem } from '@/types/notification';
import { Order, OrderStatus } from '@/types/order';
import { ReportSummary, TopMovieStat, TopFoodStat } from '@/types/report';
import PricingManagementTab from '@/features/pricing/PricingManagementTab';

type AdminTab = 'food' | 'promo' | 'reviews' | 'notifs' | 'orders' | 'reports' | 'pricing';

interface AdminManagementHubModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: AdminTab;
}

export default function AdminManagementHubModal({
  visible,
  onClose,
  initialTab = 'food',
}: AdminManagementHubModalProps) {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ─── 1. UC37: FOOD STATE ────────────────────────────────────────────────────
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>('all');
  const [foodModalVisible, setFoodModalVisible] = useState<boolean>(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodFormName, setFoodFormName] = useState<string>('');
  const [foodFormCategory, setFoodFormCategory] = useState<'food' | 'drink' | 'combo'>('food');
  const [foodFormPrice, setFoodFormPrice] = useState<string>('');
  const [foodFormDesc, setFoodFormDesc] = useState<string>('');
  const [foodFormUnit, setFoodFormUnit] = useState<string>('Phần');
  const [foodFormImage, setFoodFormImage] = useState<string>('');
  const [foodFormAvailable, setFoodFormAvailable] = useState<boolean>(true);

  // ─── 2. UC39: PROMOTIONS STATE ──────────────────────────────────────────────
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [promoModalVisible, setPromoModalVisible] = useState<boolean>(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoFormCode, setPromoFormCode] = useState<string>('');
  const [promoFormTitle, setPromoFormTitle] = useState<string>('');
  const [promoFormDesc, setPromoFormDesc] = useState<string>('');
  const [promoFormType, setPromoFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoFormValue, setPromoFormValue] = useState<string>('');
  const [promoFormMax, setPromoFormMax] = useState<string>('');
  const [promoFormMinOrder, setPromoFormMinOrder] = useState<string>('');

  // ─── 3. UC41: REVIEWS STATE ─────────────────────────────────────────────────
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('all');

  // ─── 4. UC42: NOTIFICATIONS STATE ───────────────────────────────────────────
  const [adminNotifs, setAdminNotifs] = useState<NotificationItem[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState<boolean>(false);
  const [notifFormTitle, setNotifFormTitle] = useState<string>('');
  const [notifFormMsg, setNotifFormMsg] = useState<string>('');
  const [notifFormType, setNotifFormType] = useState<'system' | 'promotion' | 'movie' | 'order'>('system');

  // ─── 5. UC44: FOOD ORDERS STATE ─────────────────────────────────────────────
  const [foodOrders, setFoodOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // ─── 6. UC45: REPORTS STATE ─────────────────────────────────────────────────
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [topMovies, setTopMovies] = useState<TopMovieStat[]>([]);
  const [topFoods, setTopFoods] = useState<TopFoodStat[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ─── Fetch Data for Active Tab ──────────────────────────────────────────────
  const loadActiveTabData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'food') {
        const res = await FoodAPI.getFoods({
          category: foodCategoryFilter === 'all' ? undefined : foodCategoryFilter,
        });
        if (res.success) setFoods(res.items || []);
      } else if (activeTab === 'promo') {
        const res = await PromotionAPI.getPromotions();
        if (res.success) setPromos(res.promotions || []);
      } else if (activeTab === 'reviews') {
        const res = await ReviewAPI.getAdminReviews({
          status: reviewStatusFilter === 'all' ? undefined : reviewStatusFilter,
        });
        if (res.success) setAdminReviews(res.reviews || []);
      } else if (activeTab === 'notifs') {
        const res = await NotificationAPI.getAdminNotifications();
        if (res.success) setAdminNotifs(res.notifications || []);
      } else if (activeTab === 'orders') {
        const res = await OrderAPI.getFoodOrders({
          status: orderStatusFilter === 'all' ? undefined : orderStatusFilter,
        });
        if (res.success) setFoodOrders(res.orders || []);
      } else if (activeTab === 'reports') {
        const [sumRes, movRes, foodRes] = await Promise.all([
          ReportAPI.getSummary(),
          ReportAPI.getTopMovies(),
          ReportAPI.getTopFoods(),
        ]);
        if (sumRes.success) setReportSummary(sumRes.data);
        if (movRes.success) setTopMovies(movRes.topMovies || []);
        if (foodRes.success) setTopFoods(foodRes.topFoods || []);
      }
    } catch (err) {
      console.log('[Load Admin Data Error]', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, foodCategoryFilter, reviewStatusFilter, orderStatusFilter]);

  useEffect(() => {
    if (visible && isAuthenticated && user?.role === 'admin') {
      loadActiveTabData();
    }
  }, [visible, isAuthenticated, user?.role, activeTab, foodCategoryFilter, reviewStatusFilter, orderStatusFilter, loadActiveTabData]);

  // ─── HANDLERS UC37: FOOD & DRINKS ───────────────────────────────────────────
  const handleOpenCreateFood = () => {
    setEditingFood(null);
    setFoodFormName('');
    setFoodFormCategory('food');
    setFoodFormPrice('');
    setFoodFormDesc('');
    setFoodFormUnit('Phần');
    setFoodFormImage('https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500');
    setFoodFormAvailable(true);
    setFoodModalVisible(true);
  };

  const handleOpenEditFood = (item: FoodItem) => {
    setEditingFood(item);
    setFoodFormName(item.name);
    setFoodFormCategory(item.category);
    setFoodFormPrice(String(item.price));
    setFoodFormDesc(item.description);
    setFoodFormUnit(item.unit);
    setFoodFormImage(item.image);
    setFoodFormAvailable(item.isAvailable);
    setFoodModalVisible(true);
  };

  const handleSaveFood = async () => {
    if (!foodFormName.trim() || !foodFormPrice.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món và giá tiền.');
      return;
    }

    try {
      if (editingFood) {
        await FoodAPI.updateFood(editingFood.id, {
          name: foodFormName.trim(),
          category: foodFormCategory,
          price: Number(foodFormPrice),
          description: foodFormDesc.trim(),
          unit: foodFormUnit.trim(),
          image: foodFormImage.trim(),
          isAvailable: foodFormAvailable,
        });
        Alert.alert('Thành công', 'Đã cập nhật món ăn.');
      } else {
        await FoodAPI.createFood({
          name: foodFormName.trim(),
          category: foodFormCategory,
          price: Number(foodFormPrice),
          description: foodFormDesc.trim(),
          unit: foodFormUnit.trim(),
          image: foodFormImage.trim(),
          isAvailable: foodFormAvailable,
        });
        Alert.alert('Thành công', 'Đã thêm món mới vào thực đơn.');
      }
      setFoodModalVisible(false);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu món ăn.');
    }
  };

  const handleToggleFoodAvailable = async (item: FoodItem) => {
    try {
      await FoodAPI.toggleAvailable(item.id);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleDeleteFood = (item: FoodItem) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa món [${item.name}] khỏi thực đơn?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await FoodAPI.deleteFood(item.id);
            Alert.alert('Thành công', 'Đã xóa món ăn.');
            loadActiveTabData();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  // ─── HANDLERS UC39: PROMOTIONS ──────────────────────────────────────────────
  const handleOpenCreatePromo = () => {
    setEditingPromo(null);
    setPromoFormCode('');
    setPromoFormTitle('');
    setPromoFormDesc('');
    setPromoFormType('percentage');
    setPromoFormValue('20');
    setPromoFormMax('50000');
    setPromoFormMinOrder('100000');
    setPromoModalVisible(true);
  };

  const handleOpenEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoFormCode(promo.code);
    setPromoFormTitle(promo.title);
    setPromoFormDesc(promo.description);
    setPromoFormType(promo.discountType);
    setPromoFormValue(String(promo.discountValue));
    setPromoFormMax(String(promo.maxDiscount || ''));
    setPromoFormMinOrder(String(promo.minOrderValue || ''));
    setPromoModalVisible(true);
  };

  const handleSavePromo = async () => {
    if (!promoFormCode.trim() || !promoFormTitle.trim() || !promoFormValue.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền mã code, tiêu đề và giá trị giảm.');
      return;
    }

    try {
      if (editingPromo) {
        await PromotionAPI.updatePromotion(editingPromo.id, {
          title: promoFormTitle.trim(),
          description: promoFormDesc.trim(),
          discountType: promoFormType,
          discountValue: Number(promoFormValue),
          maxDiscount: Number(promoFormMax) || 0,
          minOrderValue: Number(promoFormMinOrder) || 0,
        });
        Alert.alert('Thành công', 'Đã cập nhật mã khuyến mãi.');
      } else {
        await PromotionAPI.createPromotion({
          code: promoFormCode.trim().toUpperCase(),
          title: promoFormTitle.trim(),
          description: promoFormDesc.trim(),
          discountType: promoFormType,
          discountValue: Number(promoFormValue),
          maxDiscount: Number(promoFormMax) || 0,
          minOrderValue: Number(promoFormMinOrder) || 0,
          isActive: true,
        });
        Alert.alert('Thành công', 'Đã tạo mã khuyến mãi mới.');
      }
      setPromoModalVisible(false);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu khuyến mãi.');
    }
  };

  const handleTogglePromoActive = async (promo: Promotion) => {
    try {
      await PromotionAPI.togglePromotion(promo.id);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Lỗi thay đổi trạng thái.');
    }
  };

  const handleDeletePromo = (promo: Promotion) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa vĩnh viễn mã [${promo.code}]?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await PromotionAPI.deletePromotion(promo.id);
            Alert.alert('Thành công', 'Đã xóa mã khuyến mãi.');
            loadActiveTabData();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  // ─── HANDLERS UC41: REVIEWS MODERATION ──────────────────────────────────────
  const handleModerateReview = async (review: Review, status: 'approved' | 'hidden' | 'flagged') => {
    try {
      await ReviewAPI.moderateReview(review.id, status);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleDeleteAdminReview = (review: Review) => {
    Alert.alert('Xóa đánh giá', 'Xóa vĩnh viễn đánh giá này khỏi cơ sở dữ liệu?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await ReviewAPI.deleteReview(review.id);
            Alert.alert('Thành công', 'Đã xóa đánh giá.');
            loadActiveTabData();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  // ─── HANDLERS UC42: NOTIFICATIONS ───────────────────────────────────────────
  const handleCreateNotif = async () => {
    if (!notifFormTitle.trim() || !notifFormMsg.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và nội dung thông báo.');
      return;
    }

    try {
      await NotificationAPI.createNotification({
        title: notifFormTitle.trim(),
        message: notifFormMsg.trim(),
        type: notifFormType,
        targetUser: 'all',
      });
      Alert.alert('Thành công', 'Đã phát thông báo hệ thống đến người dùng!');
      setNotifModalVisible(false);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo thông báo.');
    }
  };

  const handleDeleteNotif = (notif: NotificationItem) => {
    Alert.alert('Xóa thông báo', 'Xóa thông báo này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await NotificationAPI.deleteNotification(notif.id);
            loadActiveTabData();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  // ─── HANDLERS UC44: FOOD ORDERS ─────────────────────────────────────────────
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await OrderAPI.updateOrderStatus(orderId, status);
      loadActiveTabData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái đơn.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Navbar */}
        <View style={styles.topNavbar}>
          <View style={styles.navbarBrandRow}>
            <View style={styles.navbarBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.navbarTitle}>TRUNG TÂM QUẢN TRỊ CINEMAX</Text>
              <Text style={styles.navbarSubtitle}>
                Bảng điều khiển quản trị viên (Admin RBAC)
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.navbarCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!isAuthenticated || user?.role !== 'admin' ? (
          <View style={styles.accessDeniedContainer}>
            <View style={styles.accessDeniedIconCircle}>
              <Ionicons name="lock-closed" size={44} color="#EF4444" />
            </View>
            <Text style={styles.accessDeniedTitle}>Yêu Cầu Quyền Quản Trị</Text>
            <Text style={styles.accessDeniedDesc}>
              Chức năng này được bảo vệ bởi phân quyền RBAC. Chỉ tài khoản với vai trò Quản trị viên (Admin) mới được phép truy cập và quản lý dữ liệu.
            </Text>
            <TouchableOpacity style={styles.accessDeniedBtn} onPress={onClose}>
              <Text style={styles.accessDeniedBtnText}>Đóng lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>

        {/* Tab Navigation Bar (UC37, UC39, UC41, UC42, UC44, UC45) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContainer}>
          {[
            { key: 'food', label: '🍿 Đồ ăn' },
            { key: 'orders', label: '📋 Đơn đồ ăn' },
            { key: 'promo', label: '🎟️ Khuyến mãi' },
            { key: 'pricing', label: '🏷️ Giá vé' },
            { key: 'reviews', label: '⭐ Kiểm duyệt' },
            { key: 'notifs', label: '🔔 Thông báo' },
            { key: 'reports', label: '📊 Báo cáo' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as AdminTab)}
                style={[styles.tabButton, active && styles.tabButtonActive]}>
                <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main Body */}
        {isLoading && !isRefreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Đang tải dữ liệu quản trị...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.mainScrollView}
            contentContainerStyle={styles.mainContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  loadActiveTabData();
                }}
                tintColor="#E50914"
              />
            }>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 1: UC37 - MANAGE FOOD & DRINKS                          */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'food' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View>
                    <Text style={styles.tabSectionTitle}>Quản Lý Menu Đồ Ăn & Nước</Text>
                    <Text style={styles.tabSectionDesc}>Thêm, xem, sửa, xóa và bật/tắt còn hàng</Text>
                  </View>
                  <TouchableOpacity style={styles.primaryAddBtn} onPress={handleOpenCreateFood}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryAddBtnText}>Thêm món</Text>
                  </TouchableOpacity>
                </View>

                {/* Category Filter Pills */}
                <View style={styles.filterPillsRow}>
                  {['all', 'food', 'drink', 'combo'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setFoodCategoryFilter(cat)}
                      style={[
                        styles.filterPill,
                        foodCategoryFilter === cat && styles.filterPillActive,
                      ]}>
                      <Text
                        style={[
                          styles.filterPillText,
                          foodCategoryFilter === cat && styles.filterPillTextActive,
                        ]}>
                        {cat === 'all' && 'Tất cả'}
                        {cat === 'food' && 'Bắp rang'}
                        {cat === 'drink' && 'Nước ngọt'}
                        {cat === 'combo' && 'Combo'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Foods List */}
                <View style={styles.itemsList}>
                  {foods.map((f) => (
                    <View key={f.id} style={styles.adminFoodCard}>
                      <Image source={{ uri: f.image }} style={styles.adminFoodImg} />
                      <View style={styles.adminFoodInfo}>
                        <View style={styles.adminFoodNameRow}>
                          <Text style={styles.adminFoodName}>{f.name}</Text>
                          <View
                            style={[
                              styles.catBadge,
                              f.category === 'combo' && { backgroundColor: '#831843' },
                              f.category === 'drink' && { backgroundColor: '#1E3A8A' },
                            ]}>
                            <Text style={styles.catBadgeText}>{f.category.toUpperCase()}</Text>
                          </View>
                        </View>

                        <Text style={styles.adminFoodPrice}>
                          {f.price.toLocaleString('vi-VN')}đ / {f.unit}
                        </Text>
                        <Text style={styles.adminFoodDesc} numberOfLines={1}>
                          {f.description}
                        </Text>

                        {/* Status Switch & Actions */}
                        <View style={styles.adminFoodActionsRow}>
                          <View style={styles.statusSwitchRow}>
                            <Switch
                              value={f.isAvailable}
                              onValueChange={() => handleToggleFoodAvailable(f)}
                              trackColor={{ false: '#374151', true: '#10B981' }}
                              thumbColor="#FFFFFF"
                            />
                            <Text
                              style={[
                                styles.statusSwitchLabel,
                                { color: f.isAvailable ? '#10B981' : '#EF4444' },
                              ]}>
                              {f.isAvailable ? 'Còn hàng' : 'Hết hàng'}
                            </Text>
                          </View>

                          <View style={styles.actionButtonsGroup}>
                            <TouchableOpacity
                              onPress={() => handleOpenEditFood(f)}
                              style={styles.iconEditBtn}>
                              <Ionicons name="create-outline" size={16} color="#3B82F6" />
                              <Text style={styles.iconEditBtnText}>Sửa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDeleteFood(f)}
                              style={styles.iconDeleteBtn}>
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              <Text style={styles.iconDeleteBtnText}>Xóa</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 2: UC44 - MANAGE FOOD ORDERS                            */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'orders' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View>
                    <Text style={styles.tabSectionTitle}>Quản Lý Đơn Đồ Ăn Tại Quầy</Text>
                    <Text style={styles.tabSectionDesc}>Theo dõi đơn hàng & cập nhật trạng thái pha chế</Text>
                  </View>
                </View>

                {/* Filter Orders Status */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'preparing', label: '👩‍🍳 Đang làm' },
                    { key: 'ready', label: '✅ Sẵn sàng giao' },
                    { key: 'completed', label: '🎉 Đã hoàn tất' },
                    { key: 'cancelled', label: '❌ Đã hủy' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setOrderStatusFilter(s.key)}
                      style={[
                        styles.filterPill,
                        orderStatusFilter === s.key && styles.filterPillActive,
                      ]}>
                      <Text
                        style={[
                          styles.filterPillText,
                          orderStatusFilter === s.key && styles.filterPillTextActive,
                        ]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {foodOrders.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={40} color="#6B7280" />
                    <Text style={styles.emptyCardText}>Không có đơn đồ ăn nào phù hợp.</Text>
                  </View>
                ) : (
                  <View style={styles.itemsList}>
                    {foodOrders.map((ord) => (
                      <View key={ord.id} style={styles.adminOrderCard}>
                        <View style={styles.adminOrderHeader}>
                          <View>
                            <Text style={styles.adminOrderCode}>#{ord.orderCode}</Text>
                            <Text style={styles.adminOrderCustomer}>
                              Khách: {ord.user.fullName} • SĐT: {ord.user.phone}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.orderStatusPill,
                              ord.orderStatus === 'preparing' && { backgroundColor: '#F59E0B25' },
                              ord.orderStatus === 'ready' && { backgroundColor: '#10B98125' },
                              ord.orderStatus === 'completed' && { backgroundColor: '#3B82F625' },
                            ]}>
                            <Text
                              style={[
                                styles.orderStatusPillText,
                                ord.orderStatus === 'preparing' && { color: '#F59E0B' },
                                ord.orderStatus === 'ready' && { color: '#10B981' },
                                ord.orderStatus === 'completed' && { color: '#3B82F6' },
                              ]}>
                              {ord.orderStatus === 'preparing' && 'Đang chuẩn bị'}
                              {ord.orderStatus === 'ready' && 'Đã sẵn sàng'}
                              {ord.orderStatus === 'completed' && 'Đã giao khách'}
                              {ord.orderStatus === 'cancelled' && 'Đã hủy'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.orderShowtimeDetails}>
                          🎬 {ord.movie.title} | {ord.theater.room} ({ord.theater.showtimeTime})
                        </Text>

                        {/* Food Items in this order */}
                        <View style={styles.orderFoodsBox}>
                          <Text style={styles.orderFoodsHeader}>Món ăn & nước uống:</Text>
                          {ord.foods.map((f, i) => (
                            <View key={i} style={styles.orderFoodLine}>
                              <Text style={styles.orderFoodLineName}>
                                • {f.name} <Text style={{ color: '#F59E0B' }}>x{f.quantity}</Text>
                              </Text>
                              <Text style={styles.orderFoodLinePrice}>
                                {(f.price * f.quantity).toLocaleString('vi-VN')}đ
                              </Text>
                            </View>
                          ))}
                          {ord.notes ? (
                            <Text style={styles.orderNoteText}>📌 Ghi chú khách: "{ord.notes}"</Text>
                          ) : null}
                        </View>

                        {/* Status Transition Action Buttons */}
                        <View style={styles.orderActionsRow}>
                          {ord.orderStatus !== 'preparing' && (
                            <TouchableOpacity
                              onPress={() => handleUpdateOrderStatus(ord.id, 'preparing')}
                              style={styles.statusActionBtnPreparing}>
                              <Text style={styles.statusActionBtnText}>Đang làm</Text>
                            </TouchableOpacity>
                          )}

                          {ord.orderStatus !== 'ready' && ord.orderStatus !== 'completed' && (
                            <TouchableOpacity
                              onPress={() => handleUpdateOrderStatus(ord.id, 'ready')}
                              style={styles.statusActionBtnReady}>
                              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                              <Text style={styles.statusActionBtnText}>Sẵn sàng giao</Text>
                            </TouchableOpacity>
                          )}

                          {ord.orderStatus !== 'completed' && (
                            <TouchableOpacity
                              onPress={() => handleUpdateOrderStatus(ord.id, 'completed')}
                              style={styles.statusActionBtnDone}>
                              <Text style={styles.statusActionBtnText}>Đã giao khách</Text>
                            </TouchableOpacity>
                          )}

                          {ord.orderStatus !== 'cancelled' && ord.orderStatus !== 'completed' && (
                            <TouchableOpacity
                              onPress={() => handleUpdateOrderStatus(ord.id, 'cancelled')}
                              style={styles.statusActionBtnCancel}>
                              <Text style={styles.statusActionBtnTextCancel}>Hủy đơn</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 3: UC39 - MANAGE PROMOTIONS                             */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'promo' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View>
                    <Text style={styles.tabSectionTitle}>Quản Lý Mã Khuyến Mãi</Text>
                    <Text style={styles.tabSectionDesc}>Thêm, sửa và kích hoạt / vô hiệu hóa mã</Text>
                  </View>
                  <TouchableOpacity style={styles.primaryAddBtn} onPress={handleOpenCreatePromo}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryAddBtnText}>Tạo mã mới</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemsList}>
                  {promos.map((p) => (
                    <View key={p.id} style={styles.adminPromoCard}>
                      <View style={styles.adminPromoHeader}>
                        <View style={styles.adminPromoCodeBox}>
                          <Text style={styles.adminPromoCode}>{p.code}</Text>
                        </View>
                        <View
                          style={[
                            styles.promoActivePill,
                            { backgroundColor: p.isActive ? '#10B98125' : '#EF444425' },
                          ]}>
                          <Text
                            style={[
                              styles.promoActivePillText,
                              { color: p.isActive ? '#10B981' : '#EF4444' },
                            ]}>
                            {p.isActive ? 'ĐANG KÍCH HOẠT' : 'ĐÃ VÔ HIỆU HÓA'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.adminPromoTitle}>{p.title}</Text>
                      <Text style={styles.adminPromoDesc}>{p.description}</Text>

                      <View style={styles.promoStatsRow}>
                        <Text style={styles.promoStatItem}>
                          Mức giảm:{' '}
                          <Text style={{ color: '#F59E0B', fontWeight: '700' }}>
                            {p.discountType === 'percentage'
                              ? `${p.discountValue}%`
                              : `${p.discountValue.toLocaleString('vi-VN')}đ`}
                          </Text>
                        </Text>
                        <Text style={styles.promoStatItem}>
                          Đã dùng:{' '}
                          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                            {p.usedCount} / {p.usageLimit}
                          </Text>
                        </Text>
                      </View>

                      <View style={styles.promoActionsRow}>
                        <TouchableOpacity
                          onPress={() => handleTogglePromoActive(p)}
                          style={[
                            styles.togglePromoBtn,
                            { backgroundColor: p.isActive ? '#EF444420' : '#10B98120' },
                          ]}>
                          <Text
                            style={[
                              styles.togglePromoBtnText,
                              { color: p.isActive ? '#EF4444' : '#10B981' },
                            ]}>
                            {p.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenEditPromo(p)}
                          style={styles.iconEditBtn}>
                          <Ionicons name="create-outline" size={15} color="#3B82F6" />
                          <Text style={styles.iconEditBtnText}>Sửa</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeletePromo(p)}
                          style={styles.iconDeleteBtn}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          <Text style={styles.iconDeleteBtnText}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 4: UC41 - MANAGE REVIEWS (MODERATION)                   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'reviews' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View>
                    <Text style={styles.tabSectionTitle}>Kiểm Duyệt Đánh Giá</Text>
                    <Text style={styles.tabSectionDesc}>Duyệt, ẩn hoặc xóa các đánh giá không phù hợp</Text>
                  </View>
                </View>

                {/* Filter Status */}
                <View style={styles.filterPillsRow}>
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'approved', label: 'Đã duyệt' },
                    { key: 'hidden', label: 'Đang ẩn' },
                    { key: 'flagged', label: 'Vi phạm' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setReviewStatusFilter(s.key)}
                      style={[
                        styles.filterPill,
                        reviewStatusFilter === s.key && styles.filterPillActive,
                      ]}>
                      <Text
                        style={[
                          styles.filterPillText,
                          reviewStatusFilter === s.key && styles.filterPillTextActive,
                        ]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.itemsList}>
                  {adminReviews.map((rev) => (
                    <View key={rev.id} style={styles.adminReviewCard}>
                      <View style={styles.adminReviewHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adminReviewMovie}>{rev.movieTitle || 'Phim rạp'}</Text>
                          <Text style={styles.adminReviewUser}>
                            Bởi: {rev.userName} • {rev.rating}★
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.reviewStatusBadge,
                            rev.status === 'approved' && { backgroundColor: '#10B98125' },
                            rev.status === 'hidden' && { backgroundColor: '#6B728025' },
                            rev.status === 'flagged' && { backgroundColor: '#EF444425' },
                          ]}>
                          <Text
                            style={[
                              styles.reviewStatusBadgeText,
                              rev.status === 'approved' && { color: '#10B981' },
                              rev.status === 'hidden' && { color: '#9CA3AF' },
                              rev.status === 'flagged' && { color: '#EF4444' },
                            ]}>
                            {rev.status === 'approved' && 'ĐÃ DUYỆT'}
                            {rev.status === 'hidden' && 'ĐANG ẨN'}
                            {rev.status === 'flagged' && 'VI PHẠM'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.adminReviewComment}>"{rev.comment}"</Text>

                      {/* Moderation Actions */}
                      <View style={styles.moderationActionsRow}>
                        {rev.status !== 'approved' && (
                          <TouchableOpacity
                            onPress={() => handleModerateReview(rev, 'approved')}
                            style={styles.modBtnApprove}>
                            <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                            <Text style={styles.modBtnApproveText}>Duyệt hiển thị</Text>
                          </TouchableOpacity>
                        )}

                        {rev.status !== 'hidden' && (
                          <TouchableOpacity
                            onPress={() => handleModerateReview(rev, 'hidden')}
                            style={styles.modBtnHide}>
                            <Ionicons name="eye-off-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.modBtnHideText}>Ẩn đánh giá</Text>
                          </TouchableOpacity>
                        )}

                        {rev.status !== 'flagged' && (
                          <TouchableOpacity
                            onPress={() => handleModerateReview(rev, 'flagged')}
                            style={styles.modBtnFlag}>
                            <Ionicons name="flag-outline" size={14} color="#F59E0B" />
                            <Text style={styles.modBtnFlagText}>Đánh dấu vi phạm</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => handleDeleteAdminReview(rev)}
                          style={styles.modBtnDelete}>
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          <Text style={styles.modBtnDeleteText}>Xóa vĩnh viễn</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 5: UC42 - MANAGE NOTIFICATIONS                          */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'notifs' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View>
                    <Text style={styles.tabSectionTitle}>Quản Lý Thông Báo Hệ Thống</Text>
                    <Text style={styles.tabSectionDesc}>Tạo và phát thông báo mới tới người dùng</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => {
                      setNotifFormTitle('');
                      setNotifFormMsg('');
                      setNotifFormType('system');
                      setNotifModalVisible(true);
                    }}>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryAddBtnText}>Gửi thông báo</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemsList}>
                  {adminNotifs.map((n) => (
                    <View key={n.id} style={styles.adminNotifCard}>
                      <View style={styles.adminNotifTop}>
                        <View style={styles.notifTypeTag}>
                          <Text style={styles.notifTypeTagText}>{n.type.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.adminNotifDate}>
                          {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>

                      <Text style={styles.adminNotifTitle}>{n.title}</Text>
                      <Text style={styles.adminNotifMsg}>{n.message}</Text>

                      <View style={styles.adminNotifBottom}>
                        <Text style={styles.notifTargetText}>Gửi đến: {n.targetUser}</Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteNotif(n)}
                          style={styles.iconDeleteBtn}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          <Text style={styles.iconDeleteBtnText}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 6: UC45 - VIEW REPORTS                                  */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'reports' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View>
                    <Text style={styles.tabSectionTitle}>Báo Cáo Doanh Thu & Phim Phổ Biến</Text>
                    <Text style={styles.tabSectionDesc}>Thống kê tổng hợp số liệu vé và đồ ăn thời gian thực</Text>
                  </View>
                </View>

                {/* KPI Cards Grid */}
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiCard}>
                    <Ionicons name="cash-outline" size={24} color="#10B981" />
                    <Text style={styles.kpiNum}>
                      {(reportSummary?.totalRevenue || 0).toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={styles.kpiLabel}>Tổng Doanh Thu</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Ionicons name="film-outline" size={24} color="#3B82F6" />
                    <Text style={styles.kpiNum}>
                      {(reportSummary?.ticketRevenue || 0).toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={styles.kpiLabel}>Doanh Thu Vé ({reportSummary?.totalTicketsSold || 0} vé)</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Ionicons name="fast-food-outline" size={24} color="#F59E0B" />
                    <Text style={styles.kpiNum}>
                      {(reportSummary?.foodRevenue || 0).toLocaleString('vi-VN')}đ
                    </Text>
                    <Text style={styles.kpiLabel}>Doanh Thu F&B ({reportSummary?.totalFoodItemsSold || 0} phần)</Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Ionicons name="receipt-outline" size={24} color="#EC4899" />
                    <Text style={styles.kpiNum}>{reportSummary?.totalOrders || 0}</Text>
                    <Text style={styles.kpiLabel}>Tổng Đơn Đã Đặt</Text>
                  </View>
                </View>

                {/* Top Movies Table */}
                <View style={styles.reportSectionBox}>
                  <View style={styles.reportSectionHeader}>
                    <Ionicons name="trophy" size={18} color="#F59E0B" />
                    <Text style={styles.reportSectionTitle}>Top Phim Phổ Biến & Doanh Thu Cao</Text>
                  </View>

                  {topMovies.map((m, idx) => (
                    <View key={m.movieId} style={styles.topRankingRow}>
                      <Text style={[styles.rankingIndex, idx < 3 && { color: '#F59E0B' }]}>
                        #{idx + 1}
                      </Text>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.rankingTitle}>{m.title}</Text>
                        <Text style={styles.rankingSub}>{m.ticketsSold} vé xem phim đã bán</Text>
                      </View>
                      <Text style={styles.rankingPrice}>
                        {m.revenue.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Top Foods Table */}
                <View style={styles.reportSectionBox}>
                  <View style={styles.reportSectionHeader}>
                    <Ionicons name="flame" size={18} color="#E50914" />
                    <Text style={styles.reportSectionTitle}>Top Đồ Ăn & Nước Uống Bán Chạy</Text>
                  </View>

                  {topFoods.map((f, idx) => (
                    <View key={f.id} style={styles.topRankingRow}>
                      <Text style={[styles.rankingIndex, idx < 3 && { color: '#E50914' }]}>
                        #{idx + 1}
                      </Text>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.rankingTitle}>{f.name}</Text>
                        <Text style={styles.rankingSub}>Đã bán: {f.quantitySold} phần</Text>
                      </View>
                      <Text style={styles.rankingPrice}>
                        {f.revenue.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TAB 7: UC28 - MANAGE TICKET PRICING RULES                   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'pricing' && (
              <PricingManagementTab isManageMode={true} />
            )}
          </ScrollView>
        )}

        {/* ─── MODAL: CREATE/EDIT FOOD (UC37) ──────────────────────────────────── */}
        <Modal
          visible={foodModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFoodModalVisible(false)}>
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>
                {editingFood ? 'Sửa Món Ăn/Nước' : 'Thêm Món Mới'}
              </Text>

              <Text style={styles.popupLabel}>Tên món:</Text>
              <TextInput
                style={styles.popupInput}
                value={foodFormName}
                onChangeText={setFoodFormName}
                placeholder="VD: Bắp Rang Bơ Phô Mai"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.popupLabel}>Phân loại:</Text>
              <View style={styles.categoryRadioRow}>
                {[
                  { key: 'food', label: 'Bắp rang' },
                  { key: 'drink', label: 'Nước ngọt' },
                  { key: 'combo', label: 'Combo' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setFoodFormCategory(c.key as any)}
                    style={[
                      styles.categoryRadioBtn,
                      foodFormCategory === c.key && styles.categoryRadioBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.categoryRadioBtnText,
                        foodFormCategory === c.key && styles.categoryRadioBtnTextActive,
                      ]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupLabel}>Giá bán (VNĐ):</Text>
                  <TextInput
                    style={styles.popupInput}
                    value={foodFormPrice}
                    onChangeText={setFoodFormPrice}
                    placeholder="VD: 65000"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.popupLabel}>Đơn vị:</Text>
                  <TextInput
                    style={styles.popupInput}
                    value={foodFormUnit}
                    onChangeText={setFoodFormUnit}
                    placeholder="Hộp/Ly"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              <Text style={styles.popupLabel}>Mô tả món:</Text>
              <TextInput
                style={[styles.popupInput, { height: 60 }]}
                value={foodFormDesc}
                onChangeText={setFoodFormDesc}
                placeholder="Mô tả hương vị..."
                placeholderTextColor="#6B7280"
                multiline
              />

              <View style={styles.popupBtnRow}>
                <TouchableOpacity
                  onPress={() => setFoodModalVisible(false)}
                  style={styles.popupCancelBtn}>
                  <Text style={styles.popupCancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveFood} style={styles.popupSubmitBtn}>
                  <Text style={styles.popupSubmitBtnText}>Lưu món</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── MODAL: CREATE/EDIT PROMO (UC39) ─────────────────────────────────── */}
        <Modal
          visible={promoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPromoModalVisible(false)}>
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>
                {editingPromo ? 'Sửa Khuyến Mãi' : 'Tạo Mã Khuyến Mãi Mới'}
              </Text>

              <Text style={styles.popupLabel}>Mã Code (viết hoa):</Text>
              <TextInput
                style={styles.popupInput}
                value={promoFormCode}
                onChangeText={setPromoFormCode}
                placeholder="VD: CINEMAX20"
                placeholderTextColor="#6B7280"
                autoCapitalize="characters"
                editable={!editingPromo}
              />

              <Text style={styles.popupLabel}>Tiêu đề khuyến mãi:</Text>
              <TextInput
                style={styles.popupInput}
                value={promoFormTitle}
                onChangeText={setPromoFormTitle}
                placeholder="VD: Giảm 20% cho đơn đặt vé"
                placeholderTextColor="#6B7280"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupLabel}>Loại giảm giá:</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setPromoFormType('percentage')}
                      style={[
                        styles.categoryRadioBtn,
                        promoFormType === 'percentage' && styles.categoryRadioBtnActive,
                      ]}>
                      <Text style={styles.categoryRadioBtnText}>Theo %</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPromoFormType('fixed')}
                      style={[
                        styles.categoryRadioBtn,
                        promoFormType === 'fixed' && styles.categoryRadioBtnActive,
                      ]}>
                      <Text style={styles.categoryRadioBtnText}>Số tiền (đ)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ width: 110 }}>
                  <Text style={styles.popupLabel}>Giá trị:</Text>
                  <TextInput
                    style={styles.popupInput}
                    value={promoFormValue}
                    onChangeText={setPromoFormValue}
                    placeholder="20 hoặc 50000"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.popupLabel}>Đơn hàng tối thiểu (VNĐ):</Text>
              <TextInput
                style={styles.popupInput}
                value={promoFormMinOrder}
                onChangeText={setPromoFormMinOrder}
                placeholder="VD: 100000"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />

              <View style={styles.popupBtnRow}>
                <TouchableOpacity
                  onPress={() => setPromoModalVisible(false)}
                  style={styles.popupCancelBtn}>
                  <Text style={styles.popupCancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSavePromo} style={styles.popupSubmitBtn}>
                  <Text style={styles.popupSubmitBtnText}>Lưu mã</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── MODAL: CREATE NOTIFICATION (UC42) ───────────────────────────────── */}
        <Modal
          visible={notifModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotifModalVisible(false)}>
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>Phát Thông Báo Hệ Thống</Text>

              <Text style={styles.popupLabel}>Loại thông báo:</Text>
              <View style={styles.categoryRadioRow}>
                {[
                  { key: 'system', label: 'Hệ thống' },
                  { key: 'promotion', label: 'Khuyến mãi' },
                  { key: 'movie', label: 'Phim mới' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setNotifFormType(t.key as any)}
                    style={[
                      styles.categoryRadioBtn,
                      notifFormType === t.key && styles.categoryRadioBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.categoryRadioBtnText,
                        notifFormType === t.key && styles.categoryRadioBtnTextActive,
                      ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.popupLabel}>Tiêu đề thông báo:</Text>
              <TextInput
                style={styles.popupInput}
                value={notifFormTitle}
                onChangeText={setNotifFormTitle}
                placeholder="VD: 🎁 Tặng 1 hộp bắp rang bơ cho vé VIP"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.popupLabel}>Nội dung chi tiết:</Text>
              <TextInput
                style={[styles.popupInput, { height: 80 }]}
                value={notifFormMsg}
                onChangeText={setNotifFormMsg}
                placeholder="Nhập nội dung gửi đến toàn bộ khách hàng..."
                placeholderTextColor="#6B7280"
                multiline
              />

              <View style={styles.popupBtnRow}>
                <TouchableOpacity
                  onPress={() => setNotifModalVisible(false)}
                  style={styles.popupCancelBtn}>
                  <Text style={styles.popupCancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateNotif} style={styles.popupSubmitBtn}>
                  <Text style={styles.popupSubmitBtnText}>Phát thông báo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1219',
  },
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  accessDeniedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  accessDeniedDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  accessDeniedBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  accessDeniedBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  topNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#161922',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  navbarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  navbarBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navbarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  navbarSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  navbarCloseBtn: {
    padding: 6,
  },
  tabsScroll: {
    maxHeight: 52,
    backgroundColor: '#12141C',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1F2430',
  },
  tabButtonActive: {
    backgroundColor: '#E50914',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mainScrollView: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tabSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabSectionDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  primaryAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#1A1D24',
    borderWidth: 1,
    borderColor: '#262626',
  },
  filterPillActive: {
    backgroundColor: '#374151',
    borderColor: '#9CA3AF',
  },
  filterPillText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  itemsList: {
    gap: 12,
  },
  adminFoodCard: {
    flexDirection: 'row',
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  adminFoodImg: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#262626',
  },
  adminFoodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  adminFoodNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminFoodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  catBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminFoodPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 2,
  },
  adminFoodDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  adminFoodActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  statusSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusSwitchLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E3A8A25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  iconEditBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  iconDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  iconDeleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  adminOrderCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  adminOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adminOrderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  adminOrderCustomer: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 2,
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderShowtimeDetails: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  orderFoodsBox: {
    backgroundColor: '#0F1219',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  orderFoodsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  orderFoodLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  orderFoodLineName: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  orderFoodLinePrice: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  orderNoteText: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  statusActionBtnPreparing: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActionBtnReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActionBtnDone: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActionBtnCancel: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusActionBtnTextCancel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  adminPromoCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  adminPromoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminPromoCodeBox: {
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminPromoCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },
  promoActivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoActivePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  adminPromoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminPromoDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  promoStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  promoStatItem: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  promoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  togglePromoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  togglePromoBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adminReviewCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  adminReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adminReviewMovie: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminReviewUser: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
  },
  reviewStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reviewStatusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  adminReviewComment: {
    fontSize: 12,
    color: '#D1D5DB',
    marginVertical: 8,
    lineHeight: 17,
  },
  moderationActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  modBtnApprove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modBtnApproveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  modBtnHide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modBtnHideText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  modBtnFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modBtnFlagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  modBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modBtnDeleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  adminNotifCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  adminNotifTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifTypeTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notifTypeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminNotifDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  adminNotifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  adminNotifMsg: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
  },
  adminNotifBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  notifTargetText: {
    fontSize: 10,
    color: '#6B7280',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  kpiNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reportSectionBox: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  reportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topRankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  rankingIndex: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9CA3AF',
    width: 26,
  },
  rankingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rankingSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  rankingPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  popupLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    marginTop: 8,
  },
  popupInput: {
    backgroundColor: '#0F1219',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FFFFFF',
  },
  categoryRadioRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  categoryRadioBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F1219',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoryRadioBtnActive: {
    borderColor: '#E50914',
    backgroundColor: '#E5091420',
  },
  categoryRadioBtnText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  categoryRadioBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  popupBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  popupCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#374151',
  },
  popupCancelBtnText: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  popupSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E50914',
  },
  popupSubmitBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});


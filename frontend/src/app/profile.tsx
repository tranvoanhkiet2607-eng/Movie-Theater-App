import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import LoginScreen from './login';
import {
  NAME_REGEX,
  VN_PHONE_REGEX,
  validateLoginForm,
  validateRegisterForm,
} from '@/utils/validation';

import { AdminAccountManagementModal } from '@/components/admin-account-management';
import { BookingHistoryModal } from '@/components/booking-history-modal';
import { ForgotPasswordModal } from '@/components/forgot-password-modal';
import { MembershipModal } from '@/components/membership-modal';
import NotificationModal from '@/components/NotificationModal';
import AdminManagementHubModal from '@/features/admin/AdminManagementHubModal';
import { NotificationAPI, OrderAPI } from '@/services/api';
import { LoginFormData, RegisterFormData, UserRole } from '@/types/auth';
import { Order } from '@/types/order';


export default function ProfileScreen() {
  const {
    user,
    session,
    isAuthenticated,
    login,
    register,
    resetPassword,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    isLoading,
    switchDemoRole,
    updateUserLoyaltyPoints,
  } = useAuth();

  // Modals for UC07, UC08, UC09, UC10
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [bookingHistoryVisible, setBookingHistoryVisible] = useState(false);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Change Password Modal
  const [changePwdModalVisible, setChangePwdModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Avatar Picker Modal
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Logout Confirm Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Delete Account Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Session Info Modal
  const [sessionModalVisible, setSessionModalVisible] = useState(false);

  // Notifications (UC43) & Admin Management Hub (UC37, 39, 41, 42, 44, 45)
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [adminHubVisible, setAdminHubVisible] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const [notifRes, orderRes] = await Promise.all([
        NotificationAPI.getUnreadCount(user.id),
        OrderAPI.getOrders({ userId: user.id }),
      ]);
      if (notifRes.success) setUnreadNotifs(notifRes.count || 0);
      if (orderRes.success) setMyOrders(orderRes.orders || []);
    } catch (err) {
      console.log('[Load Profile Data Error]', err);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Đang tải thông tin phiên đăng nhập...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Guest State - When not logged in: Render the unified, official LoginScreen (Image 2)
  if (!isAuthenticated || !user) {
    return <LoginScreen isTab={true} />;
  }

  // Authenticated State - Active Session
  const handleOpenEdit = () => {
    setEditName(user.fullName);
    setEditPhone(user.phone);
    setEditError(null);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || !NAME_REGEX.test(trimmedName)) {
      setEditError('Họ và tên không hợp lệ (tối thiểu 2 ký tự)');
      return;
    }

    if (!trimmedPhone || !VN_PHONE_REGEX.test(trimmedPhone)) {
      setEditError('Số điện thoại không hợp lệ (phải gồm 10 chữ số)');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    const res = await updateProfile({
      fullName: trimmedName,
      phone: trimmedPhone,
    });

    setIsUpdating(false);
    if (res.success) {
      setEditModalVisible(false);
      Alert.alert('Thành công', res.message);
    } else {
      setEditError(res.message);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setLogoutModalVisible(false);
    router.replace('/login');
  };

  const CINEMA_AVATARS = [
    { id: '1', name: 'Bắp bơ', icon: 'fast-food' as const, color: '#F59E0B' },
    { id: '2', name: 'Cuộn phim', icon: 'film' as const, color: '#E50914' },
    { id: '3', name: 'Đạo diễn', icon: 'videocam' as const, color: '#8B5CF6' },
    { id: '4', name: 'Vé VIP', icon: 'ticket' as const, color: '#10B981' },
    { id: '5', name: 'Ngôi sao', icon: 'star' as const, color: '#EC4899' },
    { id: '6', name: 'Cúp vàng', icon: 'trophy' as const, color: '#EAB308' },
  ];

  const handleOpenChangePassword = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPwdError(null);
    setChangePwdModalVisible(true);
  };

  const handleSaveNewPassword = async () => {
    setPwdError(null);
    if (!oldPassword) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsChangingPwd(true);
    const res = await changePassword(oldPassword, newPassword);
    setIsChangingPwd(false);

    if (res.success) {
      setChangePwdModalVisible(false);
      Alert.alert('Thành công', res.message);
    } else {
      setPwdError(res.message);
    }
  };

  const handleSelectAvatar = async (avatarItem: typeof CINEMA_AVATARS[0]) => {
    await updateProfile({
      avatarUrl: `cinema_avatar_${avatarItem.icon}`,
    });
    setAvatarModalVisible(false);
    Alert.alert('Thành công', `Đã cập nhật ảnh đại diện: ${avatarItem.name}!`);
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    const res = await deleteAccount();
    setIsDeleting(false);
    setDeleteModalVisible(false);
    if (!res.success) {
      Alert.alert('Lỗi', res.message);
    } else {
      router.replace('/login');
    }
  };



  // Mock booked tickets for this customer
  const sampleTickets = [
    {
      id: 'TCK-8821',
      movieTitle: 'Dune: Part Two (Hành Tinh Cát)',
      theater: 'CineMax Vincom Đồng Khởi - Rạp 03',
      showtime: '20:15 - Hôm nay',
      seats: 'F08, F09 (VIP)',
      status: 'Đã xác nhận',
    },
  ];

  // Current avatar icon determination
  const currentAvatarIcon = user.avatarUrl?.startsWith('cinema_avatar_')
    ? (user.avatarUrl.replace('cinema_avatar_', '') as any)
    : 'person';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hồ Sơ Khách Hàng</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => setNotifModalVisible(true)}
              activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              {unreadNotifs > 0 && (
                <View style={styles.notifBadgeCircle}>
                  <Text style={styles.notifBadgeNum}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sessionStatusBadge}
              onPress={() => setSessionModalVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.statusDot} />
              <Text style={styles.sessionStatusText}>Phiên hoạt động</Text>
              <Ionicons name="information-circle-outline" size={14} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* VIP Membership Card (UC10) */}
        <TouchableOpacity
          style={styles.membershipCard}
          onPress={() => setMembershipModalVisible(true)}
          activeOpacity={0.88}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardBrand}>CINEMAX PRIVILEGE</Text>
              <Text style={styles.cardTier}>HẠNG {user.membershipTier.toUpperCase()}</Text>
            </View>
            <View style={styles.cardChip}>
              <Ionicons name="hardware-chip-outline" size={30} color="#F59E0B" />
            </View>
          </View>

          <View style={styles.cardMiddleRow}>
            <Text style={styles.cardCustomerName}>{user.fullName.toUpperCase()}</Text>
            <Text style={styles.cardPhone}>{user.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}</Text>
          </View>

          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardPointLabel}>ĐIỂM TÍCH LŨY</Text>
              <Text style={styles.cardPoints}>{user.loyaltyPoints} PTS</Text>
            </View>

            {/* Virtual Barcode */}
            <View style={styles.barcodeWrapper}>
              <View style={styles.barcodeLines}>
                {[12, 6, 18, 8, 20, 10, 16, 7, 22, 12, 14, 8, 18, 9, 21].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.barcodeBar,
                      { height: h, width: i % 2 === 0 ? 2 : 1.5 },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.barcodeText}>ID: {user.id.substring(0, 12)}</Text>
            </View>
          </View>

          <View style={styles.cardActionFooter}>
            <Ionicons name="gift-outline" size={14} color="#F59E0B" />
            <Text style={styles.cardActionFooterText}>Xem đặc quyền hạng & Đổi thưởng tích lũy</Text>
            <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
          </View>
        </TouchableOpacity>

        {/* Booking History & Upcoming Tickets Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="ticket" size={18} color="#E50914" />
              <Text style={styles.sectionTitle}>Vé & Lịch sử Đặt Vé</Text>
            </View>
            <TouchableOpacity
              style={styles.openFeatureBtn}
              onPress={() => setBookingHistoryVisible(true)}>
              <Text style={styles.openFeatureBtnText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={13} color="#E50914" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.ticketPreviewCard}
            onPress={() => setBookingHistoryVisible(true)}
            activeOpacity={0.85}>
            <View style={styles.ticketPreviewBadge}>
              <Text style={styles.ticketPreviewBadgeText}>SẮP CHIẾU HÔM NAY</Text>
            </View>
            <Text style={styles.ticketPreviewTitle}>Dune: Hành Tinh Cát - Phần 2 (IMAX 3D)</Text>
            <Text style={styles.ticketPreviewMeta}>
              📍 CineMax Vincom Đồng Khởi • Rạp 03 • Ghế: F08, F09 (VIP)
            </Text>
            <View style={styles.ticketPreviewActionRow}>
              <Ionicons name="qr-code-outline" size={16} color="#3B82F6" />
              <Text style={styles.ticketPreviewActionText}>Mở vé điện tử & Mã QR soát vé vào rạp</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Administration & Role Management Section - CHỈ HIỂN THỊ KHI LÀ ADMIN */}
        {user.role === 'admin' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Quản Trị Hệ Thống & Phân Quyền</Text>
              </View>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>Quản trị viên</Text>
              </View>
            </View>

            <Text style={styles.adminSectionDesc}>
              Khu vực dành riêng cho quản trị viên: Quản lý danh sách tài khoản, xem/thay đổi trạng thái hoạt động và thiết lập phân quyền người dùng.
            </Text>

            <TouchableOpacity
              style={styles.adminLaunchBtn}
              onPress={() => setAdminModalVisible(true)}
              activeOpacity={0.85}>
              <Ionicons name="people-outline" size={18} color="#FFFFFF" />
              <Text style={styles.adminLaunchBtnText}>
                Mở Quản Trị Tài Khoản & Phân Quyền
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Admin Management Hub Access - Chỉ hiển thị cho Admin */}
        {user.role === 'admin' && (
          <TouchableOpacity
            style={styles.adminHubCard}
            onPress={() => setAdminHubVisible(true)}
            activeOpacity={0.85}>
            <View style={styles.adminHubLeft}>
              <View style={styles.adminHubIconCircle}>
                <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.adminHubTitle}>TRUNG TÂM QUẢN TRỊ CINEMAX</Text>
                  <View style={styles.adminHubRolePill}>
                    <Text style={styles.adminHubRoleText}>Admin Access</Text>
                  </View>
                </View>
                <Text style={styles.adminHubSub}>
                  Quản lý Đồ ăn, Khuyến mãi, Đánh giá, Thông báo, Đơn đồ ăn & Báo cáo doanh thu
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Customer Info Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
            <View style={styles.headerActionRow}>
              <TouchableOpacity
                onPress={handleOpenChangePassword}
                style={styles.headerActionBtn}
                activeOpacity={0.75}>
                <Ionicons name="key-outline" size={13} color="#F59E0B" />
                <Text style={styles.headerActionTextKey}>Đổi mật khẩu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenEdit}
                style={styles.editBtn}
                activeOpacity={0.75}>
                <Ionicons name="pencil" size={13} color="#E50914" />
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Banner */}
          <View style={styles.avatarRowContainer}>
            <TouchableOpacity
              style={styles.avatarBubble}
              onPress={() => setAvatarModalVisible(true)}
              activeOpacity={0.8}>
              <Ionicons name={currentAvatarIcon} size={30} color="#E50914" />
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={10} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarInfoText}>
              <Text style={styles.avatarCustomerName}>{user.fullName}</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
                <Text style={styles.avatarChangeText}>Đổi biểu tượng đại diện</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Họ và tên:</Text>
            <Text style={styles.infoValue}>{user.fullName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Ngày gia nhập:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>

        {/* Quick Hub for UC09 & UC10 Action Buttons */}
        <View style={styles.quickHubRow}>
          <TouchableOpacity
            style={styles.hubActionBtn}
            onPress={() => setBookingHistoryVisible(true)}
            activeOpacity={0.85}>
            <Ionicons name="ticket-outline" size={20} color="#E50914" />
            <Text style={styles.hubActionBtnTitle}>Vé xem phim</Text>
            <Text style={styles.hubActionBtnSubtitle}>Lịch sử & E-Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubActionBtn}
            onPress={() => setMembershipModalVisible(true)}
            activeOpacity={0.85}>
            <Ionicons name="ribbon-outline" size={20} color="#F59E0B" />
            <Text style={styles.hubActionBtnTitle}>Hội viên CineMax</Text>
            <Text style={styles.hubActionBtnSubtitle}>Đổi quà & Tích điểm</Text>
          </TouchableOpacity>
        </View>

        {/* Tickets & Food Orders (UC38 & UC44) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vé xem phim & Đơn đồ ăn của bạn</Text>
            <Text style={styles.ticketCount}>
              {myOrders.length > 0 ? `${myOrders.length} đơn` : `${sampleTickets.length} vé`}
            </Text>
          </View>

          {myOrders.length > 0 ? (
            myOrders.map((ord) => (
              <View key={ord.id} style={styles.ticketItem}>
                <View style={styles.ticketHeader}>
                  <Ionicons name="film-outline" size={18} color="#E50914" />
                  <Text style={styles.ticketMovieTitle}>{ord.movie?.title || 'Phim rạp'}</Text>
                  <View
                    style={[
                      styles.orderStatusChip,
                      {
                        backgroundColor:
                          ord.orderStatus === 'ready'
                            ? '#10B98125'
                            : ord.orderStatus === 'completed'
                              ? '#3B82F625'
                              : '#F59E0B25',
                      },
                    ]}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color:
                          ord.orderStatus === 'ready'
                            ? '#10B981'
                            : ord.orderStatus === 'completed'
                              ? '#3B82F6'
                              : '#F59E0B',
                      }}>
                      {ord.orderStatus === 'preparing' && 'Đang chuẩn bị'}
                      {ord.orderStatus === 'ready' && 'Đã sẵn sàng nhận'}
                      {ord.orderStatus === 'completed' && 'Đã hoàn tất'}
                      {ord.orderStatus === 'cancelled' && 'Đã hủy'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketTheater}>
                  {ord.theater?.name} • {ord.theater?.room}
                </Text>

                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketShowtime}>
                    🕒 {ord.theater?.showtimeTime} ({ord.theater?.showtimeDate})
                  </Text>
                  <Text style={styles.ticketSeats}>
                    Ghế: {(ord.tickets || []).map((t) => t.seatNumber).join(', ')}
                  </Text>
                </View>

                {ord.foods && ord.foods.length > 0 && (
                  <View style={styles.ticketFoodRow}>
                    <Ionicons name="fast-food-outline" size={14} color="#F59E0B" />
                    <Text style={styles.ticketFoodText}>
                      Đồ ăn: {ord.foods.map((f) => `${f.name} x${f.quantity}`).join(', ')}
                    </Text>
                  </View>
                )}

                <View style={styles.ticketPriceRow}>
                  <Text style={styles.ticketOrderCode}>Mã đơn: #{ord.orderCode}</Text>
                  <Text style={styles.ticketPriceVal}>
                    {ord.totalPrice?.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
            ))
          ) : (
            sampleTickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketItem}>
                <View style={styles.ticketHeader}>
                  <Ionicons name="film-outline" size={18} color="#E50914" />
                  <Text style={styles.ticketMovieTitle}>{ticket.movieTitle}</Text>
                </View>
                <Text style={styles.ticketTheater}>{ticket.theater}</Text>
                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketShowtime}>🕒 {ticket.showtime}</Text>
                  <Text style={styles.ticketSeats}>Ghế: {ticket.seats}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>ĐĂNG XUẤT</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={() => setDeleteModalVisible(true)}
          activeOpacity={0.8}>
          <Text style={styles.deleteAccountText}>Xóa tài khoản thành viên</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật thông tin</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {editError && (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            )}

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Họ và tên</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Số điện thoại</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="0901234567"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                disabled={isUpdating}>
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out" size={32} color="#EF4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.logoutModalDesc}>
              Bạn có chắc chắn muốn kết thúc phiên đăng nhập hiện tại không? Dữ liệu phiên sẽ được giải phóng an toàn.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
                disabled={isLoggingOut}>
                <Text style={styles.modalCancelText}>Ở lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}>
                {isLoggingOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalLogoutText}>Đăng xuất</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Technical Session Info Modal */}
      <Modal
        visible={sessionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết kỹ thuật phiên đăng nhập</Text>
              <TouchableOpacity onPress={() => setSessionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.techInfoBlock}>
              <Text style={styles.techLabel}>Session Token ID:</Text>
              <Text style={styles.techCode}>{session?.token || 'None'}</Text>

              <Text style={styles.techLabel}>User ID Khách Hàng:</Text>
              <Text style={styles.techCode}>{user.id}</Text>

              <Text style={styles.techLabel}>Thời điểm khởi tạo:</Text>
              <Text style={styles.techCode}>
                {session ? new Date(session.createdAt).toISOString() : 'None'}
              </Text>

              <Text style={styles.techLabel}>Thời điểm hết hạn:</Text>
              <Text style={styles.techCode}>
                {session ? new Date(session.expiresAt).toISOString() : 'None'}
              </Text>

              <Text style={styles.techLabel}>Cơ chế lưu trữ:</Text>
              <Text style={styles.techCode}>AsyncStorage (Key: @movie_theater_session_v1)</Text>
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setSessionModalVisible(false)}>
              <Text style={styles.modalCancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePwdModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePwdModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu tài khoản</Text>
              <TouchableOpacity onPress={() => setChangePwdModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {pwdError && (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.modalErrorText}>{pwdError}</Text>
              </View>
            )}

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Mật khẩu hiện tại</Text>
              <TextInput
                style={styles.modalInput}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Mật khẩu mới (tối thiểu 6 ký tự)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setChangePwdModalVisible(false)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveNewPassword}
                disabled={isChangingPwd}>
                {isChangingPwd ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Cập nhật</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn biểu tượng đại diện</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.avatarModalDesc}>
              Chọn biểu tượng chủ đề điện ảnh mà bạn yêu thích nhất:
            </Text>

            <View style={styles.avatarGrid}>
              {CINEMA_AVATARS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.avatarGridItem}
                  onPress={() => handleSelectAvatar(item)}
                  activeOpacity={0.8}>
                  <View style={[styles.avatarIconCircle, { backgroundColor: item.color + '25', borderColor: item.color }]}>
                    <Ionicons name={item.icon} size={28} color={item.color} />
                  </View>
                  <Text style={styles.avatarGridLabel}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setAvatarModalVisible(false)}>
              <Text style={styles.modalCancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Xóa tài khoản thành viên</Text>
            <Text style={styles.logoutModalDesc}>
              Hành động này sẽ xóa vĩnh viễn tài khoản của bạn, bao gồm lịch sử vé xem phim và toàn bộ điểm tích lũy. Bạn có chắc chắn không?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}>
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleConfirmDeleteAccount}
                disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalLogoutText}>Xác nhận xóa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Account Management & Role Authorization Modal */}
      <AdminAccountManagementModal
        visible={adminModalVisible && user.role === 'admin'}
        onClose={() => setAdminModalVisible(false)}
        token={session?.token}
        currentUser={user}
      />

      {/* UC09: Booking History & E-Ticket Modal */}
      <BookingHistoryModal
        visible={bookingHistoryVisible}
        onClose={() => setBookingHistoryVisible(false)}
        token={session?.token}
        onBookingAdded={(newPts) => updateUserLoyaltyPoints?.(newPts)}
      />

      {/* UC10: Membership & Loyalty Points Modal */}
      <MembershipModal
        visible={membershipModalVisible}
        onClose={() => setMembershipModalVisible(false)}
        token={session?.token}
        user={user}
        onPointsUpdated={(newPts) => updateUserLoyaltyPoints?.(newPts)}
      />

      {/* UC43: View Notifications & Mark As Read */}
      <NotificationModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
        onNotificationsUpdated={fetchProfileData}
      />

      {/* Admin Management Hub Modal (UC37, UC39, UC41, UC42, UC44, UC45) */}
      <AdminManagementHubModal
        visible={adminHubVisible && user.role === 'admin'}
        onClose={() => {
          setAdminHubVisible(false);
          fetchProfileData();
        }}
      />
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2430',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E50914',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0B0C10',
  },
  notifBadgeNum: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  adminHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginBottom: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  adminHubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  adminHubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminHubTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adminHubRolePill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  adminHubRoleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0B0C10',
  },
  adminHubSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
    lineHeight: 15,
  },
  orderStatusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  ticketFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#151821',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  ticketFoodText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
    flex: 1,
  },
  ticketPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  ticketOrderCode: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  ticketPriceVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E50914',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sessionStatusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  membershipCard: {
    backgroundColor: '#1F2430',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: '#9CA3AF',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  cardTier: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  cardChip: {
    padding: 2,
  },
  cardMiddleRow: {
    marginVertical: 18,
  },
  cardCustomerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardPhone: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  cardPointLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    letterSpacing: 1,
  },
  cardPoints: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  barcodeWrapper: {
    alignItems: 'flex-end',
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 24,
  },
  barcodeBar: {
    backgroundColor: '#E5E7EB',
  },
  barcodeText: {
    color: '#9CA3AF',
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 3,
  },
  cardActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginHorizontal: -16,
    marginBottom: -16,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardActionFooterText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 6,
  },
  openFeatureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openFeatureBtnText: {
    fontSize: 12,
    color: '#E50914',
    fontWeight: '600',
  },
  ticketPreviewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ticketPreviewBadge: {
    backgroundColor: '#E50914',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  ticketPreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketPreviewTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  ticketPreviewMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  ticketPreviewActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  ticketPreviewActionText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  roleTag: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: 'bold',
  },
  adminSectionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 10,
  },
  demoRoleSwitcher: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoRoleLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  demoRoleButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoRoleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoRoleChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  demoRoleChipText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  demoRoleChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  adminLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  adminLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  quickHubRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  hubActionBtn: {
    flex: 1,
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#232838',
  },
  hubActionBtnTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 8,
  },
  hubActionBtnSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  sessionHeaderTitle: {
    flex: 1,
    marginRight: 8,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  headerActionTextKey: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.25)',
  },
  editBtnText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  avatarBubble: {
    position: 'relative',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1F2430',
    borderWidth: 1.5,
    borderColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#E50914',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#151821',
  },
  avatarInfoText: {
    flex: 1,
  },
  avatarCustomerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  avatarChangeText: {
    color: '#E50914',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 13.5,
    marginLeft: 10,
    width: 100,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexShrink: 0,
    alignSelf: 'center',
  },
  activeTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  sessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  sessionGridItem: {
    width: '48%',
    backgroundColor: '#0F121B',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1F2430',
  },
  sessionGridLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  sessionGridValue: {
    color: '#D1D5DB',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 3,
  },
  sessionDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  sessionDetailButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  ticketCount: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '700',
  },
  ticketItem: {
    backgroundColor: '#0F121B',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E50914',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticketMovieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ticketTheater: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
    paddingTop: 6,
  },
  ticketShowtime: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  ticketSeats: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  deleteAccountText: {
    color: '#6B7280',
    fontSize: 12.5,
    textDecorationLine: 'underline',
  },
  avatarModalDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatarGridItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#0F121B',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2430',
  },
  avatarIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarGridLabel: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  guestHero: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 6,
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
  },
  guestActionBlock: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  primaryAuthButton: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAuthButton: {
    backgroundColor: '#1F2430',
    borderWidth: 1,
    borderColor: '#E50914',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAuthButtonText: {
    color: '#E50914',
    fontSize: 15,
    fontWeight: '700',
  },
  benefitsCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#232838',
  },
  benefitsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitHead: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  benefitDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#2D3345',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12.5,
    flex: 1,
  },
  modalField: {
    marginBottom: 14,
  },
  modalLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#0F121B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3345',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1F2430',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#E50914',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutModalDesc: {
    fontSize: 13.5,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalLogoutBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLogoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  techInfoBlock: {
    backgroundColor: '#0F121B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  techLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 6,
  },
  techCode: {
    color: '#E5E7EB',
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
    backgroundColor: '#151821',
    padding: 4,
    borderRadius: 4,
  },
  guestTabSwitcher: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#141722',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#232938',
  },
  guestTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9,
  },
  guestTabBtnActive: {
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  guestTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  guestTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  guestAuthCard: {
    width: '100%',
    backgroundColor: '#141722',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232938',
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  demoFillSection: {
    backgroundColor: '#0F121B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E2435',
  },
  demoFillHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  demoFillTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  demoFillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoFillPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#151926',
    borderWidth: 1,
    borderColor: '#293247',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  demoFillPillActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  demoFillPillAdminActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  demoFillPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  guestDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  guestDemoText: {
    fontSize: 12,
    color: '#F3F4F6',
    flex: 1,
  },
  guestDemoBold: {
    fontWeight: '700',
    color: '#FBBF24',
  },
  guestAlertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  guestAlertErrorText: {
    color: '#FCA5A5',
    fontSize: 12.5,
    flex: 1,
  },
  guestAlertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  guestAlertSuccessText: {
    color: '#6EE7B7',
    fontSize: 12.5,
    flex: 1,
  },
  guestField: {
    marginBottom: 16,
    width: '100%',
  },
  guestLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  guestInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F121B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262D3D',
    paddingHorizontal: 14,
    height: 48,
  },
  guestInputIcon: {
    marginRight: 10,
  },
  guestTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  guestPassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestForgotLink: {
    color: '#E50914',
    fontSize: 12.5,
    fontWeight: '600',
  },
  guestCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  guestCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  guestCheckboxChecked: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  guestCheckboxText: {
    color: '#D1D5DB',
    fontSize: 13,
    flex: 1,
  },
  guestSubmitBtn: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  guestSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  demoTestingCard: {
    backgroundColor: '#121622',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262F44',
    marginTop: 20,
    marginBottom: 30,
  },
  demoTestingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  demoTestingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  demoTestingDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
  },
  guestRegPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  guestRegPromoText: {
    fontSize: 12.5,
    color: '#F3F4F6',
    flex: 1,
  },
  guestCriteriaBox: {
    backgroundColor: '#0B0D14',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 4,
  },
  guestCriteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestCriteriaText: {
    fontSize: 11,
    color: '#6B7280',
  },
});

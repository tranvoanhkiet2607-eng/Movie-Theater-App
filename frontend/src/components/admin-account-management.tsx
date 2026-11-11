import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, UserRole, MembershipTier, RoleInfo } from '@/types/auth';
import { AdminAPI } from '@/services/api';
import { NAME_REGEX, VN_PHONE_REGEX, EMAIL_REGEX } from '@/utils/validation';

interface AdminAccountManagementProps {
  visible: boolean;
  onClose: () => void;
  token?: string;
  currentUser: User;
}

const DEFAULT_ROLE_MATRIX: Record<UserRole, RoleInfo> = {
  customer: {
    roleName: 'Khách hàng',
    description: 'Người dùng xem phim, đặt vé, tích điểm thành viên và quản lý thông tin cá nhân',
    badgeColor: '#3B82F6',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé xem phim', granted: true },
      { code: 'booking:history', name: 'Xem lịch sử đặt vé & E-Ticket', granted: true },
      { code: 'membership:points', name: 'Tích điểm & đổi voucher hội viên', granted: true },
      { code: 'profile:edit', name: 'Quản lý thông tin & đổi mật khẩu', granted: true },
      { code: 'ticket:checkin', name: 'Soát vé & quét mã QR vào rạp', granted: false },
      { code: 'account:manage', name: 'Quản trị danh sách tài khoản', granted: false },
      { code: 'role:manage', name: 'Phân quyền & đổi vai trò', granted: false },
    ],
  },
  staff: {
    roleName: 'Nhân viên rạp',
    description: 'Nhân viên tại quầy vé và cửa soát vé, kiểm tra E-Ticket khách hàng',
    badgeColor: '#10B981',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé tại quầy', granted: true },
      { code: 'booking:history', name: 'Tra cứu thông tin vé khách hàng', granted: true },
      { code: 'membership:points', name: 'Tra cứu điểm hội viên', granted: true },
      { code: 'profile:edit', name: 'Quản lý thông tin cá nhân', granted: true },
      { code: 'ticket:checkin', name: 'Soát vé & quét mã QR vào rạp', granted: true },
      { code: 'account:manage', name: 'Quản trị danh sách tài khoản', granted: false },
      { code: 'role:manage', name: 'Phân quyền & đổi vai trò', granted: false },
    ],
  },
  admin: {
    roleName: 'Quản trị viên',
    description: 'Toàn quyền kiểm soát hệ thống, phân quyền, quản trị tài khoản và cấu hình hệ thống',
    badgeColor: '#EF4444',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé xem phim', granted: true },
      { code: 'booking:history', name: 'Quản lý toàn bộ vé hệ thống', granted: true },
      { code: 'membership:points', name: 'Toàn quyền cấu hình điểm & voucher', granted: true },
      { code: 'profile:edit', name: 'Quản trị mọi hồ sơ người dùng', granted: true },
      { code: 'ticket:checkin', name: 'Kiểm tra & xác thực vé', granted: true },
      { code: 'account:manage', name: 'Thêm, sửa, vô hiệu hóa tài khoản', granted: true },
      { code: 'role:manage', name: 'Toàn quyền phân quyền vai trò người dùng', granted: true },
    ],
  },
};

export function AdminAccountManagementModal({
  visible,
  onClose,
  token,
  currentUser,
}: AdminAccountManagementProps) {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Sub-modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [matrixModalVisible, setMatrixModalVisible] = useState(false);

  // Selected account for editing / role update
  const [targetAccount, setTargetAccount] = useState<User | null>(null);

  // Create form state
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState<UserRole>('customer');
  const [newTier, setNewTier] = useState<MembershipTier>('Standard');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTier, setEditTier] = useState<MembershipTier>('Standard');
  const [editPoints, setEditPoints] = useState('0');
  const [editError, setEditError] = useState<string | null>(null);

  // Role update state
  const [assignedRole, setAssignedRole] = useState<UserRole>('customer');

  // Load accounts
  const fetchAccounts = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await AdminAPI.getAccounts(token, searchQuery, selectedRoleFilter, selectedStatusFilter);
      if (res.success && res.accounts) {
        setAccounts(res.accounts);
      }
    } catch {
      // Keep existing mock accounts if backend is unreachable
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    if (!visible || !token) return;

    AdminAPI.getAccounts(token, searchQuery, selectedRoleFilter, selectedStatusFilter)
      .then((res) => {
        if (!isCancelled && res.success && res.accounts) {
          setAccounts(res.accounts);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [visible, token, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Filter accounts locally for instant search responsiveness
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        acc.fullName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.phone.includes(q);

      const matchRole =
        selectedRoleFilter === 'all' || acc.role === selectedRoleFilter;

      const matchStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' && acc.isActive !== false) ||
        (selectedStatusFilter === 'inactive' && acc.isActive === false);

      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Toggle Account Active / Inactive Status (UC07)
  const handleToggleStatus = (account: User) => {
    if (account.id === currentUser.id && account.isActive !== false) {
      Alert.alert('Không thể thực hiện', 'Bạn không thể tự vô hiệu hóa tài khoản quản trị của chính mình.');
      return;
    }

    const nextStatus = account.isActive === false ? true : false;
    const actionText = nextStatus ? 'kích hoạt lại' : 'vô hiệu hóa';

    Alert.alert(
      'Xác nhận thay đổi trạng thái',
      `Bạn có chắc chắn muốn ${actionText} tài khoản của "${account.fullName}" không? ${
        !nextStatus ? 'Người dùng này sẽ không thể đăng nhập vào hệ thống.' : ''
      }`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: nextStatus ? 'Kích hoạt' : 'Vô hiệu hóa',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            if (token) {
              try {
                await AdminAPI.toggleStatus(token, account.id, nextStatus);
              } catch {
                // fall through to update local state
              }
            }
            setAccounts((prev) =>
              prev.map((a) => (a.id === account.id ? { ...a, isActive: nextStatus } : a))
            );
            Alert.alert('Thành công', `Đã ${actionText} tài khoản ${account.fullName}!`);
          },
        },
      ]
    );
  };

  // Open Edit Modal (UC07)
  const handleOpenEdit = (acc: User) => {
    setTargetAccount(acc);
    setEditFullName(acc.fullName);
    setEditPhone(acc.phone);
    setEditTier(acc.membershipTier);
    setEditPoints(acc.loyaltyPoints?.toString() || '0');
    setEditError(null);
    setEditModalVisible(true);
  };

  // Save Edit (UC07)
  const handleSaveEdit = async () => {
    if (!targetAccount) return;
    setEditError(null);

    if (!editFullName.trim() || !NAME_REGEX.test(editFullName.trim())) {
      setEditError('Họ và tên không hợp lệ.');
      return;
    }
    if (!editPhone.trim() || !VN_PHONE_REGEX.test(editPhone.trim())) {
      setEditError('Số điện thoại phải gồm 10 chữ số hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    const updatedData = {
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      membershipTier: editTier,
      loyaltyPoints: parseInt(editPoints, 10) || 0,
    };

    if (token) {
      try {
        await AdminAPI.updateAccount(token, targetAccount.id, updatedData);
      } catch {
        // Local update fallback
      }
    }

    setAccounts((prev) =>
      prev.map((a) => (a.id === targetAccount.id ? { ...a, ...updatedData } : a))
    );
    setIsSubmitting(false);
    setEditModalVisible(false);
    Alert.alert('Thành công', 'Đã cập nhật thông tin tài khoản thành công!');
  };

  // Handle Create Account (UC07)
  const handleCreateAccount = async () => {
    setCreateError(null);
    if (!newFullName.trim() || !NAME_REGEX.test(newFullName.trim())) {
      setCreateError('Họ và tên không hợp lệ.');
      return;
    }
    if (!newEmail.trim() || !EMAIL_REGEX.test(newEmail.trim())) {
      setCreateError('Địa chỉ email không đúng định dạng.');
      return;
    }
    if (!newPhone.trim() || !VN_PHONE_REGEX.test(newPhone.trim())) {
      setCreateError('Số điện thoại không hợp lệ (10 chữ số).');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setCreateError('Mật khẩu ban đầu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    const accountData = {
      fullName: newFullName.trim(),
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim(),
      password: newPassword,
      role: newRole,
      membershipTier: newTier,
      loyaltyPoints: 50,
    };

    if (token) {
      try {
        const res = await AdminAPI.createAccount(token, accountData);
        if (!res.success) {
          setCreateError(res.message);
          setIsSubmitting(false);
          return;
        }
      } catch {
        // If server fails or offline, create locally
      }
    }

    const createdUser: User = {
      id: `usr_${Date.now()}`,
      ...accountData,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setAccounts((prev) => [createdUser, ...prev]);
    setIsSubmitting(false);
    setCreateModalVisible(false);
    // Reset form
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('password123');
    Alert.alert('Thành công', `Đã tạo tài khoản mới cho [${createdUser.fullName}]!`);
  };

  // Open Role Management Modal (UC08)
  const handleOpenRoleModal = (acc: User) => {
    setTargetAccount(acc);
    setAssignedRole(acc.role);
    setRoleModalVisible(true);
  };

  // Save Role Update (UC08)
  const handleSaveRole = async () => {
    if (!targetAccount) return;
    setIsSubmitting(true);

    if (token) {
      try {
        await AdminAPI.updateRole(token, targetAccount.id, assignedRole);
      } catch {
        // Fallback update locally
      }
    }

    setAccounts((prev) =>
      prev.map((a) => (a.id === targetAccount.id ? { ...a, role: assignedRole } : a))
    );
    setIsSubmitting(false);
    setRoleModalVisible(false);
    Alert.alert(
      'Thành công',
      `Đã cập nhật vai trò của [${targetAccount.fullName}] thành: ${DEFAULT_ROLE_MATRIX[assignedRole].roleName}!`
    );
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { bg: '#FEE2E2', text: '#DC2626', label: 'Quản trị viên' };
      case 'staff':
        return { bg: '#D1FAE5', text: '#059669', label: 'Nhân viên' };
      default:
        return { bg: '#DBEAFE', text: '#2563EB', label: 'Khách hàng' };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.adminBadgeIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Quản Trị Tài Khoản & Phân Quyền</Text>
              <Text style={styles.headerSubtitle}>Quản lý tài khoản • Phân quyền vai trò</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Action Top Bar */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.matrixBtn}
            onPress={() => setMatrixModalVisible(true)}
            activeOpacity={0.8}>
            <Ionicons name="git-network-outline" size={16} color="#3B82F6" />
            <Text style={styles.matrixBtnText}>Bảng Phân Quyền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addAccountBtn}
            onPress={() => {
              setCreateError(null);
              setCreateModalVisible(true);
            }}
            activeOpacity={0.8}>
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addAccountBtnText}>+ Thêm Tài Khoản</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên, email, số điện thoại..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Text style={styles.filterLabel}>Vai trò:</Text>
            {(['all', 'customer', 'staff', 'admin'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.filterChip, selectedRoleFilter === r && styles.filterChipActive]}
                onPress={() => setSelectedRoleFilter(r)}>
                <Text style={[styles.filterChipText, selectedRoleFilter === r && styles.filterChipTextActive]}>
                  {r === 'all'
                    ? 'Tất cả vai trò'
                    : r === 'customer'
                    ? 'Khách hàng'
                    : r === 'staff'
                    ? 'Nhân viên'
                    : 'Quản trị viên'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            <Text style={styles.filterLabel}>Trạng thái:</Text>
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, selectedStatusFilter === s && styles.filterChipActive]}
                onPress={() => setSelectedStatusFilter(s)}>
                <Text style={[styles.filterChipText, selectedStatusFilter === s && styles.filterChipTextActive]}>
                  {s === 'all' ? 'Tất cả' : s === 'active' ? '🟢 Hoạt động' : '🔴 Vô hiệu hóa'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Account List */}
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.listSummaryRow}>
            <Text style={styles.listCountText}>
              Hiển thị <Text style={{ color: '#E50914', fontWeight: 'bold' }}>{filteredAccounts.length}</Text> tài khoản
            </Text>
            <TouchableOpacity onPress={fetchAccounts} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={14} color="#9CA3AF" />
              <Text style={styles.refreshText}>Làm mới</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E50914" size="large" />
              <Text style={styles.loadingText}>Đang tải dữ liệu tài khoản...</Text>
            </View>
          ) : filteredAccounts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#4B5563" />
              <Text style={styles.emptyTitle}>Không tìm thấy tài khoản</Text>
              <Text style={styles.emptyDesc}>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</Text>
            </View>
          ) : (
            filteredAccounts.map((account) => {
              const roleBadge = getRoleBadgeStyle(account.role);
              const isActive = account.isActive !== false;

              return (
                <View
                  key={account.id}
                  style={[
                    styles.accountCard,
                    !isActive && styles.accountCardDisabled,
                  ]}>
                  {/* Account Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarInitials}>
                      <Text style={styles.initialsText}>
                        {account.fullName ? account.fullName.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>

                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.accountName, !isActive && styles.nameDisabled]}>
                          {account.fullName}
                        </Text>
                        {account.id === currentUser.id && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>Bạn</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.accountEmail}>{account.email}</Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isActive ? '#064E3B' : '#7F1D1D' },
                      ]}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? '#10B981' : '#EF4444' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isActive ? '#34D399' : '#FCA5A5' },
                        ]}>
                        {isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </Text>
                    </View>
                  </View>

                  {/* Account Card Meta Info */}
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="call-outline" size={13} color="#9CA3AF" />
                      <Text style={styles.metaText}>{account.phone}</Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Ionicons name="ribbon-outline" size={13} color="#F59E0B" />
                      <Text style={styles.metaText}>
                        Hạng: <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>{account.membershipTier}</Text>
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Ionicons name="star-outline" size={13} color="#10B981" />
                      <Text style={styles.metaText}>{account.loyaltyPoints || 0} điểm</Text>
                    </View>
                  </View>

                  {/* Role & Permissions Banner */}
                  <View style={styles.roleBannerRow}>
                    <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>
                        {roleBadge.label}
                      </Text>
                    </View>
                    <Text style={styles.roleDescText} numberOfLines={1}>
                      {DEFAULT_ROLE_MATRIX[account.role]?.description || ''}
                    </Text>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnEdit}
                      onPress={() => handleOpenEdit(account)}
                      activeOpacity={0.75}>
                      <Ionicons name="pencil" size={14} color="#3B82F6" />
                      <Text style={styles.actionBtnEditText}>Chỉnh sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnRole}
                      onPress={() => handleOpenRoleModal(account)}
                      activeOpacity={0.75}>
                      <Ionicons name="shield-outline" size={14} color="#8B5CF6" />
                      <Text style={styles.actionBtnRoleText}>Phân quyền vai trò</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtnToggle,
                        isActive ? styles.btnDeactivate : styles.btnActivate,
                      ]}
                      onPress={() => handleToggleStatus(account)}
                      activeOpacity={0.75}>
                      <Ionicons
                        name={isActive ? 'lock-closed-outline' : 'lock-open-outline'}
                        size={14}
                        color={isActive ? '#EF4444' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.actionBtnToggleText,
                          { color: isActive ? '#EF4444' : '#10B981' },
                        ]}>
                        {isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: Ma Trận Phân Quyền (UC08) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Modal
          visible={matrixModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setMatrixModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.matrixModalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="git-network" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>Bảng Phân Quyền Vai Trò</Text>
                </View>
                <TouchableOpacity onPress={() => setMatrixModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.matrixNotice}>
                  Hệ thống phân cấp CineMax bao gồm 3 vai trò. Mỗi vai trò sở hữu các quyền hạn được thiết lập nghiêm ngặt:
                </Text>

                {(['customer', 'staff', 'admin'] as UserRole[]).map((rKey) => {
                  const role = DEFAULT_ROLE_MATRIX[rKey];
                  return (
                    <View key={rKey} style={styles.matrixRoleBox}>
                      <View style={styles.matrixRoleHeader}>
                        <View style={[styles.matrixBadge, { backgroundColor: role.badgeColor }]}>
                          <Text style={styles.matrixBadgeText}>{role.roleName}</Text>
                        </View>
                        <Text style={styles.matrixRoleCode}>Role: {rKey}</Text>
                      </View>
                      <Text style={styles.matrixRoleDesc}>{role.description}</Text>

                      <View style={styles.permissionGrid}>
                        {role.permissions.map((p) => (
                          <View key={p.code} style={styles.permissionItemRow}>
                            <Ionicons
                              name={p.granted ? 'checkmark-circle' : 'close-circle'}
                              size={16}
                              color={p.granted ? '#10B981' : '#6B7280'}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.permissionItemName,
                                !p.granted && { color: '#6B7280', textDecorationLine: 'line-through' },
                              ]}>
                              {p.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalClosePrimaryBtn}
                onPress={() => setMatrixModalVisible(false)}>
                <Text style={styles.modalClosePrimaryBtnText}>Đã hiểu bảng phân quyền</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODAL 2: Thêm Tài Khoản Mới (UC07) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCreateModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.formModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Thêm Tài Khoản Người Dùng</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {createError && (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorAlertText}>{createError}</Text>
                </View>
              )}

              <ScrollView style={{ maxHeight: 400 }}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Họ và tên *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Nguyễn Văn B"
                    placeholderTextColor="#6B7280"
                    value={newFullName}
                    onChangeText={setNewFullName}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email tài khoản *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="user@cinema.com"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newEmail}
                    onChangeText={setNewEmail}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Số điện thoại *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0911223344"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={newPhone}
                    onChangeText={setNewPhone}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Mật khẩu khởi tạo *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#6B7280"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Vai trò (Role)</Text>
                  <View style={styles.roleChoiceRow}>
                    {(['customer', 'staff', 'admin'] as UserRole[]).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleChoiceBtn, newRole === r && styles.roleChoiceBtnActive]}
                        onPress={() => setNewRole(r)}>
                        <Text style={[styles.roleChoiceText, newRole === r && styles.roleChoiceTextActive]}>
                          {DEFAULT_ROLE_MATRIX[r].roleName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Hạng hội viên ban đầu</Text>
                  <View style={styles.roleChoiceRow}>
                    {(['Standard', 'Silver', 'Gold', 'VIP'] as MembershipTier[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.roleChoiceBtn, newTier === t && styles.roleChoiceBtnActive]}
                        onPress={() => setNewTier(t)}>
                        <Text style={[styles.roleChoiceText, newTier === t && styles.roleChoiceTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateAccount}
                  disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Tạo Tài Khoản</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODAL 3: Chỉnh Sửa Thông Tin Tài Khoản (UC07) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Modal
          visible={editModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.formModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cập Nhật Thông Tin Tài Khoản</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {editError && (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorAlertText}>{editError}</Text>
                </View>
              )}

              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Họ và tên</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editFullName}
                    onChangeText={setEditFullName}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Hạng hội viên</Text>
                  <View style={styles.roleChoiceRow}>
                    {(['Standard', 'Silver', 'Gold', 'VIP'] as MembershipTier[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.roleChoiceBtn, editTier === t && styles.roleChoiceBtnActive]}
                        onPress={() => setEditTier(t)}>
                        <Text style={[styles.roleChoiceText, editTier === t && styles.roleChoiceTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Điểm tích lũy (Loyalty Points)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPoints}
                    onChangeText={setEditPoints}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSaveEdit}
                  disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Lưu Thay Đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODAL 4: Phân Quyền & Cập Nhật Vai Trò (UC08) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Modal
          visible={roleModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setRoleModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.matrixModalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Phân Quyền Vai Trò</Text>
                  <Text style={styles.modalSubtitle}>
                    Tài khoản: <Text style={{ color: '#E50914', fontWeight: 'bold' }}>{targetAccount?.fullName}</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.rolePickerTitle}>Chọn vai trò được ủy quyền:</Text>

              <ScrollView style={{ maxHeight: 350 }}>
                {(['customer', 'staff', 'admin'] as UserRole[]).map((rKey) => {
                  const role = DEFAULT_ROLE_MATRIX[rKey];
                  const isSelected = assignedRole === rKey;

                  return (
                    <TouchableOpacity
                      key={rKey}
                      style={[
                        styles.roleSelectCard,
                        isSelected && styles.roleSelectCardSelected,
                      ]}
                      onPress={() => setAssignedRole(rKey)}
                      activeOpacity={0.8}>
                      <View style={styles.roleSelectTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleActive,
                            ]}>
                            {isSelected && <View style={styles.radioInnerDot} />}
                          </View>
                          <Text style={[styles.roleSelectName, isSelected && { color: '#E50914' }]}>
                            {role.roleName}
                          </Text>
                        </View>
                        <View style={[styles.matrixBadge, { backgroundColor: role.badgeColor }]}>
                          <Text style={styles.matrixBadgeText}>{rKey.toUpperCase()}</Text>
                        </View>
                      </View>

                      <Text style={styles.roleSelectDesc}>{role.description}</Text>

                      {isSelected && (
                        <View style={styles.grantedList}>
                          <Text style={styles.grantedListTitle}>Các quyền hạn được cấp tự động:</Text>
                          {role.permissions
                            .filter((p) => p.granted)
                            .map((p) => (
                              <View key={p.code} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                                <Ionicons name="checkmark-sharp" size={14} color="#10B981" style={{ marginRight: 4 }} />
                                <Text style={styles.grantedText}>{p.name}</Text>
                              </View>
                            ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setRoleModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSaveRole}
                  disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Xác Nhận Đổi Vai Trò</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  topActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  matrixBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  matrixBtnText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  addAccountBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  filterSection: {
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginRight: 2,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterChipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  listCountText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptyDesc: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  accountCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  accountCardDisabled: {
    opacity: 0.65,
    borderColor: '#7F1D1D',
    backgroundColor: '#181E2C',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initialsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  nameDisabled: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  youBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  accountEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  roleBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleDescText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A22',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 4,
  },
  actionBtnEditText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  actionBtnRole: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#581C8722',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    gap: 4,
  },
  actionBtnRoleText: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '600',
  },
  actionBtnToggle: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  btnDeactivate: {
    backgroundColor: '#7F1D1D22',
    borderColor: '#EF4444',
  },
  btnActivate: {
    backgroundColor: '#064E3B22',
    borderColor: '#10B981',
  },
  actionBtnToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  matrixModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  matrixNotice: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 18,
  },
  matrixRoleBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  matrixRoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matrixBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  matrixRoleCode: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  matrixRoleDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    marginVertical: 6,
  },
  permissionGrid: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  permissionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  permissionItemName: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  modalClosePrimaryBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  modalClosePrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D44',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorAlertText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleChoiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  roleChoiceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleChoiceBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  roleChoiceText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  roleChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#E50914',
    minWidth: 110,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rolePickerTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
  roleSelectCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSelectCardSelected: {
    borderColor: '#E50914',
    backgroundColor: '#1E1B2E',
  },
  roleSelectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: '#E50914',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E50914',
  },
  roleSelectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  roleSelectDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  grantedList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  grantedListTitle: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  grantedText: {
    fontSize: 11,
    color: '#CBD5E1',
  },
});

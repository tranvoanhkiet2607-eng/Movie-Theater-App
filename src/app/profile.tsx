import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import {
  NAME_REGEX,
  VN_PHONE_REGEX,
  validateLoginForm,
  validateRegisterForm,
} from '@/utils/validation';

import { LoginFormData, RegisterFormData } from '@/types/auth';

interface GuestAuthProps {
  login: (data: LoginFormData) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterFormData) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPass: string) => Promise<{ success: boolean; message: string }>;
}

function GuestAuthSection({ login, register, resetPassword }: GuestAuthProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login State
  const [loginId, setLoginId] = useState('customer@cinema.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginRemember, setLoginRemember] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgreeTerms, setRegAgreeTerms] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Forgot Password State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);


  const handleQuickFillDemo = () => {
    setLoginId('customer@cinema.com');
    setLoginPassword('password123');
    setLoginError(null);
  };

  const handleLoginSubmit = async () => {
    setLoginError(null);
    setLoginSuccess(null);

    const validation = validateLoginForm({
      identifier: loginId,
      password: loginPassword,
      rememberMe: loginRemember,
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setLoginError(firstError || 'Thông tin đăng nhập không hợp lệ.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await login({
        identifier: loginId.trim(),
        password: loginPassword,
        rememberMe: loginRemember,
      });

      if (res.success) {
        setLoginSuccess(res.message);
      } else {
        setLoginError(res.message);
      }
    } catch {
      setLoginError('Có lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    setRegError(null);

    const validation = validateRegisterForm({
      fullName: regFullName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      confirmPassword: regConfirmPassword,
      agreeTerms: regAgreeTerms,
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setRegError(firstError || 'Dữ liệu đăng ký không hợp lệ.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
        agreeTerms: regAgreeTerms,
      });

      if (!res.success) {
        setRegError(res.message);
      }
    } catch {
      setRegError('Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPassword(forgotEmail.trim(), forgotNewPassword);
      if (res.success) {
        setForgotSuccess(res.message);
        setLoginId(forgotEmail.trim());
        setLoginPassword(forgotNewPassword);
        setTimeout(() => {
          setForgotModalVisible(false);
          setForgotEmail('');
          setForgotNewPassword('');
          setForgotSuccess(null);
        }, 1500);
      } else {
        setForgotError(res.message);
      }
    } catch {
      setForgotError('Lỗi đặt lại mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.guestContainer} keyboardShouldPersistTaps="handled">
        {/* Cinema Brand Hero */}
        <View style={styles.guestHero}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="film" size={36} color="#E50914" />
          </View>
          <Text style={styles.guestTitle}>CINEMAX THEATER</Text>
          <Text style={styles.guestSubtitle}>
            Đăng nhập hoặc đăng ký tài khoản khách hàng để nhận vé ưu đãi và tích điểm bắp nước!
          </Text>
        </View>

        {/* Segmented Control */}
        <View style={styles.guestTabSwitcher}>
          <TouchableOpacity
            style={[styles.guestTabBtn, tab === 'login' && styles.guestTabBtnActive]}
            onPress={() => setTab('login')}
            activeOpacity={0.85}>
            <Ionicons
              name="log-in-outline"
              size={18}
              color={tab === 'login' ? '#FFFFFF' : '#9CA3AF'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.guestTabText, tab === 'login' && styles.guestTabTextActive]}>
              Đăng Nhập
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.guestTabBtn, tab === 'register' && styles.guestTabBtnActive]}
            onPress={() => setTab('register')}
            activeOpacity={0.85}>
            <Ionicons
              name="person-add-outline"
              size={18}
              color={tab === 'register' ? '#FFFFFF' : '#9CA3AF'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.guestTabText, tab === 'register' && styles.guestTabTextActive]}>
              Đăng Ký
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOGIN TAB CONTENT */}
        {tab === 'login' && (
          <View style={styles.guestAuthCard}>
            {/* Quick Demo Fill */}
            <TouchableOpacity
              style={styles.guestDemoBtn}
              onPress={handleQuickFillDemo}
              activeOpacity={0.8}>
              <Ionicons name="flash" size={16} color="#F59E0B" />
              <Text style={styles.guestDemoText}>
                Điền nhanh tài khoản mẫu: <Text style={styles.guestDemoBold}>customer@cinema.com</Text>
              </Text>
            </TouchableOpacity>

            {loginError && (
              <View style={styles.guestAlertError}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.guestAlertErrorText}>{loginError}</Text>
              </View>
            )}

            {loginSuccess && (
              <View style={styles.guestAlertSuccess}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.guestAlertSuccessText}>{loginSuccess}</Text>
              </View>
            )}

            {/* Email / SĐT */}
            <View style={styles.guestField}>
              <Text style={styles.guestLabel}>Email hoặc Số điện thoại</Text>
              <View style={styles.guestInputRow}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="Nhập email hoặc SĐT 10 số"
                  placeholderTextColor="#6B7280"
                  value={loginId}
                  onChangeText={(val) => {
                    setLoginId(val);
                    setLoginError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.guestField}>
              <View style={styles.guestPassHeader}>
                <Text style={styles.guestLabel}>Mật khẩu</Text>
                <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
                  <Text style={styles.guestForgotLink}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.guestInputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  placeholderTextColor="#6B7280"
                  value={loginPassword}
                  onChangeText={(val) => {
                    setLoginPassword(val);
                    setLoginError(null);
                  }}
                  secureTextEntry={!loginShowPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setLoginShowPassword(!loginShowPassword)}
                  style={{ padding: 4 }}>
                  <Ionicons
                    name={loginShowPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me Checkbox */}
            <TouchableOpacity
              style={styles.guestCheckboxRow}
              onPress={() => setLoginRemember(!loginRemember)}
              activeOpacity={0.8}>
              <View style={[styles.guestCheckbox, loginRemember && styles.guestCheckboxChecked]}>
                {loginRemember && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.guestCheckboxText}>Ghi nhớ đăng nhập trên thiết bị này</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.guestSubmitBtn, loginLoading && { opacity: 0.7 }]}
              onPress={handleLoginSubmit}
              disabled={loginLoading}
              activeOpacity={0.85}>
              {loginLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.guestSubmitBtnText}>ĐĂNG NHẬP NGAY</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* REGISTER TAB CONTENT */}
        {tab === 'register' && (
          <View style={styles.guestAuthCard}>
            {/* Promo banner */}
            <View style={styles.guestRegPromo}>
              <Ionicons name="gift-outline" size={18} color="#F59E0B" />
              <Text style={styles.guestRegPromoText}>
                Tặng ngay <Text style={{ color: '#F59E0B', fontWeight: '700' }}>50 điểm thưởng</Text> chào mừng thành viên mới!
              </Text>
            </View>

            {regError && (
              <View style={styles.guestAlertError}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.guestAlertErrorText}>{regError}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.guestField}>
              <Text style={styles.guestLabel}>Họ và tên khách hàng *</Text>
              <View style={styles.guestInputRow}>
                <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  placeholderTextColor="#6B7280"
                  value={regFullName}
                  onChangeText={(val) => {
                    setRegFullName(val);
                    setRegError(null);
                  }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.guestField}>
              <Text style={styles.guestLabel}>Địa chỉ Email *</Text>
              <View style={styles.guestInputRow}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="customer@example.com"
                  placeholderTextColor="#6B7280"
                  value={regEmail}
                  onChangeText={(val) => {
                    setRegEmail(val);
                    setRegError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.guestField}>
              <Text style={styles.guestLabel}>Số điện thoại *</Text>
              <View style={styles.guestInputRow}>
                <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="10 chữ số (VD: 0901234567)"
                  placeholderTextColor="#6B7280"
                  value={regPhone}
                  onChangeText={(val) => {
                    setRegPhone(val);
                    setRegError(null);
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.guestField}>
              <Text style={styles.guestLabel}>Mật khẩu đăng nhập *</Text>
              <View style={styles.guestInputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor="#6B7280"
                  value={regPassword}
                  onChangeText={(val) => {
                    setRegPassword(val);
                    setRegError(null);
                  }}
                  secureTextEntry={!regShowPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setRegShowPassword(!regShowPassword)}
                  style={{ padding: 4 }}>
                  <Ionicons
                    name={regShowPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {/* Password checklist */}
              {regPassword.length > 0 && (
                <View style={styles.guestCriteriaBox}>
                  <View style={styles.guestCriteriaItem}>
                    <Ionicons
                      name={regPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={regPassword.length >= 6 ? '#10B981' : '#6B7280'}
                    />
                    <Text style={[styles.guestCriteriaText, regPassword.length >= 6 && { color: '#10B981' }]}>
                      Tối thiểu 6 ký tự
                    </Text>
                  </View>
                  <View style={styles.guestCriteriaItem}>
                    <Ionicons
                      name={/[a-zA-Z]/.test(regPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={/[a-zA-Z]/.test(regPassword) ? '#10B981' : '#6B7280'}
                    />
                    <Text style={[styles.guestCriteriaText, /[a-zA-Z]/.test(regPassword) && { color: '#10B981' }]}>
                      Chứa chữ cái (A-Z, a-z)
                    </Text>
                  </View>
                  <View style={styles.guestCriteriaItem}>
                    <Ionicons
                      name={/\d/.test(regPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={/\d/.test(regPassword) ? '#10B981' : '#6B7280'}
                    />
                    <Text style={[styles.guestCriteriaText, /\d/.test(regPassword) && { color: '#10B981' }]}>
                      Chứa chữ số (0-9)
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.guestField}>
              <Text style={styles.guestLabel}>Xác nhận lại mật khẩu *</Text>
              <View style={styles.guestInputRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#9CA3AF" style={styles.guestInputIcon} />
                <TextInput
                  style={styles.guestTextInput}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#6B7280"
                  value={regConfirmPassword}
                  onChangeText={(val) => {
                    setRegConfirmPassword(val);
                    setRegError(null);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Agree Terms */}
            <TouchableOpacity
              style={styles.guestCheckboxRow}
              onPress={() => setRegAgreeTerms(!regAgreeTerms)}
              activeOpacity={0.8}>
              <View style={[styles.guestCheckbox, regAgreeTerms && styles.guestCheckboxChecked]}>
                {regAgreeTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.guestCheckboxText}>
                Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật CineMax
              </Text>
            </TouchableOpacity>

            {/* Register Submit Button */}
            <TouchableOpacity
              style={[styles.guestSubmitBtn, regLoading && { opacity: 0.7 }]}
              onPress={handleRegisterSubmit}
              disabled={regLoading}
              activeOpacity={0.85}>
              {regLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.guestSubmitBtnText}>ĐĂNG KÝ TÀI KHOẢN MỚI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Member Privileges Card */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>ĐẶC QUYỀN THÀNH VIÊN CINEMAX</Text>
          <View style={styles.benefitRow}>
            <Ionicons name="ticket" size={20} color="#F59E0B" />
            <View style={styles.benefitTextCol}>
              <Text style={styles.benefitHead}>Vé xem phim sinh nhật</Text>
              <Text style={styles.benefitDesc}>Tặng 01 vé xem phim 2D miễn phí trong tháng sinh nhật</Text>
            </View>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="gift" size={20} color="#10B981" />
            <View style={styles.benefitTextCol}>
              <Text style={styles.benefitHead}>Tích lũy điểm đến 10%</Text>
              <Text style={styles.benefitDesc}>Đổi điểm lấy vé xem phim và combo bắp nước không giới hạn</Text>
            </View>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="fast-food" size={20} color="#3B82F6" />
            <View style={styles.benefitTextCol}>
              <Text style={styles.benefitHead}>Ưu đãi thứ Tư vui vẻ</Text>
              <Text style={styles.benefitDesc}>Đồng giá vé 50.000đ cho toàn bộ phim 2D mỗi thứ Tư</Text>
            </View>
          </View>
        </View>

        {/* Forgot Password Modal */}
        <Modal
          visible={forgotModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setForgotModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Khôi phục mật khẩu</Text>
                <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {forgotError && (
                <View style={styles.guestAlertError}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.guestAlertErrorText}>{forgotError}</Text>
                </View>
              )}

              {forgotSuccess && (
                <View style={styles.guestAlertSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.guestAlertSuccessText}>{forgotSuccess}</Text>
                </View>
              )}

              <Text style={styles.guestLabel}>Email đã đăng ký</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="customer@cinema.com"
                placeholderTextColor="#6B7280"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.guestLabel}>Mật khẩu mới (tối thiểu 6 ký tự)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#6B7280"
                value={forgotNewPassword}
                onChangeText={setForgotNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setForgotModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleForgotSubmit}
                  disabled={forgotLoading}>
                  {forgotLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Đặt Lại</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  } = useAuth();

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

  // Guest State - When not logged in: Render interactive Login & Register form directly
  if (!isAuthenticated || !user) {
    return <GuestAuthSection login={login} register={register} resetPassword={resetPassword} />;
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
          <TouchableOpacity
            style={styles.sessionStatusBadge}
            onPress={() => setSessionModalVisible(true)}
            activeOpacity={0.8}>
            <View style={styles.statusDot} />
            <Text style={styles.sessionStatusText}>Phiên hoạt động</Text>
            <Ionicons name="information-circle-outline" size={14} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* VIP Membership Card */}
        <View style={styles.membershipCard}>
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
        </View>

        {/* Customer Info Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
            <View style={styles.headerActionRow}>
              <TouchableOpacity onPress={handleOpenChangePassword} style={styles.headerActionBtn}>
                <Ionicons name="key-outline" size={14} color="#F59E0B" />
                <Text style={styles.headerActionTextKey}>Đổi mật khẩu</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenEdit} style={styles.editBtn}>
                <Ionicons name="pencil" size={14} color="#E50914" />
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

        {/* Session Management Details (UC02) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quản lý phiên đăng nhập (Session)</Text>
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>Đang hoạt động</Text>
            </View>
          </View>

          <View style={styles.sessionGrid}>
            <View style={styles.sessionGridItem}>
              <Text style={styles.sessionGridLabel}>Mã phiên (Token)</Text>
              <Text style={styles.sessionGridValue} numberOfLines={1}>
                {session ? session.token.substring(0, 16) + '...' : 'N/A'}
              </Text>
            </View>

            <View style={styles.sessionGridItem}>
              <Text style={styles.sessionGridLabel}>Thiết bị / Nền tảng</Text>
              <Text style={styles.sessionGridValue}>
                {session?.devicePlatform?.toUpperCase() || 'MOBILE'}
              </Text>
            </View>

            <View style={styles.sessionGridItem}>
              <Text style={styles.sessionGridLabel}>Ghi nhớ đăng nhập</Text>
              <Text style={styles.sessionGridValue}>
                {session?.rememberMe ? 'Đã kích hoạt (30 ngày)' : '24 giờ'}
              </Text>
            </View>

            <View style={styles.sessionGridItem}>
              <Text style={styles.sessionGridLabel}>Hết hạn lúc</Text>
              <Text style={styles.sessionGridValue}>
                {session ? new Date(session.expiresAt).toLocaleDateString('vi-VN') : 'N/A'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sessionDetailButton}
            onPress={() => setSessionModalVisible(true)}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#9CA3AF" />
            <Text style={styles.sessionDetailButtonText}>Xem chi tiết kỹ thuật phiên đăng nhập</Text>
          </TouchableOpacity>
        </View>

        {/* Cinema Management Services */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dịch vụ & Quản lý rạp</Text>
          </View>

          <TouchableOpacity
            style={styles.fnbProfileBtn}
            onPress={() => router.push('/food')}
            activeOpacity={0.85}>
            <View style={styles.fnbProfileIconWrap}>
              <Ionicons name="fast-food" size={20} color="#E50914" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fnbProfileTitle}>Quản lý Bắp Nước (UC37)</Text>
              <Text style={styles.fnbProfileSubtitle}>
                Thêm, xem, sửa và xóa thực đơn bắp rang, nước ngọt & combo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Tickets Demo */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vé xem phim của bạn</Text>
            <Text style={styles.ticketCount}>{sampleTickets.length} vé</Text>
          </View>

          {sampleTickets.map((ticket) => (
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
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>ĐĂNG XUẤT PHIÊN LÀM VIỆC</Text>
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
              <Text style={styles.modalTitle}>Chi tiết kỹ thuật phiên (UC02)</Text>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  scrollContent: {
    paddingHorizontal: 20,
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
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  sectionCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionTextKey: {
    color: '#F59E0B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    color: '#E50914',
    fontSize: 13,
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
    paddingVertical: 3,
    borderRadius: 6,
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
    padding: 24,
    alignItems: 'center',
  },
  guestHero: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
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
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  guestTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  guestTabBtnActive: {
    backgroundColor: '#E50914',
  },
  guestTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  guestTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  guestAuthCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#232938',
    marginBottom: 18,
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
    marginBottom: 14,
  },
  guestLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 6,
  },
  guestInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F121B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3345',
    paddingHorizontal: 12,
    height: 46,
  },
  guestInputIcon: {
    marginRight: 8,
  },
  guestTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  guestPassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  guestForgotLink: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '600',
  },
  guestCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  guestCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
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
    fontSize: 12.5,
    flex: 1,
  },
  guestSubmitBtn: {
    backgroundColor: '#E50914',
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  guestSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  fnbProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2028',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D3039',
    gap: 12,
  },
  fnbProfileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fnbProfileTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fnbProfileSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 16,
  },
});

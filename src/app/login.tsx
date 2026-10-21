import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { validateLoginForm } from '@/utils/validation';
import { LoginErrors } from '@/types/auth';
import { ForgotPasswordModal } from '@/components/forgot-password-modal';

export default function LoginScreen() {
  const { login, logout, savedIdentifier, user, isAuthenticated } = useAuth();

  const [rawIdentifier, setRawIdentifier] = useState<string | null>(null);
  const identifier = rawIdentifier ?? (savedIdentifier || '');
  const setIdentifier = (val: string) => setRawIdentifier(val);

  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal for Forgot Password (UC04)
  const [forgotModalVisible, setForgotModalVisible] = useState(false);


  // If already logged in, show quick switch or redirect
  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.alreadyLoggedInCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.loggedInTitle}>Bạn đã đăng nhập</Text>
            <Text style={styles.loggedInSubtitle}>
              Phiên đăng nhập hiện tại: <Text style={styles.highlight}>{user.fullName}</Text>
            </Text>
            <Text style={styles.loggedInEmail}>({user.email})</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/profile')}>
              <Ionicons name="person-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Xem thông tin tài khoản</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/')}>
              <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 12, borderColor: 'rgba(239, 68, 68, 0.5)' }]}
              onPress={async () => {
                await logout();
              }}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Đăng xuất tài khoản này</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Quick fill demo account for convenient testing
  const handleQuickFillDemo = () => {
    setIdentifier('customer@cinema.com');
    setPassword('password123');
    setErrors({});
    setErrorMessage(null);
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate inputs
    const validation = validateLoginForm({
      identifier,
      password,
      rememberMe,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const result = await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });

      if (result.success) {
        setSuccessMessage(result.message);
        setTimeout(() => {
          router.replace('/profile');
        }, 800);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage('Đã xảy ra sự cố kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSuccess = (resetIdentifier: string, resetPass: string) => {
    setIdentifier(resetIdentifier);
    setPassword(resetPass);
    setSuccessMessage('Khôi phục mật khẩu thành công! Bạn có thể nhấn Đăng nhập ngay.');
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          
          {/* Header Navigation */}
          <View style={styles.navBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Quay lại">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Tài Khoản Thành Viên</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Segmented Auth Switcher */}
          <View style={styles.authSegmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, styles.segmentBtnActive]}
              activeOpacity={0.9}>
              <Ionicons name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.segmentTextActive}>Đăng Nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => router.replace('/register')}
              activeOpacity={0.8}>
              <Ionicons name="person-add-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <Text style={styles.segmentTextInactive}>Đăng Ký</Text>
            </TouchableOpacity>
          </View>

          {/* Cinema Branding Card */}
          <View style={styles.brandingSection}>
            <View style={styles.logoBadge}>
              <Ionicons name="film" size={28} color="#E50914" />
            </View>
            <Text style={styles.brandTitle}>CINEMAX THEATER</Text>
            <Text style={styles.brandSubtitle}>
              Trải nghiệm điện ảnh đỉnh cao cùng đặc quyền thành viên
            </Text>
          </View>

          {/* Quick Demo Fill Button */}
          <TouchableOpacity
            style={styles.demoBanner}
            onPress={handleQuickFillDemo}
            activeOpacity={0.8}>
            <Ionicons name="flash" size={16} color="#F59E0B" />
            <Text style={styles.demoBannerText}>
              Bấm vào đây để điền nhanh tài khoản mẫu: <Text style={styles.demoBold}>customer@cinema.com</Text>
            </Text>
          </TouchableOpacity>

          {/* Alert Messages */}
          {errorMessage && (
            <View style={styles.alertError}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.alertErrorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.alertSuccess}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.alertSuccessText}>{successMessage}</Text>
            </View>
          )}

          {/* Form Container */}
          <View style={styles.formContainer}>
            
            {/* Input: Identifier (Email / Phone) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Email hoặc Số điện thoại <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.identifier ? styles.inputWrapperError : null,
                ]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={errors.identifier ? '#EF4444' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập email hoặc SĐT 10 số"
                  placeholderTextColor="#6B7280"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (errors.identifier) {
                      setErrors((prev) => ({ ...prev, identifier: undefined }));
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                {identifier.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setIdentifier('')}
                    style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              {errors.identifier && (
                <Text style={styles.fieldError}>{errors.identifier}</Text>
              )}
            </View>

            {/* Input: Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>
                  Mật khẩu <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
                  <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password ? styles.inputWrapperError : null,
                ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={errors.password ? '#EF4444' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  placeholderTextColor="#6B7280"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.fieldError}>{errors.password}</Text>
              )}
            </View>

            {/* Checkbox: Remember Me */}
            <TouchableOpacity
              style={styles.rememberRow}
              activeOpacity={0.7}
              onPress={() => setRememberMe(!rememberMe)}>
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked,
                ]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.rememberText}>
                Ghi nhớ đăng nhập trên thiết bị này
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Switch to Register */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>Chưa có tài khoản?</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}> Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Cinema Privilege Highlights */}
          <View style={styles.privilegeBox}>
            <Text style={styles.privilegeTitle}>QUYỀN LỢI THÀNH VIÊN CINEMAX</Text>
            <View style={styles.privilegeItem}>
              <Ionicons name="gift-outline" size={16} color="#E50914" />
              <Text style={styles.privilegeText}>Tích điểm 5% - 10% cho mỗi giao dịch vé và bắp nước</Text>
            </View>
            <View style={styles.privilegeItem}>
              <Ionicons name="ticket-outline" size={16} color="#E50914" />
              <Text style={styles.privilegeText}>Vé xem phim miễn phí vào ngày sinh nhật</Text>
            </View>
            <View style={styles.privilegeItem}>
              <Ionicons name="star-outline" size={16} color="#E50914" />
              <Text style={styles.privilegeText}>Ưu tiên đặt trước các suất chiếu đặc biệt & Sneak Show</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* UC04: Forgot Password Modal with Identity Verification */}
      <ForgotPasswordModal
        visible={forgotModalVisible}
        initialIdentifier={identifier}
        onClose={() => setForgotModalVisible(false)}
        onSuccess={handleResetPasswordSuccess}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  authSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#232838',
    marginTop: 8,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  segmentTextInactive: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13.5,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12.5,
    flex: 1,
  },
  modalInputLabel: {
    color: '#D1D5DB',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F2430',
    borderWidth: 1.5,
    borderColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  demoBannerText: {
    color: '#FCD34D',
    fontSize: 12.5,
    flex: 1,
  },
  demoBold: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  alertErrorText: {
    color: '#F87171',
    fontSize: 13.5,
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  alertSuccessText: {
    color: '#34D399',
    fontSize: 13.5,
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232838',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  forgotPasswordText: {
    fontSize: 12.5,
    color: '#E50914',
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F121B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3345',
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14.5,
  },
  clearButton: {
    padding: 4,
  },
  eyeButton: {
    padding: 4,
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#0F121B',
  },
  checkboxChecked: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  rememberText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: '#E50914',
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  switchAuthText: {
    color: '#9CA3AF',
    fontSize: 13.5,
  },
  registerLink: {
    color: '#E50914',
    fontSize: 13.5,
    fontWeight: '700',
  },
  privilegeBox: {
    marginTop: 24,
    backgroundColor: 'rgba(21, 24, 33, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232838',
  },
  privilegeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 10,
  },
  privilegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  privilegeText: {
    fontSize: 12.5,
    color: '#D1D5DB',
    flex: 1,
  },
  alreadyLoggedInCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232838',
  },
  avatarCircle: {
    marginBottom: 16,
  },
  loggedInTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loggedInSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  highlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loggedInEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#E50914',
    borderRadius: 10,
    height: 46,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1F2430',
    borderRadius: 10,
    height: 46,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontSize: 14.5,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D3345',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#0F121B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3345',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#E50914',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

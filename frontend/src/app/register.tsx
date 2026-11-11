import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { validateRegisterForm, getPasswordStrength } from '@/utils/validation';
import { RegisterErrors, RegisterFormData } from '@/types/auth';

export default function RegisterScreen() {
  const { register, requestRegisterOtp, verifyRegisterOtp } = useAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessNotice, setOtpSuccessNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const canResend = countdown === 0;

  // Countdown timer for OTP Resend
  useEffect(() => {
    if (!otpModalVisible || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [otpModalVisible, countdown]);

  // Success Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  // Terms Modal
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Compute password strength live
  const pwdStrength = getPasswordStrength(formData.password);

  const updateField = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  /**
   * Bước 1: Kiểm tra form & Gửi mã OTP thật về email của người dùng
   */
  const handleRegister = async () => {
    setErrorMessage(null);

    // Validate form inputs
    const validation = validateRegisterForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const result = await requestRegisterOtp(formData);

      if (result.success) {
        setMaskedTarget(result.maskedTarget || formData.email.trim());
        setTargetEmail(result.targetEmail || formData.email.trim());
        setOtpCode('');
        setOtpError(null);
        setOtpSuccessNotice(null);
        setCountdown(60);
        setOtpModalVisible(true);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi khi gửi mã xác thực OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gửi lại mã OTP khi hết thời gian đếm ngược
   */
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsVerifyingOtp(true);
    setOtpError(null);
    setOtpSuccessNotice(null);

    try {
      const result = await requestRegisterOtp(formData);
      if (result.success) {
        setCountdown(60);
        setOtpSuccessNotice('Mã xác thực OTP mới đã được gửi lại vào email của bạn!');
        setTimeout(() => setOtpSuccessNotice(null), 3500);
      } else {
        setOtpError(result.message);
      }
    } catch {
      setOtpError('Không thể gửi lại mã OTP. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /**
   * Bước 2: Xác thực mã OTP và hoàn tất tạo tài khoản
   */
  const handleConfirmOtp = async () => {
    setOtpError(null);
    const cleanCode = otpCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      setOtpError('Vui lòng nhập đầy đủ 6 chữ số mã xác thực OTP.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const result = await verifyRegisterOtp(formData.email.trim(), cleanCode);

      if (result.success && result.user) {
        setOtpModalVisible(false);
        setRegisteredName(result.user.fullName || formData.fullName);
        setSuccessModalVisible(true);
      } else {
        setOtpError(result.message || 'Mã xác thực OTP không chính xác.');
      }
    } catch {
      setOtpError('Đã xảy ra lỗi trong quá trình xác thực OTP. Vui lòng thử lại.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleFinishRegistration = () => {
    setSuccessModalVisible(false);
    router.replace('/profile');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Navigation Bar */}
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
              style={styles.segmentBtn}
              onPress={() => router.replace('/login')}
              activeOpacity={0.8}>
              <Ionicons name="log-in-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <Text style={styles.segmentTextInactive}>Đăng Nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, styles.segmentBtnActive]}
              activeOpacity={0.9}>
              <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.segmentTextActive}>Đăng Ký</Text>
            </TouchableOpacity>
          </View>

          {/* Header Promotion Banner */}
          <View style={styles.promoCard}>
            <View style={styles.promoIconWrapper}>
              <Ionicons name="sparkles" size={22} color="#F59E0B" />
            </View>
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Chào mừng Thành Viên Mới!</Text>
              <Text style={styles.promoSubtitle}>
                Đăng ký ngay nhận ngay <Text style={styles.promoHighlight}>50 điểm thưởng</Text> + Voucher giảm 20% combo bắp nước.
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.alertError}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.alertErrorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Container */}
          <View style={styles.formCard}>
            
            {/* 1. Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Họ và tên khách hàng <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.fullName ? styles.inputWrapperError : null,
                ]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={errors.fullName ? '#EF4444' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  placeholderTextColor="#6B7280"
                  value={formData.fullName}
                  onChangeText={(val) => updateField('fullName', val)}
                  autoCapitalize="words"
                />
                {formData.fullName.length > 0 && (
                  <TouchableOpacity
                    onPress={() => updateField('fullName', '')}
                    style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              {errors.fullName && (
                <Text style={styles.fieldError}>{errors.fullName}</Text>
              )}
            </View>

            {/* 2. Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Địa chỉ Email <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email ? styles.inputWrapperError : null,
                ]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={errors.email ? '#EF4444' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="customer@example.com"
                  placeholderTextColor="#6B7280"
                  value={formData.email}
                  onChangeText={(val) => updateField('email', val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {formData.email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => updateField('email', '')}
                    style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              {errors.email && (
                <Text style={styles.fieldError}>{errors.email}</Text>
              )}
            </View>

            {/* 3. Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Số điện thoại di động <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.phone ? styles.inputWrapperError : null,
                ]}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={errors.phone ? '#EF4444' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="10 chữ số (VD: 0901234567)"
                  placeholderTextColor="#6B7280"
                  value={formData.phone}
                  onChangeText={(val) => updateField('phone', val)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {formData.phone.length > 0 && (
                  <TouchableOpacity
                    onPress={() => updateField('phone', '')}
                    style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              {errors.phone && (
                <Text style={styles.fieldError}>{errors.phone}</Text>
              )}
            </View>

            {/* 4. Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Mật khẩu đăng nhập <Text style={styles.requiredStar}>*</Text>
              </Text>
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
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor="#6B7280"
                  value={formData.password}
                  onChangeText={(val) => updateField('password', val)}
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

              {/* Password Strength Meter & Live Checklist */}
              {formData.password.length > 0 && (
                <View style={styles.strengthBox}>
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarRow}>
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              pwdStrength.score >= 1 ? pwdStrength.color : '#2D3345',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              pwdStrength.score >= 2 ? pwdStrength.color : '#2D3345',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              pwdStrength.score >= 3 ? pwdStrength.color : '#2D3345',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: pwdStrength.color }]}>
                      Độ mạnh: {pwdStrength.label}
                    </Text>
                  </View>

                  {/* Checklist criteria */}
                  <View style={styles.checklistContainer}>
                    <View style={styles.checkItem}>
                      <Ionicons
                        name={formData.password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={formData.password.length >= 6 ? '#10B981' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.checkText,
                          formData.password.length >= 6 && styles.checkTextMet,
                        ]}>
                        Tối thiểu 6 ký tự
                      </Text>
                    </View>

                    <View style={styles.checkItem}>
                      <Ionicons
                        name={/[a-zA-Z]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={/[a-zA-Z]/.test(formData.password) ? '#10B981' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.checkText,
                          /[a-zA-Z]/.test(formData.password) && styles.checkTextMet,
                        ]}>
                        Chứa chữ cái (A-Z, a-z)
                      </Text>
                    </View>

                    <View style={styles.checkItem}>
                      <Ionicons
                        name={/\d/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={/\d/.test(formData.password) ? '#10B981' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.checkText,
                          /\d/.test(formData.password) && styles.checkTextMet,
                        ]}>
                        Chứa chữ số (0-9)
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {errors.password && (
                <Text style={styles.fieldError}>{errors.password}</Text>
              )}
            </View>

            {/* 5. Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Xác nhận mật khẩu <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.confirmPassword ? styles.inputWrapperError : null,
                ]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={errors.confirmPassword ? '#EF4444' : '#9CA3AF'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập lại mật khẩu vừa đặt"
                  placeholderTextColor="#6B7280"
                  value={formData.confirmPassword}
                  onChangeText={(val) => updateField('confirmPassword', val)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* 6. Terms Agreement */}
            <View style={styles.termsWrapper}>
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.7}
                onPress={() => updateField('agreeTerms', !formData.agreeTerms)}>
                <View
                  style={[
                    styles.checkbox,
                    formData.agreeTerms && styles.checkboxChecked,
                    errors.agreeTerms ? styles.checkboxError : null,
                  ]}>
                  {formData.agreeTerms && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.termsText}>
                    Tôi đồng ý với{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setTermsModalVisible(true)}>
                      Điều khoản sử dụng
                    </Text>{' '}
                    và{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setTermsModalVisible(true)}>
                      Chính sách bảo mật
                    </Text>{' '}
                    của CineMax.
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.agreeTerms && (
                <Text style={styles.fieldError}>{errors.agreeTerms}</Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>ĐĂNG KÝ TÀI KHOẢN</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Switch to Login */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>Đã có tài khoản thành viên?</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}> Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Registration Email OTP Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.otpModalCard}>
            
            {/* Modal Header */}
            <View style={styles.otpModalHeader}>
              <View style={styles.otpHeaderTitleRow}>
                <View style={styles.otpHeaderIconWrap}>
                  <Ionicons name="mail-unread" size={20} color="#E50914" />
                </View>
                <Text style={styles.otpModalTitle}>Xác Thực Email</Text>
              </View>
              <TouchableOpacity
                onPress={() => setOtpModalVisible(false)}
                style={styles.otpCloseBtn}
                accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.otpSubtitle}>
                Chúng tôi đã gửi mã xác thực 6 chữ số đến hộp thư:
              </Text>

              {/* Email Target Box */}
              <View style={styles.targetEmailBox}>
                <Ionicons name="mail" size={18} color="#10B981" />
                <Text style={styles.targetEmailText}>{targetEmail || maskedTarget || formData.email}</Text>
              </View>

              <Text style={styles.otpNoticeText}>
                Vui lòng kiểm tra hộp thư đến (hoặc thư mục <Text style={{ color: '#F59E0B', fontWeight: '700' }}>Spam / Thư rác</Text>) và nhập mã OTP bên dưới:
              </Text>

              {/* OTP Error Notice */}
              {otpError && (
                <View style={styles.otpAlertBoxError}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.otpAlertTextError}>{otpError}</Text>
                </View>
              )}

              {/* OTP Success Notice */}
              {otpSuccessNotice && (
                <View style={styles.otpAlertBoxSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.otpAlertTextSuccess}>{otpSuccessNotice}</Text>
                </View>
              )}

              {/* OTP Input */}
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={styles.otpInputBox}
                  placeholder="• • • • • •"
                  placeholderTextColor="#6B7280"
                  value={otpCode}
                  onChangeText={(val) => {
                    setOtpCode(val);
                    if (otpError) setOtpError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                  textAlign="center"
                />
              </View>

              {/* Resend Countdown Row */}
              <View style={styles.otpResendRow}>
                {canResend ? (
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={isVerifyingOtp}
                    style={styles.resendBtn}>
                    <Ionicons name="refresh" size={15} color="#E50914" style={{ marginRight: 4 }} />
                    <Text style={styles.resendBtnText}>Gửi lại mã OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendTimerText}>
                    Gửi lại mã sau: <Text style={{ color: '#E50914', fontWeight: '700' }}>{countdown}s</Text>
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.confirmOtpButton, isVerifyingOtp && styles.confirmOtpButtonDisabled]}
                onPress={handleConfirmOtp}
                disabled={isVerifyingOtp}
                activeOpacity={0.85}>
                {isVerifyingOtp ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmOtpButtonText}>XÁC NHẬN & HOÀN TẤT</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backEditButton}
                onPress={() => setOtpModalVisible(false)}
                disabled={isVerifyingOtp}>
                <Ionicons name="arrow-back-outline" size={16} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={styles.backEditText}>Sửa lại thông tin đăng ký</Text>
              </TouchableOpacity>
            </ScrollView>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleFinishRegistration}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="gift" size={40} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Đăng Ký Thành Công!</Text>
            <Text style={styles.successDesc}>
              Chúc mừng <Text style={styles.boldText}>{registeredName}</Text> đã trở thành thành viên CineMax!
            </Text>

            <View style={styles.bonusBadge}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.bonusText}>+50 Điểm thưởng chào mừng</Text>
            </View>

            <Text style={styles.successNote}>
              Tài khoản của bạn đã được kích hoạt và tự động đăng nhập.
            </Text>

            <TouchableOpacity
              style={styles.successActionButton}
              onPress={handleFinishRegistration}>
              <Text style={styles.successActionText}>Bắt đầu trải nghiệm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.termsModalCard}>
            <View style={styles.termsModalHeader}>
              <Text style={styles.termsModalTitle}>Điều Khoản & Bảo Mật</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.termsModalBody}>
              <Text style={styles.termsSectionTitle}>1. Điều kiện thành viên</Text>
              <Text style={styles.termsParagraph}>
                Khách hàng đăng ký tài khoản cần cung cấp thông tin chính xác về Họ tên, Email và Số điện thoại để phục vụ việc nhận vé và tích lũy điểm thưởng.
              </Text>
              <Text style={styles.termsSectionTitle}>2. Tích điểm và quyền lợi</Text>
              <Text style={styles.termsParagraph}>
                Mỗi giao dịch mua vé xem phim và bắp nước sẽ được tích điểm theo hạng thành viên (Standard: 5%, Silver: 7%, Gold/VIP: 10%). Điểm thưởng có giá trị quy đổi sang vé và quà tặng.
              </Text>
              <Text style={styles.termsSectionTitle}>3. Bảo mật thông tin</Text>
              <Text style={styles.termsParagraph}>
                CineMax cam kết bảo mật tuyệt đối thông tin cá nhân và dữ liệu phiên giao dịch của quý khách, không chia sẻ cho bên thứ ba vì mục đích thương mại.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.termsCloseButton}
              onPress={() => setTermsModalVisible(false)}>
              <Text style={styles.termsCloseText}>Đã hiểu và đồng ý</Text>
            </TouchableOpacity>
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
  clearBtn: {
    padding: 4,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  promoIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTextCol: {
    flex: 1,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  promoSubtitle: {
    color: '#9CA3AF',
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  promoHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
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
  formCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232838',
  },
  fieldGroup: {
    marginBottom: 16,
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
  eyeButton: {
    padding: 4,
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  strengthBox: {
    backgroundColor: '#0F121B',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1F2430',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 4,
    width: '45%',
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  checklistContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
    paddingTop: 8,
    gap: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    color: '#6B7280',
    fontSize: 11.5,
  },
  checkTextMet: {
    color: '#10B981',
    fontWeight: '500',
  },
  termsWrapper: {
    marginBottom: 20,
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
    backgroundColor: '#0F121B',
  },
  checkboxChecked: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  checkboxError: {
    borderColor: '#EF4444',
  },
  termsText: {
    color: '#9CA3AF',
    fontSize: 12.5,
    lineHeight: 18,
  },
  termsLink: {
    color: '#E50914',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
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
  loginLink: {
    color: '#E50914',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3345',
  },
  successIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  bonusText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 13.5,
  },
  successNote: {
    fontSize: 12.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  successActionButton: {
    backgroundColor: '#E50914',
    borderRadius: 10,
    height: 46,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successActionText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  termsModalCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2D3345',
  },
  termsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  termsModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  termsModalBody: {
    marginBottom: 16,
  },
  termsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E50914',
    marginTop: 10,
    marginBottom: 4,
  },
  termsParagraph: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
  },
  termsCloseButton: {
    backgroundColor: '#1F2430',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  otpModalCard: {
    backgroundColor: '#151821',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#2D3345',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  otpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#202636',
  },
  otpHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otpHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpCloseBtn: {
    padding: 6,
  },
  otpSubtitle: {
    fontSize: 13.5,
    color: '#9CA3AF',
    lineHeight: 19,
    marginBottom: 10,
  },
  targetEmailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F121B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#252C3E',
    gap: 8,
    marginBottom: 12,
  },
  targetEmailText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  otpNoticeText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 16,
  },
  otpAlertBoxError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  otpAlertTextError: {
    color: '#F87171',
    fontSize: 13,
    flex: 1,
  },
  otpAlertBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  otpAlertTextSuccess: {
    color: '#34D399',
    fontSize: 13,
    flex: 1,
  },
  otpInputContainer: {
    marginBottom: 14,
    alignItems: 'center',
  },
  otpInputBox: {
    backgroundColor: '#0B0E14',
    borderWidth: 1.5,
    borderColor: '#E50914',
    borderRadius: 12,
    width: '100%',
    height: 54,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  otpResendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendBtnText: {
    color: '#E50914',
    fontSize: 13.5,
    fontWeight: '700',
  },
  resendTimerText: {
    color: '#6B7280',
    fontSize: 13,
  },
  confirmOtpButton: {
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
    marginBottom: 10,
  },
  confirmOtpButtonDisabled: {
    opacity: 0.6,
  },
  confirmOtpButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  backEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  backEditText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (identifier: string, newPassword: string) => void;
  initialIdentifier?: string;
}

type Step = 'REQUEST' | 'VERIFY' | 'RESET' | 'SUCCESS';

function ForgotPasswordContent({
  onClose,
  onSuccess,
  initialIdentifier = '',
}: {
  onClose: () => void;
  onSuccess: (identifier: string, newPassword: string) => void;
  initialIdentifier?: string;
}) {
  const { requestPasswordReset, verifyResetOtp, completePasswordReset } = useAuth();

  const [step, setStep] = useState<Step>('REQUEST');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Notifications
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [maskedTarget, setMaskedTarget] = useState<string>('');

  // Countdown timer for Resend OTP (computed property)
  const [countdown, setCountdown] = useState(60);
  const canResend = countdown === 0;

  // Countdown timer effect without redundant state triggers
  useEffect(() => {
    if (step !== 'VERIFY' || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Password strength check
  const getPasswordStrength = (pwd: string): { label: string; color: string; percent: DimensionValue } => {
    if (!pwd) return { label: 'Chưa nhập', color: '#6B7280', percent: '0%' };
    if (pwd.length < 6) return { label: 'Quá ngắn', color: '#EF4444', percent: '25%' };
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (hasLetters && hasNumbers && hasSpecial && pwd.length >= 8) {
      return { label: 'Rất mạnh', color: '#10B981', percent: '100%' };
    }
    if ((hasLetters && hasNumbers) || (hasLetters && hasSpecial)) {
      return { label: 'Khá an toàn', color: '#3B82F6', percent: '70%' };
    }
    return { label: 'Trung bình', color: '#F59E0B', percent: '45%' };
  };

  const strength = getPasswordStrength(newPassword);

  // Quick fill sample account
  const handleQuickFillCustomer = () => {
    setIdentifier('customer@cinema.com');
    setErrorMessage(null);
  };

  // Step 1: Request Password Reset
  const handleRequestReset = async () => {
    setErrorMessage(null);
    const trimmed = identifier.trim();

    if (!trimmed) {
      setErrorMessage('Vui lòng nhập Email hoặc Số điện thoại tài khoản rạp phim.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(trimmed);
      if (res.success) {
        setSimulatedOtp(res.demoOtp || null);
        setMaskedTarget(res.maskedTarget || trimmed);
        setStep('VERIFY');
        setCountdown(60);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await requestPasswordReset(identifier.trim());
      if (res.success) {
        setSimulatedOtp(res.demoOtp || null);
        setCountdown(60);
        setSuccessNotice('Mã xác minh mới đã được gửi lại!');
        setTimeout(() => setSuccessNotice(null), 3000);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Gửi lại mã thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Identity OTP
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const cleanCode = otpCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      setErrorMessage('Vui lòng nhập đầy đủ mã xác minh 6 chữ số.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyResetOtp(identifier.trim(), cleanCode);
      if (res.success) {
        setStep('RESET');
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Xác minh thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Password Reset
  const handleCompleteReset = async () => {
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không trùng khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await completePasswordReset(identifier.trim(), otpCode.trim(), newPassword);
      if (res.success) {
        setStep('SUCCESS');
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra khi cập nhật mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Finish and close
  const handleFinish = () => {
    onSuccess(identifier.trim(), newPassword);
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <View style={styles.modalCard}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="key" size={20} color="#E50914" />
              <Text style={styles.headerTitle}>UC04 • Quên Mật Khẩu</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Stepper Progress Bar */}
          <View style={styles.stepperContainer}>
            <View style={[styles.stepDot, styles.stepActive]}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={[styles.stepLine, step !== 'REQUEST' && styles.stepLineActive]} />
            <View style={[styles.stepDot, (step === 'VERIFY' || step === 'RESET' || step === 'SUCCESS') && styles.stepActive]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={[styles.stepLine, (step === 'RESET' || step === 'SUCCESS') && styles.stepLineActive]} />
            <View style={[styles.stepDot, (step === 'RESET' || step === 'SUCCESS') && styles.stepActive]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={[styles.stepLine, step === 'SUCCESS' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'SUCCESS' && styles.stepActive]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successNotice && (
            <View style={styles.successNoticeBox}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.successNoticeText}>{successNotice}</Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            
            {/* ================= STEP 1: REQUEST ================= */}
            {step === 'REQUEST' && (
              <View>
                <Text style={styles.stepHeading}>Bước 1: Yêu cầu đặt lại mật khẩu</Text>
                <Text style={styles.stepSub}>
                  Nhập Email hoặc Số điện thoại đã đăng ký tài khoản thành viên để nhận mã xác minh danh tính bảo mật.
                </Text>

                <Text style={styles.inputLabel}>Email hoặc Số điện thoại:</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="customer@cinema.com hoặc 0901234567"
                    placeholderTextColor="#6B7280"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Sample Account Quick Button */}
                <TouchableOpacity
                  style={styles.quickFillBtn}
                  onPress={handleQuickFillCustomer}
                  activeOpacity={0.8}>
                  <Ionicons name="sparkles" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.quickFillText}>Điền tài khoản mẫu demo: customer@cinema.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRequestReset}
                  disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Gửi mã xác minh danh tính</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= STEP 2: VERIFY OTP ================= */}
            {step === 'VERIFY' && (
              <View>
                <Text style={styles.stepHeading}>Bước 2: Xác minh danh tính</Text>
                <Text style={styles.stepSub}>
                  Hệ thống đã gửi mã xác minh OTP gồm 6 chữ số đến{' '}
                  <Text style={styles.highlightText}>{maskedTarget}</Text>. Mã có hiệu lực trong 5 phút.
                </Text>

                {/* Simulated Demo OTP notification box */}
                {simulatedOtp && (
                  <View style={styles.simulatedOtpBox}>
                    <View style={styles.simulatedOtpHeader}>
                      <Ionicons name="chatbox-ellipses" size={16} color="#3B82F6" />
                      <Text style={styles.simulatedOtpTitle}>Hộp thư / Tin nhắn OTP Mô Phỏng</Text>
                    </View>
                    <Text style={styles.simulatedOtpDesc}>
                      Mã OTP xác minh của bạn là: <Text style={styles.otpHighlight}>{simulatedOtp}</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.pasteOtpBtn}
                      onPress={() => {
                        setOtpCode(simulatedOtp);
                        setErrorMessage(null);
                      }}>
                      <Ionicons name="copy-outline" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={styles.pasteOtpText}>Tự động điền mã {simulatedOtp}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.inputLabel}>Nhập mã xác minh 6 số (OTP):</Text>
                <View style={styles.otpInputWrap}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor="#6B7280"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>

                {/* Resend OTP Row */}
                <View style={styles.resendRow}>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                      <Text style={styles.resendActiveText}>Gửi lại mã xác minh mới</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendDisabledText}>
                      Gửi lại mã sau: <Text style={{ color: '#E50914', fontWeight: 'bold' }}>{countdown}s</Text>
                    </Text>
                  )}
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setStep('REQUEST')}>
                    <Text style={styles.backStepText}>Đổi Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1, marginTop: 0 }]}
                    onPress={handleVerifyOtp}
                    disabled={isLoading}>
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Xác minh danh tính</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= STEP 3: RESET PASSWORD ================= */}
            {step === 'RESET' && (
              <View>
                <Text style={styles.stepHeading}>Bước 3: Thiết lập mật khẩu mới</Text>
                <Text style={styles.stepSub}>
                  Danh tính đã được xác minh thành công. Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
                </Text>

                {/* New Password */}
                <Text style={styles.inputLabel}>Mật khẩu mới:</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#6B7280"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                {/* Strength Meter */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthBarBg}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          { width: strength.percent, backgroundColor: strength.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>
                      Độ mạnh: {strength.label}
                    </Text>
                  </View>
                )}

                {/* Confirm Password */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Xác nhận mật khẩu mới:</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="#6B7280"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCompleteReset}
                  disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Lưu & Cập Nhật Mật Khẩu</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= STEP 4: SUCCESS ================= */}
            {step === 'SUCCESS' && (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={40} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Khôi phục thành công!</Text>
                <Text style={styles.successDesc}>
                  Mật khẩu của tài khoản <Text style={styles.highlightText}>{identifier}</Text> đã được cập nhật an toàn trong hệ thống.
                </Text>

                <TouchableOpacity
                  style={styles.finishBtn}
                  onPress={handleFinish}>
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.finishBtnText}>Đăng Nhập Ngay</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function ForgotPasswordModal({
  visible,
  onClose,
  onSuccess,
  initialIdentifier = '',
}: ForgotPasswordModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <ForgotPasswordContent
        onClose={onClose}
        onSuccess={onSuccess}
        initialIdentifier={initialIdentifier}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
  },
  modalCard: {
    backgroundColor: '#16181F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3139',
    padding: 20,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262A33',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#262A33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#E50914',
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#262A33',
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: '#E50914',
  },
  scrollBody: {
    paddingBottom: 8,
  },
  stepHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
    marginBottom: 16,
  },
  highlightText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1015',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  quickFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  quickFillText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  simulatedOtpBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  simulatedOtpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  simulatedOtpTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  simulatedOtpDesc: {
    fontSize: 13,
    color: '#E5E7EB',
    marginBottom: 8,
  },
  otpHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#60A5FA',
    letterSpacing: 2,
  },
  pasteOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pasteOtpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#93C5FD',
  },
  otpInputWrap: {
    backgroundColor: '#0F1015',
    borderWidth: 1,
    borderColor: '#E50914',
    borderRadius: 10,
    height: 54,
    justifyContent: 'center',
    marginBottom: 10,
  },
  otpInput: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendActiveText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resendDisabledText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backStepBtn: {
    backgroundColor: '#262A33',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  backStepText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#E50914',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  strengthWrap: {
    marginBottom: 8,
  },
  strengthBarBg: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  finishBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 48,
    borderRadius: 10,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    flex: 1,
  },
  successNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  successNoticeText: {
    color: '#34D399',
    fontSize: 13,
    flex: 1,
  },
});

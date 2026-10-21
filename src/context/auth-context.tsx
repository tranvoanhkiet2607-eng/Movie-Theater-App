import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  User,
  AuthSession,
  RegisterFormData,
  LoginFormData,
  AuthContextType,
} from '@/types/auth';
import { validateLoginForm, validateRegisterForm } from '@/utils/validation';
import { AuthAPI } from '@/services/api';

// ─── AsyncStorage keys (chỉ lưu token & remember-me, không lưu user data) ───
const TOKEN_STORAGE_KEY = '@movie_theater_token_v2';
const REMEMBERED_ID_KEY = '@movie_theater_remembered_id';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedIdentifier, setSavedIdentifier] = useState<string | null>(null);

  // ─── Khôi phục session từ token đã lưu ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // Load remember-me identifier
        const remembered = await AsyncStorage.getItem(REMEMBERED_ID_KEY);
        if (isMounted && remembered) setSavedIdentifier(remembered);

        // Kiểm tra token còn hiệu lực không
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
          const result = await AuthAPI.getMe(storedToken);
          if (result.success && result.user && isMounted) {
            setUser(result.user as User);
            setSession({
              token: storedToken,
              userId: result.user.id,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              rememberMe: true,
              devicePlatform: 'restored',
            });
          } else {
            // Token hết hạn → xóa đi
            await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }
      } catch {
        // Token không hợp lệ hoặc server offline → xóa token
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initializeAuth();
    return () => { isMounted = false; };
  }, []);

  // ─── Helper: lấy token hiện tại ────────────────────────────────────────────
  async function getToken(): Promise<string | null> {
    return session?.token ?? AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /**
   * UC01: Đăng ký tài khoản
   */
  async function register(
    data: RegisterFormData
  ): Promise<{ success: boolean; message: string; user?: User }> {
    // Validate phía client trước
    const validation = validateRegisterForm(data);
    if (!validation.isValid) {
      const firstKey = Object.keys(validation.errors)[0] as keyof typeof validation.errors;
      return { success: false, message: validation.errors[firstKey] || 'Dữ liệu không hợp lệ' };
    }

    try {
      const result = await AuthAPI.register({
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
      });

      if (result.success && result.token && result.user) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        const newSession: AuthSession = {
          token: result.token,
          userId: result.user.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          rememberMe: true,
          devicePlatform: 'register',
        };
        setUser(result.user as User);
        setSession(newSession);
        return { success: true, message: result.message, user: result.user as User };
      }

      return { success: false, message: result.message || 'Đăng ký thất bại.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.' };
    }
  }

  /**
   * UC02: Đăng nhập
   */
  async function login(
    data: LoginFormData
  ): Promise<{ success: boolean; message: string }> {
    const validation = validateLoginForm(data);
    if (!validation.isValid) {
      const firstKey = Object.keys(validation.errors)[0] as keyof typeof validation.errors;
      return { success: false, message: validation.errors[firstKey] || 'Dữ liệu không hợp lệ' };
    }

    try {
      const result = await AuthAPI.login({
        identifier: data.identifier.trim(),
        password: data.password,
        rememberMe: data.rememberMe,
      });

      if (result.success && result.token && result.user) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, result.token);

        if (data.rememberMe) {
          await AsyncStorage.setItem(REMEMBERED_ID_KEY, data.identifier.trim());
          setSavedIdentifier(data.identifier.trim());
        } else {
          await AsyncStorage.removeItem(REMEMBERED_ID_KEY);
          setSavedIdentifier(null);
        }

        const durationHours = data.rememberMe ? 30 * 24 : 24;
        const newSession: AuthSession = {
          token: result.token,
          userId: result.user.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
          rememberMe: data.rememberMe,
          devicePlatform: 'login',
        };

        setUser(result.user as User);
        setSession(newSession);
        return { success: true, message: result.message };
      }

      return { success: false, message: result.message || 'Đăng nhập thất bại.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Đăng nhập không thành công. Vui lòng thử lại.' };
    }
  }

  /**
   * UC02: Đăng xuất
   */
  async function logout(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setSession(null);
  }

  /**
   * Cập nhật hồ sơ
   */
  async function updateProfile(
    updatedData: Partial<Pick<User, 'fullName' | 'phone' | 'avatarUrl'>>
  ): Promise<{ success: boolean; message: string }> {
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    try {
      const token = await getToken();
      if (!token) return { success: false, message: 'Phiên đăng nhập đã hết hạn.' };

      const result = await AuthAPI.updateProfile(token, updatedData);
      if (result.success && result.user) {
        setUser(result.user as User);
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Cập nhật thất bại.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Cập nhật thất bại. Vui lòng thử lại.' };
    }
  }

  /**
   * UC02: Đổi mật khẩu
   */
  async function changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    try {
      const token = await getToken();
      if (!token) return { success: false, message: 'Phiên đăng nhập đã hết hạn.' };

      const result = await AuthAPI.changePassword(token, oldPassword, newPassword);
      return { success: result.success, message: result.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.' };
    }
  }

  /**
   * UC04: Yêu cầu OTP reset mật khẩu
   */
  async function requestPasswordReset(identifier: string): Promise<{
    success: boolean;
    message: string;
    demoOtp?: string;
    maskedTarget?: string;
  }> {
    try {
      const result = await AuthAPI.forgotPassword(identifier.trim());
      return {
        success: result.success,
        message: result.message,
        demoOtp: result.demoOtp,
        maskedTarget: result.maskedTarget,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Đã xảy ra lỗi khi yêu cầu đặt lại mật khẩu.' };
    }
  }

  /**
   * UC04: Xác minh OTP
   */
  async function verifyResetOtp(
    identifier: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await AuthAPI.verifyOtp(identifier.trim(), code.trim());
      return { success: result.success, message: result.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Đã xảy ra sự cố trong quá trình xác minh danh tính.' };
    }
  }

  /**
   * UC04: Hoàn tất đặt lại mật khẩu
   */
  async function completePasswordReset(
    identifier: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await AuthAPI.resetPassword(identifier.trim(), code.trim(), newPassword);
      return { success: result.success, message: result.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Không thể cập nhật mật khẩu mới do lỗi hệ thống.' };
    }
  }

  /**
   * Legacy reset (giữ tương thích ngược)
   */
  async function resetPassword(
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Dùng luồng mới: yêu cầu OTP → bỏ qua verify (legacy flow)
      const result = await AuthAPI.resetPassword(email.trim(), '', newPassword);
      return { success: result.success, message: result.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Có lỗi xảy ra khi đặt lại mật khẩu.' };
    }
  }

  /**
   * UC02: Xóa tài khoản
   */
  async function deleteAccount(): Promise<{ success: boolean; message: string }> {
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    try {
      const token = await getToken();
      if (!token) return { success: false, message: 'Phiên đăng nhập đã hết hạn.' };

      const result = await AuthAPI.deleteAccount(token);
      if (result.success) {
        await logout();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Xóa tài khoản thất bại.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Xóa tài khoản thất bại.' };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        resetPassword,
        requestPasswordReset,
        verifyResetOtp,
        completePasswordReset,
        deleteAccount,
        savedIdentifier,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

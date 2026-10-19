import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  User,
  AuthSession,
  RegisterFormData,
  LoginFormData,
  AuthContextType,
} from '@/types/auth';
import { validateLoginForm, validateRegisterForm } from '@/utils/validation';

const USERS_STORAGE_KEY = '@movie_theater_users_v1';
const SESSION_STORAGE_KEY = '@movie_theater_session_v1';
const REMEMBERED_ID_KEY = '@movie_theater_remembered_id';

// Default mock accounts for immediate testing
const INITIAL_MOCK_USERS: User[] = [
  {
    id: 'usr_demo_01',
    fullName: 'Nguyễn Văn A',
    email: 'customer@cinema.com',
    phone: '0901234567',
    password: 'password123',
    role: 'customer',
    membershipTier: 'Gold',
    loyaltyPoints: 350,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: '2025-01-10T08:30:00Z',
  },
  {
    id: 'usr_demo_02',
    fullName: 'Trần Thị Bích Ngọc',
    email: 'vip@cinema.com',
    phone: '0987654321',
    password: 'password123',
    role: 'customer',
    membershipTier: 'VIP',
    loyaltyPoints: 1250,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    createdAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'usr_demo_admin',
    fullName: 'Quản Lý Rạp CineMax',
    email: 'admin@cinema.com',
    phone: '0912345678',
    password: 'password123',
    role: 'admin',
    membershipTier: 'VIP',
    loyaltyPoints: 9999,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedIdentifier, setSavedIdentifier] = useState<string | null>(null);

  // Initialize storage & restore session
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // 1. Ensure mock database exists
        const storedUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
        if (!storedUsers) {
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
        }

        // 2. Load saved remember-me identifier
        const remembered = await AsyncStorage.getItem(REMEMBERED_ID_KEY);
        if (isMounted && remembered) {
          setSavedIdentifier(remembered);
        }

        // 3. Check for existing active session
        const rawSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
          const parsedSession: AuthSession = JSON.parse(rawSession);
          const now = new Date().getTime();
          const expiresAt = new Date(parsedSession.expiresAt).getTime();

          if (now < expiresAt) {
            // Session is still valid, fetch user
            const usersData = storedUsers ? JSON.parse(storedUsers) : INITIAL_MOCK_USERS;
            const currentUser = usersData.find((u: User) => u.id === parsedSession.userId);

            if (currentUser && isMounted) {
              setUser(currentUser);
              setSession(parsedSession);
            }
          } else {
            // Session expired, remove it
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Helper to load all stored users
   */
  async function getAllUsers(): Promise<User[]> {
    const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
      return INITIAL_MOCK_USERS;
    }
    return JSON.parse(raw);
  }

  /**
   * UC01: Customer Registration with Input Validation and Duplicate Checking
   */
  async function register(data: RegisterFormData): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // 1. Input Validation
      const validation = validateRegisterForm(data);
      if (!validation.isValid) {
        const firstErrorKey = Object.keys(validation.errors)[0] as keyof typeof validation.errors;
        return {
          success: false,
          message: validation.errors[firstErrorKey] || 'Dữ liệu không hợp lệ',
        };
      }

      const users = await getAllUsers();
      const normalizedEmail = data.email.trim().toLowerCase();
      const normalizedPhone = data.phone.trim();

      // 2. Duplicate Check: Email
      const emailExists = users.some(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (emailExists) {
        return {
          success: false,
          message: 'Email này đã được đăng ký tài khoản. Vui lòng sử dụng Email khác hoặc Đăng nhập.',
        };
      }

      // 3. Duplicate Check: Phone
      const phoneExists = users.some((u) => u.phone === normalizedPhone);
      if (phoneExists) {
        return {
          success: false,
          message: 'Số điện thoại này đã được liên kết với một tài khoản khác.',
        };
      }

      // 4. Create new customer user
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password: data.password,
        role: 'customer',
        membershipTier: 'Standard',
        loyaltyPoints: 50, // Welcome gift
        avatarUrl: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(data.fullName.trim())}`,
        createdAt: new Date().toISOString(),
      };

      // 5. Save into storage
      users.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      // 6. Create active session for instant login
      const newSession: AuthSession = {
        token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        userId: newUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        rememberMe: true,
        devicePlatform: Platform.OS,
      };

      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setUser(newUser);
      setSession(newSession);

      return {
        success: true,
        message: 'Đăng ký tài khoản khách hàng thành công! Bạn nhận được 50 điểm thưởng chào mừng.',
        user: newUser,
      };
    } catch (err) {
      console.error('Registration error:', err);
      return {
        success: false,
        message: 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.',
      };
    }
  }

  /**
   * UC02: Customer Login & Session Management
   */
  async function login(data: LoginFormData): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Validate inputs
      const validation = validateLoginForm(data);
      if (!validation.isValid) {
        const firstErrorKey = Object.keys(validation.errors)[0] as keyof typeof validation.errors;
        return {
          success: false,
          message: validation.errors[firstErrorKey] || 'Dữ liệu không hợp lệ',
        };
      }

      const users = await getAllUsers();
      const searchTarget = data.identifier.trim().toLowerCase();

      // 2. Find customer by Email OR Phone
      const foundUser = users.find(
        (u) =>
          u.email.toLowerCase() === searchTarget ||
          u.phone === data.identifier.trim()
      );

      if (!foundUser) {
        return {
          success: false,
          message: 'Không tìm thấy tài khoản với Email hoặc Số điện thoại này.',
        };
      }

      // 3. Verify password
      if (foundUser.password !== data.password) {
        return {
          success: false,
          message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        };
      }

      // 4. Session validity (30 days if rememberMe, 24 hours otherwise)
      const durationHours = data.rememberMe ? 30 * 24 : 24;
      const newSession: AuthSession = {
        token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        userId: foundUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
        rememberMe: data.rememberMe,
        devicePlatform: Platform.OS,
      };

      // 5. Persist Session & Remembered identifier
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));

      if (data.rememberMe) {
        await AsyncStorage.setItem(REMEMBERED_ID_KEY, data.identifier.trim());
        setSavedIdentifier(data.identifier.trim());
      } else {
        await AsyncStorage.removeItem(REMEMBERED_ID_KEY);
        setSavedIdentifier(null);
      }

      // Update State
      setUser(foundUser);
      setSession(newSession);

      return {
        success: true,
        message: `Chào mừng ${foundUser.fullName} quay trở lại!`,
      };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        message: 'Đăng nhập không thành công do lỗi hệ thống. Vui lòng thử lại.',
      };
    }
  }

  /**
   * UC02: Terminate Session (Logout)
   */
  async function logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  /**
   * Update Profile data
   */
  async function updateProfile(
    updatedData: Partial<Pick<User, 'fullName' | 'phone' | 'avatarUrl'>>
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!user) {
        return { success: false, message: 'Bạn chưa đăng nhập.' };
      }

      const users = await getAllUsers();
      const updatedUser: User = {
        ...user,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      const updatedUsersList = users.map((u) => (u.id === user.id ? updatedUser : u));
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsersList));

      setUser(updatedUser);
      return { success: true, message: 'Cập nhật thông tin thành công!' };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, message: 'Cập nhật thất bại. Vui lòng thử lại.' };
    }
  }

  /**
   * UC02: Change Password
   */
  async function changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!user) {
        return { success: false, message: 'Bạn chưa đăng nhập.' };
      }

      if (user.password !== oldPassword) {
        return { success: false, message: 'Mật khẩu hiện tại không chính xác.' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
      }

      if (oldPassword === newPassword) {
        return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ.' };
      }

      const users = await getAllUsers();
      const updatedUser: User = {
        ...user,
        password: newPassword,
        updatedAt: new Date().toISOString(),
      };

      const updatedUsersList = users.map((u) => (u.id === user.id ? updatedUser : u));
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsersList));

      setUser(updatedUser);
      return { success: true, message: 'Đổi mật khẩu thành công!' };
    } catch (err) {
      console.error('Change password error:', err);
      return { success: false, message: 'Đổi mật khẩu thất bại. Vui lòng thử lại.' };
    }
  }

  /**
   * UC02: Reset / Forgot Password
   */
  async function resetPassword(
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const users = await getAllUsers();
      const userIndex = users.findIndex(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (userIndex === -1) {
        return {
          success: false,
          message: 'Không tìm thấy tài khoản nào khớp với Email này.',
        };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
      }

      users[userIndex].password = newPassword;
      users[userIndex].updatedAt = new Date().toISOString();

      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      return {
        success: true,
        message: 'Khôi phục mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
      };
    } catch (err) {
      console.error('Reset password error:', err);
      return { success: false, message: 'Có lỗi xảy ra khi đặt lại mật khẩu.' };
    }
  }

  /**
   * UC02: Delete Account / Clear Session
   */
  async function deleteAccount(): Promise<{ success: boolean; message: string }> {
    try {
      if (!user) {
        return { success: false, message: 'Bạn chưa đăng nhập.' };
      }

      const users = await getAllUsers();
      const remainingUsers = users.filter((u) => u.id !== user.id);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(remainingUsers));
      await logout();

      return { success: true, message: 'Tài khoản của bạn đã được xóa thành công.' };
    } catch (err) {
      console.error('Delete account error:', err);
      return { success: false, message: 'Xóa tài khoản thất bại.' };
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

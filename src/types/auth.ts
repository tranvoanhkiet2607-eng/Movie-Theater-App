export type MembershipTier = 'Standard' | 'Silver' | 'Gold' | 'VIP';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string; // Stored securely in mock database
  role: 'customer' | 'admin';
  membershipTier: MembershipTier;
  loyaltyPoints: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  rememberMe: boolean;
  devicePlatform: string;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export interface RegisterErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
  general?: string;
}

export interface LoginFormData {
  identifier: string; // Email or Phone number
  password: string;
  rememberMe: boolean;
}

export interface LoginErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

export interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterFormData) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => Promise<void>;
  updateProfile: (updatedData: Partial<Pick<User, 'fullName' | 'phone' | 'avatarUrl'>>) => Promise<{ success: boolean; message: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  deleteAccount: () => Promise<{ success: boolean; message: string }>;
  savedIdentifier: string | null;
}

import { RegisterFormData, RegisterErrors, LoginFormData, LoginErrors } from '@/types/auth';

/**
 * Regex for standard email validation
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Regex for Vietnamese phone number (10 digits starting with 03, 05, 07, 08, 09)
 */
export const VN_PHONE_REGEX = /^(0[35789])[0-9]{8}$/;

/**
 * Validate Vietnamese name (letters, spaces, accents, min 2 chars)
 */
export const NAME_REGEX = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]{2,50}$/;

/**
 * Calculate password strength:
 * 0: Very Weak
 * 1: Weak
 * 2: Medium
 * 3: Strong
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: 'Rất yếu' | 'Yếu' | 'Trung bình' | 'Mạnh';
  color: string;
} {
  if (!password) {
    return { score: 0, label: 'Rất yếu', color: '#6B7280' };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 0.5;
  if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 0.5;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score >= 3) {
    return { score: 3, label: 'Mạnh', color: '#10B981' };
  } else if (score >= 2) {
    return { score: 2, label: 'Trung bình', color: '#F59E0B' };
  } else if (score >= 1) {
    return { score: 1, label: 'Yếu', color: '#EF4444' };
  }
  return { score: 0, label: 'Rất yếu', color: '#DC2626' };
}

/**
 * UC01: Validate customer registration form data
 */
export function validateRegisterForm(data: RegisterFormData): {
  isValid: boolean;
  errors: RegisterErrors;
} {
  const errors: RegisterErrors = {};

  // Full Name
  const trimmedName = data.fullName.trim();
  if (!trimmedName) {
    errors.fullName = 'Họ và tên không được để trống';
  } else if (trimmedName.length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
  } else if (!NAME_REGEX.test(trimmedName)) {
    errors.fullName = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
  }

  // Email
  const trimmedEmail = data.email.trim();
  if (!trimmedEmail) {
    errors.email = 'Email không được để trống';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Email không đúng định dạng (VD: example@gmail.com)';
  }

  // Phone number
  const trimmedPhone = data.phone.trim();
  if (!trimmedPhone) {
    errors.phone = 'Số điện thoại không được để trống';
  } else if (!VN_PHONE_REGEX.test(trimmedPhone)) {
    errors.phone = 'Số điện thoại phải gồm 10 chữ số (đầu số 03, 05, 07, 08, 09)';
  }

  // Password
  if (!data.password) {
    errors.password = 'Mật khẩu không được để trống';
  } else if (data.password.length < 6) {
    errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự';
  }

  // Confirm password
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  // Terms and conditions
  if (!data.agreeTerms) {
    errors.agreeTerms = 'Bạn phải đồng ý với Điều khoản và Quy chế của rạp phim';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * UC02: Validate customer login form data
 */
export function validateLoginForm(data: LoginFormData): {
  isValid: boolean;
  errors: LoginErrors;
} {
  const errors: LoginErrors = {};

  const trimmedIdentifier = data.identifier.trim();
  if (!trimmedIdentifier) {
    errors.identifier = 'Vui lòng nhập Email hoặc Số điện thoại';
  } else {
    const isEmail = EMAIL_REGEX.test(trimmedIdentifier);
    const isPhone = VN_PHONE_REGEX.test(trimmedIdentifier);

    if (!isEmail && !isPhone) {
      errors.identifier = 'Vui lòng nhập Email hợp lệ hoặc Số điện thoại 10 số';
    }
  }

  if (!data.password) {
    errors.password = 'Vui lòng nhập mật khẩu';
  } else if (data.password.length < 6) {
    errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

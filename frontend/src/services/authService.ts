import { api } from './api';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse, 
  RefreshTokenRequest,
  RefreshTokenResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  LogoutRequest,
  User 
} from '@/types/auth.types';
import { API_ENDPOINTS } from '@/utils/constants';

class AuthService {
  /**
   * Register a new user account
   * Requirements: 1.1 - Create new user account with unverified status
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  }

  /**
   * Authenticate user and receive tokens
   * Requirements: 3.1 - Generate and return access and refresh tokens for verified users
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  }

  /**
   * Logout user and blacklist tokens
   * Requirements: 4.4 - Add tokens to blacklist with appropriate expiry times
   */
  async logout(refreshToken: string): Promise<void> {
    const logoutData: LogoutRequest = { refresh_token: refreshToken };
    await api.post(API_ENDPOINTS.AUTH.LOGOUT, logoutData);
  }

  /**
   * Refresh access token using refresh token
   * Requirements: 4.3 - Generate new access token from valid refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await api.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH, 
      { refresh_token: refreshToken } as RefreshTokenRequest
    );
    return response.data;
  }

  /**
   * Verify user email with verification token
   * Requirements: 2.1 - Validate token and mark user account as verified
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const verifyData: VerifyEmailRequest = { token };
    const response = await api.post<VerifyEmailResponse>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, verifyData);
    return response.data;
  }

  /**
   * Resend email verification
   * Helper method for email verification flow
   */
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const resendData: ResendVerificationRequest = { email };
    const response = await api.post<ResendVerificationResponse>(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, resendData);
    return response.data;
  }

  /**
   * Request password reset email
   * Requirements: 5.1 - Send password reset email with unique reset link valid for 1 hour
   */
  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    const resetData: PasswordResetRequest = { email };
    const response = await api.post<PasswordResetResponse>(API_ENDPOINTS.AUTH.PASSWORD_RESET_REQUEST, resetData);
    return response.data;
  }

  /**
   * Confirm password reset with token and new password
   * Requirements: 5.3 - Validate password meets complexity requirements and update user account
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetConfirmResponse> {
    const confirmData: PasswordResetConfirmRequest = { 
      token, 
      new_password: newPassword 
    };
    const response = await api.post<PasswordResetConfirmResponse>(API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, confirmData);
    return response.data;
  }

  /**
   * Change password for authenticated user
   * Requirements: 8.1 - Verify current password before allowing change
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    const changeData: ChangePasswordRequest = { 
      current_password: currentPassword, 
      new_password: newPassword 
    };
    const response = await api.post<ChangePasswordResponse>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, changeData);
    return response.data;
  }

  /**
   * Get current user profile
   * Helper method for profile management
   */
  async getProfile(): Promise<User> {
    const response = await api.get(API_ENDPOINTS.USERS.ME);
    // Backend returns {profile: {...}}, so we need to extract the profile
    return response.data.profile;
  }
}

export const authService = new AuthService();

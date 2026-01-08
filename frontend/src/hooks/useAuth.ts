import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import { setLoading, loginSuccess, loginFailure, logout as logoutAction } from '@/store/authSlice';
import { authService } from '@/services/authService';
import type { LoginRequest, RegisterRequest } from '@/types/auth.types';
import { ROUTES } from '@/utils/constants';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch(setLoading(true));
      const response = await authService.login(credentials);
      
      dispatch(loginSuccess({
        user: response.user,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      }));

      // Navigate to dashboard based on role
      navigate(ROUTES.DASHBOARD);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed. Please try again.';
      dispatch(loginFailure(errorMessage));
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      dispatch(setLoading(true));
      const response = await authService.register(data);
      
      dispatch(setLoading(false));
      
      // Redirect to email verification page
      navigate(ROUTES.VERIFY_EMAIL, { state: { email: data.email } });
      
      return { success: true, message: 'Registration successful! Please verify your email.', otp: response.otp };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed. Please try again.';
      dispatch(loginFailure(errorMessage));
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (auth.refreshToken) {
        await authService.logout(auth.refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(logoutAction());
      navigate(ROUTES.LOGIN);
    }
  };

  return {
    ...auth,
    login,
    register,
    logout,
  };
};

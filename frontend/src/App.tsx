import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { router } from './router';
import { authService } from './services/authService';
import { loginSuccess, setLoading } from './store/authSlice';
import type { RootState, AppDispatch } from './store';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './utils/constants';
import { useKeyboardNavigationDetection } from './hooks/useKeyboardNavigation';
import './styles/admin-accessibility.css';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  // Initialize keyboard navigation detection for accessibility
  useKeyboardNavigationDetection();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (token && !user) {
        try {
          dispatch(setLoading(true));
          // Try to get user profile to restore user data
          const userProfile = await authService.getProfile();

          dispatch(loginSuccess({
            user: userProfile,
            accessToken: token,
            refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || '',
          }));
        } catch (error: any) {
          console.error('Failed to restore user session:', error);

          // Only clear tokens if it's an authentication error (401/403)
          // or if the error code indicates invalid token
          const isAuthError =
            error?.response?.status === 401 ||
            error?.response?.status === 403 ||
            error?.code === 'HTTP_401' ||
            error?.code === 'HTTP_403';

          if (isAuthError) {
            console.log('Session expired or invalid, clearing tokens');
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
          } else {
            // For other errors (network, 500, etc), don't clear tokens immediately
            // allowing the user to retry or reload without losing session
            console.warn('Non-auth error during session restore, keeping tokens');
          }
        } finally {
          dispatch(setLoading(false));
        }
      } else if (!token) {
        dispatch(setLoading(false));
      }
    };

    initializeAuth();
  }, [dispatch, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;

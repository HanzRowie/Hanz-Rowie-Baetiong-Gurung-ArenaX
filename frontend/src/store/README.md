# Redux Store Documentation

## Overview

The Redux store is configured with Redux Toolkit and includes authentication state management with the following features:

- **Redux DevTools**: Enabled in development mode for debugging
- **Auth State Management**: Complete authentication state with user, tokens, loading, and error states
- **Selectors**: Pre-built selectors for easy state access
- **LocalStorage Integration**: Automatic token persistence

## Store Structure

```typescript
interface RootState {
  auth: AuthState;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

## Available Actions

### Core Actions
- `setLoading(boolean)` - Set loading state
- `loginSuccess({ user, accessToken, refreshToken })` - Handle successful login
- `loginFailure(errorMessage)` - Handle login failure
- `logout()` - Clear auth state and tokens
- `updateUser(user)` - Update user information
- `clearError()` - Clear error state
- `updateTokens({ accessToken, refreshToken? })` - Update tokens (useful for token refresh)

### Usage Example

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess, logout, setLoading } from '@/store/authSlice';
import { selectUser, selectIsAuthenticated, selectIsLoading } from '@/store';

function MyComponent() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);

  const handleLogin = async (credentials) => {
    dispatch(setLoading(true));
    try {
      const response = await authService.login(credentials);
      dispatch(loginSuccess({
        user: response.user,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      }));
    } catch (error) {
      dispatch(loginFailure(error.message));
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.full_name}!</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => handleLogin(credentials)}>Login</button>
      )}
    </div>
  );
}
```

## Available Selectors

- `selectAuth(state)` - Get entire auth state
- `selectUser(state)` - Get current user
- `selectAccessToken(state)` - Get access token
- `selectRefreshToken(state)` - Get refresh token
- `selectIsAuthenticated(state)` - Get authentication status
- `selectIsLoading(state)` - Get loading state
- `selectAuthError(state)` - Get error message

## LocalStorage Integration

The store automatically:
- Loads tokens from localStorage on initialization
- Saves tokens to localStorage on login success
- Removes tokens from localStorage on logout
- Updates tokens in localStorage when using `updateTokens` action

## Redux DevTools

Redux DevTools are enabled in development mode. You can:
- Inspect state changes in real-time
- Time-travel debug through actions
- Export/import state for testing

## Requirements Satisfied

This implementation satisfies the following requirements:
- **3.1**: JWT-based authentication state management
- **4.1**: Token storage and management for API requests
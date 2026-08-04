import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, AuthState } from '../types';
import { authService, LoginPayload, RegisterPayload } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<UserRole>;
  register: (payload: RegisterPayload) => Promise<UserRole>;
  logout: () => void;
  getRoleRedirectPath: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getRoleRedirectPath = (role?: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'coach':
      return '/coach/dashboard';
    case 'user':
    default:
      return '/user/dashboard';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isLoading: true,
  });

  // Verify and hydrate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      try {
        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          setState({
            user: response.data.user,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          throw new Error('Failed to fetch user');
        }
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload): Promise<UserRole> => {
    const res = await authService.login(payload);
    if (res.success && res.data) {
      const { user, token } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return user.role;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (payload: RegisterPayload): Promise<UserRole> => {
    const res = await authService.register(payload);
    if (res.success && res.data) {
      const { user, token } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return user.role;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        getRoleRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

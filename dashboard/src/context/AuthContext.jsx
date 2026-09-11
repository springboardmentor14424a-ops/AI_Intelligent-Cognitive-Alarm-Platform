import React, { createContext, useContext, useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('cogniwell_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('cogniwell_user') || 'null'));
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const saveAuthData = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem('cogniwell_token', newToken);
      localStorage.setItem('cogniwell_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('cogniwell_token');
      localStorage.removeItem('cogniwell_user');
    }
  };

  // JWT Login with PostgreSQL backend & exact error messages
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        throw new Error(data.message || 'Login failed');
      }

      saveAuthData(data.token, data.user);
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // JWT Register with PostgreSQL backend & BCrypt encryption
  const register = async (name, email, password, role = 'User', coachId = null) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        throw new Error(data.message || 'Registration failed');
      }

      // If a specific coach was selected, assign them now
      if (coachId && data.user?.id) {
        await fetch(`${API_BASE_URL}/api/coach/assign`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ userId: data.user.id, coachId })
        });
      }

      saveAuthData(data.token, data.user);
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };


  // OAuth Login
  const loginWithOAuth = async (provider, role = 'User') => {
    setLoading(true);
    setAuthError(null);
    try {
      const mockOAuthProfile = {
        provider,
        providerId: `oauth_${Date.now()}`,
        email: `${provider.toLowerCase()}_user@cogniwell.com`,
        name: `${provider} Authenticated User`,
        avatarUrl: provider === 'Google' ? 'GU' : 'GH',
        role
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/oauth`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mockOAuthProfile)
      });

      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        throw new Error(data.message || 'OAuth authentication failed');
      }

      saveAuthData(data.token, data.user);
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    saveAuthData(null, null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      authError,
      login,
      register,
      loginWithOAuth,
      logout,
      isAuthenticated: !!token,
      role: user?.role || 'guest'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

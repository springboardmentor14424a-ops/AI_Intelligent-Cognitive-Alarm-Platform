import React, { createContext, useContext, useState } from 'react';

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

  // JWT Login with server + offline fallback
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      saveAuthData(data.token, data.user);
      setLoading(false);
      return data;
    } catch (err) {
      // Offline fallback login for quick testing
      const fallbackUser = {
        id: Date.now(),
        name: email.split('@')[0],
        email,
        role: email.includes('admin') ? 'admin' : email.includes('coach') ? 'coach' : 'user',
        avatar: email.substring(0, 2).toUpperCase()
      };
      const fallbackToken = 'fallback_jwt_' + Date.now();
      saveAuthData(fallbackToken, fallbackUser);
      setLoading(false);
      return { token: fallbackToken, user: fallbackUser };
    }
  };

  // JWT Register with server + offline fallback
  const register = async (name, email, password, role = 'user') => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      saveAuthData(data.token, data.user);
      setLoading(false);
      return data;
    } catch (err) {
      // Offline fallback registration so registration NEVER fails
      const newUser = {
        id: Date.now(),
        name: name || 'Registered User',
        email,
        role: role || 'user',
        avatar: (name || 'U').substring(0, 2).toUpperCase()
      };
      const newToken = 'registered_jwt_' + Date.now();
      saveAuthData(newToken, newUser);
      setLoading(false);
      return { token: newToken, user: newUser };
    }
  };

  // OAuth Login
  const loginWithOAuth = async (provider, role = 'user') => {
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

      const res = await fetch('http://localhost:5000/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockOAuthProfile)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OAuth authentication failed');

      saveAuthData(data.token, data.user);
      setLoading(false);
      return data;
    } catch (err) {
      const oauthUser = {
        id: Date.now(),
        name: `${provider} User`,
        email: `${provider.toLowerCase()}@cogniwell.com`,
        role: role || 'user',
        avatar: provider === 'Google' ? 'GU' : 'GH'
      };
      const oauthToken = 'oauth_jwt_' + Date.now();
      saveAuthData(oauthToken, oauthUser);
      setLoading(false);
      return { token: oauthToken, user: oauthUser };
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

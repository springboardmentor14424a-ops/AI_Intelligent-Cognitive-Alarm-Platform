import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Store role in localStorage: 'student' | 'coach' | 'admin' | null
  const [role, setRole] = useState(() => {
    return localStorage.getItem('user_role') || 'student';
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) return JSON.parse(savedUser);
    return { name: 'Alex Rivera', email: 'alex@alarm.io' };
  });

  useEffect(() => {
    if (role) {
      localStorage.setItem('user_role', role);
    } else {
      localStorage.removeItem('user_role');
    }
  }, [role]);

  const login = (selectedRole, email) => {
    let normalizedRole = 'student';
    let userInfo = { name: 'Alex Rivera', email: email || 'alex@alarm.io' };

    if (selectedRole === 'Student' || selectedRole === 'student') {
      normalizedRole = 'student';
      userInfo = { name: 'Alex Rivera', email: email || 'alex@alarm.io' };
    } else if (selectedRole === 'Wellness Coach' || selectedRole === 'coach') {
      normalizedRole = 'coach';
      userInfo = { name: 'Dr. Aris Thorne', email: email || 'coach@alarm.io' };
    } else if (selectedRole === 'Administrator' || selectedRole === 'admin') {
      normalizedRole = 'admin';
      userInfo = { name: 'System Ops Lead', email: email || 'admin@alarm.io' };
    }

    setRole(normalizedRole);
    setUser(userInfo);
    localStorage.setItem('user_role', normalizedRole);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    return normalizedRole;
  };

  const logout = () => {
    setRole(null);
    setUser(null);
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_info');
  };

  return (
    <AuthContext.Provider value={{ role, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

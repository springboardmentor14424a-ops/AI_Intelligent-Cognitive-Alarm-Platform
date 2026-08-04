import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { CgSpinner } from 'react-icons/cg';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user, getRoleRedirectPath } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <CgSpinner className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to their role-appropriate dashboard if trying to access unauthorized route
    const fallbackPath = getRoleRedirectPath(user.role);
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};

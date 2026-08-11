import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useToast } from '../components/Toast';
import { CgSpinner } from 'react-icons/cg';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getRoleRedirectPath } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      if (!token) {
        toast.error('Authentication Error', 'No session token received from OAuth callback.');
        navigate('/login', { replace: true });
        return;
      }

      try {
        localStorage.setItem('token', token);
        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          toast.success('Google Authentication Successful', `Logged in as ${response.data.user.name}`);
          const targetPath = getRoleRedirectPath(response.data.user.role);
          window.location.href = targetPath;
        } else {
          throw new Error('Could not hydrate user profile session');
        }
      } catch (err: any) {
        toast.error('Login Failed', err.message || 'Failed to authenticate session.');
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, getRoleRedirectPath, toast]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
      <CgSpinner className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-white mb-1">Completing Authentication</h2>
      <p className="text-sm text-slate-400">Syncing Google profile and initializing dashboard session...</p>
    </div>
  );
};

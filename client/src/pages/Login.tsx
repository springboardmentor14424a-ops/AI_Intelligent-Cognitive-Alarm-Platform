import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { FormInput } from '../components/FormInput';
import { LoadingButton } from '../components/LoadingButton';
import { UserRole } from '../types';
import { FiMail, FiLock, FiActivity, FiShield } from 'react-icons/fi';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['user', 'coach', 'admin'] as const),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, isAuthenticated, user, getRoleRedirectPath } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'user',
    },
  });

  const selectedRole = watch('role');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleRedirectPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate, getRoleRedirectPath]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const userRole = await login(data);
      toast.success('Welcome back!', `Logged in successfully as ${userRole.toUpperCase()}`);
      navigate(getRoleRedirectPath(userRole), { replace: true });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Authentication failed';
      toast.error('Authentication Error', errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <Link
            to="/"
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/25 border border-blue-400/20"
          >
            <FiActivity className="w-8 h-8 text-white" />
          </Link>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Intelligent Cognitive Alarm Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800 space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Role Selection Dropdown / Selector */}
            <div className="space-y-1.5">
              <label htmlFor="role-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FiShield className="w-4 h-4 text-indigo-400" />
                Select Account Role
              </label>
              <div className="relative">
                <select
                  id="role-select"
                  value={selectedRole}
                  onChange={(e) => setValue('role', e.target.value as UserRole)}
                  className="w-full text-sm rounded-xl py-3 px-4 glass-input bg-slate-900 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
                >
                  <option value="user">User / Student</option>
                  <option value="coach">Coach / Counselor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <FormInput
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              icon={<FiMail className="w-5 h-5" />}
              registration={register('email')}
              error={errors.email?.message}
            />

            <FormInput
              label="Password"
              isPassword
              placeholder="••••••••"
              icon={<FiLock className="w-5 h-5" />}
              registration={register('password')}
              error={errors.password?.message}
            />

            <div>
              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                loadingText="Signing in..."
                className="w-full"
              >
                Sign In
              </LoadingButton>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-slate-800/80 pt-5">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

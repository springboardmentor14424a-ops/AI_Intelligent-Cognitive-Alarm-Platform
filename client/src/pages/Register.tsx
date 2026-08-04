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
import { FiUser, FiMail, FiLock, FiActivity, FiShield } from 'react-icons/fi';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'coach', 'admin'] as const),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { register: registerAuth, isAuthenticated, user, getRoleRedirectPath } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
  });

  const currentRole = watch('role');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleRedirectPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate, getRoleRedirectPath]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const userRole = await registerAuth(data);
      toast.success('Account Created!', `Registered successfully as ${userRole.toUpperCase()}`);
      navigate(getRoleRedirectPath(userRole), { replace: true });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      toast.error('Registration Error', errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <Link to="/" className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 border border-indigo-400/20">
            <FiActivity className="w-8 h-8 text-white" />
          </Link>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Join the Intelligent Cognitive Alarm Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800 space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormInput
              label="Full Name"
              placeholder="John Doe"
              icon={<FiUser className="w-5 h-5" />}
              registration={register('name')}
              error={errors.name?.message}
            />

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

            {/* Role Selection Tabs */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FiShield className="w-4 h-4 text-indigo-400" />
                Select Account Role
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
                {(['user', 'coach', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setValue('role', r)}
                    className={`py-2 text-xs font-bold rounded-lg capitalize transition-all duration-200 ${
                      currentRole === r
                        ? r === 'admin'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : r === 'coach'
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                loadingText="Registering..."
                className="w-full mt-2"
              >
                Register Account
              </LoadingButton>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-slate-800/80 pt-5">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

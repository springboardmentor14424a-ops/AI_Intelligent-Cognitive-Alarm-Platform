import React, { useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { FiEye, FiEyeOff } from 'react-icons/fi';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  registration?: UseFormRegisterReturn;
  isPassword?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  icon,
  registration,
  isPassword = false,
  type = 'text',
  className = '',
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
        {label}
      </label>
      <div className="relative rounded-xl">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          type={computedType}
          className={`w-full text-sm rounded-xl py-3 text-slate-100 placeholder-slate-500 glass-input transition-all duration-200 ${
            icon ? 'pl-10' : 'pl-4'
          } ${isPassword ? 'pr-10' : 'pr-4'} ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...registration}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1">{error}</p>}
    </div>
  );
};

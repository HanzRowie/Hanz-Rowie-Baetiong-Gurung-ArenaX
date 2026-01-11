import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { RoleType } from '../../tokens/colors';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  animation?: 'pulse' | 'bounce' | 'slide' | 'lift' | 'scale';
  haptic?: boolean;
  role?: RoleType;
  fullWidth?: boolean;
  children: ReactNode;
}

// Loading spinner component - moved outside to prevent recreation during render
const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      animation = 'lift',
      haptic = false,
      role,
      fullWidth = false,
      className,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    // Handle haptic feedback for mobile devices
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(50); // Short vibration
      }
      onClick?.(event);
    };

    // Base button classes
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-lg',
      'transition-all duration-fast ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      fullWidth && 'w-full',
    ];

    // Size variants
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
      xl: 'px-8 py-4 text-xl gap-3',
    };

    // Variant classes
    const variantClasses = {
      primary: role
        ? `bg-${role}-500 hover:bg-${role}-600 text-white focus:ring-${role}-500`
        : 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500',
      secondary: role
        ? `bg-${role}-100 hover:bg-${role}-200 text-${role}-700 focus:ring-${role}-500`
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
      ghost: role
        ? `text-${role}-600 hover:bg-${role}-50 focus:ring-${role}-500`
        : 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
      danger: 'bg-error-500 hover:bg-error-600 text-white focus:ring-error-500',
      success: 'bg-success-500 hover:bg-success-600 text-white focus:ring-success-500',
    };

    // Animation classes
    const animationClasses = {
      pulse: 'hover:animate-pulse',
      bounce: 'hover:animate-bounce',
      slide: 'hover:translate-x-1',
      lift: 'hover:animate-hover-lift hover:shadow-lg',
      scale: 'hover:animate-hover-scale',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          !disabled && !loading && animationClasses[animation],
          'animate-press', // Active state animation
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        <span className={loading ? 'opacity-0' : ''}>{children}</span>
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
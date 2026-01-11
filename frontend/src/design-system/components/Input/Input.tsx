import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  validation?: (value: string) => string | null;
  realTimeValidation?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Loading spinner component - moved outside to prevent recreation during render
const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4 text-text-tertiary"
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

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      icon,
      iconPosition = 'left',
      validation,
      realTimeValidation = false,
      loading = false,
      size = 'md',
      className,
      onChange,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(() => value || '');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [hasBeenBlurred, setHasBeenBlurred] = useState(false);

    // Memoized validation function to prevent unnecessary re-runs
    const validateValue = useCallback((val: string) => {
      if (validation) {
        return validation(val);
      }
      return null;
    }, [validation]);

    // Update internal value when prop value changes (avoid setState in effect)
    const currentValue = value !== undefined ? value : internalValue;

    // Real-time validation effect
    useEffect(() => {
      if (realTimeValidation && hasBeenBlurred && currentValue !== internalValue) {
        const errorMessage = validateValue(String(currentValue));
        setValidationError(errorMessage);
      }
    }, [currentValue, validateValue, realTimeValidation, hasBeenBlurred, internalValue]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInternalValue(newValue);
      
      // Clear validation error on change if there was one
      if (validationError) {
        setValidationError(null);
      }
      
      onChange?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasBeenBlurred(true);
      
      // Validate on blur
      const errorMessage = validateValue(String(currentValue));
      setValidationError(errorMessage);
      
      onBlur?.(event);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(event);
    };

    // Determine current state
    const currentError = error || validationError;
    const hasError = Boolean(currentError);
    const hasSuccess = Boolean(success && !hasError);

    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // Base input classes
    const baseInputClasses = [
      'w-full rounded-lg border transition-all duration-fast ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'placeholder:text-text-tertiary',
    ];

    // State-based classes
    const stateClasses = hasError
      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
      : hasSuccess
      ? 'border-success-500 focus:border-success-500 focus:ring-success-500/20'
      : isFocused
      ? 'border-primary-500 focus:border-primary-500 focus:ring-primary-500/20'
      : 'border-border-primary hover:border-border-secondary';

    // Icon classes
    const iconClasses = icon
      ? iconPosition === 'left'
        ? 'pl-10'
        : 'pr-10'
      : '';

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-text-primary">
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className={cn('text-text-tertiary', hasError && 'text-error-500', hasSuccess && 'text-success-500')}>
                {icon}
              </span>
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={cn(
              baseInputClasses,
              sizeClasses[size],
              stateClasses,
              iconClasses,
              loading && 'pr-10',
              className
            )}
            {...props}
          />

          {/* Right icon or loading */}
          {(icon && iconPosition === 'right') || loading ? (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <span className={cn('text-text-tertiary', hasError && 'text-error-500', hasSuccess && 'text-success-500')}>
                  {icon}
                </span>
              )}
            </div>
          ) : null}

          {/* Success/Error icons */}
          {!loading && !icon && (hasError || hasSuccess) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {hasError ? (
                <svg className="h-5 w-5 text-error-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="min-h-[1.25rem]">
          {currentError && (
            <p className="text-sm text-error-500 animate-slide-in-down">
              {currentError}
            </p>
          )}
          {success && !hasError && (
            <p className="text-sm text-success-500 animate-slide-in-down">
              {success}
            </p>
          )}
          {hint && !hasError && !success && (
            <p className="text-sm text-text-secondary">
              {hint}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
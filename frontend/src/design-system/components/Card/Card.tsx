import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { RoleType } from '../../tokens/colors';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  gradient?: boolean;
  blur?: boolean; // Glass morphism effect
  animation?: 'hover-lift' | 'hover-glow' | 'hover-tilt' | 'hover-scale' | 'none';
  role?: RoleType;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      elevation = 'md',
      interactive = false,
      gradient = false,
      blur = false,
      animation = 'hover-lift',
      role,
      padding = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Base card classes
    const baseClasses = [
      'rounded-xl',
      'border border-border-primary',
      'transition-all duration-normal ease-out',
      'relative overflow-hidden',
    ];

    // Elevation (shadow) classes
    const elevationClasses = {
      none: 'shadow-none',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    };

    // Padding classes
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    // Background classes
    const backgroundClasses = blur
      ? 'glass-effect backdrop-blur-md'
      : 'bg-surface-card-primary';

    // Gradient classes
    const gradientClasses = gradient && role
      ? `bg-gradient-to-br from-${role}-50 to-${role}-100`
      : gradient
      ? 'bg-gradient-to-br from-gray-50 to-gray-100'
      : '';

    // Interactive classes
    const interactiveClasses = interactive
      ? 'cursor-pointer hover:border-border-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
      : '';

    // Animation classes
    const animationClasses = {
      'hover-lift': interactive ? 'hover:animate-hover-lift hover:shadow-lg' : '',
      'hover-glow': interactive && role
        ? `hover:shadow-${role}-500/20 hover:shadow-2xl`
        : interactive
        ? 'hover:shadow-primary-500/20 hover:shadow-2xl'
        : '',
      'hover-tilt': interactive ? 'hover:rotate-1 hover:scale-102' : '',
      'hover-scale': interactive ? 'hover:animate-hover-scale' : '',
      'none': '',
    };

    // Role-specific accent classes
    const roleAccentClasses = role
      ? `border-l-4 border-l-${role}-500`
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          elevationClasses[elevation],
          paddingClasses[padding],
          backgroundClasses,
          gradientClasses,
          interactiveClasses,
          animationClasses[animation],
          roleAccentClasses,
          className
        )}
        {...props}
      >
        {/* Glass morphism overlay */}
        {blur && (
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm -z-10" />
        )}
        
        {/* Gradient overlay for role-specific styling */}
        {gradient && role && (
          <div className={`absolute inset-0 bg-gradient-to-br from-${role}-500/5 to-${role}-600/10 -z-10`} />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-text-secondary', className)}
      {...props}
    >
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
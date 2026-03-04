/**
 * AdminErrorBoundary Component
 * 
 * Error boundary specifically for admin dashboard components.
 * Catches and displays errors gracefully with admin-specific styling and recovery options.
 * 
 * Requirements:
 * - 20.5: Error boundaries to prevent complete application crashes
 * - 20.6: Fallback UI with error details and recovery options
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info for display
    this.setState({
      errorInfo,
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Log to external error tracking service if configured
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call custom reset handler if provided
    this.props.onReset?.();
  };

  handleReload = (): void => {
    // Reload the entire page
    globalThis.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default admin error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            {/* Error Title */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
              Admin Dashboard Error
            </h2>
            
            {/* Error Description */}
            <p className="text-gray-600 text-center mb-6">
              We encountered an unexpected error in the admin dashboard. 
              This has been logged for investigation. Please try one of the recovery options below.
            </p>
            
            {/* Error Details (Collapsible) */}
            {this.state.error && (
              <details className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <summary className="cursor-pointer text-gray-700 font-semibold hover:text-gray-900 transition-colors">
                  Technical Details
                </summary>
                <div className="mt-4 space-y-3">
                  {/* Error Message */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Error Message:</h4>
                    <pre className="text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto border border-red-200">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  
                  {/* Stack Trace */}
                  {this.state.error.stack && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Stack Trace:</h4>
                      <pre className="text-xs text-gray-600 bg-white p-3 rounded overflow-auto border border-gray-200 max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {/* Component Stack */}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Component Stack:</h4>
                      <pre className="text-xs text-gray-600 bg-white p-3 rounded overflow-auto border border-gray-200 max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Try to recover from error"
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Reload the entire page"
              >
                Reload Page
              </button>
            </div>
            
            {/* Help Text */}
            <p className="text-sm text-gray-500 text-center mt-6">
              If the problem persists, please contact technical support with the error details above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;

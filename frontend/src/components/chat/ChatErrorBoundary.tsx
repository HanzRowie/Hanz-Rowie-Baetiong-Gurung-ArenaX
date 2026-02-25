import React from 'react';
import ErrorBoundary from '../ErrorBoundary';

interface ChatErrorFallbackProps {
  error?: Error;
  onReset?: () => void;
}

const ChatErrorFallback: React.FC<ChatErrorFallbackProps> = ({ error, onReset }) => {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Chat Error
        </h3>
        
        <p className="text-gray-600 mb-4">
          We couldn't load the chat. This might be a temporary issue.
        </p>
        
        {error && (
          <details className="mb-4 p-3 bg-gray-50 rounded text-left text-sm">
            <summary className="cursor-pointer text-gray-700 font-medium">
              Technical details
            </summary>
            <pre className="mt-2 text-xs text-gray-600 overflow-auto">
              {error.toString()}
            </pre>
          </details>
        )}
        
        <div className="space-y-2">
          {onReset && (
            <button
              onClick={onReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Try again
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
}

const ChatErrorBoundary: React.FC<ChatErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error) => {
    // Log to error tracking service (e.g., Sentry)
    console.error('Chat error:', error);
  };

  return (
    <ErrorBoundary
      fallback={<ChatErrorFallback />}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ChatErrorBoundary;

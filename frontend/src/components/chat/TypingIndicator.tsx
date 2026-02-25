/**
 * TypingIndicator Component
 * 
 * Displays typing status with animated indicator.
 * Supports multiple users typing simultaneously.
 * 
 * Requirements: 6.3
 */

import React from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
  isGroupChat?: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  isGroupChat = false
}) => {
  // Don't render if no one is typing
  if (typingUsers.length === 0) {
    return null;
  }

  // Format typing message
  const getTypingMessage = (): string => {
    const count = typingUsers.length;
    
    if (count === 1) {
      return isGroupChat 
        ? `${typingUsers[0]} is typing...`
        : 'Typing...';
    } else if (count === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else if (count === 3) {
      return `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers[2]} are typing...`;
    } else {
      return `${typingUsers[0]}, ${typingUsers[1]}, and ${count - 2} others are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {/* Animated dots */}
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
        
        {/* Typing message */}
        <span className="italic">{getTypingMessage()}</span>
      </div>
    </div>
  );
};

export default TypingIndicator;

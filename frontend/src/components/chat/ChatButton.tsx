import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChatButtonProps {
  targetUserId: string;
  targetUserName: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  context?: 'venue' | 'tournament' | 'referee';
}

const ChatButton: React.FC<ChatButtonProps> = ({
  targetUserId,
  targetUserName,
  buttonText = 'Message',
  variant = 'primary',
  context,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Hide button when user is not logged in
  if (!user) {
    return null;
  }

  const handleClick = () => {
    // Navigate to conversation with target user
    navigate(`/chats/${targetUserId}`);
  };

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200';
      case 'secondary':
        return 'w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-4 py-3 rounded-xl transition-all duration-200 font-semibold';
      case 'icon':
        return 'p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200';
      default:
        return 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 ${getVariantStyles()}`}
      aria-label={`Message ${targetUserName}`}
      title={`Message ${targetUserName}`}
    >
      <MessageCircle className={variant === 'icon' ? 'h-5 w-5' : 'h-4 w-4'} />
      {variant !== 'icon' && <span>{buttonText}</span>}
    </button>
  );
};

export default ChatButton;

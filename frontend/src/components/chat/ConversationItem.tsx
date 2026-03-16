/**
 * ConversationItem Component
 * 
 * Displays a single conversation preview in the conversation list.
 * Shows participant name, avatar, last message, timestamp, unread badge, and presence indicator.
 * 
 * Requirements: 6.5, 9.4, 9.6, 9.7
 */

import React from 'react';
import { getAvatarUrl } from '@/utils/imageUtils';
import type { Conversation } from '@/types/chat.types';
import { formatDistanceToNow } from 'date-fns';
import PresenceIndicator from './PresenceIndicator.js';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick
}) => {
  const { user, latest_message, unread_count } = conversation;

  // Format timestamp
  const formattedTime = formatDistanceToNow(new Date(latest_message.timestamp), {
    addSuffix: true
  });

  // Truncate message preview
  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-4 cursor-pointer transition-all duration-200
        hover:bg-gray-50
        ${isActive ? 'bg-purple-50 border-l-4 border-purple-600' : 'border-l-4 border-transparent'}
      `}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Conversation with ${user.full_name}`}
    >
      {/* Avatar with presence indicator */}
      <div className="relative flex-shrink-0">
        {user.profile_picture ? (
          <img
            src={getAvatarUrl(user.profile_picture)!}
            alt={user.full_name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-semibold text-lg">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Presence indicator */}
        <div className="absolute bottom-0 right-0">
          <PresenceIndicator userId={user.id} size="small" />
        </div>
      </div>

      {/* Conversation details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-semibold truncate ${unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
            {user.full_name}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
            {latest_message.is_from_me && (
              <span className="text-gray-500 mr-1">You: </span>
            )}
            {truncateMessage(latest_message.content)}
          </p>

          {/* Unread count badge */}
          {unread_count > 0 && (
            <span className="flex-shrink-0 ml-2 bg-purple-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
              {unread_count > 99 ? '99+' : unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;

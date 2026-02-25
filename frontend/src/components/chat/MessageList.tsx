/**
 * MessageList Component
 * 
 * Displays messages in chronological order with infinite scroll pagination.
 * Groups messages by date and shows sender info, status, and edited indicators.
 * 
 * Requirements: 6.7, 6.8, 10.3, 10.4, 10.5
 */

import React, { useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Edit2 } from 'lucide-react';
import type { Message, GroupMessage } from '@/types/chat.types';
import { MessageStatus } from '@/types/chat.types';
import MessageListSkeleton from './MessageListSkeleton.js';
import EmptyState from './EmptyState.js';

interface MessageListProps {
  messages: (Message | GroupMessage)[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isGroupChat?: boolean;
  currentUserId?: string;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  isGroupChat = false,
  currentUserId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle infinite scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current || !hasMore || isLoading) return;

    const { scrollTop } = scrollContainerRef.current;
    
    // Load more when scrolled near the top
    if (scrollTop < 100 && onLoadMore) {
      onLoadMore();
    }
  };

  // Format date header
  const formatDateHeader = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        messages: []
      };
    }
    
    groups[dateKey].messages.push(message);
    return groups;
  }, {} as Record<string, { date: Date; messages: (Message | GroupMessage)[] }>);

  // Render message status icon
  const renderStatusIcon = (status?: MessageStatus) => {
    if (!status) return null;

    switch (status) {
      case MessageStatus.SENT:
        return <Check className="h-3 w-3 text-gray-400" />;
      case MessageStatus.DELIVERED:
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case MessageStatus.READ:
        return <CheckCheck className="h-3 w-3 text-purple-600" />;
      case MessageStatus.FAILED:
        return <span className="text-xs text-red-500">Failed</span>;
      default:
        return null;
    }
  };

  // Check if message is from current user
  const isFromMe = (message: Message | GroupMessage): boolean => {
    if ('is_from_me' in message) {
      return message.is_from_me;
    }
    return message.sender.id === currentUserId;
  };

  // Empty state
  if (!isLoading && messages.length === 0) {
    return <EmptyState type="no-messages" />;
  }

  // Loading state
  if (isLoading && messages.length === 0) {
    return <MessageListSkeleton />;
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {/* Loading indicator for pagination */}
      {isLoading && hasMore && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Grouped messages by date */}
      {Object.entries(groupedMessages).map(([dateKey, group]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="flex justify-center mb-4">
            <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDateHeader(group.date)}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-3">
            {group.messages.map((message) => {
              const fromMe = isFromMe(message);
              const showSenderInfo = isGroupChat && !fromMe;

              return (
                <div
                  key={message.id}
                  className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for group chat */}
                    {showSenderInfo && (
                      <div className="flex-shrink-0">
                        {message.sender.profile_picture ? (
                          <img
                            src={message.sender.profile_picture}
                            alt={message.sender.full_name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-semibold">
                            {message.sender.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div>
                      {/* Sender name for group chat */}
                      {showSenderInfo && (
                        <p className="text-xs text-gray-600 mb-1 ml-1">
                          {message.sender.full_name}
                        </p>
                      )}

                      <div
                        className={`
                          rounded-2xl px-4 py-2 break-words
                          ${fromMe
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                            : 'bg-gray-100 text-gray-900'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                        {/* Message metadata */}
                        <div className={`flex items-center gap-1 mt-1 text-xs ${fromMe ? 'text-purple-100' : 'text-gray-500'}`}>
                          <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                          
                          {/* Edited indicator */}
                          {message.edited && (
                            <>
                              <span>•</span>
                              <Edit2 className="h-3 w-3" />
                              <span>Edited</span>
                            </>
                          )}

                          {/* Status for sent messages */}
                          {fromMe && 'status' in message && (
                            <span className="ml-1">
                              {renderStatusIcon(message.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && !hasMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

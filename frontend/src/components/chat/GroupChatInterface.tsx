/**
 * GroupChatInterface Component
 * 
 * Team group chat interface with real-time messaging.
 * Displays chat header with team name, connection status indicator,
 * message list, message input, and typing indicators.
 * 
 * Requirements: 5.1, 5.5, 6.1, 6.3
 */

import React, { useState, useMemo } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useGroupChat } from '@/hooks/useGroupChat';
import { useAuth } from '@/hooks/useAuth';
import MessageList from './MessageList.js';
import MessageInput from './MessageInput.js';
import TypingIndicator from './TypingIndicator.js';
import GroupChatSkeleton from './GroupChatSkeleton.js';
import type { GroupMessage, MessageType, MessageStatus } from '@/types/chat.types';

interface GroupChatInterfaceProps {
  teamId: string;
  teamName?: string;
}

const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  teamId,
  teamName
}) => {
  const { user } = useAuth();
  const {
    messages,
    sendMessage,
    isLoading,
    error,
    isConnected
  } = useGroupChat(teamId);

  const [typingUsers] = useState<string[]>([]);

  // Convert service GroupMessage to chat.types GroupMessage
  const convertedMessages = useMemo<GroupMessage[]>(() => {
    return messages.map(msg => ({
      ...msg,
      message_type: msg.message_type as MessageType,
      status: msg.status as MessageStatus
    }));
  }, [messages]);

  // Handle typing indicator updates from WebSocket
  // In a real implementation, this would be connected via WebSocket handlers in useGroupChat
  // For now, typing indicators are managed locally and would be updated via WebSocket messages

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handle typing start (would send WebSocket message)
  const handleTypingStart = () => {
    // In real implementation, send typing indicator via WebSocket
    // websocketService.send(wsUrl, { type: 'typing', is_typing: true });
  };

  // Handle typing stop (would send WebSocket message)
  const handleTypingStop = () => {
    // In real implementation, send typing indicator via WebSocket
    // websocketService.send(wsUrl, { type: 'typing', is_typing: false });
  };

  // Error state - user is not a team member
  if (error?.message?.includes('403')) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 max-w-md">
          You don't have access to this team chat. Only active team members can view and send messages.
        </p>
      </div>
    );
  }

  // General error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Connection Error
        </h3>
        <p className="text-gray-600 max-w-md mb-4">
          {error.message || 'Failed to connect to team chat. Please try again.'}
        </p>
        <button
          onClick={() => globalThis.location.reload()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {teamName || 'Team Chat'}
            </h2>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Connected</span>
                <Wifi className="h-4 w-4 text-green-500" />
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Reconnecting...</span>
                <WifiOff className="h-4 w-4 text-red-500" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && messages.length === 0 ? (
        <GroupChatSkeleton />
      ) : (
        <>
          {/* Message List */}
          <MessageList
            messages={convertedMessages}
            isLoading={isLoading}
            isGroupChat={true}
            currentUserId={user?.id}
          />

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator
              typingUsers={typingUsers}
              isGroupChat={true}
            />
          )}

          {/* Message Input */}
          <MessageInput
            onSend={handleSendMessage}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            placeholder="Message your team..."
            disabled={!isConnected}
          />
        </>
      )}
    </div>
  );
};

export default GroupChatInterface;

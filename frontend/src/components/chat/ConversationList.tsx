/**
 * ConversationList Component
 * 
 * Displays a list of conversations with search/filter capabilities.
 * Shows last message preview, timestamp, and unread count badge.
 * Sorts conversations by most recent message.
 * 
 * Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.7
 */

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Conversation } from '@/types/chat.types';
import ConversationItem from './ConversationItem.js';
import ConversationListSkeleton from './ConversationListSkeleton.js';
import EmptyState from './EmptyState.js';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect: (userId: string) => void;
  isLoading?: boolean;
  roleFilter?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onConversationSelect,
  isLoading = false,
  roleFilter
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.user.full_name.toLowerCase().includes(query) ||
        conv.user.username.toLowerCase().includes(query)
      );
    }

    // Sort by most recent message timestamp (descending)
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.latest_message.timestamp).getTime();
      const timeB = new Date(b.latest_message.timestamp).getTime();
      return timeB - timeA;
    });
  }, [conversations, searchQuery]);

  // Empty state when no conversations
  if (!isLoading && conversations.length === 0) {
    // If a role filter is active and there are no conversations, show filtered empty state
    if (roleFilter) {
      return <EmptyState type="no-filtered-results" roleFilter={roleFilter} />;
    }
    return <EmptyState type="no-conversations" />;
  }

  // Empty state when search returns no results
  if (!isLoading && filteredConversations.length === 0 && searchQuery) {
    return <EmptyState type="no-search-results" searchQuery={searchQuery} />;
  }

  // Empty state when role filter returns no results
  if (!isLoading && filteredConversations.length === 0 && roleFilter) {
    return <EmptyState type="no-filtered-results" roleFilter={roleFilter} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.user.id}
                conversation={conversation}
                isActive={activeConversationId === conversation.user.id}
                onClick={() => onConversationSelect(conversation.user.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;

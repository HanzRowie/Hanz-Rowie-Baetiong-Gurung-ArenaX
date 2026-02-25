import React from 'react';
import { MessageSquare, Users, Search, Inbox } from 'lucide-react';

export type EmptyStateType = 'no-conversations' | 'no-messages' | 'no-search-results' | 'no-filtered-results';

interface EmptyStateProps {
  type: EmptyStateType;
  searchQuery?: string;
  roleFilter?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type, searchQuery, roleFilter }) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-conversations':
        return {
          icon: <MessageSquare className="h-16 w-16 text-gray-300" />,
          title: 'No conversations yet',
          description: 'Start a conversation by clicking the message button on a user\'s profile, venue, or tournament page.',
        };

      case 'no-messages':
        return {
          icon: <Inbox className="h-16 w-16 text-gray-300" />,
          title: 'No messages yet',
          description: 'Start the conversation by sending your first message!',
        };

      case 'no-search-results':
        return {
          icon: <Search className="h-16 w-16 text-gray-300" />,
          title: 'No conversations found',
          description: searchQuery
            ? `No conversations match "${searchQuery}". Try searching with a different name.`
            : 'Try searching with a different name.',
        };

      case 'no-filtered-results':
        return {
          icon: <Users className="h-16 w-16 text-gray-300" />,
          title: `No ${roleFilter || ''} conversations`,
          description: `You don't have any conversations with ${roleFilter?.toLowerCase() || 'users in this category'} yet.`,
        };

      default:
        return {
          icon: <MessageSquare className="h-16 w-16 text-gray-300" />,
          title: 'No content',
          description: 'There\'s nothing to display here.',
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
      <div className="mb-4">{content.icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {content.title}
      </h3>
      <p className="text-gray-500 max-w-sm">
        {content.description}
      </p>
    </div>
  );
};

export default EmptyState;

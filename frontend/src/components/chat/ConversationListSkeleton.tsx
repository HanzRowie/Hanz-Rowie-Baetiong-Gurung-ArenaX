import React from 'react';

const ConversationListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center space-x-3 p-3 rounded-lg bg-white animate-pulse"
        >
          {/* Avatar skeleton */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gray-300 rounded-full" />
          </div>
          
          {/* Content skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-300 rounded w-32" />
              <div className="h-3 bg-gray-300 rounded w-12" />
            </div>
            <div className="h-3 bg-gray-300 rounded w-48" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationListSkeleton;

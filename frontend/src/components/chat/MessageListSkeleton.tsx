import React from 'react';

const MessageListSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={`flex ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md animate-pulse ${
              i % 3 === 0 ? 'bg-blue-100' : 'bg-gray-200'
            } rounded-lg p-3 space-y-2`}
          >
            <div className="h-4 bg-gray-300 rounded w-48" />
            <div className="h-4 bg-gray-300 rounded w-32" />
            <div className="h-3 bg-gray-300 rounded w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageListSkeleton;

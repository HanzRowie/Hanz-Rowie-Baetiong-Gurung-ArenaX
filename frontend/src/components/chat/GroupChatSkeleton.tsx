import React from 'react';

const GroupChatSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full" />
          <div>
            <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-300 rounded w-24" />
          </div>
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
          >
            <div className="animate-pulse">
              {i % 2 !== 0 && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-gray-300 rounded-full" />
                  <div className="h-3 bg-gray-300 rounded w-20" />
                </div>
              )}
              <div
                className={`max-w-xs lg:max-w-md ${
                  i % 2 === 0 ? 'bg-blue-100' : 'bg-gray-200'
                } rounded-lg p-3 space-y-2`}
              >
                <div className="h-4 bg-gray-300 rounded w-48" />
                <div className="h-4 bg-gray-300 rounded w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="p-4 border-t border-gray-200 animate-pulse">
        <div className="flex items-center space-x-2">
          <div className="flex-1 h-10 bg-gray-300 rounded-lg" />
          <div className="w-10 h-10 bg-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default GroupChatSkeleton;

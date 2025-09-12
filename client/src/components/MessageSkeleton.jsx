import React from 'react';

const MessageSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start space-x-3 animate-pulse">
          {/* Avatar skeleton */}
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
          
          {/* Message content skeleton */}
          <div className="flex-1 space-y-2">
            {/* Username and timestamp */}
            <div className="flex items-center space-x-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            </div>
            
            {/* Message text */}
            <div className="space-y-1">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
              {index % 2 === 0 && (
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;

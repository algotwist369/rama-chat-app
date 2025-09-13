import React from 'react';

const MessageSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start space-x-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {/* Avatar skeleton */}
          <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full animate-pulse shadow-sm flex-shrink-0"></div>
          
          {/* Message content skeleton */}
          <div className="flex-1 space-y-2">
            {/* Username and timestamp */}
            <div className="flex items-center space-x-2">
              <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 rounded-full w-20 animate-pulse"></div>
              <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full w-12 animate-pulse"></div>
            </div>
            
            {/* Message bubble skeleton */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-4 animate-pulse shadow-sm border border-slate-200 dark:border-slate-600">
              <div className="space-y-2">
                <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 rounded-full w-full"></div>
                {index % 2 === 0 && (
                  <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 rounded-full w-3/4"></div>
                )}
                {index % 3 === 0 && (
                  <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 rounded-full w-1/2"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;

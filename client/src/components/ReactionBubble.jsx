import React, { useState } from 'react';

const ReactionBubble = ({ 
  emoji, 
  count, 
  hasUserReacted, 
  onReactionClick,
  showUserList = false,
  users = []
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    onReactionClick(emoji);
  };

  const handleMouseEnter = () => {
    if (showUserList && users.length > 0) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
          hasUserReacted
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-sm'
        }`}
      >
        <span className="text-base group-hover:scale-110 transition-transform duration-200">
          {emoji}
        </span>
        <span className={`text-xs font-semibold ${
          hasUserReacted 
            ? 'text-blue-600 dark:text-blue-400' 
            : 'text-slate-500 dark:text-slate-400'
        }`}>
          {count}
        </span>
      </button>

      {/* Tooltip showing users who reacted */}
      {showTooltip && showUserList && users.length > 0 && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="flex flex-col space-y-1">
              {users.slice(0, 5).map((user, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span>{emoji}</span>
                  <span className="font-medium">{user.username || user.name}</span>
                </div>
              ))}
              {users.length > 5 && (
                <div className="text-slate-400 dark:text-slate-500 text-center">
                  +{users.length - 5} more
                </div>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactionBubble;

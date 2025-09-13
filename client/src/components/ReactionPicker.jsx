import React, { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

const ReactionPicker = ({ 
  isOpen, 
  onClose, 
  onReactionSelect, 
  message, 
  user, 
  position = 'top-right' 
}) => {
  const [selectedCategory, setSelectedCategory] = useState('recent');
  const pickerRef = useRef(null);

  const emojiCategories = {
    recent: ['😀', '😂', '😊', '😍', '🥰', '😘', '😎', '🤔', '😮', '😢', '😭', '😡'],
    people: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    objects: ['💯', '🔥', '💥', '💢', '💫', '💦', '💨', '🕳️', '💣', '💤', '💨', '💫', '⭐', '🌟', '💫', '✨', '⚡', '☄️', '💥', '🔥', '🌈', '☀️', '🌙', '🌚', '🌛', '🌜', '🌝', '🌞', '⭐', '🌟', '💫', '✨', '⚡', '☄️', '💥', '🔥', '🌈'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭']
  };

  const getCurrentEmojis = () => {
    return emojiCategories[selectedCategory] || emojiCategories.recent;
  };

  const hasUserReacted = (emoji) => {
    return message?.reactions?.some(
      r => (r.user === user._id || r.user === user.id) && r.emoji === emoji
    );
  };

  const handleReactionClick = (emoji) => {
    onReactionSelect(emoji);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = {
    'top-right': 'bottom-full right-0 mb-2',
    'top-left': 'bottom-full left-0 mb-2',
    'bottom-right': 'top-full right-0 mt-2',
    'bottom-left': 'top-full left-0 mt-2'
  };

  return (
    <div 
      ref={pickerRef}
      className={`absolute ${positionClasses[position]} z-50 reaction-picker-slide-in`}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm overflow-hidden w-80 sm:w-96">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <Smile className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              React to message
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 touch-manipulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium transition-colors capitalize touch-manipulation ${
                selectedCategory === category
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="p-2 sm:p-3 max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
            {getCurrentEmojis().map((emoji) => {
              const isReacted = hasUserReacted(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 text-base sm:text-lg emoji-hover touch-manipulation ${
                    isReacted
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Click to react or remove reaction
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReactionPicker;

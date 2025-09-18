import React, { useState, useRef, useEffect } from 'react';

const EmojiPicker = ({ isVisible, onClose, onEmojiSelect, position = 'bottom' }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const emojiPickerRef = useRef(null);

  const emojiCategories = {
    smileys: {
      name: 'Smileys & People',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡', '👹', '👺']
    },
    hearts: {
      name: 'Hearts & Symbols',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭']
    },
    thumbs: {
      name: 'Gestures',
      emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸']
    },
    celebration: {
      name: 'Activities',
      emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🎳', '🎮', '🕹️', '🎰', '🎲', '🧩', '🎨', '🎭', '🖼️', '🎪', '🤹', '🤹‍♂️', '🤹‍♀️', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🪘', '🎸', '🪕', '🎺', '🎷', '🪗', '🎹', '🎻', '🪕']
    }
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    onClose();
  };

  if (!isVisible) return null;

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      ref={emojiPickerRef}
      className={`absolute right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-4 w-80 sm:w-96 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] ${positionClasses}`}
    >
      {/* Category Tabs */}
      <div className="flex justify-center space-x-1 mb-4 border-b border-gray-200 dark:border-gray-600 pb-3">
        {Object.entries(emojiCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${activeCategory === key
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            title={category.name}
          >
            {category.emojis[0]}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto scrollbar-hide">
        {emojiCategories[activeCategory].emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleEmojiClick(emoji)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 text-lg hover:scale-110 transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      
      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Click an emoji to add it to your message
        </p>
      </div>
    </div>
  );
};

export default EmojiPicker;

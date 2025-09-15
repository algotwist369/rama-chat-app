import React, { useState } from 'react';

const EmojiPickerTest = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  
  const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉'];

  const handleEmojiClick = (emoji) => {
    console.log('Emoji clicked:', emoji);
    setSelectedEmoji(emoji);
    setShowPicker(false);
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4">Emoji Picker Test</h3>
      
      <div className="mb-4">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showPicker ? 'Hide' : 'Show'} Emoji Picker
        </button>
      </div>

      {showPicker && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg hover:scale-110 transform"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Click to react
          </div>
        </div>
      )}

      {selectedEmoji && (
        <div className="p-2 bg-green-100 rounded">
          <p>Selected emoji: {selectedEmoji}</p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Debug info:</p>
        <p>showPicker: {showPicker.toString()}</p>
        <p>selectedEmoji: {selectedEmoji}</p>
      </div>
    </div>
  );
};

export default EmojiPickerTest;

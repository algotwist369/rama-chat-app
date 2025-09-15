import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Copy, Download } from 'lucide-react';

const MessageSelector = ({ 
  selectedMessages, 
  onClearSelection, 
  onDeleteSelected, 
  onEditSelected,
  currentUser 
}) => {
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    setShowActions(selectedMessages.length > 0);
  }, [selectedMessages]);

  if (!showActions) return null;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedMessages.length} message(s)?`)) {
      // Extract message IDs from the selected messages, with safety checks
      const messageIds = selectedMessages
        .filter(msg => msg && msg._id) // Filter out any undefined/null messages
        .map(msg => msg._id);
      
      if (messageIds.length > 0) {
        onDeleteSelected(messageIds);
        onClearSelection();
      }
    }
  };

  const handleEdit = () => {
    // For now, just show a toast - you can implement bulk edit later
    console.log('Bulk edit not implemented yet');
  };

  const handleCopy = () => {
    const text = selectedMessages
      .map(msg => `${msg.senderId?.username || 'Unknown'}: ${msg.content}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {selectedMessages.length} message(s) selected
        </span>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy messages"
          >
            <Copy className="h-4 w-4" />
          </button>
          
          {selectedMessages.every(msg => 
            msg.senderId._id === currentUser.id || msg.senderId._id === currentUser._id
          ) && (
            <button
              onClick={handleEdit}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit messages"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={handleDelete}
            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete messages"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={onClearSelection}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageSelector;

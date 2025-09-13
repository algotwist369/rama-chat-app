import React, { useState } from 'react';
import { X, Forward, Check, AlertCircle } from 'lucide-react';
import { messageApi } from '../api/messageApi';
import toast from 'react-hot-toast';

const ForwardMessageModal = ({ isOpen, onClose, message, availableGroups, onSuccess }) => {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleForward = async () => {
    if (selectedGroups.length === 0) {
      toast.error('Please select at least one group');
      return;
    }

    setLoading(true);
    try {
      await messageApi.forwardMessage(message._id, selectedGroups);
      toast.success(`Message forwarded to ${selectedGroups.length} group(s)`);
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to forward message');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedGroups([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Forward className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Forward Message
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select groups to forward this message to
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {message.senderId.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {message.senderId.username}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {message.content && (
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {message.content}
              </p>
            )}
            {message.file && (
              <div className="mt-3 flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-4 h-4 bg-slate-400 rounded"></div>
                <span>{message.file.originalname || 'File'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Group Selection */}
        <div className="p-6 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">
            Select Groups ({selectedGroups.length} selected)
          </h4>
          
          {availableGroups.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No groups available to forward to
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGroups.map((group) => (
                <label
                  key={group._id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group._id)}
                    onChange={() => handleGroupToggle(group._id)}
                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {group.region} • {group.users?.length || 0} members
                    </p>
                  </div>
                  {selectedGroups.includes(group._id) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedGroups.length === 0 || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Forwarding...</span>
              </>
            ) : (
              <>
                <Forward className="h-4 w-4" />
                <span>Forward ({selectedGroups.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;

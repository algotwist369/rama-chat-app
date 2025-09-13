import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import Button from '../common/Button';
import InputField from '../common/InputField';

const MessagesTab = ({ groups = [], actionLoading = {}, onDeleteMessage, onEditMessage }) => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Load messages for selected group
  const loadMessages = async (groupId) => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      const { messageApi } = await import('../../api/messageApi');
      const response = await messageApi.getMessages(groupId, 1, 50);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search messages
  const searchMessages = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const { messageApi } = await import('../../api/messageApi');
      const response = await messageApi.searchMessages(searchQuery, selectedGroup || null);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to search messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle message edit
  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) return;
    
    try {
      await onEditMessage(messageId, editContent);
      setEditingMessage(null);
      setEditContent('');
      // Reload messages
      if (selectedGroup) {
        loadMessages(selectedGroup);
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle message delete
  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await onDeleteMessage(messageId);
        // Reload messages
        if (selectedGroup) {
          loadMessages(selectedGroup);
        }
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup);
    }
  }, [selectedGroup]);

  return (
    <div className="max-w-[99rem] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Messages Management</h3>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Groups</option>
                {groups && groups.length > 0 ? groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name} ({group.region})
                  </option>
                )) : (
                  <option value="" disabled>No groups available</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Messages</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search message content..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={searchMessages}
                  variant="outline"
                  size="sm"
                  icon={<Search className="h-4 w-4" />}
                  disabled={!searchQuery.trim() || loading}
                >
                  Search
                </Button>
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroup('');
                  setMessages([]);
                }}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'No messages match your search criteria.' : 'Select a group to view messages.'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {message.sender?.username || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                      {message.groupId && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {groups && groups.length > 0 ? (groups.find(g => g._id === message.groupId)?.name || 'Unknown Group') : 'Unknown Group'}
                        </span>
                      )}
                    </div>
                    
                    {editingMessage === message._id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEditMessage(message._id)}
                            variant="primary"
                            size="sm"
                            disabled={!editContent.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingMessage(null);
                              setEditContent('');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      onClick={() => {
                        setEditingMessage(message._id);
                        setEditContent(message.content);
                      }}
                      variant="ghost"
                      size="sm"
                      icon={<Edit className="h-4 w-4" />}
                      title="Edit Message"
                      disabled={editingMessage === message._id}
                    />
                    <Button
                      onClick={() => handleDeleteMessage(message._id)}
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="h-4 w-4" />}
                      title="Delete Message"
                      disabled={actionLoading[`deleteMessage_${message._id}`]}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;

import axiosInstance from './axiosInstance';

export const messageApi = {
  getMessages: async (groupId, params = {}) => {
    const queryParams = new URLSearchParams();
    
    // Handle both old and new parameter formats
    if (typeof params === 'object' && params !== null) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    } else {
      // Legacy support for old format (page, limit)
      const page = params.page || 1;
      const limit = params.limit || 20;
      queryParams.append('page', page);
      queryParams.append('limit', limit);
    }
    
    const response = await axiosInstance.get(`/messages/${groupId}?${queryParams}`);
    return response.data;
  },

  sendMessage: async (messageData) => {
    const response = await axiosInstance.post('/messages', messageData);
    return response.data;
  },

  editMessage: async (messageId, content) => {
    console.log('Edit message request:', { messageId, content });
    const response = await axiosInstance.put(`/messages/${messageId}`, { content });
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await axiosInstance.delete(`/messages/${messageId}`);
    return response.data;
  },

  deleteMultipleMessages: async (messageIds) => {
    const response = await axiosInstance.post('messages/delete-multiple', { messageIds });
    return response.data;
  },

  searchMessages: async (query, options = {}) => {
    const params = new URLSearchParams({ q: query });
    
    if (options.groupId) params.append('groupId', options.groupId);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    
    const response = await axiosInstance.get(`/messages/search?${params}`);
    return response.data;
  },

  forwardMessage: async (messageId, groupIds) => {
    const response = await axiosInstance.post(`/messages/${messageId}/forward`, { groupIds });
    return response.data;
  },

  markAsDelivered: async (messageIds) => {
    const response = await axiosInstance.post('/messages/delivered', { messageIds });
    return response.data;
  },

  markAsSeen: async (messageIds) => {
    const response = await axiosInstance.post('/messages/seen', { messageIds });
    return response.data;
  },

  // Test endpoint for debugging - matches backend GET /messages/test/:groupId
  testGetMessages: async (groupId) => {
    const response = await axiosInstance.get(`/messages/test/${groupId}`);
    return response.data;
  },

  // Message reactions
  addReaction: async (messageId, emoji) => {
    const response = await axiosInstance.post(`/messages/${messageId}/reactions`, { emoji });
    return response.data;
  },

  removeReaction: async (messageId, emoji) => {
    const response = await axiosInstance.delete(`/messages/${messageId}/reactions`, { data: { emoji } });
    return response.data;
  },

  // Message replies
  replyToMessage: async (messageId, content, groupId) => {
    const response = await axiosInstance.post(`/messages/${messageId}/reply`, { content, groupId });
    return response.data;
  }
};
import axiosInstance from './axiosInstance';

export const messageApi = {
  getMessages: async (groupId, params = {}) => {
    // Convert old pagination params to new chunking params
    const chunkingParams = {};
    
    if (params.page && params.page > 1) {
      // Convert page-based to cursor-based
      chunkingParams.before = params.before;
    }
    
    if (params.limit) {
      chunkingParams.chunkSize = params.limit;
    }
    
    if (params.after) {
      chunkingParams.after = params.after;
    }
    
    if (params.includeMetadata) {
      chunkingParams.includeMetadata = params.includeMetadata;
    }
    
    const response = await axiosInstance.get(`/messages/${groupId}`, { 
      params: { ...chunkingParams, ...params } 
    });
    return response.data;
  },

  sendMessage: async (messageData) => {
    const response = await axiosInstance.post('/messages', messageData);
    return response.data;
  },

  editMessage: async (messageId, text) => {
    const response = await axiosInstance.put(`/messages/${messageId}`, { text });
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await axiosInstance.delete(`/messages/${messageId}`);
    return response.data;
  },

  deleteMultipleMessages: async (messageIds) => {
    const response = await axiosInstance.delete('/messages/bulk', {
      data: { messageIds }
    });
    return response.data;
  },

  searchMessages: async (query, groupId) => {
    const response = await axiosInstance.get('/messages/search', {
      params: { q: query, groupId }
    });
    return response.data;
  },

  forwardMessage: async (messageId, groupIds) => {
    const response = await axiosInstance.post(`/messages/${messageId}/forward`, {
      groupIds
    });
    return response.data;
  },

  markAsDelivered: async (messageIds) => {
    const response = await axiosInstance.post('/messages/delivered', { messageIds });
    return response.data;
  },

  markAsSeen: async (messageIds) => {
    const response = await axiosInstance.post('/messages/seen', { messageIds });
    return response.data;
  }
};

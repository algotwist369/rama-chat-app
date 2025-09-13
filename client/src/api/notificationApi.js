import axiosInstance from './axiosInstance';

export const notificationApi = {
  // Get user notifications - matches backend GET /notifications
  getNotifications: async () => {
    const response = await axiosInstance.get('/notifications');
    return response.data;
  },

  // Mark notifications as seen - matches backend PATCH /notifications/seen
  markNotificationsAsSeen: async () => {
    const response = await axiosInstance.patch('/notifications/seen');
    return response.data;
  },

  // Clear all notifications - matches backend DELETE /notifications
  clearNotifications: async () => {
    const response = await axiosInstance.delete('/notifications');
    return response.data;
  },

  // Create test notifications - matches backend POST /notifications/test (dev only)
  createTestNotifications: async () => {
    const response = await axiosInstance.post('/notifications/test');
    return response.data;
  }
};
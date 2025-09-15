import axiosInstance from './axiosInstance';

const userApi = {
  // Get current user profile
  getProfile: async () => {
    const response = await axiosInstance.get('/users/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await axiosInstance.put('/users/profile', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await axiosInstance.put('/users/change-password', passwordData);
    return response.data;
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    const response = await axiosInstance.put('/users/preferences', preferences);
    return response.data;
  },

  // Get user activity
  getActivity: async () => {
    const response = await axiosInstance.get('/users/activity');
    return response.data;
  },

  // Delete user account
  deleteAccount: async () => {
    const response = await axiosInstance.delete('/users/account');
    return response.data;
  }
};

export default userApi;

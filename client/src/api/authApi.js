import axiosInstance from './axiosInstance';

export const authApi = {
  login: async (credentials) => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data;
  },

  loginWithPin: async (credentials) => {
    const response = await axiosInstance.post('/auth/login-pin', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await axiosInstance.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await axiosInstance.post('/auth/create-user', userData);
    return response.data;
  },

  getUsers: async () => {
    const response = await axiosInstance.get('/auth/users');
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await axiosInstance.put(`/auth/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await axiosInstance.delete(`/auth/users/${userId}`);
    return response.data;
  },

  getRoutes: async () => {
    const response = await axiosInstance.get('/auth/routes');
    return response.data;
  }
};

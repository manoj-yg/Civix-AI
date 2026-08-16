import apiClient from './axios';

export const authApi = {
  login: async (credentials) => {
    const payload = {
      email: credentials.email || credentials.username || 'citizen@civix.gov',
      password: credentials.password || 'password123',
    };
    return await apiClient.post('/auth/login', payload);
  },

  register: async (userData) => {
    return await apiClient.post('/auth/register', userData);
  },

  getCurrentUser: async () => {
    return await apiClient.get('/auth/me');
  },
};

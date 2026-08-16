import apiClient from './axios';

export const recommendationApi = {
  getRecommendations: async (params = {}) => {
    return await apiClient.get('/recommendations', { params });
  },

  actionRecommendation: async (id, action, notes) => {
    return await apiClient.post(`/recommendations/${id}/action`, { action, notes });
  },
};

import apiClient from './axios';

export const analyticsApi = {
  getAdminStats: async () => {
    return await apiClient.get('/admin/stats');
  },

  getDefectDistribution: async () => {
    return await apiClient.get('/admin/defect-distribution');
  },

  getSeverityDistribution: async () => {
    return await apiClient.get('/admin/severity-distribution');
  },

  getGISSummary: async () => {
    return await apiClient.get('/admin/gis-summary');
  },

  getAIMetrics: async () => {
    return await apiClient.get('/admin/ai-metrics');
  },
};

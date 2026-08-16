import apiClient from './axios';

export const reportApi = {
  getPDFReportUrl: (inspectionId) => {
    const baseURL = apiClient.defaults.baseURL;
    return `${baseURL}/reports/pdf/${inspectionId}`;
  },

  getJSONReport: async (inspectionId) => {
    return await apiClient.get(`/reports/json/${inspectionId}`);
  },

  generateCustomReport: async (filters = {}) => {
    return await apiClient.post('/reports/generate', filters);
  },
};

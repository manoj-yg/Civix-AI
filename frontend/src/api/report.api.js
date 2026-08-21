import apiClient from './axios';

export const reportApi = {
  getPDFReportUrl: (inspectionId) => {
    const baseURL = apiClient.defaults.baseURL;
    return `${baseURL}/reports/pdf/${inspectionId}`;
  },

  getSummaryPDFReportUrl: (params = {}) => {
    const baseURL = apiClient.defaults.baseURL;
    const query = new URLSearchParams(params).toString();
    return `${baseURL}/reports/summary/pdf${query ? `?${query}` : ''}`;
  },

  getJSONReport: async (inspectionId) => {
    return await apiClient.get(`/reports/json/${inspectionId}`);
  },

  generateCustomReport: async (filters = {}) => {
    return await apiClient.post('/reports/generate', filters);
  },
};


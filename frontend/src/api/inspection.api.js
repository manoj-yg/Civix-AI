import apiClient from './axios';

export const inspectionApi = {
  createInspection: async (data) => {
    return await apiClient.post('/inspections', data);
  },

  uploadMedia: async (inspectionId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return await apiClient.post(`/inspections/${inspectionId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percentCompleted);
        }
      },
    });
  },

  getJobStatus: async (jobId) => {
    return await apiClient.get(`/jobs/${jobId}`);
  },

  getInspections: async (params = {}) => {
    return await apiClient.get('/inspections', { params });
  },

  getInspectionById: async (id) => {
    return await apiClient.get(`/inspections/${id}`);
  },
};

import apiClient from './axios';

export const assetApi = {
  getAssets: async (params = {}) => {
    return await apiClient.get('/assets', { params });
  },

  getAssetById: async (id) => {
    return await apiClient.get(`/assets/${id}`);
  },

  getAssetDefects: async (id) => {
    return await apiClient.get(`/assets/${id}/defects`);
  },

  getAssetMaintenanceHistory: async (id) => {
    return await apiClient.get(`/assets/${id}/maintenance`);
  },
};

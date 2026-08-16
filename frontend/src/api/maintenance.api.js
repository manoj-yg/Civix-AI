import apiClient from './axios';

export const maintenanceApi = {
  getMaintenanceRecords: async (params = {}) => {
    return await apiClient.get('/maintenance', { params });
  },

  createMaintenanceRecord: async (data) => {
    return await apiClient.post('/maintenance', data);
  },

  updateMaintenanceStatus: async (id, status, notes) => {
    return await apiClient.patch(`/maintenance/${id}`, { status, notes });
  },
};

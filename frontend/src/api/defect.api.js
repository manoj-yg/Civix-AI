import apiClient from './axios';

export const defectApi = {
  getDefects: async (params = {}) => {
    return await apiClient.get('/defects', { params });
  },

  getDefectById: async (id) => {
    return await apiClient.get(`/defects/${id}`);
  },

  updateDefectStatus: async (id, status, assignedTeam) => {
    return await apiClient.patch(`/defects/${id}`, { status, assigned_team: assignedTeam });
  },
};

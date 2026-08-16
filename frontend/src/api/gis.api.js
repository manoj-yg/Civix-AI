import apiClient from './axios';

export const gisApi = {
  getNearbyDefects: async (lat, lng, radiusKm = 5.0) => {
    return await apiClient.get('/gis/nearby-defects', {
      params: { latitude: lat, longitude: lng, radius_km: radiusKm }
    });
  },

  getSeverityHeatmap: async (params = {}) => {
    return await apiClient.get('/gis/severity-heatmap', { params });
  },

  getDefectsByInfrastructure: async () => {
    return await apiClient.get('/gis/defects-by-infrastructure');
  },

  getHighRiskAreas: async (minRiskScore = 70.0) => {
    return await apiClient.get('/gis/high-risk-areas', {
      params: { min_risk_score: minRiskScore }
    });
  },

  getAllGISDefects: async (params = {}) => {
    return await apiClient.get('/gis/defects', { params });
  },
};

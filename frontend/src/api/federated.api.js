import apiClient from './axios';

export const federatedApi = {
  getStatus: async () => {
    return await apiClient.get('/federated/status');
  },

  startTrainingRounds: async (numRounds = 3) => {
    return await apiClient.post('/federated/rounds/start', { num_rounds: numRounds });
  },

  getMetricsHistory: async () => {
    return await apiClient.get('/federated/metrics');
  },

  getModelMetadata: async () => {
    return await apiClient.get('/federated/model');
  },

  getClients: async () => {
    return await apiClient.get('/federated/clients');
  },
};


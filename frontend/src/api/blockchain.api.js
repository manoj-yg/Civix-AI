import apiClient from './axios';

export const blockchainApi = {
  verifyInspection: async (inspectionId) => {
    return await apiClient.get(`/blockchain/verify/${inspectionId}`);
  },

  getBlockchainSummary: async () => {
    return await apiClient.get('/admin/blockchain-summary');
  },
};

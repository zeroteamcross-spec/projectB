import { apiClient } from '../../core/apiClient.js';

export class NetworkDraftStorageAdapter {
  async loadDraft(route) {
    try {
      const response = await apiClient.get(`/design-studio-v2/draft?route=${encodeURIComponent(route)}`);
      return response.data?.draft ?? null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  async saveDraft(route, draft) {
    try {
      const response = await apiClient.post(`/design-studio-v2/draft?route=${encodeURIComponent(route)}`, draft);
      return Boolean(response.success);
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  }

  async recoverDraft(route) {
    return null;
  }
}

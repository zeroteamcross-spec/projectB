import { apiClient } from '../../core/apiClient.js';

export class NetworkPublishAdapter {
  async publish({ route, publishNote } = {}) {
    try {
      const response = await apiClient.post(`/design-studio-v2/publish?route=${encodeURIComponent(route)}`, { publishNote });
      return response.data?.published ?? null;
    } catch (error) {
      console.error('Failed to publish draft:', error);
      return null;
    }
  }

  async loadHistory(route) {
    try {
      const response = await apiClient.get(`/design-studio-v2/history?route=${encodeURIComponent(route)}`);
      return response.data ?? [];
    } catch (error) {
      console.error('Failed to load version history:', error);
      return [];
    }
  }
}

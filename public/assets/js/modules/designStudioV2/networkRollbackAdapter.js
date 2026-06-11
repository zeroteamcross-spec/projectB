import { apiClient } from '../../core/apiClient.js';

export class NetworkRollbackAdapter {
  async preview({ route, targetVersion } = {}) {
    try {
      const response = await apiClient.get(
        `/design-studio-v2/rollback/preview?route=${encodeURIComponent(route)}&targetVersion=${encodeURIComponent(targetVersion)}`
      );
      return response.data ?? null;
    } catch (error) {
      console.error('Failed to load rollback preview:', error);
      return null;
    }
  }

  async rollback({ route, targetVersion, rollbackNote } = {}) {
    try {
      const response = await apiClient.post(
        `/design-studio-v2/rollback?route=${encodeURIComponent(route)}`,
        { targetVersion, rollbackNote }
      );
      return response.data?.published ?? null;
    } catch (error) {
      console.error('Failed to execute rollback:', error);
      return null;
    }
  }
}

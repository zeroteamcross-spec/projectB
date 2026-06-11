import { CacheManager } from './cacheManager.js';

export class PublishManager {
    constructor({ publishAdapter = null, cacheAdapter = null } = {}) {
        this.publishAdapter = publishAdapter;
        this.cacheManager = new CacheManager({ cacheAdapter });
    }

    validatePublishNote(note) {
        return typeof note === 'string' && note.trim().length >= 5 && note.trim().length <= 500;
    }

    async publish({ route, publishedBy, publishNote } = {}) {
        if (!this.validatePublishNote(publishNote) || typeof this.publishAdapter?.publish !== 'function') {
            return null;
        }

        const result = await this.publishAdapter.publish({ route, publishedBy, publishNote: publishNote.trim() });

        if (result) {
            await this.cacheManager.invalidatePublishedCache(route);
        }

        return result || null;
    }

    async loadHistory(route) {
        if (typeof this.publishAdapter?.loadHistory !== 'function') {
            return [];
        }

        return this.publishAdapter.loadHistory(route);
    }

    destroy() {
        this.publishAdapter = null;
        this.cacheManager.destroy();
    }
}

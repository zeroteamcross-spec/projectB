import { CacheManager } from './cacheManager.js';
import { buildRollbackMetadata, validateRollbackNote } from './rollbackMetadataBuilder.js';
import { RollbackPreview } from './rollbackPreview.js';

export class RollbackManager {
    constructor({ rollbackAdapter = null, cacheAdapter = null } = {}) {
        this.rollbackAdapter = rollbackAdapter;
        this.cacheManager = new CacheManager({ cacheAdapter });
        this.previewManager = new RollbackPreview({ rollbackAdapter });
    }

    preview(payload = {}) {
        return this.previewManager.preview(payload);
    }

    async rollback({ route, targetVersion, currentVersion = null, publishedBy = null, rollbackNote = '' } = {}) {
        if (!validateRollbackNote(rollbackNote) || typeof this.rollbackAdapter?.rollback !== 'function') {
            return null;
        }

        const metadata = buildRollbackMetadata({ currentVersion, targetVersion, publishedBy, rollbackNote });

        if (!metadata) {
            return null;
        }

        const result = await this.rollbackAdapter.rollback({ route, targetVersion, publishedBy, rollbackNote: rollbackNote.trim(), metadata });

        if (result) {
            await this.cacheManager.invalidatePublishedCache(route);
        }

        return result || null;
    }

    destroy() {
        this.rollbackAdapter = null;
        this.cacheManager.destroy();
        this.previewManager.destroy();
    }
}

export class RestoreManager {
    constructor({ restoreAdapter = null } = {}) {
        this.restoreAdapter = restoreAdapter;
    }

    async restore(backupPayload, options = {}) {
        if (options.confirm !== true || typeof this.restoreAdapter?.restore !== 'function') {
            return null;
        }

        return this.restoreAdapter.restore(backupPayload, options);
    }

    destroy() {
        this.restoreAdapter = null;
    }
}

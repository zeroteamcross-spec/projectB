export class BackupManager {
    constructor({ backupAdapter = null } = {}) {
        this.backupAdapter = backupAdapter;
    }

    async backup(route, metadata = {}) {
        if (typeof this.backupAdapter?.backup !== 'function') {
            return null;
        }

        return this.backupAdapter.backup(route, metadata);
    }

    destroy() {
        this.backupAdapter = null;
    }
}

export class MigrationManager {
    constructor({ migrationAdapter = null } = {}) {
        this.migrationAdapter = migrationAdapter;
    }

    async analyze(legacyPayload) {
        return typeof this.migrationAdapter?.analyze === 'function' ? this.migrationAdapter.analyze(legacyPayload) : null;
    }

    async preview(legacyPayload) {
        return typeof this.migrationAdapter?.preview === 'function' ? this.migrationAdapter.preview(legacyPayload) : null;
    }

    async confirm(legacyPayload, options = {}) {
        if (options.confirm !== true || typeof this.migrationAdapter?.confirm !== 'function') {
            return null;
        }

        return this.migrationAdapter.confirm(legacyPayload, options);
    }

    async enableRoute(route, userId) {
        return typeof this.migrationAdapter?.enableRoute === 'function' ? this.migrationAdapter.enableRoute(route, userId) : false;
    }

    async disableRoute(route, userId) {
        return typeof this.migrationAdapter?.disableRoute === 'function' ? this.migrationAdapter.disableRoute(route, userId) : false;
    }

    destroy() {
        this.migrationAdapter = null;
    }
}

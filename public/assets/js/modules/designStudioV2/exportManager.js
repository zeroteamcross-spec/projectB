export class ExportManager {
    constructor({ exportAdapter = null } = {}) {
        this.exportAdapter = exportAdapter;
    }

    async exportRoute(route, options = {}) {
        if (typeof this.exportAdapter?.exportRoute !== 'function') {
            return null;
        }

        return this.exportAdapter.exportRoute(route, options);
    }

    toJson(payload) {
        return JSON.stringify(payload || {}, null, 2);
    }

    destroy() {
        this.exportAdapter = null;
    }
}

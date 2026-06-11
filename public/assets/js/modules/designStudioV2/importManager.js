export class ImportManager {
    constructor({ importAdapter = null } = {}) {
        this.importAdapter = importAdapter;
    }

    async dryRun(payload, route) {
        if (typeof this.importAdapter?.dryRun !== 'function') {
            return { valid: false, errors: ['missing_import_adapter'], warnings: [], route };
        }

        return this.importAdapter.dryRun(payload, route);
    }

    async import(payload, route, options = {}) {
        if (options.confirm !== true || typeof this.importAdapter?.import !== 'function') {
            return null;
        }

        return this.importAdapter.import(payload, route, options);
    }

    async previewReplaceRoute(payload, route) {
        if (typeof this.importAdapter?.previewReplaceRoute !== 'function') {
            return { valid: false, errors: ['replace_preview_unavailable'], route, writeAllowed: false };
        }

        return this.importAdapter.previewReplaceRoute(payload, route);
    }

    destroy() {
        this.importAdapter = null;
    }
}

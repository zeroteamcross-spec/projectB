export class MigrationPreviewPanel {
    constructor({ migrationAdapter = null } = {}) {
        this.migrationAdapter = migrationAdapter;
    }

    async buildViewModel(legacyPayload) {
        const preview = typeof this.migrationAdapter?.preview === 'function'
            ? await this.migrationAdapter.preview(legacyPayload)
            : { elements: {}, conflicts: [], unsupported: [], risk: 'SAFE' };

        return {
            route: preview.route || legacyPayload?.route || '',
            risk: preview.risk || 'SAFE',
            elements: Object.keys(preview.elements || {}),
            conflicts: preview.conflicts || [],
            unsupported: preview.unsupported || [],
            writeAllowed: false,
        };
    }

    destroy() {
        this.migrationAdapter = null;
    }
}

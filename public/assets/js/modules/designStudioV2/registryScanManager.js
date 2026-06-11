export class RegistryScanManager {
    constructor({ registryAdapter = null } = {}) {
        this.registryAdapter = registryAdapter;
    }

    async scan(route, elements = []) {
        if (typeof this.registryAdapter?.scan !== 'function') {
            return { route, elements: [...new Set(elements)].sort(), scannedAt: null };
        }

        return this.registryAdapter.scan(route, elements);
    }

    async previewRebuild(route, elements = []) {
        if (typeof this.registryAdapter?.previewRebuild !== 'function') {
            return {
                route,
                added: [],
                removed: [],
                unchanged: [...new Set(elements)].sort(),
                nextElements: [...new Set(elements)].sort(),
            };
        }

        return this.registryAdapter.previewRebuild(route, elements);
    }

    async confirmRebuild(route, preview) {
        if (typeof this.registryAdapter?.confirmRebuild !== 'function') {
            return false;
        }

        return Boolean(await this.registryAdapter.confirmRebuild(route, preview));
    }

    destroy() {
        this.registryAdapter = null;
    }
}

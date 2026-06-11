export class HealthCheckerManager {
    constructor({ healthAdapter = null } = {}) {
        this.healthAdapter = healthAdapter;
        this.cache = new Map();
        this.ttlMs = 5 * 60 * 1000;
    }

    async check(document) {
        const route = document?.route || '';
        const key = `${route}:${JSON.stringify(document?.elements || {})}`;
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            return cached.report;
        }

        const report = typeof this.healthAdapter?.check === 'function'
            ? await this.healthAdapter.check(document)
            : this.localReport(document);

        this.cache.set(key, { report, expiresAt: now + this.ttlMs });

        return report;
    }

    localReport(document = {}) {
        return {
            route: document.route || '',
            summary: { INFO: 0, WARNING: 0, HIGH: 0, CRITICAL: 0 },
            requiresConfirmation: false,
            requiresReason: false,
            issues: [],
            generatedAt: new Date().toISOString(),
        };
    }

    clearCache(route = null) {
        if (!route) {
            this.cache.clear();
            return;
        }

        Array.from(this.cache.keys()).forEach((key) => {
            if (key.startsWith(`${route}:`)) {
                this.cache.delete(key);
            }
        });
    }

    destroy() {
        this.clearCache();
        this.healthAdapter = null;
    }
}

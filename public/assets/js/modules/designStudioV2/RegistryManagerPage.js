export class RegistryManagerPage {
    constructor({ registryAdapter = null } = {}) {
        this.registryAdapter = registryAdapter;
    }

    async buildViewModel() {
        const dashboard = typeof this.registryAdapter?.loadDashboard === 'function'
            ? await this.registryAdapter.loadDashboard()
            : { summary: {}, routes: [] };

        return {
            summary: {
                totalRoutes: dashboard.summary?.totalRoutes || 0,
                totalElements: dashboard.summary?.totalElements || 0,
                active: dashboard.summary?.ACTIVE || dashboard.summary?.active || 0,
                missing: dashboard.summary?.MISSING || dashboard.summary?.missing || 0,
                orphan: dashboard.summary?.ORPHAN || dashboard.summary?.orphan || 0,
                unknown: dashboard.summary?.UNKNOWN || dashboard.summary?.unknown || 0,
            },
            routes: (dashboard.routes || []).map((route) => ({
                route: route.route,
                healthScore: route.healthScore ?? 100,
                status: route.status || 'ACTIVE',
                recommendation: route.recommendation || null,
            })),
        };
    }

    destroy() {
        this.registryAdapter = null;
    }
}

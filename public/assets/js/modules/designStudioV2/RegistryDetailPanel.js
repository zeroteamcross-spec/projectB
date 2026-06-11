export class RegistryDetailPanel {
    constructor({ registryAdapter = null } = {}) {
        this.registryAdapter = registryAdapter;
    }

    async buildViewModel(route) {
        const detail = typeof this.registryAdapter?.loadRouteDetail === 'function'
            ? await this.registryAdapter.loadRouteDetail(route)
            : { route, elements: [] };

        return {
            route: detail.route || route,
            healthScore: detail.healthScore ?? 100,
            elements: (detail.elements || []).map((element) => ({
                name: element.element || element.name,
                status: element.status || 'UNKNOWN',
                lastSeenAt: element.lastSeenAt || null,
                published: Boolean(element.published),
                draft: Boolean(element.draft),
                historyCount: element.historyCount || 0,
                recommendation: element.recommendation || null,
            })),
        };
    }

    destroy() {
        this.registryAdapter = null;
    }
}

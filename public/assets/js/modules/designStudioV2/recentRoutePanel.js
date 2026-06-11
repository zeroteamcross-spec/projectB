export class RecentRoutePanel {
    constructor({ recentAdapter = null } = {}) {
        this.recentAdapter = recentAdapter;
    }

    async buildViewModel(userId) {
        const routes = typeof this.recentAdapter?.listRoutes === 'function' ? await this.recentAdapter.listRoutes(userId) : [];

        return {
            userId,
            routes,
            count: routes.length,
        };
    }

    destroy() {
        this.recentAdapter = null;
    }
}

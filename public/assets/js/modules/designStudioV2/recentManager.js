export class RecentManager {
    constructor({ recentAdapter = null, limit = 20 } = {}) {
        this.recentAdapter = recentAdapter;
        this.limit = limit;
        this.routes = new Map();
        this.elements = new Map();
    }

    async recordRoute(userId, route) {
        if (typeof this.recentAdapter?.recordRoute === 'function') {
            return this.recentAdapter.recordRoute(userId, route);
        }

        this.routes.set(userId, this.unshift(this.routes.get(userId) || [], route));
        return this.listRoutes(userId);
    }

    async recordElement(userId, route, element) {
        if (typeof this.recentAdapter?.recordElement === 'function') {
            return this.recentAdapter.recordElement(userId, route, element);
        }

        this.elements.set(userId, this.unshift(this.elements.get(userId) || [], { route, element }));
        return this.listElements(userId);
    }

    async listRoutes(userId) {
        return typeof this.recentAdapter?.listRoutes === 'function' ? this.recentAdapter.listRoutes(userId) : (this.routes.get(userId) || []);
    }

    async listElements(userId) {
        return typeof this.recentAdapter?.listElements === 'function' ? this.recentAdapter.listElements(userId) : (this.elements.get(userId) || []);
    }

    unshift(items, nextItem) {
        return [nextItem, ...items.filter((item) => JSON.stringify(item) !== JSON.stringify(nextItem))].slice(0, this.limit);
    }

    destroy() {
        this.recentAdapter = null;
        this.routes.clear();
        this.elements.clear();
    }
}

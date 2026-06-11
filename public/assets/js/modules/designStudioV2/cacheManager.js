export class CacheManager {
    constructor({ cacheAdapter = null } = {}) {
        this.cacheAdapter = cacheAdapter;
    }

    async clearRouteCache(route) {
        if (typeof this.cacheAdapter?.clearRouteCache !== 'function') {
            return false;
        }

        return Boolean(await this.cacheAdapter.clearRouteCache(route));
    }

    async invalidatePublishedCache(route) {
        if (typeof this.cacheAdapter?.invalidatePublishedCache !== 'function') {
            return this.clearRouteCache(route);
        }

        return Boolean(await this.cacheAdapter.invalidatePublishedCache(route));
    }

    destroy() {
        this.cacheAdapter = null;
    }
}

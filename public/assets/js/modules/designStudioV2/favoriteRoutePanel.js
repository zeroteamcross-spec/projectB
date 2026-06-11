export class FavoriteRoutePanel {
    constructor({ favoriteAdapter = null } = {}) {
        this.favoriteAdapter = favoriteAdapter;
    }

    async buildViewModel(userId) {
        const routes = typeof this.favoriteAdapter?.list === 'function' ? await this.favoriteAdapter.list(userId) : [];

        return {
            userId,
            routes,
            count: routes.length,
        };
    }

    destroy() {
        this.favoriteAdapter = null;
    }
}

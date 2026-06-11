export class FavoriteManager {
    constructor({ favoriteAdapter = null } = {}) {
        this.favoriteAdapter = favoriteAdapter;
        this.favorites = new Map();
    }

    async add(userId, route) {
        if (typeof this.favoriteAdapter?.add === 'function') {
            return this.favoriteAdapter.add(userId, route);
        }

        const items = new Set(this.favorites.get(userId) || []);
        items.add(route);
        this.favorites.set(userId, items);
        return this.list(userId);
    }

    async remove(userId, route) {
        if (typeof this.favoriteAdapter?.remove === 'function') {
            return this.favoriteAdapter.remove(userId, route);
        }

        const items = new Set(this.favorites.get(userId) || []);
        items.delete(route);
        this.favorites.set(userId, items);
        return this.list(userId);
    }

    async list(userId) {
        if (typeof this.favoriteAdapter?.list === 'function') {
            return this.favoriteAdapter.list(userId);
        }

        return Array.from(this.favorites.get(userId) || []);
    }

    destroy() {
        this.favoriteAdapter = null;
        this.favorites.clear();
    }
}

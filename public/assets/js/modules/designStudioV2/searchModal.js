export class SearchModal {
    constructor({ searchAdapter = null } = {}) {
        this.searchAdapter = searchAdapter;
        this.isOpen = false;
        this.results = [];
    }

    open() {
        this.isOpen = true;
        return this.isOpen;
    }

    close() {
        this.isOpen = false;
        return this.isOpen;
    }

    async search(query, filters = {}) {
        this.results = typeof this.searchAdapter?.search === 'function'
            ? await this.searchAdapter.search(query, filters)
            : [];

        return this.results;
    }

    selectResult(index = 0) {
        return this.results[index] || null;
    }

    clear() {
        this.results = [];
    }

    destroy() {
        this.clear();
        this.searchAdapter = null;
        this.isOpen = false;
    }
}

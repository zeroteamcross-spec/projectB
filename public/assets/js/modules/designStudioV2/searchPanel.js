export class SearchPanel {
    constructor({ searchAdapter = null } = {}) {
        this.searchAdapter = searchAdapter;
    }

    async buildViewModel(query, filters = {}) {
        const results = typeof this.searchAdapter?.search === 'function'
            ? await this.searchAdapter.search(query, filters)
            : [];

        return {
            query,
            filters,
            hasResults: results.length > 0,
            emptyLabel: results.length > 0 ? null : 'No Result',
            results,
        };
    }

    destroy() {
        this.searchAdapter = null;
    }
}

export class MigrationDashboardPage {
    constructor({ migrationAdapter = null } = {}) {
        this.migrationAdapter = migrationAdapter;
    }

    async buildViewModel() {
        const dashboard = typeof this.migrationAdapter?.loadDashboard === 'function'
            ? await this.migrationAdapter.loadDashboard()
            : { summary: {}, routes: [] };

        return {
            summary: {
                NOT_MIGRATED: dashboard.summary?.NOT_MIGRATED || 0,
                PARTIAL: dashboard.summary?.PARTIAL || 0,
                FULL: dashboard.summary?.FULL || 0,
                DISABLED: dashboard.summary?.DISABLED || 0,
            },
            routes: dashboard.routes || [],
        };
    }

    destroy() {
        this.migrationAdapter = null;
    }
}

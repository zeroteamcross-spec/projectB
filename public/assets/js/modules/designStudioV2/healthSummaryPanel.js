export class HealthSummaryPanel {
    constructor({ healthAdapter = null } = {}) {
        this.healthAdapter = healthAdapter;
    }

    async buildViewModel(document) {
        const report = typeof this.healthAdapter?.check === 'function'
            ? await this.healthAdapter.check(document)
            : document;

        const summary = report?.summary || { INFO: 0, WARNING: 0, HIGH: 0, CRITICAL: 0 };

        return {
            route: report?.route || '',
            summary,
            requiresConfirmation: Boolean(report?.requiresConfirmation),
            requiresReason: Boolean(report?.requiresReason),
            issues: Array.isArray(report?.issues) ? report.issues : [],
            severityOrder: ['CRITICAL', 'HIGH', 'WARNING', 'INFO'],
        };
    }

    destroy() {
        this.healthAdapter = null;
    }
}

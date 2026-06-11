export class HealthReportPage {
    constructor({ reportAdapter = null } = {}) {
        this.reportAdapter = reportAdapter;
    }

    async buildViewModel(scope = {}) {
        const report = typeof this.reportAdapter?.loadReport === 'function'
            ? await this.reportAdapter.loadReport(scope)
            : { summary: {}, issues: [] };

        return {
            scope,
            report,
            formats: ['json', 'csv', 'markdown'],
        };
    }

    async render(format, report) {
        if (typeof this.reportAdapter?.render === 'function') {
            return this.reportAdapter.render(format, report);
        }

        if (format === 'json') {
            return JSON.stringify(report || {}, null, 2);
        }

        return '';
    }

    destroy() {
        this.reportAdapter = null;
    }
}

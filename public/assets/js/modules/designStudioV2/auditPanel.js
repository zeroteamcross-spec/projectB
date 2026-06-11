export class AuditPanel {
    constructor({ auditAdapter = null } = {}) {
        this.auditAdapter = auditAdapter;
    }

    async loadTimeline(route = null) {
        if (typeof this.auditAdapter?.loadAudit !== 'function') {
            return [];
        }

        const entries = await this.auditAdapter.loadAudit(route);

        return Array.isArray(entries) ? entries.map((entry) => this.toViewModel(entry)) : [];
    }

    toViewModel(entry = {}) {
        return {
            auditId: entry.auditId ?? null,
            type: entry.type ?? 'unknown',
            version: entry.version ?? null,
            route: entry.route ?? null,
            userId: entry.userId ?? null,
            username: entry.username ?? null,
            publishedAt: entry.publishedAt ?? null,
            note: entry.publishNote || entry.rollbackNote || '',
            rollbackFrom: entry.rollbackFrom ?? null,
            rollbackTarget: entry.rollbackTarget ?? null,
            elementsChanged: entry.elementsChanged ?? 0,
            propertiesChanged: entry.propertiesChanged ?? 0,
            responsiveChanges: entry.responsiveChanges || { mobile: 0, tablet: 0, desktop: 0 },
        };
    }

    destroy() {
        this.auditAdapter = null;
    }
}

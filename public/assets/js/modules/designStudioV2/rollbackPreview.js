import { compareDocuments } from './compareManager.js';

function countPropertyChanges(diff = {}) {
    return Object.values(diff).reduce((total, elementDiff) => (
        total + Object.values(elementDiff).reduce((elementTotal, breakpointDiff) => (
            elementTotal + Object.keys(breakpointDiff).length
        ), 0)
    ), 0);
}

export class RollbackPreview {
    constructor({ rollbackAdapter = null } = {}) {
        this.rollbackAdapter = rollbackAdapter;
    }

    async preview({ route, currentDocument = null, targetDocument = null, targetVersion = null } = {}) {
        if (typeof this.rollbackAdapter?.preview === 'function') {
            return this.rollbackAdapter.preview({ route, targetVersion });
        }

        if (!currentDocument || !targetDocument) {
            return null;
        }

        const diff = compareDocuments(currentDocument, targetDocument);

        return {
            route,
            currentVersion: currentDocument.version ?? null,
            targetVersion: targetVersion ?? targetDocument.version ?? null,
            targetPublishNote: targetDocument.publishNote ?? null,
            elementChanges: Object.keys(diff).length,
            propertyChanges: countPropertyChanges(diff),
            diff,
        };
    }

    destroy() {
        this.rollbackAdapter = null;
    }
}

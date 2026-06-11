import { compareDocuments } from './compareManager.js';

function summarize(diff = {}) {
    return Object.entries(diff).reduce((summary, [, elementDiff]) => {
        summary.elementsChanged += 1;

        ['mobile', 'tablet', 'desktop'].forEach((breakpoint) => {
            const count = Object.keys(elementDiff[breakpoint] || {}).length;
            summary[breakpoint] += count;
            summary.propertiesChanged += count;
        });

        return summary;
    }, {
        elementsChanged: 0,
        propertiesChanged: 0,
        mobile: 0,
        tablet: 0,
        desktop: 0,
    });
}

export class ComparePanel {
    constructor({ compareAdapter = null } = {}) {
        this.compareAdapter = compareAdapter;
    }

    async buildViewModel({ left = null, right = null } = {}) {
        const result = typeof this.compareAdapter?.compare === 'function'
            ? await this.compareAdapter.compare(left, right)
            : { diff: compareDocuments(left || {}, right || {}) };

        const diff = result.diff || result;
        const statistics = result.statistics || summarize(diff);

        return {
            hasDifference: Object.keys(diff).length > 0,
            label: Object.keys(diff).length > 0 ? 'Difference' : 'No Difference',
            statistics,
            diff,
        };
    }

    destroy() {
        this.compareAdapter = null;
    }
}

function compareElement(left = {}, right = {}) {
    return ['mobile', 'tablet', 'desktop'].reduce((diff, breakpoint) => {
        const leftProperties = left[breakpoint] || {};
        const rightProperties = right[breakpoint] || {};
        const properties = Array.from(new Set([...Object.keys(leftProperties), ...Object.keys(rightProperties)])).sort();

        properties.forEach((property) => {
            const before = leftProperties[property] ?? null;
            const after = rightProperties[property] ?? null;

            if (before !== after) {
                diff[breakpoint] = diff[breakpoint] || {};
                diff[breakpoint][property] = { before, after };
            }
        });

        return diff;
    }, {});
}

export function compareDocuments(left = {}, right = {}) {
    const leftElements = left.elements || {};
    const rightElements = right.elements || {};
    const elementNames = Array.from(new Set([...Object.keys(leftElements), ...Object.keys(rightElements)])).sort();

    return elementNames.reduce((diff, elementName) => {
        const elementDiff = compareElement(leftElements[elementName], rightElements[elementName]);

        if (Object.keys(elementDiff).length > 0) {
            diff[elementName] = elementDiff;
        }

        return diff;
    }, {});
}

export class CompareManager {
    constructor({ compareAdapter = null } = {}) {
        this.compareAdapter = compareAdapter;
    }

    async compare(left, right) {
        if (typeof this.compareAdapter?.compare === 'function') {
            return this.compareAdapter.compare(left, right);
        }

        return compareDocuments(left, right);
    }

    destroy() {
        this.compareAdapter = null;
    }
}

import { getPropertyMetadata } from './propertyMetadataRegistry.js';

const SHADOWS = {
    none: 'none',
    sm: '0 1px 3px rgba(15, 23, 42, 0.16)',
    md: '0 8px 18px rgba(15, 23, 42, 0.18)',
    lg: '0 18px 32px rgba(15, 23, 42, 0.22)',
};

function formatValue(metadata, value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (metadata.name === 'shadow') {
        return SHADOWS[value] || SHADOWS.none;
    }

    if (metadata.unit && typeof value === 'number') {
        return `${value}${metadata.unit}`;
    }

    return String(value);
}

export class PreviewStyleEngine {
    constructor({ root = null, showHighRisk = false } = {}) {
        this.root = root;
        this.showHighRisk = showHighRisk;
        this.applied = new Map();
    }

    apply(elementName, styles = {}) {
        if (!this.root || typeof this.root.querySelectorAll !== 'function' || !elementName) {
            return false;
        }

        const nodes = Array.from(this.root.querySelectorAll(`[data-ds="${elementName}"]`));

        nodes.forEach((node) => {
            const previous = this.applied.get(node) || {};

            Object.entries(styles).forEach(([property, value]) => {
                const metadata = getPropertyMetadata(property, { showHighRisk: this.showHighRisk });

                if (!metadata) {
                    return;
                }

                if (!Object.prototype.hasOwnProperty.call(previous, property)) {
                    previous[property] = node.style[property] || '';
                }

                node.style[property] = formatValue(metadata, value);
            });

            this.applied.set(node, previous);
        });

        return nodes.length > 0;
    }

    clear() {
        this.applied.forEach((styles, node) => {
            Object.entries(styles).forEach(([property, value]) => {
                node.style[property] = value;
            });
        });
        this.applied.clear();
    }

    destroy() {
        this.clear();
        this.root = null;
    }
}

function normalizeSpacing(value) {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    if (typeof value !== 'object' || value === null) {
        return null;
    }

    return ['top', 'right', 'bottom', 'left'].map((side) => `${Number(value[side] || 0)}px`).join(' ');
}

export function createSpacingEditor({ property, onChange = null } = {}) {
    return {
        type: 'spacing',
        property,
        setValue(value) {
            const nextValue = normalizeSpacing(value);

            if (nextValue) {
                onChange?.(property, nextValue);
            }

            return nextValue;
        },
        destroy() {},
    };
}

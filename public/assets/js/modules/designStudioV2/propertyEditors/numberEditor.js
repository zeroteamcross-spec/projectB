export function createNumberEditor({ property, min = 0, max = 9999, step = 1, onChange = null } = {}) {
    return {
        type: 'number',
        property,
        min,
        max,
        step,
        setValue(value) {
            const nextValue = Math.min(max, Math.max(min, Number(value)));
            onChange?.(property, nextValue);
            return nextValue;
        },
        destroy() {},
    };
}

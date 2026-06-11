export function createSliderEditor({ property, min = 0, max = 100, step = 1, onChange = null } = {}) {
    return {
        type: 'slider',
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

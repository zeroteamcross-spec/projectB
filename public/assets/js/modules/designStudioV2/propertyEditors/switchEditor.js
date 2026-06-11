export function createSwitchEditor({ property, onChange = null } = {}) {
    return {
        type: 'switch',
        property,
        setValue(value) {
            const nextValue = Boolean(value);
            onChange?.(property, nextValue);
            return nextValue;
        },
        destroy() {},
    };
}

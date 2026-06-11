const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function createColorPickerEditor({ property, onChange = null } = {}) {
    return {
        type: 'color',
        property,
        setValue(value) {
            const nextValue = typeof value === 'string' && HEX_COLOR.test(value) ? value : null;

            if (nextValue) {
                onChange?.(property, nextValue);
            }

            return nextValue;
        },
        destroy() {},
    };
}

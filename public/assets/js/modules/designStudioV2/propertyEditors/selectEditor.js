export function createSelectEditor({ property, options = [], onChange = null } = {}) {
    return {
        type: 'select',
        property,
        options: [...options],
        setValue(value) {
            const nextValue = options.includes(value) ? value : null;

            if (nextValue !== null) {
                onChange?.(property, nextValue);
            }

            return nextValue;
        },
        destroy() {},
    };
}

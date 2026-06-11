export function createEditorResizeManager({ storage = null, storageKey = 'ds-v2-editor-width', minWidth = 320, maxWidth = 700, defaultWidth = 420 } = {}) {
    let width = defaultWidth;

    function clamp(nextWidth) {
        return Math.min(maxWidth, Math.max(minWidth, Number(nextWidth) || defaultWidth));
    }

    function load() {
        if (storage && typeof storage.getItem === 'function') {
            width = clamp(storage.getItem(storageKey));
        }

        return width;
    }

    function setWidth(nextWidth) {
        width = clamp(nextWidth);

        if (storage && typeof storage.setItem === 'function') {
            storage.setItem(storageKey, String(width));
        }

        return width;
    }

    return {
        load,
        setWidth,
        getWidth() {
            return width;
        },
        destroy() {},
    };
}

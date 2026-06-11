const MAX_DATA_DS_LENGTH = 255;
const DATA_DS_PATTERN = /^[A-Za-z0-9_.-]+$/;

export function normalizeElementName(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const name = value.trim();

    if (!name || name.length > MAX_DATA_DS_LENGTH || /\s/.test(name)) {
        return null;
    }

    return DATA_DS_PATTERN.test(name) ? name : null;
}

export function collectElements(root = null) {
    const scanRoot = root || (typeof document === 'undefined' ? null : document);

    if (!scanRoot || typeof scanRoot.querySelectorAll !== 'function') {
        return [];
    }

    const names = new Set();

    scanRoot.querySelectorAll('[data-ds]').forEach((element) => {
        const name = normalizeElementName(element.getAttribute('data-ds'));

        if (name) {
            names.add(name);
        }
    });

    return Array.from(names).sort();
}

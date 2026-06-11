import { normalizeElementName } from './elementCollector.js';

export function normalizeRegistryEntries(registry = []) {
    const entries = new Map();

    if (Array.isArray(registry)) {
        registry.forEach((entry) => {
            const name = normalizeElementName(typeof entry === 'string' ? entry : entry?.name);

            if (name) {
                entries.set(name, typeof entry === 'string' ? { name, status: 'active' } : entry);
            }
        });
    } else if (registry && typeof registry === 'object') {
        Object.entries(registry).forEach(([key, entry]) => {
            const name = normalizeElementName(entry?.name || key);

            if (name) {
                entries.set(name, entry && typeof entry === 'object' ? { ...entry, name } : { name, status: 'active' });
            }
        });
    }

    return entries;
}

export function findUnregisteredElements(elements = [], registry = []) {
    const entries = normalizeRegistryEntries(registry);
    const missing = new Set();

    elements.forEach((element) => {
        const name = normalizeElementName(element);
        const entry = name ? entries.get(name) : null;

        if (name && !entry) {
            missing.add(name);
        }
    });

    return Array.from(missing).sort();
}

export function buildRegistryDocument(name, { status = 'active', risk = 'safe', createdBy = null, createdAt = null } = {}) {
    const normalizedName = normalizeElementName(name);

    if (!normalizedName) {
        return null;
    }

    return {
        name: normalizedName,
        risk,
        createdAt: createdAt || new Date().toISOString(),
        createdBy,
        status,
    };
}

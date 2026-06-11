import { collectElements } from './elementCollector.js';
import { findUnregisteredElements } from './registryBuilder.js';

function canScan({ enabled = false, designMode = false, currentUser = null } = {}) {
    return Boolean(enabled && designMode && currentUser?.role === 'super_admin');
}

export function scanRoute({ route = '', currentUser = null, designMode = false, enabled = false, root = null, registry = [] } = {}) {
    if (!canScan({ enabled, designMode, currentUser })) {
        return {
            route,
            elements: [],
            unregisteredElements: [],
        };
    }

    const elements = collectElements(root);

    return {
        route,
        elements,
        unregisteredElements: findUnregisteredElements(elements, registry),
    };
}

export function scanCurrentRoute(options = {}) {
    const currentHash = typeof window === 'undefined' ? '' : window.location.hash;
    const route = options.route || currentHash || '';

    return scanRoute({ ...options, route });
}

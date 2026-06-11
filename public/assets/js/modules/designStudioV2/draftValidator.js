const BREAKPOINTS = ['mobile', 'tablet', 'desktop'];

export function createEmptyDraft(route = '') {
    return {
        schemaVersion: 1,
        route,
        updatedBy: null,
        updatedAt: null,
        elements: {},
    };
}

export function validateDraft(draft) {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
        return false;
    }

    if (!Number.isInteger(draft.schemaVersion) || typeof draft.route !== 'string') {
        return false;
    }

    if (!draft.elements || typeof draft.elements !== 'object' || Array.isArray(draft.elements)) {
        return false;
    }

    return Object.values(draft.elements).every((element) => (
        element
        && typeof element === 'object'
        && !Array.isArray(element)
        && BREAKPOINTS.every((breakpoint) => (
            element[breakpoint]
            && typeof element[breakpoint] === 'object'
            && !Array.isArray(element[breakpoint])
        ))
    ));
}

export function ensureElementDraft(draft, elementName) {
    if (!draft.elements[elementName]) {
        draft.elements[elementName] = {
            mobile: {},
            tablet: {},
            desktop: {},
        };
    }

    return draft.elements[elementName];
}

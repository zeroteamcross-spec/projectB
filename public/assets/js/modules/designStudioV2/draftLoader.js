import { createEmptyDraft, validateDraft } from './draftValidator.js';

export async function loadDraft({ storageAdapter, route = '' } = {}) {
    if (typeof storageAdapter?.loadDraft !== 'function') {
        return createEmptyDraft(route);
    }

    const draft = await storageAdapter.loadDraft(route);

    return validateDraft(draft) ? draft : createEmptyDraft(route);
}

export async function saveDraft({ storageAdapter, route = '', draft } = {}) {
    if (typeof storageAdapter?.saveDraft !== 'function' || !validateDraft(draft)) {
        return false;
    }

    return Boolean(await storageAdapter.saveDraft(route, draft));
}

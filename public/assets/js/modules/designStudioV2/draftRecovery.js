import { createEmptyDraft, validateDraft } from './draftValidator.js';

export async function recoverDraft({ storageAdapter, route = '', draft = null } = {}) {
    if (validateDraft(draft)) {
        return {
            draft,
            warning: null,
        };
    }

    if (typeof storageAdapter?.recoverDraft === 'function') {
        return storageAdapter.recoverDraft(route);
    }

    const fallbackDraft = createEmptyDraft(route);

    return {
        draft: fallbackDraft,
        warning: 'Draft recovery used in-memory fallback.',
    };
}

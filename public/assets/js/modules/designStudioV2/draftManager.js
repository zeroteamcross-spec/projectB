import { createDraftAutosave } from './draftAutosave.js';
import { createEmptyDraft, ensureElementDraft, validateDraft } from './draftValidator.js';
import { loadDraft, saveDraft } from './draftLoader.js';

export class DraftManager {
    constructor({ route = '', storageAdapter = null, autosaveDelay = 500 } = {}) {
        this.route = route;
        this.storageAdapter = storageAdapter;
        this.draft = createEmptyDraft(route);
        this.autosave = createDraftAutosave({
            delay: autosaveDelay,
            onSave: (draft) => this.save(draft),
        });
    }

    async load() {
        this.draft = await loadDraft({ storageAdapter: this.storageAdapter, route: this.route });
        return this.draft;
    }

    async save(draft = this.draft) {
        if (!validateDraft(draft)) {
            return false;
        }

        this.draft = draft;
        return saveDraft({ storageAdapter: this.storageAdapter, route: this.route, draft });
    }

    updateElement(elementName, breakpoint, property, value) {
        if (!['mobile', 'tablet', 'desktop'].includes(breakpoint) || !property) {
            return false;
        }

        const element = ensureElementDraft(this.draft, elementName);
        element[breakpoint][property] = value;

        return true;
    }

    clearElement(elementName) {
        if (this.draft.elements[elementName]) {
            delete this.draft.elements[elementName];
            return true;
        }

        return false;
    }

    getDraft() {
        return {
            ...this.draft,
            elements: { ...this.draft.elements },
        };
    }

    destroy() {
        this.autosave.destroy();
        this.storageAdapter = null;
    }
}

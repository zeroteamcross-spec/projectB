export function createDraftAutosave({ delay = 500, onSave = null } = {}) {
    let timer = null;
    let pendingDraft = null;

    function cancel() {
        if (timer) {
            clearTimeout(timer);
        }

        timer = null;
        pendingDraft = null;
    }

    function schedule(draft) {
        pendingDraft = draft;

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(async () => {
            const draftToSave = pendingDraft;
            timer = null;
            pendingDraft = null;

            if (typeof onSave === 'function') {
                await onSave(draftToSave);
            }
        }, delay);
    }

    return {
        schedule,
        cancel,
        destroy: cancel,
        hasPending() {
            return Boolean(timer);
        },
    };
}

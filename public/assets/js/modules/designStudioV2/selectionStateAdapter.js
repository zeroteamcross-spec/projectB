export function createSelectionStateAdapter(selectionManager) {
    return {
        getSelected() {
            return selectionManager?.getSelected?.() || null;
        },
        select(elementName) {
            return selectionManager?.select?.(elementName) || null;
        },
        clear() {
            selectionManager?.clear?.();
        },
        subscribe(listener) {
            return selectionManager?.subscribe?.(listener) || (() => {});
        },
    };
}

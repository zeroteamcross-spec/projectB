export function createSelectionManager() {
    let selectedElement = null;
    const listeners = new Set();

    function notify() {
        listeners.forEach((listener) => {
            if (typeof listener === 'function') {
                listener(selectedElement);
            }
        });
    }

    return {
        getSelected() {
            return selectedElement;
        },

        isSelected(elementName) {
            return selectedElement === elementName;
        },

        select(elementName) {
            selectedElement = elementName || null;
            notify();

            return selectedElement;
        },

        clear() {
            selectedElement = null;
            notify();
        },

        subscribe(listener) {
            if (typeof listener !== 'function') {
                return () => {};
            }

            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },

        destroy() {
            selectedElement = null;
            listeners.clear();
        },
    };
}

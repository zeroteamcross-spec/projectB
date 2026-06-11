import { createPreviewStateManager } from './previewStateManager.js';

export function createPropertyPanelManager({ selectionManager, previewEngine, breakpoint = 'mobile' } = {}) {
    const previewState = createPreviewStateManager();

    function update(property, value) {
        const selectedElement = selectionManager?.getSelected?.();

        if (!selectedElement || !previewState.setProperty(breakpoint, property, value)) {
            return false;
        }

        return previewEngine?.apply?.(selectedElement, previewState.getEffectiveState(breakpoint)) || false;
    }

    function clear() {
        previewState.clear();
        previewEngine?.clear?.();
    }

    return {
        update,
        clear,
        getState: previewState.getState,
        destroy() {
            clear();
            previewState.destroy();
        },
    };
}

import { createRuntimeStateReader } from './runtimeStateReader.js';

export function createAuditReporter({ runtimeStateProvider = null } = {}) {
    const reader = createRuntimeStateReader({ runtimeStateProvider });

    function inspect() {
        const state = reader.read();
        const warnings = [];

        if ((state.listeners || 0) > 1) {
            warnings.push({
                code: 'possible_duplicate_listener',
                message: 'More than one runtime listener is registered.',
            });
        }

        if (!state.initialized && (state.overlayMounted || state.floatingMounted || state.shellMounted)) {
            warnings.push({
                code: 'ui_residue_after_destroy',
                message: 'Runtime is not initialized but UI residue is still reported.',
            });
        }

        if (!state.initialized && (state.overlayBindings || 0) > 0) {
            warnings.push({
                code: 'orphan_overlay_bindings',
                message: 'Overlay bindings are present while runtime is not initialized.',
            });
        }

        if (!state.activeRoute && state.selectedElement) {
            warnings.push({
                code: 'stale_selection',
                message: 'Selection exists without an active route.',
            });
        }

        return {
            phase: 'integration-phase-5',
            status: warnings.length === 0 ? 'PASS' : 'WARNING',
            state,
            warnings,
        };
    }

    return { inspect };
}

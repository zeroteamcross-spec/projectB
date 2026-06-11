import { createRuntimeStateReader } from './runtimeStateReader.js';

export function createDiagnosticCollector({
    runtimeStateProvider = null,
    memoryProvider = null,
    errorClassifier = null,
} = {}) {
    const reader = createRuntimeStateReader({ runtimeStateProvider });

    function collect({ errors = [] } = {}) {
        const state = reader.read();
        const classifiedErrors = errors.map((error) => {
            if (typeof errorClassifier === 'function') {
                return errorClassifier(error);
            }

            return {
                category: 'runtime',
                severity: 'UNKNOWN',
                message: String(error?.message || error || ''),
            };
        });

        return {
            phase: 'integration-phase-6',
            state,
            memory: typeof memoryProvider === 'function' ? memoryProvider() : null,
            errors: classifiedErrors,
            health: {
                initialized: Boolean(state.initialized),
                lifecycleClean: (state.timers || 0) === 0 && (state.observers || 0) === 0,
                listenerCount: state.listeners || 0,
            },
        };
    }

    return { collect };
}

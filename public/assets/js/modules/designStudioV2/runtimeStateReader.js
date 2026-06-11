export function createRuntimeStateReader({ runtimeStateProvider = null } = {}) {
    function read() {
        if (typeof runtimeStateProvider !== 'function') {
            return {};
        }

        const state = runtimeStateProvider();

        return state && typeof state === 'object' ? { ...state } : {};
    }

    return { read };
}

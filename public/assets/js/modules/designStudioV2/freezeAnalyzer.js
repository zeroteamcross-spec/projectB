import { createRuntimeStateReader } from './runtimeStateReader.js';

export function createFreezeAnalyzer({ runtimeStateProvider = null } = {}) {
    const reader = createRuntimeStateReader({ runtimeStateProvider });

    function snapshot({ label = 'baseline' } = {}) {
        return {
            phase: 'integration-phase-7',
            label,
            capturedAt: new Date().toISOString(),
            state: reader.read(),
        };
    }

    function compare(baseline = {}, current = reader.read()) {
        const baselineState = baseline.state || baseline;
        const drift = [];
        const keys = new Set([...Object.keys(baselineState || {}), ...Object.keys(current || {})]);

        keys.forEach((key) => {
            if (JSON.stringify(baselineState?.[key]) !== JSON.stringify(current?.[key])) {
                drift.push({
                    key,
                    expected: baselineState?.[key],
                    actual: current?.[key],
                });
            }
        });

        return {
            phase: 'integration-phase-7',
            status: drift.length === 0 ? 'PASS' : 'DRIFT_DETECTED',
            drift,
        };
    }

    return { snapshot, compare };
}

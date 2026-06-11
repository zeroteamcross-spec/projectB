const BREAKPOINTS = ['mobile', 'tablet', 'desktop'];

export function createPreviewStateManager() {
    const state = {
        mobile: {},
        tablet: {},
        desktop: {},
    };

    function setProperty(breakpoint, property, value) {
        if (!BREAKPOINTS.includes(breakpoint) || !property) {
            return false;
        }

        state[breakpoint][property] = value;
        return true;
    }

    function clear() {
        BREAKPOINTS.forEach((breakpoint) => {
            Object.keys(state[breakpoint]).forEach((property) => {
                delete state[breakpoint][property];
            });
        });
    }

    return {
        setProperty,
        getState() {
            return {
                mobile: { ...state.mobile },
                tablet: { ...state.tablet },
                desktop: { ...state.desktop },
            };
        },
        getEffectiveState(breakpoint = 'mobile') {
            if (breakpoint === 'desktop') {
                return { ...state.mobile, ...state.tablet, ...state.desktop };
            }

            if (breakpoint === 'tablet') {
                return { ...state.mobile, ...state.tablet };
            }

            return { ...state.mobile };
        },
        clear,
        destroy: clear,
    };
}

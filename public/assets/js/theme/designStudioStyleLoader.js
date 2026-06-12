import { apiClient } from '../core/apiClient.js';

const SHADOWS = {
    none: 'none',
    sm: '0 1px 3px rgba(15, 23, 42, 0.16)',
    md: '0 8px 18px rgba(15, 23, 42, 0.18)',
    lg: '0 18px 32px rgba(15, 23, 42, 0.22)',
};

const PROPERTIES_WITH_PX = new Set([
    'fontSize', 'padding', 'margin', 'gap', 'borderWidth', 'borderRadius',
    'width', 'height', 'minWidth', 'maxWidth'
]);

function camelToKebab(str) {
    if (str === 'shadow') return 'box-shadow';
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function formatCssValue(property, value) {
    if (value === null || value === undefined || value === '') return '';
    if (property === 'shadow') return SHADOWS[value] || SHADOWS.none;
    if (PROPERTIES_WITH_PX.has(property) && typeof value === 'number') {
        return `${value}px`;
    }
    return String(value);
}

function generateCss(elements = {}) {
    let mobileRules = '';
    let tabletRules = '';
    let desktopRules = '';

    Object.entries(elements).forEach(([elementName, breakpoints]) => {
        const selector = `[data-ds="${elementName}"]`;

        // Mobile
        if (breakpoints.mobile) {
            let decls = '';
            Object.entries(breakpoints.mobile).forEach(([prop, val]) => {
                const formatted = formatCssValue(prop, val);
                if (formatted) {
                    decls += `${camelToKebab(prop)}:${formatted}!important;`;
                }
            });
            if (decls) mobileRules += `${selector}{${decls}}\n`;
        }

        // Tablet
        if (breakpoints.tablet) {
            let decls = '';
            Object.entries(breakpoints.tablet).forEach(([prop, val]) => {
                const formatted = formatCssValue(prop, val);
                if (formatted) {
                    decls += `${camelToKebab(prop)}:${formatted}!important;`;
                }
            });
            if (decls) tabletRules += `${selector}{${decls}}\n`;
        }

        // Desktop
        if (breakpoints.desktop) {
            let decls = '';
            Object.entries(breakpoints.desktop).forEach(([prop, val]) => {
                const formatted = formatCssValue(prop, val);
                if (formatted) {
                    decls += `${camelToKebab(prop)}:${formatted}!important;`;
                }
            });
            if (decls) desktopRules += `${selector}{${decls}}\n`;
        }
    });

    let css = mobileRules;
    if (tabletRules) {
        css += `@media (min-width: 768px) {\n${tabletRules}}\n`;
    }
    if (desktopRules) {
        css += `@media (min-width: 1024px) {\n${desktopRules}}\n`;
    }

    return css;
}

export function bindDesignStudioStyleLoader(bus) {
    const STYLE_ID = 'ds-v2-published-styles';

    const applyStylesForRoute = async (route) => {
        let styleTag = document.getElementById(STYLE_ID);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = STYLE_ID;
            document.head.appendChild(styleTag);
        }

        if (!route) {
            styleTag.textContent = '';
            return;
        }

        try {
            // Fetch published configuration
            const response = await apiClient.get(`/design-studio-v2/published?route=${encodeURIComponent(route)}`);
            const elements = response.data?.published?.elements || {};
            styleTag.textContent = generateCss(elements);
        } catch (error) {
            console.error('Failed to load published style:', error);
            styleTag.textContent = '';
        }
    };

    bus.on('route:change', (context) => {
        const route = context.path || context.route?.path || context.name || null;
        applyStylesForRoute(route);
    });

    bus.on('design-studio:published', (context) => {
        const route = context?.route || null;
        if (route) {
            applyStylesForRoute(route);
        }
    });
}

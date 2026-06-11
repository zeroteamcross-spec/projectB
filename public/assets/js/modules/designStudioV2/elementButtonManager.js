import { normalizeElementName } from './elementCollector.js';

const ELEMENT_BUTTON_CLASS = 'ds-v2-element-button';
const HOVER_OUTLINE = '0 0 0 2px rgba(37, 99, 235, 0.45)';

function applyElementButtonStyle(button) {
    Object.assign(button.style, {
        position: 'fixed',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: '0',
        background: '#111827',
        color: '#ffffff',
        boxShadow: '0 4px 10px rgba(17, 24, 39, 0.18)',
        cursor: 'pointer',
        fontSize: '12px',
        lineHeight: '1',
        zIndex: '800',
    });
}

function positionButton(button, node) {
    if (typeof node.getBoundingClientRect !== 'function') {
        return;
    }

    const rect = node.getBoundingClientRect();
    button.style.top = `${Math.max(rect.top + 4, 4)}px`;
    button.style.left = `${Math.max(rect.right - 32, 4)}px`;
}

export function createElementButtonManager({ root, selectionManager, onSelect = null } = {}) {
    const mounted = [];

    function mount(elements = []) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return [];
        }

        destroy();

        const allowed = new Set(elements.map(normalizeElementName).filter(Boolean));
        const nodes = Array.from(root.querySelectorAll('[data-ds]'));

        nodes.forEach((node) => {
            const name = normalizeElementName(node.getAttribute('data-ds'));

            if (!name || !allowed.has(name)) {
                return;
            }

            const button = node.ownerDocument.createElement('button');
            let previousOutline = '';

            button.type = 'button';
            button.className = ELEMENT_BUTTON_CLASS;
            button.setAttribute('aria-label', `Select ${name}`);
            button.dataset.dsTarget = name;
            button.textContent = 'Edit';
            applyElementButtonStyle(button);
            positionButton(button, node);

            const clickHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                selectionManager?.select(name);

                if (typeof onSelect === 'function') {
                    onSelect(name);
                }
            };

            const mouseEnterHandler = () => {
                previousOutline = node.style.outline;
                node.style.outline = HOVER_OUTLINE;
            };

            const mouseLeaveHandler = () => {
                node.style.outline = previousOutline;
            };

            button.addEventListener('click', clickHandler);
            node.addEventListener('mouseenter', mouseEnterHandler);
            node.addEventListener('mouseleave', mouseLeaveHandler);
            node.ownerDocument.body.appendChild(button);

            mounted.push({
                node,
                button,
                clickHandler,
                mouseEnterHandler,
                mouseLeaveHandler,
            });
        });

        return mounted.map(({ button }) => button);
    }

    function destroy() {
        mounted.splice(0).forEach((entry) => {
            entry.button.removeEventListener('click', entry.clickHandler);
            entry.node.removeEventListener('mouseenter', entry.mouseEnterHandler);
            entry.node.removeEventListener('mouseleave', entry.mouseLeaveHandler);
            entry.node.style.outline = '';

            if (entry.button.parentNode) {
                entry.button.parentNode.removeChild(entry.button);
            }
        });
    }

    return {
        mount,
        destroy,
        count() {
            return mounted.length;
        },
    };
}

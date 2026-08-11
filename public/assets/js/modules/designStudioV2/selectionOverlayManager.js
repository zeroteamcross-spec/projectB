import { normalizeElementName } from './elementCollector.js';

const OVERLAY_ROOT_ID = 'ds-v2-overlay-root';
const SELECTED_CLASS = 'ds-v2-selected-overlay';
const HOVER_CLASS = 'ds-v2-hover-overlay';

function createOverlay(documentRef, className, color) {
    const overlay = documentRef.createElement('div');
    overlay.className = className;
    Object.assign(overlay.style, {
        position: 'fixed',
        pointerEvents: 'none',
        border: `2px solid ${color}`,
        borderRadius: '4px',
        boxSizing: 'border-box',
        zIndex: '820',
        display: 'none',
    });

    return overlay;
}

function positionOverlay(overlay, node) {
    if (!overlay || typeof node?.getBoundingClientRect !== 'function') {
        return;
    }

    const rect = node.getBoundingClientRect();
    Object.assign(overlay.style, {
        display: 'block',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
    });
}

export function createSelectionOverlayManager({ documentRef = null, root = null, selectionManager = null, onEditElement = null } = {}) {
    let overlayRoot = null;
    let selectedOverlay = null;
    let hoverOverlay = null;
    const bindings = [];
    const activeVisualOverlays = [];
    let scrollResizeHandler = null;

    function ensureRoot() {
        if (!documentRef?.body) {
            return null;
        }

        overlayRoot = documentRef.getElementById(OVERLAY_ROOT_ID);

        if (!overlayRoot) {
            overlayRoot = documentRef.createElement('div');
            overlayRoot.id = OVERLAY_ROOT_ID;
            overlayRoot.setAttribute('data-ds-v2-runtime', 'overlay');
            documentRef.body.appendChild(overlayRoot);
        }

        if (!selectedOverlay) {
            selectedOverlay = createOverlay(documentRef, SELECTED_CLASS, '#1e81b0');
            overlayRoot.appendChild(selectedOverlay);
        }

        if (!hoverOverlay) {
            hoverOverlay = createOverlay(documentRef, HOVER_CLASS, '#eab676');
            overlayRoot.appendChild(hoverOverlay);
        }

        return overlayRoot;
    }

    function reposition() {
        activeVisualOverlays.forEach(({ node, borderEl, pencilEl }) => {
            if (typeof node?.getBoundingClientRect !== 'function') return;
            const rect = node.getBoundingClientRect();

            if (rect.width === 0 || rect.height === 0) {
                borderEl.style.display = 'none';
                pencilEl.style.display = 'none';
                return;
            }

            borderEl.style.display = 'block';
            pencilEl.style.display = 'block';

            Object.assign(borderEl.style, {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
            });

            Object.assign(pencilEl.style, {
                top: `${rect.top + 4}px`,
                left: `${rect.left + rect.width - 28}px`,
            });
        });

        const selected = selectionManager?.getSelected();
        if (selected) {
            const activeBinding = bindings.find(b => b.elementName === selected);
            if (activeBinding) {
                positionOverlay(selectedOverlay, activeBinding.node);
            }
        }
    }

    function mount() {
        const scanRoot = root || documentRef;

        if (!ensureRoot() || typeof scanRoot?.querySelectorAll !== 'function') {
            return 0;
        }

        destroyVisualOverlays();
        destroyBindings();

        const nodes = Array.from(scanRoot.querySelectorAll('[data-ds]'));

        nodes.forEach((node) => {
            const elementName = normalizeElementName(node.getAttribute('data-ds'));

            if (!elementName) {
                return;
            }

            // Create dashed border element
            const borderEl = documentRef.createElement('div');
            Object.assign(borderEl.style, {
                position: 'fixed',
                pointerEvents: 'none',
                border: '2px dashed #1e81b0',
                borderRadius: '4px',
                boxSizing: 'border-box',
                zIndex: '810',
            });
            overlayRoot.appendChild(borderEl);

            // Create pencil button
            const pencilEl = documentRef.createElement('button');
            pencilEl.type = 'button';
            pencilEl.textContent = '✏️';
            pencilEl.title = `Edit ${elementName}`;
            Object.assign(pencilEl.style, {
                position: 'fixed',
                zIndex: '830',
                background: '#1e81b0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '11px',
                boxShadow: '0 2px 6px rgba(30,129,176, 0.3)',
                padding: '0',
                lineHeight: '1',
            });

            pencilEl.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof onEditElement === 'function') {
                    onEditElement(elementName, node);
                }
            });
            overlayRoot.appendChild(pencilEl);

            activeVisualOverlays.push({ node, borderEl, pencilEl });

            const mouseEnterHandler = () => positionOverlay(hoverOverlay, node);
            const mouseLeaveHandler = () => {
                if (hoverOverlay) {
                    hoverOverlay.style.display = 'none';
                }
            };
            const clickHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof onEditElement === 'function') {
                    onEditElement(elementName, node);
                }
            };

            node.addEventListener('mouseenter', mouseEnterHandler);
            node.addEventListener('mouseleave', mouseLeaveHandler);
            node.addEventListener('click', clickHandler);

            bindings.push({ elementName, node, mouseEnterHandler, mouseLeaveHandler, clickHandler });
        });

        reposition();

        // Listen for scroll and resize to keep overlays perfectly aligned
        if (typeof window !== 'undefined') {
            scrollResizeHandler = () => reposition();
            window.addEventListener('scroll', scrollResizeHandler, { passive: true });
            window.addEventListener('resize', scrollResizeHandler, { passive: true });
        }

        return bindings.length;
    }

    function clearSelection() {
        selectionManager?.clear?.();

        if (selectedOverlay) {
            selectedOverlay.style.display = 'none';
        }

        if (hoverOverlay) {
            hoverOverlay.style.display = 'none';
        }
    }

    function destroyBindings() {
        bindings.splice(0).forEach((binding) => {
            binding.node.removeEventListener('mouseenter', binding.mouseEnterHandler);
            binding.node.removeEventListener('mouseleave', binding.mouseLeaveHandler);
            binding.node.removeEventListener('click', binding.clickHandler);
        });
    }

    function destroyVisualOverlays() {
        if (typeof window !== 'undefined' && scrollResizeHandler) {
            window.removeEventListener('scroll', scrollResizeHandler);
            window.removeEventListener('resize', scrollResizeHandler);
            scrollResizeHandler = null;
        }

        activeVisualOverlays.splice(0).forEach(({ borderEl, pencilEl }) => {
            if (borderEl.parentNode) borderEl.parentNode.removeChild(borderEl);
            if (pencilEl.parentNode) pencilEl.parentNode.removeChild(pencilEl);
        });
    }

    function destroy() {
        destroyVisualOverlays();
        destroyBindings();
        clearSelection();

        if (overlayRoot?.parentNode) {
            overlayRoot.parentNode.removeChild(overlayRoot);
        }

        overlayRoot = null;
        selectedOverlay = null;
        hoverOverlay = null;
    }

    return {
        mount,
        clearSelection,
        destroy,
        reposition,
        count() {
            return bindings.length;
        },
        getRoot() {
            return overlayRoot;
        },
    };
}

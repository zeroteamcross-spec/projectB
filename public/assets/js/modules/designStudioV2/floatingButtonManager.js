const BUTTON_CLASS = 'ds-v2-floating-button';
const ROOT_ID = 'ds-v2-floating-root';
const SHELL_CLASS = 'ds-v2-shell-stub';

function applyFloatingButtonStyle(button) {
    Object.assign(button.style, {
        position: 'fixed',
        right: 'max(16px, env(safe-area-inset-right))',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: '0',
        background: '#111827',
        color: '#ffffff',
        boxShadow: '0 8px 18px rgba(17, 24, 39, 0.18)',
        cursor: 'pointer',
        fontSize: '22px',
        lineHeight: '1',
        zIndex: '900',
    });
}

export function createFloatingButtonManager({ documentRef, onOpenEditMode = null } = {}) {
    let root = null;
    let button = null;
    let shell = null;
    let clickHandler = null;

    function mount() {
        if (!documentRef?.body || button) {
            return null;
        }

        root = documentRef.getElementById(ROOT_ID);

        if (!root) {
            root = documentRef.createElement('div');
            root.id = ROOT_ID;
            root.setAttribute('data-ds-v2-runtime', 'floating');
            documentRef.body.appendChild(root);
        }

        button = documentRef.createElement('button');
        button.type = 'button';
        button.className = BUTTON_CLASS;
        button.setAttribute('aria-label', 'Open Design Studio');
        button.textContent = 'Edit';
        applyFloatingButtonStyle(button);

        let active = false;
        clickHandler = () => {
            active = !active;
            if (active) {
                button.textContent = 'Close';
                button.style.background = '#dc2626';
            } else {
                button.textContent = 'Edit';
                button.style.background = '#111827';
            }
            if (typeof onOpenEditMode === 'function') {
                onOpenEditMode(active);
            }
        };

        button.addEventListener('click', clickHandler);
        root.appendChild(button);

        return button;
    }

    function openShell() {
        if (!root || shell) {
            return shell;
        }

        shell = documentRef.createElement('section');
        shell.className = SHELL_CLASS;
        shell.setAttribute('aria-label', 'Design Studio V2');
        shell.textContent = 'Design Studio V2';
        Object.assign(shell.style, {
            position: 'fixed',
            right: '16px',
            bottom: '84px',
            width: '260px',
            minHeight: '72px',
            padding: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ffffff',
            color: '#111827',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
            zIndex: '850',
            fontSize: '14px',
            lineHeight: '1.4',
        });
        root.appendChild(shell);

        return shell;
    }

    function destroy() {
        if (button && clickHandler) {
            button.removeEventListener('click', clickHandler);
        }

        if (button?.parentNode) {
            button.parentNode.removeChild(button);
        }

        if (shell?.parentNode) {
            shell.parentNode.removeChild(shell);
        }

        if (root?.parentNode && root.childNodes.length === 0) {
            root.parentNode.removeChild(root);
        }

        root = null;
        button = null;
        shell = null;
        clickHandler = null;
    }

    return {
        mount,
        destroy,
        openShell,
        getElement() {
            return button;
        },
        getRoot() {
            return root;
        },
        getShell() {
            return shell;
        },
    };
}

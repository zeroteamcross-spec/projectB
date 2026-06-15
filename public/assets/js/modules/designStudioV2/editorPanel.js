import { groupPropertyMetadata } from './propertyMetadataRegistry.js';

export function createEditorPanel({ documentRef = null, resizeManager = null, showHighRisk = false, onChange = null, onPublish = null, onViewHistory = null, onSaveDraft = null, onResetElement = null } = {}) {
    let panel = null;
    let collapsed = false;
    let currentSelectedElement = null;
    let currentSelectedStyles = {};
    let activeBreakpoint = 'mobile';

    function renderPropertyGroups() {
        const groups = groupPropertyMetadata({ showHighRisk });
        return Object.entries(groups).map(([group, properties]) => ({
            group,
            properties,
        }));
    }

    function mount() {
        if (!documentRef?.body || panel) {
            return panel;
        }

        panel = documentRef.createElement('aside');
        panel.className = 'ds-v2-editor-panel';
        panel.setAttribute('aria-label', 'Design Studio Editor');
        panel.dataset.collapsed = 'false';

        // Sleek modern styling (glassmorphism/sleek borders)
        Object.assign(panel.style, {
            position: 'fixed',
            top: '0',
            right: '0',
            bottom: '0',
            width: `${resizeManager?.load?.() || 420}px`,
            zIndex: '850',
            background: '#ffffff',
            borderLeft: '1px solid #e5e7eb',
            boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            color: '#1f2937',
        });

        documentRef.body.appendChild(panel);
        renderContent();

        return panel;
    }

    function setCollapsed(nextCollapsed) {
        collapsed = Boolean(nextCollapsed);
        if (panel) {
            panel.dataset.collapsed = collapsed ? 'true' : 'false';
            panel.style.display = collapsed ? 'none' : 'flex';
        }
        return collapsed;
    }

    function updateProperty(property, value, breakpoint = activeBreakpoint) {
        if (typeof onChange === 'function') {
            onChange({ property, value, breakpoint });
        }
    }

    function updateSelection(elementName, styles = {}) {
        if (elementName === currentSelectedElement) {
            currentSelectedStyles = styles;
            return;
        }
        currentSelectedElement = elementName;
        currentSelectedStyles = styles;
        renderContent();
    }

    function renderContent() {
        if (!panel) return;
        panel.innerHTML = '';

        // Header Panel
        const header = documentRef.createElement('div');
        Object.assign(header.style, {
            padding: '16px 20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafafa',
        });

        const title = documentRef.createElement('h2');
        title.textContent = 'Design Editor';
        Object.assign(title.style, {
            fontSize: '16px',
            fontWeight: '600',
            margin: '0',
            color: '#111827',
        });

        const closeBtn = documentRef.createElement('button');
        closeBtn.textContent = '✕';
        Object.assign(closeBtn.style, {
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#9ca3af',
        });
        closeBtn.addEventListener('click', () => setCollapsed(true));

        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        if (!currentSelectedElement) {
            const emptyState = documentRef.createElement('div');
            emptyState.textContent = 'Select an element on the screen to begin editing.';
            Object.assign(emptyState.style, {
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
            });
            panel.appendChild(emptyState);
            return;
        }

        // Element Details Info
        const elementInfo = documentRef.createElement('div');
        Object.assign(elementInfo.style, {
            padding: '12px 20px',
            background: '#f3f4f6',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
        });

        const selectedText = documentRef.createElement('span');
        selectedText.textContent = `Selected: ${currentSelectedElement}`;
        Object.assign(selectedText.style, {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            flex: '1',
        });
        elementInfo.appendChild(selectedText);

        const resetBtn = documentRef.createElement('button');
        resetBtn.textContent = 'Reset Element';
        Object.assign(resetBtn.style, {
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'background 0.2s',
        });
        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.background = '#fee2e2';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.background = 'transparent';
        });
        resetBtn.addEventListener('click', () => {
            if (confirm(`Apakah Anda yakin ingin mereset elemen "${currentSelectedElement}" ke stelan default?`)) {
                if (typeof onResetElement === 'function') {
                    onResetElement(currentSelectedElement);
                }
            }
        });
        elementInfo.appendChild(resetBtn);

        panel.appendChild(elementInfo);

        // Breakpoint Switcher Tabs
        const tabContainer = documentRef.createElement('div');
        Object.assign(tabContainer.style, {
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
        });

        ['mobile', 'tablet', 'desktop'].forEach((bp) => {
            const tab = documentRef.createElement('button');
            tab.textContent = bp.charAt(0).toUpperCase() + bp.slice(1);
            Object.assign(tab.style, {
                flex: '1',
                padding: '10px 0',
                border: 'none',
                background: activeBreakpoint === bp ? '#ffffff' : '#f9fafb',
                borderBottom: activeBreakpoint === bp ? '2px solid #2563eb' : 'none',
                fontWeight: activeBreakpoint === bp ? '600' : '400',
                cursor: 'pointer',
                color: activeBreakpoint === bp ? '#2563eb' : '#4b5563',
                fontSize: '13px',
            });
            tab.addEventListener('click', () => {
                activeBreakpoint = bp;
                renderContent();
            });
            tabContainer.appendChild(tab);
        });
        panel.appendChild(tabContainer);

        // Scrollable Properties Container
        const scrollContainer = documentRef.createElement('div');
        Object.assign(scrollContainer.style, {
            flex: '1',
            overflowY: 'auto',
            padding: '16px 20px',
        });

        const groups = renderPropertyGroups();
        groups.forEach(({ group, properties }) => {
            const groupSection = documentRef.createElement('div');
            Object.assign(groupSection.style, {
                marginBottom: '20px',
            });

            const groupTitle = documentRef.createElement('h3');
            groupTitle.textContent = group;
            Object.assign(groupTitle.style, {
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#6b7280',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                borderBottom: '1px solid #f3f4f6',
                paddingBottom: '4px',
            });
            groupSection.appendChild(groupTitle);

            properties.forEach((prop) => {
                const row = documentRef.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '12px',
                });

                const label = documentRef.createElement('label');
                label.textContent = prop.name;
                Object.assign(label.style, {
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px',
                });
                row.appendChild(label);

                // Fetch current value for element styling, fallback to empty string
                const bpStyles = currentSelectedStyles[activeBreakpoint] || {};
                const propVal = bpStyles[prop.name] !== undefined ? bpStyles[prop.name] : '';

                let inputEl;
                if (prop.editor === 'select') {
                    inputEl = documentRef.createElement('select');
                    (prop.options || []).forEach((opt) => {
                        const optEl = documentRef.createElement('option');
                        optEl.value = opt;
                        optEl.textContent = opt;
                        if (opt === propVal) {
                            optEl.selected = true;
                        }
                        inputEl.appendChild(optEl);
                    });
                } else if (prop.editor === 'color') {
                    inputEl = documentRef.createElement('input');
                    inputEl.type = 'color';
                    inputEl.value = propVal.startsWith('#') ? propVal : '#ffffff';
                } else if (prop.editor === 'slider') {
                    inputEl = documentRef.createElement('input');
                    inputEl.type = 'range';
                    inputEl.min = prop.min !== undefined ? prop.min : 0;
                    inputEl.max = prop.max !== undefined ? prop.max : 1;
                    inputEl.step = prop.step !== undefined ? prop.step : 0.1;
                    inputEl.value = propVal !== '' ? propVal : (prop.min !== undefined ? prop.min : 0);
                } else if (prop.editor === 'switch') {
                    inputEl = documentRef.createElement('input');
                    inputEl.type = 'checkbox';
                    inputEl.checked = Boolean(propVal);
                } else {
                    // Default to number or text input
                    inputEl = documentRef.createElement('input');
                    inputEl.type = prop.editor === 'number' ? 'number' : 'text';
                    if (prop.min !== undefined) inputEl.min = prop.min;
                    if (prop.max !== undefined) inputEl.max = prop.max;
                    if (prop.step !== undefined) inputEl.step = prop.step;
                    inputEl.value = propVal;
                }

                Object.assign(inputEl.style, {
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '13px',
                    width: '100%',
                    boxSizing: 'border-box',
                });

                inputEl.addEventListener('input', (e) => {
                    let val = e.target.value;
                    if (prop.editor === 'switch') {
                        val = e.target.checked;
                    } else if (prop.editor === 'number' || prop.editor === 'slider') {
                        val = Number(e.target.value);
                    }
                    updateProperty(prop.name, val);
                });

                row.appendChild(inputEl);
                groupSection.appendChild(row);
            });

            scrollContainer.appendChild(groupSection);
        });

        panel.appendChild(scrollContainer);

        // Footer Publish Section
        const footer = documentRef.createElement('div');
        Object.assign(footer.style, {
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        });

        const saveDraftBtn = documentRef.createElement('button');
        saveDraftBtn.textContent = 'Save as Draft';
        Object.assign(saveDraftBtn.style, {
            padding: '10px 16px',
            background: '#ffffff',
            color: '#2563eb',
            border: '1px solid #2563eb',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
            textAlign: 'center',
        });
        saveDraftBtn.addEventListener('click', () => {
            if (typeof onSaveDraft === 'function') {
                onSaveDraft();
            }
        });
        footer.appendChild(saveDraftBtn);

        const publishBtn = documentRef.createElement('button');
        publishBtn.textContent = 'Publish Layout';
        Object.assign(publishBtn.style, {
            padding: '10px 16px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
        });
        publishBtn.addEventListener('click', () => {
            if (typeof onPublish === 'function') {
                onPublish();
            }
        });
        footer.appendChild(publishBtn);

        const historyBtn = documentRef.createElement('button');
        historyBtn.textContent = 'View History';
        Object.assign(historyBtn.style, {
            padding: '10px 16px',
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px',
            textAlign: 'center',
        });
        historyBtn.addEventListener('click', () => {
            if (typeof onViewHistory === 'function') {
                onViewHistory();
            }
        });
        footer.appendChild(historyBtn);

        panel.appendChild(footer);
    }

    function destroy() {
        if (panel?.parentNode) {
            panel.parentNode.removeChild(panel);
        }
        panel = null;
        collapsed = false;
        currentSelectedElement = null;
        currentSelectedStyles = {};
    }

    return {
        mount,
        destroy,
        setCollapsed,
        isCollapsed() {
            return collapsed;
        },
        updateProperty,
        renderPropertyGroups,
        updateSelection,
        getElement() {
            return panel;
        },
    };
}


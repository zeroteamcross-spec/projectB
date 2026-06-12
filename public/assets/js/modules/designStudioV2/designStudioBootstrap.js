import { createElementButtonManager } from './elementButtonManager.js';
import { createFloatingButtonManager } from './floatingButtonManager.js';
import { createSelectionOverlayManager } from './selectionOverlayManager.js';
import { createSelectionManager } from './selectionManager.js';
import { createEditorPanel } from './editorPanel.js';
import { DraftManager } from './draftManager.js';
import { PreviewStyleEngine } from './previewStyleEngine.js';
import { NetworkDraftStorageAdapter } from './networkDraftStorageAdapter.js';
import { PublishManager } from './publishManager.js';
import { NetworkPublishAdapter } from './networkPublishAdapter.js';
import { RollbackManager } from './rollbackManager.js';
import { NetworkRollbackAdapter } from './networkRollbackAdapter.js';

let initialized = false;
let dependencies = null;
let activeRoute = null;
let unsubscribeRouteChange = null;
let floatingButtonManager = null;
let selectionManager = null;
let selectionOverlayManager = null;
let editorPanel = null;
let draftManager = null;
let previewEngine = null;
let publishManager = null;
let rollbackManager = null;
let unsubscribeSelection = null;
let isEditorModeActive = false;

const runtimeDisposables = new Set();
const runtimeTimers = new Set();
const runtimeObservers = new Set();

function getEffectiveStyles(elementDraft, breakpoint) {
    const mobile = elementDraft?.mobile || {};
    const tablet = elementDraft?.tablet || {};
    const desktop = elementDraft?.desktop || {};

    if (breakpoint === 'desktop') {
        return { ...mobile, ...tablet, ...desktop };
    }
    if (breakpoint === 'tablet') {
        return { ...mobile, ...tablet };
    }
    return { ...mobile };
}

async function handlePublishFlow(documentRef) {
    if (!draftManager || !publishManager || !activeRoute) return;

    const draft = draftManager.getDraft();
    const modifiedElements = Object.keys(draft.elements || {});

    if (modifiedElements.length === 0) {
        alert('Tidak ada perubahan desain di draf untuk diterbitkan.');
        return;
    }

    // Custom confirm modal
    const modal = documentRef.createElement('div');
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '999',
        fontFamily: 'Inter, system-ui, sans-serif',
    });

    const dialog = documentRef.createElement('div');
    Object.assign(dialog.style, {
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        width: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    });

    const title = documentRef.createElement('h3');
    title.textContent = 'Publish Changes';
    Object.assign(title.style, {
        margin: '0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
    });
    dialog.appendChild(title);

    const desc = documentRef.createElement('p');
    desc.textContent = `You are publishing modifications to ${modifiedElements.length} elements:`;
    Object.assign(desc.style, {
        margin: '0',
        fontSize: '14px',
        color: '#4b5563',
    });
    dialog.appendChild(desc);

    const list = documentRef.createElement('ul');
    Object.assign(list.style, {
        margin: '0',
        paddingLeft: '20px',
        fontSize: '13px',
        color: '#374151',
        maxHeight: '100px',
        overflowY: 'auto',
    });
    modifiedElements.forEach((el) => {
        const item = documentRef.createElement('li');
        item.textContent = el;
        list.appendChild(item);
    });
    dialog.appendChild(list);

    const noteLabel = documentRef.createElement('label');
    noteLabel.textContent = 'Publish Note (minimum 5 characters):';
    Object.assign(noteLabel.style, {
        fontSize: '12px',
        fontWeight: '600',
        color: '#374151',
    });
    dialog.appendChild(noteLabel);

    const noteInput = documentRef.createElement('textarea');
    noteInput.placeholder = 'e.g. Adjusted navbar font size and hero section padding';
    Object.assign(noteInput.style, {
        width: '100%',
        height: '60px',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '13px',
        fontFamily: 'inherit',
        resize: 'none',
        boxSizing: 'border-box',
    });
    dialog.appendChild(noteInput);

    const btnContainer = documentRef.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '8px',
    });

    const cancelBtn = documentRef.createElement('button');
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
        padding: '8px 14px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        background: '#ffffff',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        color: '#374151',
    });
    cancelBtn.addEventListener('click', () => {
        documentRef.body.removeChild(modal);
    });

    const confirmBtn = documentRef.createElement('button');
    confirmBtn.textContent = 'Confirm & Publish';
    Object.assign(confirmBtn.style, {
        padding: '8px 14px',
        border: 'none',
        borderRadius: '6px',
        background: '#2563eb',
        color: '#ffffff',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
    });
    confirmBtn.addEventListener('click', async () => {
        const note = noteInput.value.trim();
        if (!publishManager.validatePublishNote(note)) {
            alert('Publish note harus minimal 5 karakter.');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Publishing...';

        try {
            if (draftManager) {
                await draftManager.save();
            }
        } catch (err) {
            console.error('Failed to save draft before publish:', err);
        }

        const result = await publishManager.publish({
            route: activeRoute,
            publishNote: note,
        });

        if (result) {
            alert('Desain berhasil diterbitkan!');
            if (typeof dependencies?.bus?.emit === 'function') {
                dependencies.bus.emit('design-studio:published', { route: activeRoute });
            }
            documentRef.body.removeChild(modal);
        } else {
            alert('Gagal menerbitkan desain.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm & Publish';
        }
    });

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    dialog.appendChild(btnContainer);
    modal.appendChild(dialog);
    documentRef.body.appendChild(modal);
}

async function handleHistoryFlow(documentRef) {
    if (!publishManager || !rollbackManager || !activeRoute) return;

    // Load History list
    const history = await publishManager.loadHistory(activeRoute);

    // Modal Outer Container
    const modal = documentRef.createElement('div');
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '1000',
        fontFamily: 'Inter, system-ui, sans-serif',
    });

    const dialog = documentRef.createElement('div');
    Object.assign(dialog.style, {
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        width: '500px',
        maxHeight: '80vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    });

    const header = documentRef.createElement('div');
    Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '12px',
    });

    const title = documentRef.createElement('h3');
    title.textContent = 'Version History & Rollback';
    Object.assign(title.style, {
        margin: '0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
    });

    const closeBtn = documentRef.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '18px',
        color: '#9ca3af',
    });
    closeBtn.addEventListener('click', () => {
        documentRef.body.removeChild(modal);
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // Timeline/List Area
    const listArea = documentRef.createElement('div');
    Object.assign(listArea.style, {
        flex: '1',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingRight: '4px',
    });

    if (history.length === 0) {
        const noHistory = documentRef.createElement('p');
        noHistory.textContent = 'No versions published yet.';
        noHistory.style.color = '#6b7280';
        noHistory.style.textAlign = 'center';
        listArea.appendChild(noHistory);
    } else {
        // Show reverse chronological
        [...history].reverse().forEach((version) => {
            const card = documentRef.createElement('div');
            Object.assign(card.style, {
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px 16px',
                background: '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            });

            const topRow = documentRef.createElement('div');
            Object.assign(topRow.style, {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            });

            const verNum = documentRef.createElement('span');
            verNum.textContent = `Version ${version.version}`;
            Object.assign(verNum.style, {
                fontWeight: '600',
                fontSize: '14px',
                color: '#111827',
            });

            const meta = documentRef.createElement('span');
            meta.textContent = new Date(version.publishedAt).toLocaleString();
            Object.assign(meta.style, {
                fontSize: '11px',
                color: '#6b7280',
            });

            topRow.appendChild(verNum);
            topRow.appendChild(meta);
            card.appendChild(topRow);

            if (version.rollback) {
                const badge = documentRef.createElement('span');
                badge.textContent = `🔄 Rolled back from V${version.rollbackFrom} to V${version.rollbackTarget}`;
                Object.assign(badge.style, {
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#b45309',
                    background: '#fef3c7',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    alignSelf: 'flex-start',
                });
                card.appendChild(badge);
            }

            const note = documentRef.createElement('p');
            note.textContent = version.publishNote ? `"${version.publishNote}"` : 'No note provided';
            Object.assign(note.style, {
                margin: '0',
                fontSize: '12px',
                color: '#4b5563',
                fontStyle: 'italic',
            });
            card.appendChild(note);

            // Action Buttons
            const actionRow = documentRef.createElement('div');
            Object.assign(actionRow.style, {
                display: 'flex',
                gap: '8px',
                marginTop: '4px',
            });

            const previewBtn = documentRef.createElement('button');
            previewBtn.textContent = 'Preview Changes';
            Object.assign(previewBtn.style, {
                padding: '6px 10px',
                fontSize: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: '#ffffff',
                cursor: 'pointer',
            });
            previewBtn.addEventListener('click', async () => {
                previewBtn.disabled = true;
                const prev = await rollbackManager.preview({ route: activeRoute, targetVersion: version.version });
                previewBtn.disabled = false;
                if (prev) {
                    alert(`Pratinjau Rollback ke V${version.version}:\n` +
                          `- Elemen berubah: ${prev.elementChanges}\n` +
                          `- Properti berubah: ${prev.propertyChanges}\n\n` +
                          `Catatan penerbitan target: "${prev.targetPublishNote || ''}"`);
                } else {
                    alert('Gagal memuat pratinjau rollback.');
                }
            });

            const rollbackBtn = documentRef.createElement('button');
            rollbackBtn.textContent = 'Rollback to this';
            Object.assign(rollbackBtn.style, {
                padding: '6px 10px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                background: '#dc2626',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: '600',
            });
            rollbackBtn.addEventListener('click', async () => {
                const noteInput = prompt('Masukkan catatan rollback (minimal 5 karakter):');
                if (noteInput === null) return;
                
                const trimNote = noteInput.trim();
                if (trimNote.length < 5 || trimNote.length > 500) {
                    alert('Catatan rollback wajib diisi antara 5 hingga 500 karakter.');
                    return;
                }

                rollbackBtn.disabled = true;
                rollbackBtn.textContent = 'Rolling back...';

                const result = await rollbackManager.rollback({
                    route: activeRoute,
                    targetVersion: version.version,
                    rollbackNote: trimNote,
                });

                if (result) {
                    // Update frontend draft state with rolled back elements
                    if (draftManager) {
                        const draft = draftManager.getDraft();
                        draft.elements = result.elements || {};
                        await draftManager.save(draft);

                        // Refresh styling visually in real-time
                        previewEngine?.clear?.();
                        const width = window.innerWidth;
                        const activeBp = width >= 1024 ? 'desktop' : (width >= 768 ? 'tablet' : 'mobile');
                        Object.entries(result.elements || {}).forEach(([elName, elDraft]) => {
                            const effectiveStyles = getEffectiveStyles(elDraft, activeBp);
                            previewEngine?.apply(elName, effectiveStyles);
                        });
                    }
                    alert(`Rollback berhasil! Layout telah dikembalikan ke Versi ${version.version}.`);
                    if (typeof dependencies?.bus?.emit === 'function') {
                        dependencies.bus.emit('design-studio:published', { route: activeRoute });
                    }
                    documentRef.body.removeChild(modal);
                } else {
                    alert('Gagal melakukan rollback.');
                    rollbackBtn.disabled = false;
                    rollbackBtn.textContent = 'Rollback to this';
                }
            });

            actionRow.appendChild(previewBtn);
            actionRow.appendChild(rollbackBtn);
            card.appendChild(actionRow);

            listArea.appendChild(card);
        });
    }

    dialog.appendChild(listArea);
    modal.appendChild(dialog);
    documentRef.body.appendChild(modal);
}

export function shouldEnable({ enabled = false, designMode = false, currentUser = null } = {}) {
    return Boolean(enabled && designMode && currentUser?.role === 'super_admin');
}

export function initialize(options = {}) {
    if (initialized) {
        return true;
    }

    if (!shouldEnable(options)) {
        return false;
    }

    dependencies = { ...options };
    initialized = true;
    selectionManager = createSelectionManager();
    activeRoute = currentRouteFromOptions(options);

    previewEngine = new PreviewStyleEngine({
        root: options.root || options.documentRef,
        showHighRisk: false,
    });

    publishManager = new PublishManager({
        publishAdapter: new NetworkPublishAdapter(),
    });

    rollbackManager = new RollbackManager({
        rollbackAdapter: new NetworkRollbackAdapter(),
    });

    if (typeof options.bus?.on === 'function') {
        unsubscribeRouteChange = options.bus.on('route:change', async (context) => {
            const nextRoute = routeFromContext(context);

            if (nextRoute !== activeRoute) {
                unmountRoute(activeRoute);
                await mountRoute(nextRoute);
            }
        });
        runtimeDisposables.add(unsubscribeRouteChange);
    }

    if (activeRoute) {
        mountRoute(activeRoute);
    }

    if (options.documentRef?.body) {
        // selectionOverlayManager setup (but mount deferred until Edit Mode is active)
        selectionOverlayManager = createSelectionOverlayManager({
            documentRef: options.documentRef,
            root: options.root || options.documentRef,
            selectionManager,
            onEditElement: (elementName, node) => {
                selectionManager?.select(elementName);
                editorPanel?.setCollapsed(false);
            }
        });

        // Initialize property editor panel
        editorPanel = createEditorPanel({
            documentRef: options.documentRef,
            showHighRisk: false,
            onChange: ({ property, value, breakpoint }) => {
                const selected = selectionManager?.getSelected();
                if (selected && draftManager) {
                    draftManager.updateElement(selected, breakpoint, property, value);
                    const elDraft = draftManager.getDraft().elements[selected];
                    const effectiveStyles = getEffectiveStyles(elDraft, breakpoint);
                    previewEngine?.apply(selected, effectiveStyles);
                    editorPanel?.updateSelection(selected, elDraft);
                }
            },
            onPublish: async () => {
                await handlePublishFlow(options.documentRef);
            },
            onViewHistory: async () => {
                await handleHistoryFlow(options.documentRef);
            },
            onSaveDraft: async () => {
                if (draftManager) {
                    const success = await draftManager.save();
                    if (success) {
                        alert('Draf berhasil disimpan!');
                    } else {
                        alert('Gagal menyimpan draf.');
                    }
                }
            }
        });

        // Floating Action button controls Editor Mode toggling
        floatingButtonManager = createFloatingButtonManager({
            documentRef: options.documentRef,
            onOpenEditMode: (active) => {
                isEditorModeActive = active;
                if (active) {
                    // Activate Editor Mode: Draw borders and pencils, mount panel collapsed
                    selectionOverlayManager?.mount();
                    editorPanel?.mount();
                    editorPanel?.setCollapsed(true);
                } else {
                    // Deactivate Editor Mode: Clean up UI highlights and sidebar
                    selectionOverlayManager?.clearSelection();
                    selectionOverlayManager?.destroy();
                    // Re-instantiate so we can mount again on next click
                    selectionOverlayManager = createSelectionOverlayManager({
                        documentRef: options.documentRef,
                        root: options.root || options.documentRef,
                        selectionManager,
                        onEditElement: (elementName, node) => {
                            selectionManager?.select(elementName);
                            editorPanel?.setCollapsed(false);
                        }
                    });
                    editorPanel?.destroy();
                }
            },
        });
        floatingButtonManager.mount();

        unsubscribeSelection = selectionManager.subscribe((selectedElement) => {
            if (selectedElement && draftManager) {
                const elDraft = draftManager.getDraft().elements[selectedElement] || { mobile: {}, tablet: {}, desktop: {} };
                editorPanel?.updateSelection(selectedElement, elDraft);
            } else {
                editorPanel?.updateSelection(null);
            }
        });
        runtimeDisposables.add(unsubscribeSelection);
    }

    return true;
}

export function destroy() {
    dependencies?.instance?.destroy?.();
    selectionOverlayManager?.destroy();
    selectionOverlayManager = null;
    selectionManager?.destroy?.();
    selectionManager = null;
    floatingButtonManager?.destroy();
    floatingButtonManager = null;

    editorPanel?.destroy();
    editorPanel = null;
    previewEngine?.destroy();
    previewEngine = null;
    draftManager?.destroy();
    draftManager = null;
    publishManager?.destroy?.();
    publishManager = null;
    rollbackManager?.destroy?.();
    rollbackManager = null;

    cleanup();
    runtimeDisposables.forEach((dispose) => {
        if (typeof dispose === 'function') {
            dispose();
        }
    });
    runtimeDisposables.clear();
    unsubscribeRouteChange = null;
    unsubscribeSelection = null;
    dependencies = null;
    activeRoute = null;
    initialized = false;
    isEditorModeActive = false;
}

export function isInitialized() {
    return initialized;
}

export async function mountRoute(route = null) {
    if (!initialized) {
        return false;
    }

    activeRoute = normalizeRoute(route);
    
    if (isEditorModeActive) {
        selectionOverlayManager?.mount?.();
    }

    if (activeRoute) {
        draftManager = new DraftManager({
            route: activeRoute,
            storageAdapter: new NetworkDraftStorageAdapter(),
        });
        try {
            await draftManager.load();
            const draftData = draftManager.getDraft();
            if (draftData && draftData.elements) {
                const width = window.innerWidth;
                const activeBp = width >= 1024 ? 'desktop' : (width >= 768 ? 'tablet' : 'mobile');
                Object.entries(draftData.elements).forEach(([elName, elDraft]) => {
                    const effectiveStyles = getEffectiveStyles(elDraft, activeBp);
                    previewEngine?.apply(elName, effectiveStyles);
                });
            }
        } catch (err) {
            console.error('Failed to load/apply draft on mount:', err);
        }
    }

    return true;
}

export function unmountRoute(route = null) {
    if (route === null || normalizeRoute(route) === activeRoute) {
        cleanup();
        selectionOverlayManager?.clearSelection?.();
        previewEngine?.clear?.();
        draftManager?.destroy?.();
        draftManager = null;
        activeRoute = null;
    }

    return true;
}

export function cleanup() {
    runtimeTimers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
    });
    runtimeTimers.clear();

    runtimeObservers.forEach((observer) => {
        if (typeof observer?.disconnect === 'function') {
            observer.disconnect();
        }
    });
    runtimeObservers.clear();

    return true;
}

export function runtimeState() {
    return {
        initialized,
        activeRoute,
        listeners: runtimeDisposables.size,
        timers: runtimeTimers.size,
        observers: runtimeObservers.size,
        floatingMounted: Boolean(floatingButtonManager?.getElement?.()),
        shellMounted: Boolean(floatingButtonManager?.getShell?.()),
        overlayMounted: Boolean(selectionOverlayManager?.getRoot?.()),
        overlayBindings: selectionOverlayManager?.count?.() || 0,
        selectedElement: selectionManager?.getSelected?.() || null,
    };
}

function currentRouteFromOptions(options = {}) {
    if (typeof options.router?.location === 'function') {
        return options.router.location().path;
    }

    return null;
}

function routeFromContext(context = {}) {
    return normalizeRoute(context.path || context.route?.path || context.name || null);
}

function normalizeRoute(route) {
    return route ? String(route) : null;
}

export function createDesignStudioBootstrap({
    enabled = false,
    designMode = false,
    currentUser = null,
    documentRef = null,
    root = null,
    scannerAdapter = null,
    routerAdapter = null,
    onOpenEditMode = null,
    onSelectElement = null,
} = {}) {
    let floatingButtonManager = null;
    let elementButtonManager = null;
    let selectionManager = null;
    let unsubscribeRoute = null;
    let editMode = false;
    let currentRoute = '';

    function cleanupRoute() {
        elementButtonManager?.destroy();
        selectionManager?.clear();
    }

    function scanAndMount(route = currentRoute) {
        if (!editMode || typeof scannerAdapter?.scanRoute !== 'function') {
            return [];
        }

        const result = scannerAdapter.scanRoute({
            route,
            enabled,
            designMode,
            currentUser,
            root,
        });

        const elements = Array.isArray(result?.elements) ? result.elements : [];
        elementButtonManager?.mount(elements);

        return elements;
    }

    function openEditMode() {
        editMode = true;

        if (typeof onOpenEditMode === 'function') {
            onOpenEditMode();
        }

        scanAndMount(currentRoute);
    }

    function start() {
        if (!shouldEnable({ enabled, designMode, currentUser }) || !documentRef?.body) {
            return false;
        }

        selectionManager = createSelectionManager();
        floatingButtonManager = createFloatingButtonManager({ documentRef, onOpenEditMode: openEditMode });
        elementButtonManager = createElementButtonManager({
            root: root || documentRef,
            selectionManager,
            onSelect: onSelectElement,
        });

        currentRoute = typeof routerAdapter?.getCurrentRoute === 'function' ? routerAdapter.getCurrentRoute() : '';
        floatingButtonManager.mount();

        if (typeof routerAdapter?.subscribe === 'function') {
            unsubscribeRoute = routerAdapter.subscribe((nextRoute) => {
                currentRoute = nextRoute || '';
                cleanupRoute();
                scanAndMount(currentRoute);
            });
        }

        return true;
    }

    function destroy() {
        if (typeof unsubscribeRoute === 'function') {
            unsubscribeRoute();
        }

        unsubscribeRoute = null;
        cleanupRoute();
        floatingButtonManager?.destroy();
        selectionManager?.destroy();
        floatingButtonManager = null;
        elementButtonManager = null;
        selectionManager = null;
        editMode = false;
        currentRoute = '';
    }

    return {
        start,
        destroy,
        openEditMode,
        isEditMode() {
            return editMode;
        },
        getSelectedElement() {
            return selectionManager?.getSelected() || null;
        },
    };
}

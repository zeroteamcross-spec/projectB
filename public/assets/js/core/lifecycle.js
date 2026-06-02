export function createPageLifecycle(definition) {
  const cleanup = new Set();

  return {
    bootstrap: definition.bootstrap ?? (() => {}),
    mount: definition.mount,
    hydrate: definition.hydrate ?? (() => {}),
    bindEvents(context) {
      const disposers = definition.bindEvents?.(context) ?? [];
      const list = Array.isArray(disposers) ? disposers : [disposers];
      list.filter(Boolean).forEach((dispose) => cleanup.add(dispose));
    },
    unmount: definition.unmount ?? (() => {}),
    dispose(context) {
      cleanup.forEach((dispose) => dispose());
      cleanup.clear();
      definition.dispose?.(context);
    },
  };
}

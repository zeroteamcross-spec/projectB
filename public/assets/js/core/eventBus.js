export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(listener);

    return () => this.off(event, listener);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event, payload = null) {
    this.listeners.get(event)?.forEach((listener) => listener(payload, event));
    this.listeners.get("*")?.forEach((listener) => listener(payload, event));
  }

  clear() {
    this.listeners.clear();
  }
}

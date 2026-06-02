import { deepClone } from "../utils/deepClone.js";
import { getByPath, setByPath } from "../utils/objectPath.js";

export class StateEngine {
  constructor(initialState = {}) {
    this.state = deepClone(initialState);
    this.listeners = new Set();
  }

  registerModuleState(namespace, initialState = {}) {
    if (!namespace || this.get(namespace, undefined) !== undefined) {
      return;
    }

    this.patchState(namespace, initialState, "state:module-register");
  }

  getState() {
    return deepClone(this.state);
  }

  get(path = "", fallback = null) {
    if (!path) {
      return this.getState();
    }

    return getByPath(this.state, path, fallback);
  }

  setState(nextState, action = "state:set") {
    this.state = deepClone(typeof nextState === "function" ? nextState(this.getState()) : nextState);
    this.emit(action);
  }

  patchState(path, value, action = "state:patch") {
    const nextState = this.getState();
    setByPath(nextState, path, value);
    this.state = nextState;
    this.emit(action);
  }

  resetState(path = "", action = "state:reset") {
    if (!path) {
      this.state = {};
    } else {
      this.patchState(path, {}, action);
      return;
    }

    this.emit(action);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState(), "state:init");
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  destroyWorkingState(key = "") {
    if (!key) {
      this.patchState("working", {}, "working:destroy-all");
      return;
    }

    this.patchState(`working.${key}`, null, "working:destroy");
  }

  destroyRuntimeState(key = "") {
    if (!key) {
      this.patchState("runtime", {}, "runtime:destroy-all");
      return;
    }

    this.patchState(`runtime.${key}`, null, "runtime:destroy");
  }

  emit(action) {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot, action));
  }
}

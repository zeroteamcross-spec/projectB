import { AppShell } from "./appShell.js";
import { PublicShell } from "./publicShell.js";
import { createReleaseUpdateButton } from "./releaseUpdateButton.js";

export class ShellHost {
  constructor({ store } = {}) {
    this.store = store;
    this.shells = {
      public: new PublicShell({ store }),
      app: new AppShell({ store }),
    };
    this.root = document.createElement("div");
    this.activeShellName = null;
    this.activeShellNode = null;
    this.releaseUpdateButton = createReleaseUpdateButton(store);
    this.unsubscribe = null;
  }

  render() {
    this.activate("public");
    this.unsubscribe = this.store?.subscribe?.(() => {
      this.releaseUpdateButton.sync();
    }) ?? null;
    return this.root;
  }

  contentOutlet() {
    const shellName = this.store?.get("app.currentRoute.route.shell", "public") ?? "public";
    this.activate(shellName);
    return this.shells[this.normalize(shellName)].contentOutlet();
  }

  activate(shellName) {
    const normalized = this.normalize(shellName);

    if (this.activeShellName === normalized) {
      return;
    }

    this.activeShellName = normalized;
    this.activeShellNode = this.shells[normalized].render();
    this.root.replaceChildren(this.activeShellNode, this.releaseUpdateButton.element);
  }

  normalize(shellName) {
    return this.shells[shellName] ? shellName : "public";
  }

  dispose() {
    Object.values(this.shells).forEach((shell) => shell?.dispose?.());
    this.unsubscribe?.();
  }
}

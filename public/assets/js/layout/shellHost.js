import { AppShell } from "./appShell.js";
import { PublicShell } from "./publicShell.js";

export class ShellHost {
  constructor({ store } = {}) {
    this.store = store;
    this.shells = {
      public: new PublicShell({ store }),
      app: new AppShell({ store }),
    };
    this.root = document.createElement("div");
    this.activeShellName = null;
  }

  render() {
    this.activate("public");
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
    this.root.replaceChildren(this.shells[normalized].render());
  }

  normalize(shellName) {
    return this.shells[shellName] ? shellName : "public";
  }

  dispose() {
    Object.values(this.shells).forEach((shell) => shell?.dispose?.());
  }
}

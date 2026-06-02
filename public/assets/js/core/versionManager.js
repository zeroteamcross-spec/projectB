export class VersionManager {
  constructor({ client, store, bus } = {}) {
    this.client = client;
    this.store = store;
    this.bus = bus;
  }

  async check(resourceName) {
    const response = await this.client.get(`/versions/${encodeURIComponent(resourceName)}`);
    const version = response.data?.version ?? null;
    const current = this.store.get(`app.resourceVersions.${resourceName}`, null);

    if (current && version && current.version_number !== version.version_number) {
      this.store.patchState(`snapshot.${resourceName}`, { stale: true }, "version:stale");
      this.bus?.emit("resource:stale", { resourceName, current, next: version });
    }

    this.store.patchState(`app.resourceVersions.${resourceName}`, version, "version:checked");
    return version;
  }
}

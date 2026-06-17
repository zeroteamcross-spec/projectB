const DEFAULT_MANIFEST_URL = "/release-manifest.json";
const DEFAULT_STORAGE_KEY = "projectB.releaseVersion";

export class ReleaseManager {
  constructor({ manifestUrl = DEFAULT_MANIFEST_URL, storageKey = DEFAULT_STORAGE_KEY, storage = null } = {}) {
    this.manifestUrl = manifestUrl;
    this.storageKey = storageKey;
    this.storage = storage ?? this.resolveStorage();
  }

  async check() {
    const manifest = await this.fetchManifest();
    const latestVersion = manifest?.release_version ?? null;
    const appliedVersion = this.getAppliedVersion();
    const updateAvailable = Boolean(appliedVersion && latestVersion && appliedVersion !== latestVersion);

    if (!appliedVersion && latestVersion) {
      this.markApplied(latestVersion);
    }

    return {
      manifest,
      latestVersion,
      appliedVersion,
      updateAvailable,
    };
  }

  markApplied(version) {
    if (!version) {
      return;
    }

    try {
      this.storage?.setItem(this.storageKey, String(version));
    } catch (error) {
      // Storage can be unavailable in private browsing or restricted contexts.
    }
  }

  getAppliedVersion() {
    try {
      return this.storage?.getItem(this.storageKey) || null;
    } catch (error) {
      return null;
    }
  }

  async fetchManifest() {
    const response = await fetch(`${this.manifestUrl}?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Release manifest gagal dimuat.");
    }

    return response.json();
  }

  resolveStorage() {
    try {
      return typeof window !== "undefined" ? window.localStorage : null;
    } catch (error) {
      return null;
    }
  }
}

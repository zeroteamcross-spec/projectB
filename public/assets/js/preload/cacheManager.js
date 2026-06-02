export class CacheManager {
  constructor({ namespace = "projectB:cache" } = {}) {
    this.namespace = namespace;
  }

  read(key) {
    try {
      const raw = window.localStorage.getItem(this.cacheKey(key));
      if (!raw) {
        return null;
      }

      const payload = JSON.parse(raw);
      const ageSeconds = (Date.now() - payload.fetchedAt) / 1000;

      return {
        ...payload,
        stale: payload.stale || ageSeconds > payload.ttl,
      };
    } catch (error) {
      return null;
    }
  }

  write(key, data, { ttl = 300, version = key } = {}) {
    const payload = {
      data,
      fetchedAt: Date.now(),
      ttl,
      version,
      stale: false,
    };

    window.localStorage.setItem(this.cacheKey(key), JSON.stringify(payload));
    return payload;
  }

  markStale(key) {
    const payload = this.read(key);
    if (!payload) {
      return;
    }

    window.localStorage.setItem(this.cacheKey(key), JSON.stringify({ ...payload, stale: true }));
  }

  forget(key) {
    window.localStorage.removeItem(this.cacheKey(key));
  }

  forgetByPrefix(prefix) {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(this.cacheKey(prefix)))
      .forEach((key) => window.localStorage.removeItem(key));
  }

  cacheKey(key) {
    return `${this.namespace}:${key}`;
  }
}

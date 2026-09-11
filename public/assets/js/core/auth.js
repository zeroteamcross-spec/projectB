import { apiClient } from "./apiClient.js";
import { appStore } from "../state/store.js";
import { authStore } from "../state/authStore.js";
import { profileResource } from "../resources/profileResource.js";

export class AuthService {
  constructor({ client = apiClient, store = appStore } = {}) {
    this.client = client;
    this.store = store;
  }

  async login(credentials) {
    const response = await this.client.post("/auth/login", credentials);
    const user = response.data?.user ?? null;

    this.setUser(user);

    return response;
  }

  async register(payload) {
    const response = await this.client.post("/auth/register", payload);

    // Backend hanya memberi sesi (cookie) untuk role seller, ditandai lewat
    // remember_expires_at (lihat AuthService::register()). Role lain (mis.
    // buyer/affiliate lewat halaman ini) tidak dapat cookie di sini -- mereka
    // login manual terpisah seperti sebelumnya, jadi authStore dibiarkan apa
    // adanya supaya tidak terlihat "sudah login" padahal sesinya tidak ada.
    if (response.data?.remember_expires_at) {
      this.setUser(response.data?.user ?? null);
    }

    return response;
  }

  async logout() {
    const response = await profileResource.logout();
    this.setUser(null);

    return response;
  }

  async loadCurrentUser() {
    try {
      const response = await this.client.get("/users/me");
      const user = response.data?.user ?? null;
      this.setUser(user);

      return user;
    } catch (error) {
      this.setUser(null);
      throw error;
    }
  }

  setUser(user) {
    authStore.setContext({
      user,
      actor: null,
      impersonation: null,
    });
  }

  user() {
    return this.store.get("auth.user", null);
  }

  isAuthenticated() {
    return this.store.get("auth.isAuthenticated", false);
  }
}

export const authService = new AuthService();

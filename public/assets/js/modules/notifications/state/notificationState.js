import { appStore } from "../../../state/store.js";
import { notificationsResource } from "../../../resources/notificationsResource.js";

export const NOTIFICATIONS_STATE_PATH = "modules.notifications";
export const SNAPSHOT_LIMIT = 5;

export const initialNotificationState = Object.freeze({
  unreadCount: 0,
  items: [],
  workingItems: [],
  nextCursor: null,
  activeFilter: "all",
  isHydrated: false,
  isLoading: false,
  isMarkingAllRead: false,
  markingIds: {},
  error: null,
  lastSyncedAt: null,
  lastMutationAt: null,
});

export const notificationState = {
  get() {
    ensureState();
    return appStore.get(NOTIFICATIONS_STATE_PATH, freshInitialState());
  },

  snapshot() {
    const state = this.get();
    return {
      unreadCount: state.unreadCount ?? 0,
      items: state.items ?? [],
      isHydrated: Boolean(state.isHydrated),
      isLoading: Boolean(state.isLoading),
      error: state.error ?? null,
    };
  },

  working() {
    const state = this.get();
    return {
      unreadCount: state.unreadCount ?? 0,
      workingItems: state.workingItems ?? [],
      nextCursor: state.nextCursor ?? null,
      activeFilter: state.activeFilter ?? "all",
      isLoading: Boolean(state.isLoading),
      isMarkingAllRead: Boolean(state.isMarkingAllRead),
      markingIds: state.markingIds ?? {},
      error: state.error ?? null,
    };
  },

  setSnapshot(payload = {}) {
    const current = this.get();
    const hasPendingMutation = hasPendingReadMutation(current);
    const items = preserveLocalReadState(
      normalizeItems(payload.items).slice(0, SNAPSHOT_LIMIT),
      current,
      hasPendingMutation,
    );
    patchState({
      ...current,
      unreadCount: nextUnreadCount(payload, current, hasPendingMutation),
      items,
      isHydrated: true,
      isLoading: false,
      error: null,
      lastSyncedAt: Date.now(),
    }, "notifications:snapshot-set");
    return this.snapshot();
  },

  hydrate(payload = {}, { append = false, filter = null } = {}) {
    const current = this.get();
    const hasPendingMutation = hasPendingReadMutation(current);
    const incoming = normalizeItems(payload.items);
    const mergedWorkingItems = append
      ? mergeUniqueById(current.workingItems ?? [], incoming)
      : incoming;
    const workingItems = preserveLocalReadState(mergedWorkingItems, current, hasPendingMutation);
    patchState({
      ...current,
      unreadCount: nextUnreadCount(payload, current, hasPendingMutation),
      workingItems,
      nextCursor: payload.next_cursor ?? payload.nextCursor ?? null,
      activeFilter: filter ?? current.activeFilter ?? "all",
      isLoading: false,
      error: null,
      lastSyncedAt: Date.now(),
    }, "notifications:hydrate");
    return this.working();
  },

  async loadList(params = {}, options = {}) {
    const filter = validFilter(params.status ?? this.get().activeFilter ?? "all");
    const cursor = params.cursor ?? null;
    this.setLoading(true);
    try {
      const payload = await notificationsResource.list({
        ...params,
        status: filter,
      }, options);
      return this.hydrate(payload, {
        append: Boolean(cursor),
        filter,
      });
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  setLoading(value) {
    patchState({
      ...this.get(),
      isLoading: Boolean(value),
    }, "notifications:loading");
  },

  setError(error) {
    patchState({
      ...this.get(),
      isLoading: false,
      isMarkingAllRead: false,
      error: errorMessage(error),
    }, "notifications:error");
  },

  applyMarkRead(id, readAt = nowIso()) {
    const state = this.get();
    const key = String(id);
    const wasUnread = hasUnreadItem(state.items, key) || hasUnreadItem(state.workingItems, key);
    patchState({
      ...state,
      unreadCount: wasUnread ? Math.max(0, Number(state.unreadCount ?? 0) - 1) : Number(state.unreadCount ?? 0),
      items: markItemsRead(state.items, key, readAt),
      workingItems: markItemsRead(state.workingItems, key, readAt),
      markingIds: {
        ...(state.markingIds ?? {}),
        [key]: true,
      },
      error: null,
      lastMutationAt: Date.now(),
    }, "notifications:mark-read-optimistic");
  },

  completeMarkRead(id, payload = {}) {
    const state = this.get();
    const key = String(id);
    const markingIds = { ...(state.markingIds ?? {}) };
    delete markingIds[key];
    const readAt = payload.read_at ?? payload.readAt ?? nowIso();
    patchState({
      ...state,
      unreadCount: numberOr(payload.unread_count, payload.unreadCount, state.unreadCount, 0),
      items: markItemsRead(state.items, key, readAt),
      workingItems: markItemsRead(state.workingItems, key, readAt),
      markingIds,
      error: null,
      lastSyncedAt: Date.now(),
      lastMutationAt: Date.now(),
    }, "notifications:mark-read-complete");
    return this.get();
  },

  async markRead(id, options = {}) {
    const key = String(id ?? "");
    if (!key) {
      return this.get();
    }

    const previous = this.get();
    const existing = findNotification(previous, key);
    if (existing?.isRead) {
      return previous;
    }

    this.applyMarkRead(key);
    try {
      const payload = await notificationsResource.markRead(key, options);
      return this.completeMarkRead(key, payload);
    } catch (error) {
      this.restore(previous, "notifications:mark-read-rollback");
      this.setError(error);
      throw error;
    }
  },

  applyMarkAllRead(readAt = nowIso()) {
    const state = this.get();
    patchState({
      ...state,
      unreadCount: 0,
      items: markAllItemsRead(state.items, readAt),
      workingItems: markAllItemsRead(state.workingItems, readAt),
      isMarkingAllRead: true,
      markingIds: {},
      error: null,
      lastMutationAt: Date.now(),
    }, "notifications:mark-all-optimistic");
  },

  completeMarkAllRead(payload = {}) {
    const state = this.get();
    patchState({
      ...state,
      unreadCount: numberOr(payload.unread_count, payload.unreadCount, 0),
      isMarkingAllRead: false,
      error: null,
      lastSyncedAt: Date.now(),
      lastMutationAt: Date.now(),
    }, "notifications:mark-all-complete");
    return this.get();
  },

  async markAllRead(options = {}) {
    const previous = this.get();
    this.applyMarkAllRead();
    try {
      const payload = await notificationsResource.markAllRead(options);
      return this.completeMarkAllRead(payload);
    } catch (error) {
      this.restore(previous, "notifications:mark-all-rollback");
      this.setError(error);
      throw error;
    }
  },

  restore(previousState, action = "notifications:rollback") {
    patchState(previousState ?? freshInitialState(), action);
  },

  pushNotification(item) {
    const notification = normalizeItem(item);
    if (!notification.id) {
      return this.get();
    }

    const state = this.get();
    const existingSnapshot = hasItem(state.items, notification.id);
    const existingWorking = hasItem(state.workingItems, notification.id);
    const unreadDelta = !existingSnapshot && !existingWorking && !notification.isRead ? 1 : 0;
    const nextItems = mergeUniqueById([notification], state.items ?? []).slice(0, SNAPSHOT_LIMIT);
    const nextWorkingItems = shouldIncludeForFilter(notification, state.activeFilter)
      ? mergeUniqueById([notification], state.workingItems ?? [])
      : state.workingItems ?? [];

    patchState({
      ...state,
      unreadCount: Math.max(0, Number(state.unreadCount ?? 0) + unreadDelta),
      items: nextItems,
      workingItems: nextWorkingItems,
      error: null,
      lastSyncedAt: Date.now(),
    }, "notifications:push");
    return this.get();
  },

  reset() {
    patchState(freshInitialState(), "notifications:reset");
  },

  subscribe(listener) {
    return appStore.subscribe((state, action) => {
      listener(state.modules?.notifications ?? freshInitialState(), action);
    });
  },
};

export function normalizeNotificationItem(item = {}) {
  return normalizeItem(item);
}

export function normalizeNotificationItems(items = []) {
  return normalizeItems(items);
}

function ensureState() {
  if (appStore.get(NOTIFICATIONS_STATE_PATH, undefined) === undefined) {
    patchState(freshInitialState(), "notifications:init");
  }
}

function patchState(nextState, action) {
  appStore.patchState(NOTIFICATIONS_STATE_PATH, normalizeState(nextState), action);
}

function freshInitialState() {
  return {
    unreadCount: initialNotificationState.unreadCount,
    items: [],
    workingItems: [],
    nextCursor: initialNotificationState.nextCursor,
    activeFilter: initialNotificationState.activeFilter,
    isHydrated: initialNotificationState.isHydrated,
    isLoading: initialNotificationState.isLoading,
    isMarkingAllRead: initialNotificationState.isMarkingAllRead,
    markingIds: {},
    error: initialNotificationState.error,
    lastSyncedAt: initialNotificationState.lastSyncedAt,
    lastMutationAt: initialNotificationState.lastMutationAt,
  };
}

function normalizeState(state = {}) {
  return {
    ...freshInitialState(),
    ...state,
    unreadCount: Math.max(0, Number(state.unreadCount ?? 0)),
    items: normalizeItems(state.items),
    workingItems: normalizeItems(state.workingItems),
    activeFilter: validFilter(state.activeFilter ?? "all"),
    markingIds: { ...(state.markingIds ?? {}) },
  };
}

function normalizeItems(items = []) {
  return (Array.isArray(items) ? items : []).map(normalizeItem).filter((item) => item.id !== "");
}

function normalizeItem(item = {}) {
  const rawId = item.id ?? item.notification_id ?? "";
  const data = item.data ?? item.data_json ?? {};
  return {
    id: String(rawId),
    type: String(item.type ?? "system_message"),
    title: String(item.title ?? ""),
    body: String(item.body ?? ""),
    data: isPlainObject(data) ? data : {},
    linkUrl: item.linkUrl ?? item.link_url ?? null,
    iconKey: item.iconKey ?? item.icon_key ?? null,
    priority: item.priority ?? "normal",
    sourceType: item.sourceType ?? item.source_type ?? null,
    sourceId: item.sourceId ?? item.source_id ?? null,
    actorUserId: item.actorUserId ?? item.actor_user_id ?? null,
    isRead: Boolean(item.isRead ?? item.is_read ?? false),
    readAt: item.readAt ?? item.read_at ?? null,
    createdAt: item.createdAt ?? item.created_at ?? null,
    expiresAt: item.expiresAt ?? item.expires_at ?? null,
  };
}

function validFilter(value) {
  return ["all", "unread", "read"].includes(value) ? value : "all";
}

function shouldIncludeForFilter(item, filter = "all") {
  const normalized = validFilter(filter);
  if (normalized === "unread") {
    return !item.isRead;
  }
  if (normalized === "read") {
    return item.isRead;
  }
  return true;
}

function mergeUniqueById(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((item) => {
    const key = String(item.id ?? "");
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function hasItem(items = [], id) {
  const key = String(id);
  return (items ?? []).some((item) => String(item.id) === key);
}

function hasUnreadItem(items = [], id) {
  const key = String(id);
  return (items ?? []).some((item) => String(item.id) === key && !item.isRead);
}

function findNotification(state, id) {
  const key = String(id);
  return [...(state.items ?? []), ...(state.workingItems ?? [])]
    .find((item) => String(item.id) === key) ?? null;
}

function markItemsRead(items = [], id, readAt) {
  const key = String(id);
  return (items ?? []).map((item) => String(item.id) === key
    ? { ...item, isRead: true, readAt: item.readAt ?? readAt }
    : item);
}

function markAllItemsRead(items = [], readAt) {
  return (items ?? []).map((item) => ({
    ...item,
    isRead: true,
    readAt: item.readAt ?? readAt,
  }));
}

function hasPendingReadMutation(state = {}) {
  return Boolean(state.isMarkingAllRead || Object.keys(state.markingIds ?? {}).length);
}

function nextUnreadCount(payload = {}, current = {}, hasPendingMutation = false) {
  const incoming = numberOr(payload.unread_count, payload.unreadCount, current.unreadCount, 0);
  if (!hasPendingMutation) {
    return incoming;
  }

  return Math.min(incoming, Number(current.unreadCount ?? 0));
}

function preserveLocalReadState(items = [], current = {}, hasPendingMutation = false) {
  if (!hasPendingMutation) {
    return items;
  }

  if (current.isMarkingAllRead) {
    return markAllItemsRead(items, nowIso());
  }

  const localReadIds = new Map();
  [...(current.items ?? []), ...(current.workingItems ?? [])]
    .filter((item) => item?.isRead)
    .forEach((item) => localReadIds.set(String(item.id), item.readAt ?? nowIso()));

  return items.map((item) => {
    const readAt = localReadIds.get(String(item.id));
    return readAt ? { ...item, isRead: true, readAt } : item;
  });
}

function numberOr(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return Math.max(0, number);
    }
  }
  return 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error) {
  return error?.message ?? String(error || "Notifikasi gagal diproses.");
}

function nowIso() {
  return new Date().toISOString();
}

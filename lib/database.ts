// lib/database-manager.ts
// Purpose: Minimal, robust client-side store with React bindings.
// Fixes addressed:
// - Hydration mismatches from ad-hoc useState/useEffect patterns
// - Inconsistent polling updates and re-renders
// - Scattered state logic without a single source of truth
// - Optional persistence with versioning + migration
//
// Key features:
// - createStore<T>(initial, { persistKey, version, migrate })
// - store.get(), store.set(next), store.patch(partial|fn), store.subscribe(listener), store.reset()
// - useStore(store, selector?, equality?) -> hydration-safe via useSyncExternalStore
// - shallowEqual helper for object/array selector outputs
//
// Example:
//   // store.ts
//   export const appStore = createStore({ user: null, theme: "light" as "light"|"dark" }, { persistKey: "app@1", version: 1 });
//   // component.tsx
//   const theme = useStore(appStore, s => s.theme);
//   const setDark = () => appStore.patch({ theme: "dark" });
//
// Notes:
// - All APIs are framework-agnostic except useStore(), which is a React hook.
// - Safe on server: all persistence is gated by `typeof window !== "undefined"` checks.

import * as React from "react";

/** Listener type for subscriptions */
type Listener<T> = (state: T) => void;

/** Store interface returned by createStore */
export interface Store<T extends object> {
  /** Read current immutable snapshot */
  get(): T;
  /** Replace entire state */
  set(next: T): void;
  /** Shallow patch (object) or functional patch (prev => partial) */
  patch(next: Partial<T> | ((prev: T) => Partial<T>)): void;
  /** Subscribe to changes; returns unsubscribe */
  subscribe(fn: Listener<T>): () => void;
  /** Reset to initial state (also clears persistence for this key) */
  reset(): void;
  /** Internal: expose persist key for debugging (optional) */
  __persistKey?: string;
}

type PersistEnvelope<S> = { v: number; s: S };

type CreateOptions<T> = {
  /** localStorage key; if provided, store will load/save here (client only). */
  persistKey?: string;
  /** Version number for persisted payload; used for migrations. */
  version?: number;
  /** Migrate previous persisted shape to the current state shape. */
  migrate?: (oldState: unknown, oldVersion: number | undefined) => T;
  /** Optional custom serializer/deserializer (JSON by default). */
  serialize?: (s: PersistEnvelope<T>) => string;
  deserialize?: (txt: string) => PersistEnvelope<T> | null;
};

/** Safe localStorage getters (no-ops on server or when blocked) */
function safeGetItem(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetItem(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota or privacy errors */
  }
}
function safeRemoveItem(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const defaultSerialize = <T,>(env: PersistEnvelope<T>) => JSON.stringify(env);
const defaultDeserialize = <T,>(txt: string): PersistEnvelope<T> | null => {
  try {
    const obj = JSON.parse(txt);
    if (obj && typeof obj === "object" && "s" in obj) return obj as PersistEnvelope<T>;
    return null;
  } catch {
    return null;
  }
};

/** Create a simple, immutable store with subscriptions and optional persistence. */
export function createStore<T extends object>(initial: T, opts: CreateOptions<T> = {}): Store<T> {
  const listeners = new Set<Listener<T>>();
  let state = initial;
  const persistKey = opts.persistKey;
  const version = opts.version ?? 1;
  const serialize = opts.serialize ?? defaultSerialize<T>;
  const deserialize = opts.deserialize ?? defaultDeserialize<T>;

  // Attempt to load persisted state (client-only)
  if (persistKey) {
    const raw = safeGetItem(persistKey);
    if (raw) {
      const env = deserialize(raw);
      if (env) {
        const oldV = typeof (env as any).v === "number" ? (env as any).v : undefined;
        if (oldV === version) {
          // Same version; trust persisted snapshot if shape fits
          if (env.s && typeof env.s === "object") {
            state = { ...state, ...(env.s as T) };
          }
        } else if (opts.migrate) {
          // Run migration
          try {
            state = opts.migrate(env.s, oldV) as T;
          } catch {
            // If migration fails, fall back to initial and overwrite persistence
            state = initial;
          }
        }
      }
    }
  }

  function emit(next: T) {
    state = next;
    // Persist
    if (persistKey) {
      const payload: PersistEnvelope<T> = { v: version, s: state };
      safeSetItem(persistKey, serialize(payload));
    }
    // Notify
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
        /* listener errors are isolated */
      }
    });
  }

  const store: Store<T> = {
    get() {
      return state;
    },
    set(next) {
      // Replace reference (immutable write)
      if (Object.is(next, state)) return;
      emit(next);
    },
    patch(next) {
      const partial = typeof next === "function" ? (next as (p: T) => Partial<T>)(state) : next;
      const merged = { ...state, ...partial };
      if (Object.is(merged, state)) return;
      emit(merged);
    },
    subscribe(fn) {
      listeners.add(fn);
      // Send current snapshot to the new subscriber
      fn(state);
      return () => {
        listeners.delete(fn);
      };
    },
    reset() {
      emit(initial);
      if (persistKey) safeRemoveItem(persistKey);
    },
    __persistKey: persistKey,
  };

  return store;
}

/** Shallow equality for arrays/objects; useful for selector outputs. */
export function shallowEqual(a: any, b: any) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;

  // Arrays
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  // Plain objects
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false;
  }
  return true;
}

/**
 * Hydration-safe hook to read from a store with an optional selector.
 * Uses React.useSyncExternalStore to avoid server/client mismatch.
 *
 * @param store     The store created by createStore()
 * @param selector  Function that picks a slice of state (default: identity)
 * @param equality  Comparison function to prevent unnecessary re-renders (default: Object.is)
 */
export function useStore<T extends object, U = T>(
  store: Store<T>,
  selector: (s: T) => U = (s) => s as unknown as U,
  equality: (a: U, b: U) => boolean = Object.is
): U {
  // Stable identity for selector/equality so the subscription isn't recreated on every render
  const selectorRef = React.useRef(selector);
  const equalityRef = React.useRef(equality);
  selectorRef.current = selector;
  equalityRef.current = equality;

  // Subscribe via useSyncExternalStore
  const subscribe = React.useCallback(
    (onStoreChange: () => void) =>
      store.subscribe(() => {
        onStoreChange();
      }),
    [store]
  );

  const getSnapshot = React.useCallback(() => store.get(), [store]);
  const getServerSnapshot = getSnapshot; // on server, just same snapshot

  const currentState = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Apply selector + equality to derive the slice
  const selected = selectorRef.current(currentState);
  const prevRef = React.useRef<U>(selected);

  if (!equalityRef.current(prevRef.current, selected)) {
    prevRef.current = selected;
  }
  return prevRef.current;
}

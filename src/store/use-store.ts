import { useSyncExternalStore } from "react";
import { LocalStore, STORAGE_PREFIX } from "./local-store";

let instance: LocalStore | null = null;

/** The page's single store. Other tabs' changes are picked up through the `storage` event. */
export function getStore(): LocalStore {
  if (!instance) {
    instance = new LocalStore();
    if (typeof window !== "undefined")
      window.addEventListener("storage", e => { if (e.key?.startsWith(STORAGE_PREFIX)) instance!.reload(); });
  }
  return instance;
}

/** Returns the store and re-renders the component whenever its data changes. */
export function useStore(): LocalStore {
  const store = getStore();
  useSyncExternalStore(store.subscribe, () => store.version, () => 0);
  return store;
}

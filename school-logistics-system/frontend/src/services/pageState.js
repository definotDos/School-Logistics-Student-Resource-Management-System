import { PAGE_STATE_PREFIX } from "./session.js";

export function pageStateKey(user, pathname, name) {
  return PAGE_STATE_PREFIX + JSON.stringify([user?.id || user?._id || "guest", user?.activeCampus || user?.campus || "", pathname, name]);
}

export function readPageState(key, initialValue) {
  try {
    const saved = sessionStorage.getItem(key);
    if (saved !== null) return JSON.parse(saved);
  } catch {
    // Invalid or unavailable storage should not prevent rendering.
  }
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

export function writePageState(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the UI usable if storage is full or disabled.
  }
}

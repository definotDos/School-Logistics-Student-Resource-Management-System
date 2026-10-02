const STORAGE_KEY = "srmsAppearance";
export const defaults = Object.freeze({ theme: "light", accent: "teal", textSize: "standard", density: "comfortable", reduceMotion: false });
export const colorModes = [
  { id: "light", label: "Light", description: "Clean and bright" },
  { id: "dark", label: "Dark", description: "Soft navy tones" },
  { id: "system", label: "System", description: "Match your device" },
  { id: "warm", label: "Warm", description: "Gentle cream tones" },
  { id: "ocean", label: "Ocean", description: "Cool blue surfaces" },
  { id: "midnight", label: "Midnight", description: "Deep charcoal tones" },
];
export const accentColors = ["teal", "blue", "violet", "rose", "emerald", "amber", "indigo", "slate"];
export function isDarkColorMode(theme, systemDark = false) {
  return ["dark", "midnight"].includes(theme) || (theme === "system" && systemDark);
}
const choices = { theme: colorModes.map(mode => mode.id), accent: accentColors, textSize: ["standard", "large"], density: ["comfortable", "compact"] };
export function normalizeAppearance(value) {
  const result = { ...defaults };
  for (const [key, allowed] of Object.entries(choices)) if (allowed.includes(value?.[key])) result[key] = value[key];
  if (typeof value?.reduceMotion === "boolean") result.reduceMotion = value.reduceMotion;
  return result;
}
function readPreferences() {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return { ...defaults }; }
}
let preferences = readPreferences();
let persisted = true;
const listeners = new Set();
export const getAppearance = () => preferences;
export const isAppearanceSaved = () => persisted;
export function subscribeAppearance(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function applyPreferences() {
  const root = document.documentElement;
  for (const key of ["theme", "accent", "textSize", "density"]) root.dataset[key] = preferences[key];
  root.dataset.reduceMotion = String(preferences.reduceMotion);
}
export function updateAppearance(patch) {
  preferences = normalizeAppearance({ ...preferences, ...patch });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); persisted = true; } catch { persisted = false; }
  applyPreferences();
  listeners.forEach(listener => listener());
}
export function initializeAppearance() {
  applyPreferences();
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    preferences = readPreferences();
    persisted = true;
    applyPreferences();
    listeners.forEach(listener => listener());
  });
}

import { useSyncExternalStore } from "react";
import { isDarkColorMode, getAppearance, subscribeAppearance, updateAppearance } from "../utils/appearance";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const subscribeSystemTheme = listener => {
  systemTheme.addEventListener("change", listener);
  return () => systemTheme.removeEventListener("change", listener);
};
export function useAppearance() {
  return useSyncExternalStore(subscribeAppearance, getAppearance);
}
export default function useStudentTheme() {
  const preferences = useAppearance();
  const systemDark = useSyncExternalStore(subscribeSystemTheme, () => systemTheme.matches);
  const isDark = isDarkColorMode(preferences.theme, systemDark);
  const setIsDark = next => updateAppearance({ theme: (typeof next === "function" ? next(isDark) : next) ? "dark" : "light" });
  return [isDark, setIsDark];
}

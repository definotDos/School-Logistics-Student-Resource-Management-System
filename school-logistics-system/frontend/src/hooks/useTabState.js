import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { readPageState, writePageState, pageStateKey } from "../services/pageState";

// Persist UI choices separately for each account, campus, and page in this tab.
export function useTabState(name, initialValue) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const key = pageStateKey(user, pathname, name);
  const [entry, setEntry] = useState(() => ({ key, value: readPageState(key, initialValue) }));
  let value = entry.value;
  if (entry.key !== key) {
    value = readPageState(key, initialValue);
    setEntry({ key, value });
  }

  useEffect(() => {
    writePageState(key, value);
  }, [key, value]);

  const setValue = useCallback((next) => setEntry((current) => ({
    key,
    value: typeof next === "function" ? next(current.value) : next,
  })), [key]);
  return [value, setValue];
}

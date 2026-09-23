// Credentials belong to this tab, including when Remember me is selected.
// Never adopt legacy localStorage credentials from another tab.
export const sessionStorageForAuth = () => sessionStorage;
export const getToken = () => sessionStorageForAuth().getItem("srmsToken");
export const PAGE_STATE_PREFIX = "srmsPageState:";
export function clearSession() {
  const storage = sessionStorageForAuth();
  storage.removeItem("srmsToken");
  storage.removeItem("srmsUser");
  storage.removeItem("srmsVerificationEmail");
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(PAGE_STATE_PREFIX)) storage.removeItem(key);
  }
}
export function saveSession(result) {
  clearSession();
  const storage = sessionStorageForAuth();
  storage.setItem("srmsToken", result.token);
  storage.setItem("srmsUser", JSON.stringify(result.user));
}

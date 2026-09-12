export const sessionStorageForAuth = () => localStorage.getItem("srmsToken") ? localStorage : sessionStorage;
export const getToken = () => sessionStorageForAuth().getItem("srmsToken");
export function clearSession() {
 for (const storage of [localStorage, sessionStorage]) {
  storage.removeItem("srmsToken"); storage.removeItem("srmsUser");
 }
}
export function saveSession(result, rememberMe) {
 clearSession();
 const storage = rememberMe ? localStorage : sessionStorage;
 storage.setItem("srmsToken", result.token);
 storage.setItem("srmsUser", JSON.stringify(result.user));
}

import { createContext, useEffect, useState } from "react";
import { authAPI, userAPI } from "../services/api";

import { sessionStorageForAuth, getToken, clearSession, saveSession } from "../services/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    userAPI.getMe().then(result => {
      if (cancelled || getToken() !== token) return;
      setUser(result.user);
      sessionStorageForAuth().setItem("srmsUser", JSON.stringify(result.user));
    }).catch(error => {
      if (cancelled || getToken() !== token) return;
      if ([401, 403].includes(error.status)) { setUser(null); clearSession(); }
    }).finally(() => { if (!cancelled) setIsRestoring(false); });
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const result = await authAPI.login({ email, password, rememberMe });
    if (result.requiresMfa) return result;
    saveSession(result);
    setUser(result.user);
    return result.user;
  };

  const verifyMfa = async details => {
    const result = await authAPI.verifyMfa(details);
    saveSession(result);
    setUser(result.user);
    return result.user;
  };

  const signup = async (details) => {
    const result = await authAPI.signup(details);
    return result;
  };

  const verifyEmail = async (email, code) => {
    const result = await authAPI.verifyEmail({ email, code });
    sessionStorage.removeItem("srmsVerificationEmail");
    return result;
  };

  const resendVerificationCode = async (email) => authAPI.resendVerificationCode(email);

  const logout = async () => {
    try { await authAPI.logout(); }
    catch (error) { if (![401, 403].includes(error.status)) { window.alert('Unable to revoke your session. Check your connection and try signing out again.'); return false; } }
    setUser(null);
    clearSession();
    return true;
  };

  const updateUser = async (updates) => {
    const token = getToken();
    const result = await userAPI.updateMe(updates);
    if (getToken() !== token) return result.user;
    setUser(result.user);
    sessionStorageForAuth().setItem("srmsUser", JSON.stringify(result.user));
    return result.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isRestoring,
        login,
        verifyMfa,
        signup,
        verifyEmail,
        resendVerificationCode,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

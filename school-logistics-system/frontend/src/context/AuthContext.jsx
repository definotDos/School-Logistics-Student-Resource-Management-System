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

  const logout = () => {
    setUser(null);
    clearSession();
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

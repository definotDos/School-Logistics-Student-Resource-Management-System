import { createContext, useEffect, useState } from "react";
import { authAPI, userAPI } from "../services/api";

import { sessionStorageForAuth, getToken, clearSession, saveSession } from "../services/session";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(sessionStorageForAuth().getItem("srmsUser") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    if (!getToken()) return;
    userAPI.getMe().then(result => {
      setUser(result.user);
      sessionStorageForAuth().setItem("srmsUser", JSON.stringify(result.user));
    }).catch(error => {
      if ([401, 403].includes(error.status)) { setUser(null); clearSession(); }
    });
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const result = await authAPI.login({ email, password, rememberMe });
    setUser(result.user);
    saveSession(result, rememberMe);
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
    const result = await userAPI.updateMe(updates);
    setUser(result.user);
    sessionStorageForAuth().setItem("srmsUser", JSON.stringify(result.user));
    return result.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
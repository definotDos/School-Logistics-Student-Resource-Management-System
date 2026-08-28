import { createContext, useState } from "react";
import { authAPI, userAPI } from "../services/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("srmsUser") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = async (email, password) => {
    const result = await authAPI.login({ email, password });
    setUser(result.user);
    localStorage.setItem("srmsToken", result.token);
    localStorage.setItem("srmsUser", JSON.stringify(result.user));
    return result.user;
  };

  const signup = async (details) => {
    const result = await authAPI.signup(details);
    setUser(result.user);
    localStorage.setItem("srmsToken", result.token);
    localStorage.setItem("srmsUser", JSON.stringify(result.user));
    return result.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("srmsToken");
    localStorage.removeItem("srmsUser");
  };

  const updateUser = async (updates) => {
    const result = await userAPI.updateMe(updates);
    setUser(result.user);
    localStorage.setItem("srmsUser", JSON.stringify(result.user));
    return result.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
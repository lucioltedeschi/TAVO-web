import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from '../api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/auth/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(token);
    setUser(user);
    return user;
  };

  const register = async datos => {
    const { token, user } = await api('/auth/register', { method: 'POST', body: datos });
    setToken(token);
    setUser(user);
    return user;
  };

  const logout = () => { clearToken(); setUser(null); };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

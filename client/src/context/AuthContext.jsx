import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function formatUser(authUser, profile = null) {
  const meta = authUser.user_metadata || {};
  return {
    id:            authUser.id,
    email:         authUser.email,
    nombre:        profile?.nombre        ?? meta.nombre        ?? '',
    telefono:      profile?.telefono      ?? meta.telefono      ?? '',
    direccion:     profile?.direccion     ?? meta.direccion     ?? '',
    ciudad:        profile?.ciudad        ?? meta.ciudad        ?? '',
    provincia:     profile?.provincia     ?? meta.provincia     ?? '',
    codigo_postal: profile?.codigo_postal ?? meta.codigo_postal ?? '',
    rol:           profile?.rol           ?? 'user',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser(authUser) {
    if (!authUser) { setUser(null); return; }
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', authUser.id).single();
    setUser(formatUser(authUser, profile));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', data.user.id).single();
    const u = formatUser(data.user, profile);
    setUser(u);
    return u;
  };

  const register = async (datos) => {
    const { nombre, email, password, telefono, direccion, ciudad, provincia, codigo_postal } = datos;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, telefono, direccion, ciudad, provincia, codigo_postal } },
    });
    if (error) throw new Error(error.message);
    // Actualizar perfil con todos los datos
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, nombre, telefono: telefono || null,
        direccion: direccion || null, ciudad: ciudad || null,
        provincia: provincia || null, codigo_postal: codigo_postal || null,
      });
    }
    const u = formatUser(data.user, { nombre, telefono, direccion, ciudad, provincia, codigo_postal, rol: 'user' });
    setUser(u);
    return u;
  };

  const updateProfile = async (datos) => {
    if (!user) throw new Error('No autenticado');
    const { nombre, telefono, direccion, ciudad, provincia, codigo_postal } = datos;
    await supabase.from('profiles').upsert({
      id: user.id, nombre, telefono: telefono || null,
      direccion: direccion || null, ciudad: ciudad || null,
      provincia: provincia || null, codigo_postal: codigo_postal || null,
    });
    const updated = { ...user, nombre, telefono, direccion, ciudad, provincia, codigo_postal };
    setUser(updated);
    return updated;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

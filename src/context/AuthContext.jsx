import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u);
      if (u) loadProfile(u.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadProfile(u.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = async (id) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
    setProfile(data);
  };

  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

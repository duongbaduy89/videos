import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function useAuth() {
  const [user, setUser] = useState(null);         // raw supabase user
  const [profile, setProfile] = useState(null);   // profiles row
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getUserAndProfile = async () => {
      const { data: { user: currentUser } = {} } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser || null);

      if (currentUser) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        if (mounted) setProfile(p || null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    getUserAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", u.id).single();
        setProfile(p || null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return { user, profile, loading };
}

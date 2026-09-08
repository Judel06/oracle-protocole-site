import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null); // ligne admin_users, ou undefined si non-admin
  const [loading, setLoading] = useState(true);

  const loadAdminProfile = useCallback(async (currentSession) => {
    if (!currentSession) {
      setAdminProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, role, active')
      .eq('id', currentSession.user.id)
      .maybeSingle();

    if (error || !data || !data.active) {
      // Compte authentifie mais pas (ou plus) admin : on le deconnecte
      // pour ne pas laisser une session "fantome" active.
      await supabase.auth.signOut();
      setAdminProfile(undefined);
      return;
    }
    setAdminProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      await loadAdminProfile(s);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setLoading(true);
      await loadAdminProfile(s);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadAdminProfile]);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const value = {
    session,
    user: session?.user ?? null,
    adminProfile,
    isAdmin: Boolean(adminProfile),
    loading,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise a l\'interieur de <AuthProvider>');
  return ctx;
}

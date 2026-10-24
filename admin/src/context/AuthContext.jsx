import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DG, DG_ONLY_MODULES, legacyRoles } from '../config/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null); // ligne admin_users, ou undefined si non-admin
  const [roleCatalog, setRoleCatalog] = useState([]); // lignes de public.roles
  const [delegations, setDelegations] = useState([]); // delegations actives
  const [mfaStep, setMfaStep] = useState(null); // null | 'enroll' | 'challenge' : etape 2FA a franchir
  const [loading, setLoading] = useState(true);

  const loadGovernance = useCallback(async () => {
    const [{ data: roles }, { data: dels }] = await Promise.all([
      supabase.from('roles').select('*').order('created_at'),
      supabase.from('delegations').select('*').is('revoked_at', null).gt('ends_at', new Date().toISOString()),
    ]);
    setRoleCatalog(roles || []);
    setDelegations(dels || []);
  }, []);

  const loadAdminProfile = useCallback(async (currentSession) => {
    if (!currentSession) {
      setAdminProfile(null);
      setMfaStep(null);
      return;
    }
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', currentSession.user.id)
      .maybeSingle();

    if (error || !data || !data.active) {
      // Compte authentifie mais pas (ou plus) admin : on le deconnecte
      // pour ne pas laisser une session "fantome" active.
      await supabase.auth.signOut();
      setAdminProfile(undefined);
      return;
    }

    // 2FA obligatoire pour le Directeur General (role explicite, pas le repli historique).
    if ((data.roles || []).includes(DG)) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== 'aal2') setMfaStep(aal?.nextLevel === 'aal2' ? 'challenge' : 'enroll');
      else setMfaStep(null);
    } else {
      setMfaStep(null);
    }

    setAdminProfile(data);
    await loadGovernance();
  }, [loadGovernance]);

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

  // Roles propres au compte, puis roles additionnels obtenus par delegation du DG.
  const ownRoleKeys = useMemo(() => {
    if (!adminProfile) return [];
    return adminProfile.roles?.length ? adminProfile.roles : legacyRoles(adminProfile);
  }, [adminProfile]);

  const delegatedFrom = useMemo(
    () => delegations.filter((d) => ownRoleKeys.includes(d.to_role)),
    [delegations, ownRoleKeys]
  );
  const roleKeys = useMemo(
    () => (delegatedFrom.length ? [...new Set([...ownRoleKeys, DG])] : ownRoleKeys),
    [ownRoleKeys, delegatedFrom]
  );

  const isDG = roleKeys.includes(DG);
  // Le compte DG "reel" (pas une delegation) : seul a pouvoir deleguer.
  const isRealDG = ownRoleKeys.includes(DG);

  // Les permissions de tous les roles du compte s'additionnent.
  const can = useCallback(
    (module, action = 'voir') => {
      if (isDG) return true;
      if (DG_ONLY_MODULES.includes(module)) return false;
      return roleKeys.some((k) => roleCatalog.find((r) => r.key === k)?.permissions?.[module]?.includes(action));
    },
    [isDG, roleKeys, roleCatalog]
  );

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
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
    roleCatalog,
    roleKeys,
    isDG,
    isRealDG,
    delegatedFrom,
    mfaStep,
    can,
    reloadGovernance: loadGovernance,
    reloadProfile: () => loadAdminProfile(session),
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

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// Double authentification (TOTP) obligatoire pour le Directeur General :
// enrolement au premier passage (QR code), puis code a 6 chiffres a chaque connexion.
export default function MfaGate() {
  const { mfaStep, reloadProfile, signOut } = useAuth();
  const [factor, setFactor] = useState(null); // { id, qr, secret }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (mfaStep === 'enroll') {
        // Un enrolement abandonne laisse un facteur non verifie : on le retire avant d'en creer un.
        const { data: list } = await supabase.auth.mfa.listFactors();
        for (const f of list?.all || []) {
          if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ORACLE Admin' });
        if (cancelled) return;
        if (err) setError(err.message);
        else setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      } else {
        const { data: list } = await supabase.auth.mfa.listFactors();
        const verified = list?.totp?.[0];
        if (!cancelled && verified) setFactor({ id: verified.id });
        else if (!cancelled) setError('Aucun facteur de double authentification trouvé.');
      }
    }
    init();
    return () => { cancelled = true; };
  }, [mfaStep]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: code.trim() });
      if (vErr) throw vErr;
      await reloadProfile();
    } catch (err) {
      setError(err.message?.toLowerCase().includes('invalid') ? 'Code incorrect ou expiré.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>Double authentification</h2>
        <p>
          {mfaStep === 'enroll'
            ? 'Le compte Directeur Général exige une double authentification. Scannez ce QR code avec une application d’authentification (Google Authenticator, Authy…), puis saisissez le code à 6 chiffres.'
            : 'Saisissez le code à 6 chiffres affiché par votre application d’authentification.'}
        </p>
        {error && <div className="auth-error">{error}</div>}
        {mfaStep === 'enroll' && factor?.qr && (
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img src={factor.qr} alt="QR code de double authentification" width="176" height="176" />
            <p className="field-hint">Ou saisissez la clé : <code>{factor.secret}</code></p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="mfa-code">Code à 6 chiffres</label>
            <input id="mfa-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy || !factor}>
            {busy ? 'Vérification…' : 'Valider'}
          </button>
        </form>
        <div className="auth-links"><a href="#deconnexion" onClick={(e) => { e.preventDefault(); signOut(); }}>Se déconnecter</a></div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEBOUNCE_MS = 1200;

/**
 * Sauvegarde automatique debattue (debounce) du brouillon via
 * rpc_save_candidat_draft. Renvoie le statut courant pour affichage
 * ("saved" / "saving" / "idle") et une fonction de sauvegarde immediate
 * (utilisee au changement d'etape / avant soumission finale).
 */
export function useAutosave(token, formData) {
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);
  const latestData = useRef(formData);
  latestData.current = formData;

  const saveNow = useCallback(async () => {
    if (!token) return;
    setStatus('saving');
    const { error } = await supabase.rpc('rpc_save_candidat_draft', { p_token: token, p_data: latestData.current });
    setStatus(error ? 'error' : 'saved');
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [formData, token, saveNow]);

  return { status, saveNow };
}

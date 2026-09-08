import { supabase } from './supabaseClient';

const BUCKET = 'candidats-documents';

/**
 * Televerse un fichier candidat vers Supabase Storage puis enregistre sa
 * reference dans candidat_documents (insert public, lecture reservee aux
 * admins — voir schema_recrutement.sql).
 */
export async function uploadCandidatDocument(candidatId, file, type) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${candidatId}/${type}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('candidat_documents').insert({
    candidat_id: candidatId, type, storage_path: path, nom_fichier: file.name,
  });
  if (insertError) throw insertError;

  return { path, nom: file.name };
}

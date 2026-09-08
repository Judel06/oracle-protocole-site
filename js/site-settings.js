/* =========================================================
   ORACLE — Coordonnees dynamiques
   Lit la table Supabase "parametres_site" et met a jour les elements
   marques par data-site-* / data-social sur la page. Si Supabase n'est
   pas configure ou la requete echoue, le contenu HTML statique (deja
   present) reste affiche tel quel — aucune degradation visible.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from('parametres_site')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return;

  const setText = (selector, value) => {
    if (!value) return;
    document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
  };

  setText('[data-site-address]', data.adresse);
  setText('[data-site-phone]', data.telephone);
  setText('[data-site-email]', data.email);

  const socialUrls = {
    facebook: data.facebook_url,
    x: data.x_url,
    linkedin: data.linkedin_url,
    instagram: data.instagram_url,
  };
  document.querySelectorAll('[data-social]').forEach((el) => {
    const url = socialUrls[el.getAttribute('data-social')];
    if (url) {
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    } else {
      // Pas de lien renseigne pour ce reseau : on masque l'icone plutot
      // que de laisser un lien "#" qui ne mene nulle part.
      el.style.display = 'none';
    }
  });
});

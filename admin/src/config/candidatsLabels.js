export const STATUT_CANDIDAT_LABELS = {
  candidat: 'Candidat', en_evaluation: 'En évaluation', forme: 'Formé',
  actif: 'Actif', inactif: 'Inactif', suspendu: 'Suspendu',
};
export const STATUT_CANDIDAT_COLORS = {
  candidat: 'gold', en_evaluation: 'navy', forme: 'navy', actif: 'green', inactif: 'gray', suspendu: 'red',
};

export const NIVEAU_FORMATION_LABELS = {
  'Secondaire': 'Secondaire', 'Technique / Professionnel': 'Technique / Professionnel',
  'Universitaire (Licence)': 'Licence', 'Universitaire (Master et +)': 'Master et +',
};

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Deduit le jour (libelle FR, ex. "Lundi") et la periode ("matin"/"apres_midi"/"soir"/"nuit") a partir d'une date+heure. */
export function deriveJourPeriode(dateStr, heureStr) {
  if (!dateStr) return { jour: null, periode: null };
  const d = new Date(`${dateStr}T${heureStr || '12:00'}:00`);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' });
  const jourCap = jour.charAt(0).toUpperCase() + jour.slice(1);
  const hour = heureStr ? parseInt(heureStr.split(':')[0], 10) : 12;
  let periode = 'matin';
  if (hour >= 22 || hour < 6) periode = 'nuit';
  else if (hour >= 18) periode = 'soir';
  else if (hour >= 12) periode = 'apres_midi';
  return { jour: jourCap, periode };
}

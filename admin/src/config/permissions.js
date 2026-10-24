// Matrice modules x actions. Les permissions de chaque role vivent dans la table
// public.roles (editables par le Directeur General) ; ce fichier ne definit que
// le vocabulaire et le repli utilise si un compte n'a pas encore de role attribue.

export const DG = 'directeur_general';

export const MODULES = [
  { key: 'devis', label: 'Devis' },
  { key: 'formations', label: 'Formations' },
  { key: 'messages', label: 'Messages' },
  { key: 'membres', label: 'Membres' },
  { key: 'candidatures', label: 'Candidatures' },
  { key: 'adhesions', label: 'Adhésions' },
  { key: 'paiements', label: 'Paiements' },
  { key: 'galerie', label: 'Galerie' },
  { key: 'utilisateurs', label: 'Utilisateurs' },
  { key: 'parametres', label: 'Paramètres' },
  { key: 'journal', label: "Journal d'activité" },
];

export const ACTIONS = [
  { key: 'voir', label: 'Voir' },
  { key: 'creer', label: 'Créer' },
  { key: 'modifier', label: 'Modifier' },
  { key: 'valider', label: 'Valider' },
  { key: 'exporter', label: 'Exporter' },
  { key: 'supprimer', label: 'Supprimer' },
];

// Modules et actions reservés au DG : jamais cochables pour un autre role.
export const DG_ONLY_MODULES = ['utilisateurs', 'parametres'];

export const ROLE_COLORS = ['navy', 'gold', 'teal', 'purple', 'green', 'red', 'orange', 'blue'];

// Compte sans role attribue (avant la migration) : l'ancien "admin" garde l'acces
// complet pour ne pas se retrouver bloque, l'ancien "editor" devient Communication.
export function legacyRoles(profile) {
  return [profile?.role === 'admin' ? DG : 'communication'];
}

// Configuration centrale des 3 types de soumissions geres par l'admin.
// Chaque page liste/detail generique (EntityList/EntityDetail) lit sa
// configuration ici : une seule source de verite par entite.

export const STATUT_LABELS = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  traite: 'Traité',
  repondu: 'Répondu',
};

export const STATUT_COLORS = {
  nouveau: 'gold',
  en_cours: 'navy',
  traite: 'green',
  repondu: 'green',
};

const TYPE_EVENEMENT_LABELS = {
  ceremonie_officielle: 'Cérémonie officielle',
  visite_diplomatique: 'Visite diplomatique',
  evenement_institutionnel: 'Événement institutionnel',
  autre: 'Autre',
};

const FORMATION_LABELS = {
  protocole_table: 'Protocole de table',
  codes_vestimentaires: 'Codes vestimentaires',
  communication_non_verbale: 'Communication non-verbale',
  protocole_general: 'Protocole général',
};

const FORMAT_LABELS = { presentiel: 'Présentiel', distance: 'À distance' };

const SUJET_LABELS = {
  renseignement_general: 'Renseignement général',
  partenariat: 'Demande de partenariat',
  presse: 'Demande presse',
  autre: 'Autre',
};

const label = (map) => (v) => map[v] || v || '—';

export const ENTITIES = {
  devis: {
    table: 'demandes_devis',
    route: 'devis',
    label: 'Demande de devis',
    labelPlural: 'Demandes de devis',
    statutOptions: ['nouveau', 'en_cours', 'traite'],
    searchFields: ['nom_complet', 'organisation', 'email'],
    listColumns: [
      { key: 'nom_complet', label: 'Nom', sortable: true },
      { key: 'organisation', label: 'Organisation', sortable: true },
      { key: 'type_evenement', label: "Type d'événement", format: label(TYPE_EVENEMENT_LABELS) },
      { key: 'date_evenement', label: 'Date souhaitée', isDate: true },
      { key: 'statut', label: 'Statut', badge: true, sortable: true },
      { key: 'created_at', label: 'Soumis le', isDateTime: true, sortable: true },
    ],
    filterFields: [
      { key: 'statut', label: 'Statut', options: [{ v: 'nouveau', l: 'Nouveau' }, { v: 'en_cours', l: 'En cours' }, { v: 'traite', l: 'Traité' }] },
      { key: 'type_evenement', label: "Type d'événement", options: Object.entries(TYPE_EVENEMENT_LABELS).map(([v, l]) => ({ v, l })) },
    ],
    detailGroups: [
      {
        title: 'Contact', fields: [
          { key: 'nom_complet', label: 'Nom complet' },
          { key: 'organisation', label: 'Organisation' },
          { key: 'fonction', label: 'Fonction' },
          { key: 'email', label: 'Email' },
          { key: 'telephone', label: 'Téléphone' },
        ],
      },
      {
        title: 'Événement', fields: [
          { key: 'type_evenement', label: "Type d'événement", format: label(TYPE_EVENEMENT_LABELS) },
          { key: 'date_evenement', label: 'Date souhaitée', isDate: true },
          { key: 'nombre_participants', label: 'Participants estimés' },
          { key: 'services', label: 'Services souhaités', isList: true },
        ],
      },
      { title: 'Description du projet', fields: [{ key: 'description', label: '', isLongText: true }] },
    ],
    csvColumns: [
      { key: 'created_at', label: 'Soumis le', format: (v) => new Date(v).toLocaleString('fr-FR') },
      { key: 'nom_complet', label: 'Nom' }, { key: 'organisation', label: 'Organisation' },
      { key: 'fonction', label: 'Fonction' }, { key: 'email', label: 'Email' }, { key: 'telephone', label: 'Téléphone' },
      { key: 'type_evenement', label: "Type d'événement" }, { key: 'date_evenement', label: 'Date souhaitée' },
      { key: 'nombre_participants', label: 'Participants' }, { key: 'services', label: 'Services' },
      { key: 'description', label: 'Description' }, { key: 'statut', label: 'Statut' },
    ],
  },

  formations: {
    table: 'inscriptions_formation',
    route: 'formations',
    label: 'Inscription formation',
    labelPlural: 'Inscriptions aux formations',
    statutOptions: ['nouveau', 'en_cours', 'traite'],
    searchFields: ['nom_complet', 'organisation', 'email'],
    listColumns: [
      { key: 'nom_complet', label: 'Nom', sortable: true },
      { key: 'organisation', label: 'Organisation', sortable: true },
      { key: 'formation', label: 'Formation', format: label(FORMATION_LABELS) },
      { key: 'format_souhaite', label: 'Format', format: label(FORMAT_LABELS) },
      { key: 'nombre_participants', label: 'Participants' },
      { key: 'statut', label: 'Statut', badge: true, sortable: true },
      { key: 'created_at', label: 'Soumis le', isDateTime: true, sortable: true },
    ],
    filterFields: [
      { key: 'statut', label: 'Statut', options: [{ v: 'nouveau', l: 'Nouveau' }, { v: 'en_cours', l: 'En cours' }, { v: 'traite', l: 'Traité' }] },
      { key: 'formation', label: 'Formation', options: Object.entries(FORMATION_LABELS).map(([v, l]) => ({ v, l })) },
    ],
    detailGroups: [
      {
        title: 'Contact', fields: [
          { key: 'nom_complet', label: 'Nom complet' }, { key: 'organisation', label: 'Organisation' },
          { key: 'email', label: 'Email' }, { key: 'telephone', label: 'Téléphone' },
        ],
      },
      {
        title: 'Formation demandée', fields: [
          { key: 'formation', label: 'Formation', format: label(FORMATION_LABELS) },
          { key: 'format_souhaite', label: 'Format', format: label(FORMAT_LABELS) },
          { key: 'nombre_participants', label: 'Participants à inscrire' },
          { key: 'periode_souhaitee', label: 'Période souhaitée' },
        ],
      },
      { title: 'Message complémentaire', fields: [{ key: 'message', label: '', isLongText: true }] },
    ],
    csvColumns: [
      { key: 'created_at', label: 'Soumis le', format: (v) => new Date(v).toLocaleString('fr-FR') },
      { key: 'nom_complet', label: 'Nom' }, { key: 'organisation', label: 'Organisation' },
      { key: 'email', label: 'Email' }, { key: 'telephone', label: 'Téléphone' },
      { key: 'formation', label: 'Formation' }, { key: 'format_souhaite', label: 'Format' },
      { key: 'nombre_participants', label: 'Participants' }, { key: 'periode_souhaitee', label: 'Période' },
      { key: 'message', label: 'Message' }, { key: 'statut', label: 'Statut' },
    ],
  },

  messages: {
    table: 'messages_contact',
    route: 'messages',
    label: 'Message de contact',
    labelPlural: 'Messages de contact',
    statutOptions: ['nouveau', 'en_cours', 'traite', 'repondu'],
    searchFields: ['nom', 'email'],
    listColumns: [
      { key: 'nom', label: 'Nom', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'sujet', label: 'Sujet', format: label(SUJET_LABELS) },
      { key: 'statut', label: 'Statut', badge: true, sortable: true },
      { key: 'created_at', label: 'Soumis le', isDateTime: true, sortable: true },
    ],
    filterFields: [
      { key: 'statut', label: 'Statut', options: [{ v: 'nouveau', l: 'Nouveau' }, { v: 'en_cours', l: 'En cours' }, { v: 'traite', l: 'Traité' }, { v: 'repondu', l: 'Répondu' }] },
      { key: 'sujet', label: 'Sujet', options: Object.entries(SUJET_LABELS).map(([v, l]) => ({ v, l })) },
    ],
    detailGroups: [
      {
        title: 'Contact', fields: [
          { key: 'nom', label: 'Nom' }, { key: 'email', label: 'Email' }, { key: 'telephone', label: 'Téléphone' },
        ],
      },
      { title: 'Sujet', fields: [{ key: 'sujet', label: 'Sujet', format: label(SUJET_LABELS) }] },
      { title: 'Message', fields: [{ key: 'message', label: '', isLongText: true }] },
    ],
    csvColumns: [
      { key: 'created_at', label: 'Soumis le', format: (v) => new Date(v).toLocaleString('fr-FR') },
      { key: 'nom', label: 'Nom' }, { key: 'email', label: 'Email' }, { key: 'telephone', label: 'Téléphone' },
      { key: 'sujet', label: 'Sujet' }, { key: 'message', label: 'Message' }, { key: 'statut', label: 'Statut' },
    ],
  },
};

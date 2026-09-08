// Configuration declarative des 22 blocs du formulaire de recrutement ORACLE.
// Chaque step est rendu par <Wizard> via <FieldRenderer> — voir components/.

export const COMPETENCES_LIST = [
  'Accueil et prise en charge', 'Protocole officiel', 'Gestion de délégations VIP',
  'Discrétion et confidentialité', 'Leadership et coordination d\'équipe', 'Rédaction professionnelle',
  'Maîtrise des outils numériques', 'Communication non-verbale', 'Gestion du stress',
  'Résolution de problèmes', 'Sens de l\'organisation', 'Ponctualité et fiabilité',
  'Présentation et tenue professionnelle', 'Connaissance des usages diplomatiques',
  'Gestion de flux et de foule', 'Coordination logistique', 'Relations publiques',
  'Gestion des imprévus', 'Esprit d\'équipe', 'Sens du service et de l\'hospitalité',
];

export const COMPORTEMENT_LIST = ['Ponctualité', 'Discrétion', 'Esprit d\'équipe', 'Gestion de la pression', 'Confidentialité'];

export const OUTILS_LIST = [
  'Microsoft Office', 'Google Workspace', 'Canva', 'Zoom / Google Meet',
  'Outils de gestion événementielle', 'Intelligence artificielle (ChatGPT, etc.)', 'Réseaux sociaux professionnels',
];

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const PERIODES = [
  { key: 'matin', label: 'Matin' }, { key: 'apres_midi', label: 'Après-midi' },
  { key: 'soir', label: 'Soir' }, { key: 'nuit', label: 'Nuit' },
];

export const TAILLES_FIELDS = [
  { key: 'taille_generale', label: 'Taille générale (S/M/L/XL...)' },
  { key: 'chemise', label: 'Chemise' }, { key: 'pantalon', label: 'Pantalon' },
  { key: 'robe', label: 'Robe' }, { key: 'veste', label: 'Veste' }, { key: 'pointure', label: 'Pointure' },
];

export const STEPS = [
  {
    key: 'identite', title: 'Identité & contact', desc: 'Vos informations personnelles et coordonnées.',
    fields: [
      { key: 'civilite', label: 'Civilité', type: 'select', options: ['Madame', 'Monsieur', 'Autre / ne se prononce pas'] },
      { key: 'row1', type: 'row', fields: [
        { key: 'prenom', label: 'Prénom', type: 'text', required: true },
        { key: 'nom', label: 'Nom', type: 'text', required: true },
      ] },
      { key: 'row2', type: 'row', fields: [
        { key: 'date_naissance', label: 'Date de naissance', type: 'date' },
        { key: 'nationalite', label: 'Nationalité', type: 'text' },
      ] },
      { key: 'genre', label: 'Genre (facultatif)', type: 'text' },
      { key: 'row3', type: 'row', fields: [
        { key: 'telephone', label: 'Téléphone', type: 'tel', required: true },
        { key: 'whatsapp', label: 'WhatsApp (si différent)', type: 'tel' },
      ] },
      { key: 'email', label: 'Courriel', type: 'email', required: true },
      { key: 'adresse', label: 'Adresse', type: 'text' },
      { key: 'row4', type: 'row', fields: [
        { key: 'ville', label: 'Ville', type: 'text', required: true },
        { key: 'code_postal', label: 'Code postal', type: 'text' },
      ] },
      { key: 'pays', label: 'Pays', type: 'text', required: true },
      { key: 'row5', type: 'row', fields: [
        { key: 'contact_urgence_nom', label: 'Contact d\'urgence — nom', type: 'text' },
        { key: 'contact_urgence_lien', label: 'Lien avec vous', type: 'text' },
      ] },
      { key: 'contact_urgence_telephone', label: 'Contact d\'urgence — téléphone', type: 'tel' },
    ],
  },
  {
    key: 'profil_pro', title: 'Profil professionnel', desc: 'Votre parcours et vos qualifications actuelles.',
    fields: [
      { key: 'row1', type: 'row', fields: [
        { key: 'poste_actuel', label: 'Poste actuel', type: 'text' },
        { key: 'employeur_actuel', label: 'Employeur actuel', type: 'text' },
      ] },
      { key: 'domaine_activite', label: 'Domaine d\'activité', type: 'text' },
      { key: 'niveau_formation', label: 'Niveau de formation', type: 'select', options: ['Secondaire', 'Technique / Professionnel', 'Universitaire (Licence)', 'Universitaire (Master et +)', 'Autre'] },
      { key: 'diplomes', label: 'Diplômes', type: 'dynamic_list', placeholder: 'Ex. Licence en Relations Internationales' },
      { key: 'certifications', label: 'Certifications', type: 'dynamic_list', placeholder: 'Ex. Certification en protocole diplomatique' },
      { key: 'annees_experience', label: 'Années d\'expérience professionnelle', type: 'number' },
      { key: 'row2', type: 'row', fields: [
        { key: 'portfolio_url', label: 'Portfolio (lien)', type: 'text' },
        { key: 'linkedin_url', label: 'LinkedIn', type: 'text' },
      ] },
    ],
  },
  {
    key: 'experience_protocole', title: 'Expérience protocole & événementiel', desc: 'Avez-vous déjà travaillé dans le protocole ou l\'événementiel ?',
    fields: [
      { key: 'experience_protocole', label: 'Expérience en protocole ou événementiel', type: 'yesno', required: true },
      { key: 'types_evenements', label: 'Types d\'événements couverts', type: 'checkbox_group', conditionalOn: 'experience_protocole',
        options: ['Cérémonies officielles', 'Visites diplomatiques', 'Conférences', 'Mariages', 'Galas', 'Événements corporatifs', 'Lancements de produits', 'Autre'] },
      { key: 'volume_evenements', label: 'Volume approximatif (nombre d\'événements)', type: 'text', conditionalOn: 'experience_protocole' },
      { key: 'responsabilites', label: 'Responsabilités exercées', type: 'textarea', conditionalOn: 'experience_protocole' },
      { key: 'publics_serves', label: 'Publics servis', type: 'checkbox_group', conditionalOn: 'experience_protocole',
        options: ['VIP', 'Diplomates', 'Dirigeants d\'entreprise', 'Mariages', 'Conférences', 'Grand public'] },
      { key: 'roles_tenus', label: 'Rôles tenus', type: 'checkbox_group', conditionalOn: 'experience_protocole',
        options: ['Accueil', 'Placement', 'Backstage', 'Gestion de flux', 'Coordination logistique', 'Interprétariat'] },
    ],
  },
  {
    key: 'competences', title: 'Compétences ORACLE', desc: 'Évaluez-vous honnêtement sur chaque compétence (1 = débutant, 5 = expert).',
    fields: [
      { key: 'competences', label: 'Auto-évaluation', type: 'rating_grid', items: COMPETENCES_LIST },
      { key: 'capacite_rapport_post_evenement', label: 'Capacité à rédiger un rapport post-événement', type: 'rating_single' },
    ],
  },
  {
    key: 'langues', title: 'Langues', desc: 'Vos compétences linguistiques.',
    fields: [
      { key: 'langues', label: 'Langues parlées', type: 'language_grid' },
      { key: 'accueil_langue_etrangere', label: 'Capable d\'accueillir un public en langue étrangère', type: 'yesno' },
    ],
  },
  {
    key: 'disponibilite', title: 'Disponibilité', desc: 'Vos créneaux de disponibilité habituels.',
    fields: [
      { key: 'disponibilite_niveau', label: 'Niveau de disponibilité global', type: 'select', options: ['Temps plein', 'Temps partiel', 'Occasionnel / sur demande'] },
      { key: 'disponibilite_matrice', label: 'Disponibilité par jour et moment de la journée', type: 'availability_matrix' },
      { key: 'row1', type: 'row', fields: [
        { key: 'weekends', label: 'Disponible les fins de semaine', type: 'yesno' },
        { key: 'jours_feries', label: 'Disponible les jours fériés', type: 'yesno' },
      ] },
      { key: 'row2', type: 'row', fields: [
        { key: 'derniere_minute', label: 'Disponible pour missions de dernière minute', type: 'yesno' },
        { key: 'voyages', label: 'Disponible pour des déplacements', type: 'yesno' },
      ] },
      { key: 'row3', type: 'row', fields: [
        { key: 'missions_internationales', label: 'Disponible pour missions internationales', type: 'yesno' },
        { key: 'heures_semaine', label: 'Heures disponibles / semaine', type: 'number' },
      ] },
    ],
  },
  {
    key: 'mobilite', title: 'Mobilité', desc: 'Vos moyens de déplacement.',
    fields: [
      { key: 'vehicule', label: 'Possédez-vous un véhicule', type: 'yesno' },
      { key: 'vehicule_details', label: 'Détails (type de véhicule)', type: 'text', conditionalOn: 'vehicule' },
      { key: 'permis_conduire', label: 'Permis de conduire valide', type: 'yesno' },
      { key: 'autonomie_deplacement', label: 'Autonomie de déplacement', type: 'select', options: ['Totale (véhicule personnel)', 'Transport en commun', 'Dépend d\'un tiers', 'Limitée'] },
      { key: 'zone_geo_max', label: 'Zone géographique maximale de déplacement', type: 'text' },
      { key: 'transport_materiel', label: 'Disposé(e) à transporter du matériel', type: 'yesno' },
    ],
  },
  {
    key: 'sante', title: 'Santé & besoins particuliers', desc: 'Bloc facultatif. ORACLE applique une politique stricte de non-discrimination — ces informations servent uniquement à assurer votre confort et votre sécurité en mission.',
    fields: [
      { key: 'prefere_ne_pas_repondre_sante', label: 'Je préfère ne pas répondre à ce bloc', type: 'yesno_simple' },
      { key: 'allergies', label: 'Allergies', type: 'textarea', conditionalOnNot: 'prefere_ne_pas_repondre_sante' },
      { key: 'restrictions_alimentaires', label: 'Restrictions alimentaires', type: 'textarea', conditionalOnNot: 'prefere_ne_pas_repondre_sante' },
      { key: 'amenagements_necessaires', label: 'Aménagements nécessaires', type: 'textarea', conditionalOnNot: 'prefere_ne_pas_repondre_sante' },
    ],
  },
  {
    key: 'tenue', title: 'Tenue', desc: 'Vos tailles, pour la préparation d\'un éventuel uniforme.',
    fields: [
      { key: 'tailles', label: 'Tailles', type: 'size_grid', items: TAILLES_FIELDS },
      { key: 'preference_coupe', label: 'Préférence de coupe', type: 'text' },
    ],
  },
  {
    key: 'presentation', title: 'Présentation professionnelle', desc: 'Votre aisance en contexte formel.',
    fields: [
      { key: 'aisance_tenue_formelle', label: 'Aisance en tenue formelle / uniforme', type: 'rating_single' },
      { key: 'endurance', label: 'Endurance (station debout prolongée, longues journées)', type: 'rating_single' },
      { key: 'photo_portrait', label: 'Photo portrait', type: 'file', docType: 'photo_portrait' },
      { key: 'photo_pied', label: 'Photo en pied', type: 'file', docType: 'photo_pied' },
    ],
  },
  {
    key: 'image_medias', title: 'Image, consentement médias & réseaux sociaux', desc: 'Comment ORACLE peut utiliser votre image dans le cadre professionnel.',
    fields: [
      { key: 'niveau_autorisation_image', label: 'Niveau d\'autorisation d\'usage de mon image', type: 'select',
        options: [
          { value: 'aucun', label: 'Aucun usage' }, { value: 'interne', label: 'Usage interne uniquement' },
          { value: 'externe', label: 'Usage externe (clients, partenaires)' }, { value: 'site_web', label: 'Site web ORACLE' },
          { value: 'reseaux_sociaux', label: 'Réseaux sociaux ORACLE' }, { value: 'promotionnel', label: 'Supports promotionnels' },
          { value: 'tout', label: 'Tout usage professionnel' },
        ] },
      { key: 'consent_photos_videos', label: 'J\'autorise ORACLE à utiliser mes photos/vidéos prises en mission, dans le cadre défini ci-dessus', type: 'yesno_simple', required: true },
      { key: 'consent_communications_marketing', label: 'J\'accepte de recevoir des communications marketing d\'ORACLE (facultatif)', type: 'yesno_simple' },
      { key: 'liens_reseaux_sociaux', label: 'Réseaux sociaux professionnels (facultatif)', type: 'social_links' },
      { key: 'aisance_rp_camera', label: 'Aisance en relations publiques / face caméra', type: 'rating_single' },
      { key: 'note_prise_parole', type: 'note', text: 'Toute prise de parole publique au nom d\'ORACLE nécessite une autorisation séparée de la direction.' },
    ],
  },
  {
    key: 'redaction', title: 'Rédaction & rapports', desc: 'Votre aisance rédactionnelle.',
    fields: [
      { key: 'autoeval_redaction', label: 'Auto-évaluation en rédaction professionnelle', type: 'rating_single' },
      { key: 'mini_test_reponse', label: 'Mini-test (optionnel, ~100 mots) — Comment rédigeriez-vous un rapport post-événement ?', type: 'textarea' },
    ],
  },
  {
    key: 'outils', title: 'Outils numériques', desc: 'Votre niveau de maîtrise, outil par outil.',
    fields: [
      { key: 'outils_numeriques', label: 'Niveau par outil', type: 'tool_level_grid', items: OUTILS_LIST },
    ],
  },
  {
    key: 'missions_souhaitees', title: 'Types de missions souhaitées', desc: 'Sélectionnez toutes les catégories qui vous intéressent.',
    fields: [
      { key: 'types_missions_souhaitees', label: 'Catégories de missions', type: 'checkbox_group',
        options: ['Institutionnel', 'Corporatif', 'Social / Privé', 'Événementiel grand public'] },
    ],
  },
  {
    key: 'role_prefere', title: 'Rôle préféré', desc: 'Quel(s) rôle(s) préférez-vous tenir ?',
    fields: [
      { key: 'roles_preferes', label: 'Rôles préférés', type: 'checkbox_group',
        options: ['Agent protocolaire', 'Hôte / Hôtesse d\'accueil', 'Responsable VIP', 'Coordination backstage', 'Coordination logistique', 'Maître de cérémonie (MC)', 'Relations médias', 'Interprète / Traducteur'] },
    ],
  },
  {
    key: 'comportement', title: 'Comportement professionnel', desc: 'Auto-évaluation sur les qualités essentielles au protocole.',
    fields: [
      { key: 'comportement', label: 'Auto-évaluation', type: 'rating_grid', items: COMPORTEMENT_LIST },
      { key: 'qualite_cle_protocole', label: 'Selon vous, quelle est la qualité clé d\'un professionnel du protocole ?', type: 'textarea' },
    ],
  },
  {
    key: 'ethique', title: 'Confidentialité & éthique', desc: 'ORACLE opère dans des contextes exigeant discrétion, sécurité et neutralité absolues.',
    fields: [
      { key: 'confirme_comprehension_regles', label: 'Je confirme avoir compris les règles de confidentialité, de sécurité, de neutralité et d\'usage des réseaux sociaux propres à ORACLE', type: 'yesno_simple', required: true },
      { key: 'declaration_engagement', label: 'Je m\'engage à respecter ces règles dans l\'exercice de toute mission ORACLE', type: 'yesno_simple', required: true },
    ],
  },
  {
    key: 'references', title: 'Références professionnelles', desc: 'Facultatif — une ou plusieurs personnes pouvant témoigner de votre expérience.',
    fields: [
      { key: 'references', label: 'Références', type: 'references_list' },
    ],
  },
  {
    key: 'motivation', title: 'Motivation', desc: 'Parlez-nous de vous.',
    fields: [
      { key: 'motivation_pourquoi_oracle', label: 'Pourquoi souhaitez-vous rejoindre ORACLE ?', type: 'textarea' },
      { key: 'motivation_differenciation', label: 'Qu\'est-ce qui vous différencie des autres candidats ?', type: 'textarea' },
      { key: 'motivation_contribution', label: 'Quelle contribution pensez-vous pouvoir apporter à ORACLE ?', type: 'textarea' },
      { key: 'motivation_projection_3ans', label: 'Comment vous projetez-vous au sein d\'ORACLE dans 3 ans ?', type: 'textarea' },
    ],
  },
  {
    key: 'formation', title: 'Formation', desc: 'Votre disponibilité et vos intérêts en formation continue.',
    fields: [
      { key: 'formation_disponibilite', label: 'Disponibilité pour se former', type: 'checkbox_group_bool',
        options: [{ key: 'presentiel', label: 'En présentiel' }, { key: 'en_ligne', label: 'En ligne' }, { key: 'obligatoire', label: 'Formation obligatoire acceptée' }] },
      { key: 'formation_domaines_interet', label: 'Domaines à approfondir', type: 'checkbox_group',
        options: ['Protocole diplomatique avancé', 'Gestion de crise', 'Langues étrangères', 'Prise de parole en public', 'Outils numériques événementiels', 'Leadership et management d\'équipe'] },
    ],
  },
  {
    key: 'documents', title: 'Documents', desc: 'Téléversement de vos documents (CV obligatoire, le reste est facultatif à ce stade).',
    fields: [
      { key: 'cv', label: 'CV', type: 'file', docType: 'cv', required: true },
      { key: 'certificat', label: 'Certificat(s)', type: 'file', docType: 'certificat' },
      { key: 'diplome', label: 'Diplôme(s)', type: 'file', docType: 'diplome' },
      { key: 'portfolio_doc', label: 'Portfolio (PDF)', type: 'file', docType: 'portfolio' },
    ],
  },
  {
    key: 'consentement', title: 'Récapitulatif & consentement final', desc: 'Vérifiez vos informations et confirmez votre candidature.',
    fields: [
      { key: 'recap', type: 'recap' },
      { key: 'accepte_politique_confidentialite', label: 'J\'ai lu et j\'accepte la politique de confidentialité d\'ORACLE', type: 'consent', required: true },
      { key: 'accepte_traitement_donnees', label: 'J\'accepte le traitement de mes données personnelles dans le cadre de ce recrutement', type: 'consent', required: true },
      { key: 'accepte_conditions_mission', label: 'J\'accepte les conditions générales de mission d\'ORACLE', type: 'consent', required: true },
      { key: 'confirme_exactitude_infos', label: 'Je confirme l\'exactitude de toutes les informations fournies', type: 'consent', required: true },
      { key: 'signature_nom_complet', label: 'Nom complet (valant signature)', type: 'text', required: true },
      { key: 'signature_pad', label: 'Signature', type: 'signature_pad' },
    ],
  },
];

# Configuration Supabase — Formulaires ORACLE

## 1. Créer les tables

Dans le tableau de bord Supabase → **SQL Editor**, collez et exécutez le contenu de
`supabase/schema.sql`. Cela crée les 3 tables (`demandes_devis`,
`inscriptions_formation`, `messages_contact`), leurs contraintes, et active les
policies RLS (insertion publique autorisée, lecture/modification réservées à la
clé `service_role`).

## 2. Récupérer les clés du projet

Dans **Project Settings → API** :
- `Project URL` → à coller dans `js/supabase-client.js` (`SUPABASE_URL`)
- `anon public` key → à coller dans `js/supabase-client.js` (`SUPABASE_ANON_KEY`)

Ces deux valeurs sont conçues pour être publiques (visibles dans le code
front) : la sécurité réelle est assurée par les policies RLS côté base, pas
par le secret de la clé. **Ne jamais** utiliser la clé `service_role` dans le
code du site — elle contourne RLS et donnerait un accès total à quiconque
consulte le code source de la page.

## 3. Renseigner `js/supabase-client.js`

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...'; // cle "anon public"
```

Tant que ces valeurs ne sont pas renseignées (placeholders par défaut), les
formulaires affichent un message « service momentanément indisponible » sans
jamais faire planter la page.

## 4. Consulter les soumissions reçues

Sans système d'authentification sur le site, le plus simple pour l'équipe
ORACLE/ADIS-HAITI est de consulter les tables directement dans **Table
Editor** sur le tableau de bord Supabase (connecté avec le compte
propriétaire du projet). Le champ `statut` (`nouveau` / `en_cours` /
`traite`) permet de suivre le traitement de chaque demande manuellement.

Si vous voulez plus tard un tableau de bord interne avec connexion (comptes
de l'équipe), il faudra ajouter Supabase Auth + une policy `SELECT` réservée
au rôle `authenticated` — je peux la mettre en place quand vous en aurez
besoin.

## 5. Emails automatiques (non activés)

Non mis en place pour l'instant, à votre demande. Le déclencheur naturel plus
tard serait un **Database Webhook** Supabase (sur `INSERT`) appelant une
**Edge Function** qui envoie la notification interne et l'accusé de réception
via un service comme Resend ou SendGrid — dites-moi quand vous voulez
l'activer.

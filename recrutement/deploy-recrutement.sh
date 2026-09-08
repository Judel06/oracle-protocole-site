#!/bin/bash
# Deploie le grand formulaire de recrutement sous oracleprotocole.com/dossierscomplets
# (via proxy Netlify), meme principe que admin/deploy-admin.sh : build avec
# base:'/dossierscomplets/', puis servi depuis une sous-arborescence
# dossierscomplets/ du site oracle-recrutement, pour que les chemins
# d'assets correspondent en acces direct comme via le proxy du site principal.
set -e
cd "$(dirname "$0")"

npm run build

rm -rf deploy-root
mkdir -p deploy-root/dossierscomplets
cp -r dist/* deploy-root/dossierscomplets/

cat > deploy-root/_redirects <<'EOF'
/dossierscomplets/*  /dossierscomplets/index.html  200
/                     /dossierscomplets/            301
EOF

netlify deploy --prod --dir=deploy-root --site=976a2fb9-8cdb-4dcb-9579-c78470faf92a

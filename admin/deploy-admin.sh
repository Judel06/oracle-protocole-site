#!/bin/bash
# Deploie l'app admin sous oracleprotocole.com/admin (via proxy Netlify).
# L'app est buildee avec base:'/admin/' (vite.config.js) et servie depuis
# une sous-arborescence admin/ du site oracle-admin-panel, pour que ses
# chemins d'assets (/admin/assets/...) correspondent a la fois en acces
# direct (oracle-admin-panel.netlify.app/admin/) et via le proxy du site
# principal (oracleprotocole.com/admin/*).
set -e
cd "$(dirname "$0")"

npm run build

rm -rf deploy-root
mkdir -p deploy-root/admin
cp -r dist/* deploy-root/admin/

cat > deploy-root/_redirects <<'EOF'
/admin/*  /admin/index.html  200
/         /admin/            301
EOF

netlify deploy --prod --dir=deploy-root --site=44049e82-999d-4c61-857c-765a033ea8a5

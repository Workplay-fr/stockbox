#!/bin/sh
# Met un numéro de version sur les styles et les scripts, pour que les navigateurs chargent toujours la dernière version.
# À lancer avant chaque commit : sh outils/version.sh
V=$(date +%Y%m%d%H%M%S)
cd "$(dirname "$0")/../public" || exit 1
python3 ../outils/traduire.py || exit 1
sed -i -E "s#(/css/site\.css|/js/app\.js|/js/gsap\.min\.js)(\?v=[0-9a-z]+)?\"#\1?v=$V\"#g" index.html en/index.html
for f in js/*.js; do sed -i -E "s#from \"\./([a-z]+)\.js(\?v=[0-9a-z]+)?\"#from \"./\1.js?v=$V\"#g" "$f"; done
echo "version $V"

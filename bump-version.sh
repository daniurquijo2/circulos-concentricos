#!/bin/sh
# Cambia la versión de los archivos para que el navegador no use copias viejas.
V=$(date +%Y%m%d%H%M)
sed -i "s#href=\"style.css[^\"]*\"#href=\"style.css?v=$V\"#; s#src=\"app.js[^\"]*\"#src=\"app.js?v=$V\"#" index.html
sed -i "s#from './firebase-config.js[^']*'#from './firebase-config.js?v=$V'#" app.js
echo "versión $V"

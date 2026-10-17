# Círculos Concéntricos — notas para trabajar en el código

- Web estática publicada en GitHub Pages desde la rama `main` (repo daniurquijo2/circulos-concentricos).
- Antes de cada commit que cambie app.js/style.css/index.html, ejecutar `./bump-version.sh`
  (añade ?v=… a los archivos para que el navegador no use versiones antiguas).
- Atajos de teclado: cada atajo nuevo debe añadirse también a la lista `SHORTCUTS` de app.js,
  que es lo que se muestra en Opciones → Atajos de teclado.
- Las ventanas (modales) no llevan botones de guardar/cerrar: se guardan solas y se cierran
  con clic fuera o Esc (ver `modalOnClose` en app.js).

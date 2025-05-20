/**
 * Script de prueba de producción
 * Este script inicia la aplicación en modo producción para verificar que todo funcione correctamente
 * antes de crear el ejecutable final.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verifica que dist exista
const distPath = path.join(__dirname, '../dist');

if (!fs.existsSync(distPath)) {
  console.error('Error: La carpeta dist no existe.');
  console.error('Primero debes ejecutar: npm run build:prod');
  process.exit(1);
}

// Verifica que index.html exista en dist
const indexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('Error: No se encuentra el archivo index.html en dist.');
  console.error('Primero debes ejecutar: npm run build:prod');
  process.exit(1);
}

console.log('Iniciando aplicación en modo producción...');
console.log('Para detener la aplicación, presiona Ctrl+C');

try {
  // Ejecuta electron en modo de producción usando cross-env para establecer la variable de entorno
  execSync('cross-env NODE_ENV=production electron .', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('La aplicación se cerró correctamente.');
} catch (error) {
  console.error(`Error al ejecutar la aplicación: ${error.message}`);
  process.exit(1);
}

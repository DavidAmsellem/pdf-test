const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');

class CacheService {
    constructor() {
        this.cachePath = path.join(app.getPath('userData'), 'pdf-cache');
        this.init();
    }

    async init() {
        try {
            await fs.access(this.cachePath);
        } catch {
            await fs.mkdir(this.cachePath, { recursive: true });
            console.log('Directorio de caché creado en:', this.cachePath);
        }
    }

    getCachePath() {
        return this.cachePath;
    }

    async saveToCache(pdfId, data, metadata) {
        try {
            const pdfPath = path.join(this.cachePath, `${pdfId}.pdf`);
            const metadataPath = path.join(this.cachePath, `${pdfId}.json`);

            // Verificar si el directorio existe antes de escribir
            await fs.access(this.cachePath).catch(async () => {
                await this.init();
            });

            // Escribir archivos con manejo de errores mejorado
            await Promise.all([
                fs.writeFile(pdfPath, data).catch(error => {
                    console.error(`Error al guardar PDF ${pdfId}:`, error);
                    throw error;
                }),
                fs.writeFile(metadataPath, JSON.stringify({
                    ...metadata,
                    cachedAt: Date.now(),
                    pdfId
                })).catch(error => {
                    console.error(`Error al guardar metadata ${pdfId}:`, error);
                    throw error;
                })
            ]);

            console.log(`PDF ${pdfId} guardado en caché correctamente`);
            return true;
        } catch (error) {
            console.error('Error al guardar en caché:', error);
            return false;
        }
    }

    async getFromCache(pdfId) {
        try {
            const pdfPath = path.join(this.cachePath, `${pdfId}.pdf`);
            const metadataPath = path.join(this.cachePath, `${pdfId}.json`);

            // Verificar si los archivos existen
            await Promise.all([
                fs.access(pdfPath),
                fs.access(metadataPath)
            ]);

            const [pdfData, metadataRaw] = await Promise.all([
                fs.readFile(pdfPath),
                fs.readFile(metadataPath, 'utf-8')
            ]);

            const metadata = JSON.parse(metadataRaw);
            
            // Verificar si el caché es válido (24 horas)
            const cacheAge = Date.now() - metadata.cachedAt;
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas

            if (cacheAge > maxAge) {
                console.log(`Caché expirado para PDF ${pdfId}`);
                await this.removeFromCache(pdfId);
                return null;
            }

            console.log(`PDF ${pdfId} recuperado de caché`);
            return { data: pdfData, metadata };
        } catch (error) {
            console.log(`PDF ${pdfId} no encontrado en caché:`, error.message);
            return null;
        }
    }

    async removeFromCache(pdfId) {
        try {
            const pdfPath = path.join(this.cachePath, `${pdfId}.pdf`);
            const metadataPath = path.join(this.cachePath, `${pdfId}.json`);

            await Promise.all([
                fs.unlink(pdfPath).catch(() => {
                    console.log(`PDF ${pdfId} no existe en caché`);
                }),
                fs.unlink(metadataPath).catch(() => {
                    console.log(`Metadata de ${pdfId} no existe en caché`);
                })
            ]);

            console.log(`PDF ${pdfId} eliminado de caché`);
            return true;
        } catch (error) {
            console.error(`Error al eliminar de caché ${pdfId}:`, error);
            return false;
        }
    }
}

const cacheService = new CacheService();
module.exports = cacheService;
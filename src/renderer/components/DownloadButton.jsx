import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';
import '../styles/components/DownloadButton.css';

const DownloadButton = forwardRef(({ pdfData }, ref) => {
    const [downloading, setDownloading] = useState(false);    // Función para cachear silenciosamente (sin mostrar diálogo de descarga)
    const handleCacheOnly = async () => {
        try {
            setDownloading(true);

            // Primero verificar si ya está en caché
            const cached = await window.electronAPI.getFromCache(pdfData.id);
            if (cached) {
                console.log(`Archivo ${pdfData.title} ya está en caché`);
                return true;
            }

            console.log(`Archivo ${pdfData.title} no está en caché, descargando...`);

            // Obtener URL firmada de Supabase
            const { data: { signedUrl }, error: urlError } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(pdfData.storage_path, 60);

            if (urlError) throw urlError;

            console.log(`URL firmada obtenida para cacheo de ${pdfData.title}`);

            // Usar el API de electron para descargar y cachear SOLAMENTE
            const result = await window.electronAPI.downloadAndCache({
                id: pdfData.id,
                url: signedUrl,
                metadata: {
                    title: pdfData.title,
                    storage_path: pdfData.storage_path
                }
            });

            if (!result.success) throw new Error(result.error);
            
            console.log(`Archivo ${pdfData.title} cacheado correctamente para firma`);
            return true;

        } catch (error) {
            console.error(`Error al cachear ${pdfData.title}:`, error);
            throw error;
        } finally {
            setDownloading(false);
        }
    };

    // Función para descargar con diálogo visible (comportamiento original)
    const handleDownload = async () => {
        try {
            setDownloading(true);

            // Obtener URL firmada de Supabase
            const { data: { signedUrl }, error: urlError } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(pdfData.storage_path, 60);

            if (urlError) throw urlError;

            console.log('URL firmada obtenida:', signedUrl); // Para depuración

            // Usar el API de electron para descargar y cachear
            const result = await window.electronAPI.downloadAndCache({
                id: pdfData.id,
                url: signedUrl, // Asegúrate de que esta URL sea completa
                metadata: {
                    title: pdfData.title,
                    storage_path: pdfData.storage_path
                }
            });

            if (!result.success) throw new Error(result.error);
            const pdfBuffer = new Uint8Array(result.data);

            // Crear el blob y descargar
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `${pdfData.title}.pdf`;
            document.body.appendChild(link);
            link.click();
            
            // Limpieza
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            toast.success('Archivo descargado correctamente');

        } catch (error) {
            console.error('Error al descargar:', error);
            toast.error('Error al descargar el archivo');
            throw error; // Re-lanzar el error para que YouSignButton pueda manejarlo
        } finally {
            setDownloading(false);
        }
    };

    // Exponer ambos métodos a través del ref
    useImperativeHandle(ref, () => ({
        handleDownload,
        handleCacheOnly
    }));

    return (
        <button 
            onClick={handleDownload}
            disabled={downloading}
            className="download-button"
            title="Descargar PDF"
        >
            {downloading ? (
                <span className="loading-icon">⏳</span>
            ) : (
                <span className="download-icon">⬇️</span>
            )}
        </button>
    );
});

export default DownloadButton;
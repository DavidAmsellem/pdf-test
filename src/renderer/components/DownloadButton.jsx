import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';
import '../styles/components/DownloadButton.css';

const DownloadButton = ({ pdfData }) => {
    const [downloading, setDownloading] = useState(false);

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
        } finally {
            setDownloading(false);
        }
    };

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
};

export default DownloadButton;
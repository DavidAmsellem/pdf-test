import React, { useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';

const PDFPreloader = () => {
    useEffect(() => {
        const preloadPDFs = async () => {
            try {
                // 1. Obtener todos los PDFs de la base de datos
                const { data: pdfs, error } = await supabase
                    .from('pdfs')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                console.log(`Iniciando precarga de ${pdfs.length} PDFs...`);

                let completados = 0;
                let errores = 0;

                // 2. Procesar en grupos de 3
                const chunkSize = 3;
                for (let i = 0; i < pdfs.length; i += chunkSize) {
                    const chunk = pdfs.slice(i, Math.min(i + chunkSize, pdfs.length));
                    
                    await Promise.all(chunk.map(async (pdf) => {
                        try {
                            const { data: { signedUrl }, error: urlError } = await supabase.storage
                                .from('pdfs')
                                .createSignedUrl(pdf.storage_path, 60);

                            if (urlError) throw urlError;

                            const result = await window.electronAPI.downloadAndCache({
                                id: pdf.id,
                                url: signedUrl,
                                metadata: {
                                    title: pdf.title,
                                    storage_path: pdf.storage_path
                                }
                            });

                            if (!result.success) throw new Error(result.error);
                            completados++;

                        } catch (error) {
                            console.error(`Error al precargar ${pdf.title}:`, error);
                            errores++;
                        }
                    }));

                    // Pausa entre grupos
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Solo mostrar notificación al finalizar
                if (errores === 0) {
                    toast.success(`${completados} PDFs precargados correctamente`);
                } else {
                    toast.info(`Precarga completada: ${completados} PDFs cargados, ${errores} errores`);
                }

            } catch (error) {
                console.error('Error en precarga:', error);
                // No mostrar toast de error general
            }
        };

        preloadPDFs();
    }, []);

    // No renderizar nada visualmente
    return null;
};

export default PDFPreloader;
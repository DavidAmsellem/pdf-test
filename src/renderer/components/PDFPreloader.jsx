import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';
import '../styles/components/PDFPreloader.css';

const PDFPreloader = () => {
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const preloadPDFs = async () => {
            try {
                setIsLoading(true);
                // 1. Obtener todos los PDFs de la base de datos
                const { data: pdfs, error } = await supabase
                    .from('pdfs')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (!pdfs || pdfs.length === 0) {
                    console.log('No hay PDFs para precargar');
                    return;
                }

                toast.info(`Iniciando precarga de ${pdfs.length} PDFs...`, {
                    autoClose: 2000
                });

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
                            // Actualizar el progreso
                            const newProgress = Math.round((completados + errores) * 100 / pdfs.length);
                            setProgress(newProgress);

                            // Mostrar progreso cada 25%
                            if (newProgress % 25 === 0) {
                                toast.info(`Progreso: ${newProgress}% (${completados} PDFs cargados)`, {
                                    autoClose: 1000
                                });
                            }

                        } catch (error) {
                            console.error(`Error al precargar ${pdf.title}:`, error);
                            errores++;
                            toast.warning(`Error al precargar "${pdf.title}": ${error.message}`, {
                                autoClose: 3000
                            });
                        }
                    }));

                    // Pausa entre grupos
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Mostrar resumen final
                if (errores === 0) {
                    toast.success(`¡Precarga completada! ${completados} PDFs listos para usar`, {
                        autoClose: 4000
                    });
                } else {
                    const tasaExito = Math.round((completados / (completados + errores)) * 100);
                    toast.info(
                        `Precarga completada:\n` +
                        `✅ ${completados} PDFs cargados\n` +
                        `❌ ${errores} errores\n` +
                        `📊 ${tasaExito}% de éxito`, 
                        { autoClose: 5000 }
                    );
                }

            } catch (error) {
                console.error('Error en precarga:', error);
                toast.error(`Error general en la precarga: ${error.message}`, {
                    autoClose: false // El usuario debe cerrar manualmente los errores graves
                });
            } finally {
                setIsLoading(false);
                setProgress(0);
            }
        };

        preloadPDFs();
    }, []);

    // Renderizar barra de progreso si está cargando
    return isLoading ? (
        <div className="preloader-container">
            <div className="preloader-status">
                <div className="preloader-progress">
                    <div 
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="progress-text">
                    {progress === 100 ? 
                        'Finalizando...' : 
                        `Precargando PDFs: ${progress}%`
                    }
                </div>
            </div>
        </div>
    ) : null;
};

export default PDFPreloader;
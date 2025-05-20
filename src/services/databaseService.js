import { supabase } from '../supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import { encryptionService } from './encryptionService';

// Configuración del worker con versión específica
const PDFJS_VERSION = '3.4.120';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

const getSignedUrl = async (path, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
        .from('pdfs')
        .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
};

const generatePDFCover = async (pdfFile) => {
    try {
        // Crear un ArrayBuffer del archivo
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Configurar el documento PDF
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        // Obtener la primera página
        const page = await pdf.getPage(1);
        
        // Configurar el canvas con mayor escala
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        // Renderizar con fondo blanco
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({
            canvasContext: context,
            viewport: viewport,
            background: 'rgb(255, 255, 255)'
        }).promise;

        // Convertir a blob con alta calidad
        const blob = await new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 1.0);
        });

        // Limpiar recursos
        canvas.width = 0;
        canvas.height = 0;
        context.clearRect(0, 0, 0, 0);
        
        return blob;
    } catch (error) {
        console.error('Error detallado en generatePDFCover:', error);
        return null;
    }
};

// Función auxiliar para verificar URLs
const verifyUrl = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
};

// Modificar la parte de generación y subida de carátula en createPDF
const handleCoverUpload = async (coverBlob, fileName) => {
    try {
        console.log('Iniciando subida de carátula...');
        
        if (!coverBlob) {
            console.warn('No se generó el blob de la carátula');
            return null;
        }

        const coverFileName = `covers/${Date.now()}-${fileName.replace('.pdf', '.jpg')}`;
        
        // 1. Subir la carátula
        const { data: coverUpload, error: coverError } = await supabase.storage
            .from('pdfs')
            .upload(coverFileName, coverBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false // Evitar sobreescrituras accidentales
            });

        if (coverError) {
            console.error('Error subiendo carátula:', coverError);
            throw coverError;
        }

        console.log('Carátula subida exitosamente:', coverFileName);

        // 2. Obtener URL firmada
        const { data: coverUrl, error: urlError } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(coverFileName, 3600);

        if (urlError) {
            console.error('Error generando URL firmada para carátula:', urlError);
            throw urlError;
        }

        // 3. Verificar que la URL sea accesible
        const isUrlValid = await verifyUrl(coverUrl.signedUrl);
        if (!isUrlValid) {
            throw new Error('La URL de la carátula no es accesible');
        }

        console.log('URL de carátula generada:', coverUrl.signedUrl);

        return {
            path: coverFileName,
            url: coverUrl.signedUrl
        };

    } catch (error) {
        console.error('Error completo en handleCoverUpload:', error);
        // Intentar limpiar si algo falló
        if (arguments[2]?.path) {
            await supabase.storage
                .from('pdfs')
                .remove([arguments[2].path])
                .catch(e => console.error('Error limpiando carátula fallida:', e));
        }
        return null;
    }
};

export const databaseService = {
    // Servicios para bibliotecas
    getUserLibraries: async (userId) => {
        try {
            // Consulta para obtener bibliotecas con conteo de PDFs
            const { data, error } = await supabase
                .from('libraries')
                .select(`
                    *,
                    pdfs:pdfs(count)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Procesar los resultados para incluir el conteo
            const librariesWithCounts = data.map(library => ({
                ...library,
                pdf_count: library.pdfs?.[0]?.count || 0
            }));

            return { data: librariesWithCounts, error: null };
        } catch (error) {
            console.error('Error en getUserLibraries:', error);
            return { data: null, error };
        }
    },

    createLibrary: async (libraryData) => {
        try {
            const { data, error } = await supabase
                .from('libraries')
                .insert([{
                    name: libraryData.name,
                    description: libraryData.description,
                    user_id: libraryData.userId
                }])
                .select()
                .single();

            if (error) {
                console.error('Error en createLibrary:', error);
                throw error;
            }

            return { data, error: null };
        } catch (error) {
            console.error('Error en createLibrary:', error);
            return { data: null, error };
        }
    },

    // Servicios para PDFs
    getPDFs: async (userId, libraryId = null) => {
        try {
            let query = supabase
                .from('pdfs')
                .select('*')
                .eq('user_id', userId);

            if (libraryId) {
                query = query.eq('library_id', libraryId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error en getPDFs:', error);
            return { data: null, error };
        }
    },

    createPDF: async (fileData) => {
        try {
            if (!fileData.title || !fileData.file || !fileData.libraryId || !fileData.userId) {
                throw new Error('Faltan datos requeridos para crear el PDF');
            }

            // 1. Subir el PDF
            const pdfFileName = `${Date.now()}-${fileData.fileName}`;
            const { data: fileUpload, error: uploadError } = await supabase.storage
                .from('pdfs')
                .upload(pdfFileName, fileData.file);

            if (uploadError) {
                console.error('Error en la subida:', uploadError);
                throw uploadError;
            }

            // 2. Obtener URL firmada para el PDF
            const { data: urlData, error: urlError } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(fileUpload.path, 3600);

            if (urlError) {
                console.error('Error al crear URL:', urlError);
                throw urlError;
            }

            // 3. Generar y subir carátula con mejor manejo de errores
            let coverData = null;
            try {
                const coverBlob = await generatePDFCover(fileData.file);
                if (coverBlob) {
                    coverData = await handleCoverUpload(coverBlob, fileData.fileName);
                    if (coverData) {
                        console.log('Carátula procesada exitosamente:', coverData);
                    }
                }
            } catch (coverError) {
                console.error('Error en el proceso de carátula:', coverError);
                // Continuamos sin carátula, pero logueamos el error
            }

            // 4. Cifrar datos incluyendo verificación
            const encryptedData = {
                title: encryptionService.encrypt(fileData.title),
                fileName: encryptionService.encrypt(fileData.fileName),
                publicUrl: encryptionService.encrypt(urlData.signedUrl),
                coverUrl: coverData?.url ? encryptionService.encrypt(coverData.url) : null,
                coverPath: coverData?.path ? encryptionService.encrypt(coverData.path) : null
            };

            // Verificar que los datos encriptados sean válidos
            Object.entries(encryptedData).forEach(([key, value]) => {
                if (value && !encryptionService.decrypt(value)) {
                    throw new Error(`Error en la encriptación de ${key}`);
                }
            });

            // 5. Preparar datos para inserción con verificación
            const pdfData = {
                // Versiones cifradas
                title_encrypted: encryptedData.title,
                file_name_encrypted: encryptedData.fileName,
                public_url_encrypted: encryptedData.publicUrl,
                cover_url_encrypted: encryptedData.coverUrl,
                storage_path_encrypted: encryptionService.encrypt(fileUpload.path),
                cover_path_encrypted: encryptedData.coverPath,
                // Datos no sensibles
                library_id: fileData.libraryId,
                user_id: fileData.userId,
                file_size: fileData.fileSize,
                // Mantener versiones sin cifrar para búsquedas
                title: fileData.title,
                file_name: fileData.fileName,
                // Rutas originales para manejo interno
                storage_path: fileUpload.path,
                cover_path: coverData ? coverData.path : null,
                cover_url: coverData?.url || null,
                cover_path: coverData?.path || null,
                cover_url_encrypted: encryptedData.coverUrl,
                cover_path_encrypted: encryptedData.coverPath
            };

            // Logging adicional
            console.log('Datos de carátula a insertar:', {
                cover_url: pdfData.cover_url ? 'presente' : 'ausente',
                cover_path: pdfData.cover_path ? 'presente' : 'ausente',
                cover_url_encrypted: pdfData.cover_url_encrypted ? 'presente' : 'ausente',
                cover_path_encrypted: pdfData.cover_path_encrypted ? 'presente' : 'ausente'
            });

            // 6. Insertar en la base de datos
            const { data, error: insertError } = await supabase
                .from('pdfs')
                .insert([pdfData])
                .select('*')
                .single();

            if (insertError) {
                console.error('Error de inserción:', insertError);
                // Limpiar archivos subidos si falla la inserción
                await supabase.storage.from('pdfs').remove([fileUpload.path]);
                if (coverData) {
                    await supabase.storage.from('pdfs').remove([coverData.path]);
                }
                throw insertError;
            }

            return { 
                data: {
                    ...data,
                    title: data.title,
                    file_name: data.file_name,
                    cover_url: coverData ? coverData.url : null
                }, 
                error: null 
            };

        } catch (error) {
            console.error('Error completo:', error);
            return { data: null, error };
        }
    },

    getPDFsByLibrary: async (libraryId) => {
        try {
            const { data: encryptedPdfs, error } = await supabase
                .from('pdfs')
                .select('*')
                .eq('library_id', libraryId);

            if (error) throw error;

            // Descifrar todos los datos sensibles
            const decryptedPdfs = encryptedPdfs.map(pdf => ({
                ...pdf,
                title: pdf.title_encrypted ? encryptionService.decrypt(pdf.title_encrypted) : pdf.title,
                file_name: pdf.file_name_encrypted ? encryptionService.decrypt(pdf.file_name_encrypted) : pdf.file_name,
                public_url: pdf.public_url_encrypted ? encryptionService.decrypt(pdf.public_url_encrypted) : pdf.public_url,
                cover_url: pdf.cover_url_encrypted ? encryptionService.decrypt(pdf.cover_url_encrypted) : pdf.cover_url
            }));

            // Generar nuevas URLs firmadas
            const pdfsWithSignedUrls = await Promise.all(decryptedPdfs.map(async (pdf) => {
                const [fileUrl, coverUrl] = await Promise.all([
                    getSignedUrl(pdf.storage_path),
                    pdf.cover_path ? getSignedUrl(pdf.cover_path) : null
                ]);

                return {
                    ...pdf,
                    public_url: fileUrl,
                    cover_url: coverUrl
                };
            }));

            return { data: pdfsWithSignedUrls, error: null };
        } catch (error) {
            console.error('Error en getPDFsByLibrary:', error);
            return { data: null, error };
        }
    },

    moveToLibrary: async (pdfId, newLibraryId) => {
        try {
            const { data, error } = await supabase
                .from('pdfs')
                .update({ library_id: newLibraryId })
                .eq('id', pdfId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error en moveToLibrary:', error);
            return { data: null, error };
        }
    },

    // Añadir método para eliminar PDF
    deletePDF: async (pdfId) => {
        try {
            // Obtener información del PDF antes de eliminarlo
            const { data: pdf } = await supabase
                .from('pdfs')
                .select('*')
                .eq('id', pdfId)
                .single();

            if (!pdf) throw new Error('PDF no encontrado');

            // Eliminar archivos de almacenamiento
            await Promise.all([
                supabase.storage.from('pdfs').remove([pdf.storage_path]),
                pdf.cover_path ? supabase.storage.from('pdfs').remove([pdf.cover_path]) : Promise.resolve()
            ]);

            // Eliminar registro de la base de datos
            const { error } = await supabase
                .from('pdfs')
                .delete()
                .eq('id', pdfId);

            if (error) throw error;

            return { error: null };
        } catch (error) {
            console.error('Error en deletePDF:', error);
            return { error };
        }
    },

    getStats: async (userId) => {
        try {
            const { data: encryptedPdfs, error: pdfError } = await supabase
                .from('pdfs')
                .select(`
                    id, 
                    file_size,
                    title_encrypted,
                    updated_at,
                    libraries(name)
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (pdfError) throw pdfError;

            const stats = {
                totalPdfs: encryptedPdfs.length,
                totalSize: encryptedPdfs.reduce((acc, pdf) => acc + (pdf.file_size || 0), 0),
                lastUpdated: encryptedPdfs[0] ? {
                    title: encryptedPdfs[0].title_encrypted ? 
                        encryptionService.decrypt(encryptedPdfs[0].title_encrypted) : 
                        encryptedPdfs[0].title,
                    library: encryptedPdfs[0].libraries?.name,
                    date: new Date(encryptedPdfs[0].updated_at).toLocaleDateString()
                } : null
            };

            return { data: stats, error: null };
        } catch (error) {
            console.error('Error en getStats:', error);
            return { data: null, error };
        }
    },

    getAllPDFs: async (userId) => {
        try {
            const { data: encryptedPdfs, error } = await supabase
                .from('pdfs')
                .select(`
                    *,
                    libraries (
                        id,
                        name
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Descifrar los datos
            const decryptedPdfs = await Promise.all(encryptedPdfs.map(async (pdf) => {
                const [fileUrl, coverUrl] = await Promise.all([
                    getSignedUrl(pdf.storage_path),
                    pdf.cover_path ? getSignedUrl(pdf.cover_path) : null
                ]);

                return {
                    ...pdf,
                    title: pdf.title_encrypted ? encryptionService.decrypt(pdf.title_encrypted) : pdf.title,
                    file_name: pdf.file_name_encrypted ? encryptionService.decrypt(pdf.file_name_encrypted) : pdf.file_name,
                    public_url: fileUrl,
                    cover_url: coverUrl
                };
            }));
            
            return { data: decryptedPdfs, error: null };
        } catch (error) {
            console.error('Error en getAllPDFs:', error);
            return { data: null, error };
        }
    }
};
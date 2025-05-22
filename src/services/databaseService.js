import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist';

// Importar el worker directamente desde node_modules
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Configurar el worker de PDF.js usando la URL local
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const getSignedUrl = async (path, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
        .from('pdfs')
        .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
};

const generatePDFCover = async (pdfFile) => {
    let loadingTask = null;
    let pdfDocument = null;
    
    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Configurar el documento PDF con opciones optimizadas
        loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
        });
        
        pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(1);
        
        // Configurar el canvas con un tamaño optimizado
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Aplicar fondo blanco
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        try {
            // Renderizar con WebGL si está disponible
            await page.render({
                canvasContext: context,
                viewport: viewport,
                enableWebGL: true,
                background: 'rgb(255, 255, 255)'
            }).promise;
        } catch (renderError) {
            // Si falla WebGL, intentar sin él
            await page.render({
                canvasContext: context,
                viewport: viewport,
                enableWebGL: false,
                background: 'rgb(255, 255, 255)'
            }).promise;
        }

        // Convertir a blob con calidad media para optimizar tamaño
        const blob = await new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.75);
        });

        return blob;
    } catch (error) {
        console.error('Error en generatePDFCover:', error);
        return null;
    } finally {
        // Limpiar recursos
        if (pdfDocument) {
            try {
                await pdfDocument.destroy();
            } catch (error) {
                console.error('Error al destruir documento PDF:', error);
            }
        }
        if (loadingTask) {
            try {
                await loadingTask.destroy();
            } catch (error) {
                console.error('Error al destruir loadingTask:', error);
            }
        }
    }
};

// Función auxiliar para verificar URLs con caché
const urlCache = new Map();
const verifyUrl = async (url) => {
    if (urlCache.has(url)) {
        return urlCache.get(url);
    }
    try {
        const response = await fetch(url, { 
            method: 'HEAD',
            cache: 'force-cache'
        });
        const isValid = response.ok;
        urlCache.set(url, isValid);
        return isValid;
    } catch (error) {
        urlCache.set(url, false);
        return false;
    }
};

// Modificar la parte de generación y subida de carátula en createPDF
const handleCoverUpload = async (coverBlob, fileName) => {
    try {
        if (!coverBlob) {
            console.warn('No se generó el blob de la carátula');
            return null;
        }

        // Comprimir el blob si es demasiado grande
        if (coverBlob.size > 500000) { // Si es mayor a 500KB
            const img = new Image();
            const canvas = document.createElement('canvas');
            img.src = URL.createObjectURL(coverBlob);
            
            await new Promise(resolve => {
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    const maxSize = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(blob => {
                        coverBlob = blob;
                        URL.revokeObjectURL(img.src);
                        resolve();
                    }, 'image/jpeg', 0.7);
                };
            });
        }

        const coverFileName = `covers/${Date.now()}-${fileName.replace('.pdf', '.jpg')}`;
        
        const { data: coverUpload, error: coverError } = await supabase.storage
            .from('pdfs')
            .upload(coverFileName, coverBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (coverError) throw coverError;

        const { data: coverUrl, error: urlError } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(coverFileName, 3600);

        if (urlError) throw urlError;

        const isUrlValid = await verifyUrl(coverUrl.signedUrl);
        if (!isUrlValid) {
            throw new Error('La URL de la carátula no es accesible');
        }

        return {
            path: coverFileName,
            url: coverUrl.signedUrl
        };

    } catch (error) {
        console.error('Error en handleCoverUpload:', error);
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

    getPDFsByLibrary: async (libraryId) => {
        try {
            const { data: pdfs, error } = await supabase
                .from('pdfs')
                .select('*')
                .eq('library_id', libraryId);

            if (error) throw error;

            // Generar nuevas URLs firmadas
            const pdfsWithSignedUrls = await Promise.all(pdfs.map(async (pdf) => {
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
            return { data: [], error }; // Retornamos array vacío en caso de error
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

            const pdfData = {
                title: fileData.title,
                file_name: fileData.fileName,
                library_id: fileData.libraryId,
                user_id: fileData.userId,
                file_size: fileData.fileSize,
                storage_path: fileUpload.path,
                cover_path: coverData ? coverData.path : null,
                cover_url: coverData?.url || null
            };

            const { data, error: insertError } = await supabase
                .from('pdfs')
                .insert([pdfData])
                .select('*')
                .single();

            if (insertError) throw insertError;

            return { data, error: null };
        } catch (error) {
            console.error('Error:', error);
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
            const { data: pdfs, error: pdfError } = await supabase
                .from('pdfs')
                .select(`
                    id, 
                    file_size,
                    title,
                    updated_at,
                    libraries(name)
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (pdfError) throw pdfError;

            const stats = {
                totalPdfs: pdfs.length,
                totalSize: pdfs.reduce((acc, pdf) => acc + (pdf.file_size || 0), 0),
                lastUpdated: pdfs[0] ? {
                    title: pdfs[0].title,
                    library: pdfs[0].libraries?.name,
                    date: new Date(pdfs[0].updated_at).toLocaleDateString()
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
            const { data: pdfs, error } = await supabase
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

            const pdfsWithUrls = await Promise.all(pdfs.map(async (pdf) => {
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
            
            return { data: pdfsWithUrls, error: null };
        } catch (error) {
            console.error('Error en getAllPDFs:', error);
            return { data: null, error };
        }
    },

    // Función de diagnóstico de la base de datos
    runDatabaseTests: async () => {
        const tests = [];
        let totalScore = 0;
        let testsRun = 0;

        try {
            // Test 1: Conexión básica
            const startTime = Date.now();
            const { error: connectError } = await supabase.from('libraries').select('count');
            const latency = Date.now() - startTime;
            
            tests.push({
                name: 'Conexión a la base de datos',
                status: !connectError ? 'success' : 'error',
                latency: latency + 'ms',
                details: !connectError ? 'Conexión establecida correctamente' : connectError.message,
                score: !connectError ? 100 : 0
            });

            if (!connectError) totalScore += 100;
            testsRun++;

            // Test 2: Permisos de lectura
            const { data: readData, error: readError } = await supabase
                .from('libraries')
                .select('*')
                .limit(1);
            
            tests.push({
                name: 'Permisos de lectura',
                status: !readError ? 'success' : 'error',
                details: !readError ? 'Permisos de lectura correctos' : readError.message,
                score: !readError ? 100 : 0
            });

            if (!readError) totalScore += 100;
            testsRun++;

            // Test 3: Storage
            const { data: storageData, error: storageError } = await supabase.storage
                .from('pdfs')
                .list();

            tests.push({
                name: 'Acceso al almacenamiento',
                status: !storageError ? 'success' : 'error',
                details: !storageError ? 'Acceso al almacenamiento correcto' : storageError.message,
                score: !storageError ? 100 : 0
            });

            if (!storageError) totalScore += 100;
            testsRun++;

            // Test 4: Verificar políticas RLS
            const { data: publicData, error: rlsError } = await supabase
                .from('libraries')
                .select('*')
                .limit(1)
                .is('user_id', null);

            const rlsWorking = !publicData || publicData.length === 0;
            
            tests.push({
                name: 'Políticas de seguridad (RLS)',
                status: rlsWorking ? 'success' : 'warning',
                details: rlsWorking 
                    ? 'Las políticas RLS están funcionando correctamente' 
                    : 'Se detectaron posibles problemas con las políticas RLS',
                score: rlsWorking ? 100 : 50
            });

            if (rlsWorking) totalScore += 100;
            testsRun++;

            const averageScore = Math.round(totalScore / testsRun);

            return {
                tests,
                summary: {
                    totalTests: testsRun,
                    passedTests: tests.filter(t => t.status === 'success').length,
                    averageScore,
                    connectionLatency: latency,
                    timestamp: new Date().toISOString()
                },
                error: null
            };

        } catch (error) {
            console.error('Error en las pruebas de base de datos:', error);
            return {
                tests,
                summary: {
                    totalTests: testsRun,
                    passedTests: tests.filter(t => t.status === 'success').length,
                    averageScore: Math.round(totalScore / (testsRun || 1)),
                    timestamp: new Date().toISOString()
                },
                error: error.message
            };
        }
    }
};
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databaseService } from '../../services/databaseService';
import { toast } from 'react-toastify';
import '../styles/pages/PDFLibrary.css';
import { supabase } from '../../supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import DownloadButton from './DownloadButton';
import YouSignButton from './sign/YouSignButton';
import LibraryFilter from './LibraryFilter';
import EditableTitle from './library/EditableTitle';

// Configuración global para el worker de PDF.js.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFLibrary = () => {
    const { user } = useAuth();
    const [showForm, setShowForm] = useState(false); // Visibilidad del modal para crear biblioteca.
    const [libraries, setLibraries] = useState([]);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(false); // Carga para operaciones específicas.
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Carga general inicial.
    const [showPdfModal, setShowPdfModal] = useState(false); // Visibilidad del modal para asignar PDF.
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedLibrary, setSelectedLibrary] = useState('');
    // Almacena PDFs por biblioteca: { [libraryId]: [pdf1, pdf2, ...] }
    const [libraryPdfs, setLibraryPdfs] = useState({});
    // ID de la biblioteca cuya imagen de portada se está subiendo.
    const [uploadingImage, setUploadingImage] = useState(null);
    const [stats, setStats] = useState(null);
    // ID de la biblioteca expandida para mostrar sus PDFs.
    const [expandedLibrary, setExpandedLibrary] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [sortOrder, setSortOrder] = useState('name-asc');
    const [searchType, setSearchType] = useState('all'); // Nuevo estado para el tipo de búsqueda
    const [dragOverLibrary, setDragOverLibrary] = useState(null);
    // Añadir ref para el input de archivo
    const fileInputRef = useRef(null);

    const filteredAndSortedLibraries = useMemo(() => {
        let result = [...libraries];
        
        // Aplicar filtro
        if (filterText) {
            result = result.filter(lib => {
                const matchLibrary = (searchType === 'all' || searchType === 'libraries') &&
                    (lib.name.toLowerCase().includes(filterText.toLowerCase()) ||
                    lib.description?.toLowerCase().includes(filterText.toLowerCase()));
                    
                const matchPDFs = (searchType === 'all' || searchType === 'pdfs') &&
                    libraryPdfs[lib.id]?.some(pdf => 
                        pdf.title.toLowerCase().includes(filterText.toLowerCase()) ||
                        pdf.description?.toLowerCase().includes(filterText.toLowerCase())
                    );
                    
                return matchLibrary || matchPDFs;
            });
        }
        
        // Aplicar ordenamiento
        result.sort((a, b) => {
            switch (sortOrder) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'date-new':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date-old':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'size-large':
                    return (libraryPdfs[b.id]?.length || 0) - (libraryPdfs[a.id]?.length || 0);
                case 'size-small':
                    return (libraryPdfs[a.id]?.length || 0) - (libraryPdfs[b.id]?.length || 0);
                default:
                    return 0;
            }
        });
        
        return result;
    }, [libraries, filterText, sortOrder, libraryPdfs, searchType]);

    /**
     * Carga las bibliotecas del usuario y sus PDFs asociados.
     */
    const loadLibraries = async () => {
        setIsLoading(true);
        try {
            const { data: libs, error: libsError } = await databaseService.getUserLibraries(user.id);
            if (libsError) throw libsError;
            setLibraries(libs || []);
            
            // Cargar PDFs para bibliotecas expandidas o visibles primero
            const visibleLibraries = libs?.filter(lib => 
                expandedLibrary === lib.id || 
                lib.id === selectedLibrary
            ) || [];

            // Cargar PDFs visibles primero
            await Promise.all(
                visibleLibraries.map(library => loadPDFsForLibrary(library.id))
            );

            // Cargar el resto de PDFs en segundo plano
            const remainingLibraries = libs?.filter(lib => 
                !visibleLibraries.some(visible => visible.id === lib.id)
            ) || [];

            // Usar setTimeout para dar prioridad a la interfaz
            setTimeout(() => {
                Promise.all(
                    remainingLibraries.map(library => loadPDFsForLibrary(library.id))
                );
            }, 100);

        } catch (error) {
            console.error('Error al cargar bibliotecas:', error);
            toast.error('Error al cargar las bibliotecas');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Carga los PDFs para una biblioteca específica.
     * @param {string} libraryId - ID de la biblioteca.
     */
    const loadPDFsForLibrary = async (libraryId) => {
        try {
            const { data, error } = await databaseService.getPDFsByLibrary(libraryId);
            if (error) throw error;

            // Actualizar el estado de forma inmutable
            setLibraryPdfs(prev => ({
                ...prev,
                [libraryId]: data || []
            }));

            // Pre-cargar las miniaturas
            if (data && data.length > 0) {
                data.forEach(pdf => {
                    if (pdf.cover_url) {
                        const img = new Image();
                        img.src = pdf.cover_url;
                    }
                });
            }
        } catch (error) {
            console.error(`Error al cargar PDFs para la biblioteca ${libraryId}:`, error);
        }
    };
    
    /**
     * Carga las estadísticas del usuario.
     */
    const loadStats = async () => {
        try {
            const { data, error } = await databaseService.getStats(user.id);
            if (error) throw error;
            setStats(data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            toast.error('Error al cargar estadísticas');
        }
    };

    /**
     * Maneja la creación de una nueva biblioteca.
     * @param {Event} e - Evento del formulario.
     */
    const handleCreateLibrary = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: newLibrary, error: createError } = await databaseService.createLibrary({
                name: formData.name,
                description: formData.description,
                userId: user.id
            });
            if (createError) throw createError;

            setLibraries(prev => [...prev, newLibrary]);
            setFormData({ name: '', description: '' });
            setShowForm(false);
            toast.success('Biblioteca creada correctamente');
            await loadStats();
            // Consideración: loadLibraries() recarga todo. Si solo se necesita actualizar el conteo,
            // se podría hacer una actualización más específica o confiar en la adición local.
            // Aquí se recarga para asegurar consistencia del `pdf_count`.
            await loadLibraries();


        } catch (err) {
            console.error('Error al crear biblioteca:', err);
            setError(err.message || 'Error desconocido al crear la biblioteca.');
            toast.error('Error al crear la biblioteca');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Actualiza `formData` en cambios de input.
     * @param {Event} e - Evento de cambio.
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /**
     * Maneja la selección de un archivo PDF.
     * @param {Event} e - Evento de cambio del input file.
     */
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            if (file.size === 0) {
                toast.error('El archivo PDF está vacío');
                e.target.value = null;
                return;
            }
            setSelectedFile(file);
            setShowPdfModal(true);
        } else if (file) {
            toast.error('Por favor, selecciona un archivo PDF válido');
            e.target.value = null;
        }
    };

    /**
     * Maneja la asignación de un PDF a una biblioteca.
     * @param {Event} e - Evento del formulario.
     */
    const handleAssignPdf = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!selectedFile || !selectedLibrary) {
                throw new Error('Selecciona un archivo y una biblioteca');
            }

            const fileData = {
                title: selectedFile.name.replace(/\.pdf$/i, ''),
                fileName: selectedFile.name,
                libraryId: selectedLibrary,
                userId: user.id,
                fileSize: selectedFile.size,
                file: selectedFile
            };

            const { data: newPdf, error: createPdfError } = await databaseService.createPDF(fileData);
            if (createPdfError) {
                console.error('Error detallado al crear PDF:', createPdfError);
                throw new Error(createPdfError.message || 'Error al subir el PDF.');
            }

            setLibraryPdfs(prev => ({
                ...prev,
                [selectedLibrary]: [...(prev[selectedLibrary] || []), newPdf]
            }));
            
            toast.success('PDF añadido correctamente');
            setShowPdfModal(false);
            setSelectedFile(null);
            setSelectedLibrary('');
            document.getElementById('pdf-upload').value = null;

            await loadStats();
            await loadLibraries(); // Para actualizar `pdf_count`.

        } catch (err) {
            toast.error(err.message || 'Error al asignar el PDF');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Maneja la subida de una imagen de portada para una biblioteca.
     * @param {Event} e - Evento de cambio del input file.
     * @param {string} libraryId - ID de la biblioteca.
     */
    const handleImageUpload = async (e, libraryId) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecciona una imagen válida');
            return;
        }

        setUploadingImage(libraryId);
        try {
            const fileName = `library-covers/user_${user.id}/${libraryId}-${Date.now()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('library-covers')
                .upload(fileName, file, { upsert: true }); // `upsert: true` sobrescribe si ya existe.

            if (uploadError) throw uploadError;

            // Usar URL pública si el bucket está configurado así.
            const { data: { publicUrl } } = supabase.storage
                .from('library-covers')
                .getPublicUrl(uploadData.path);

            const { error: updateError } = await supabase
                .from('libraries')
                .update({ cover_image: publicUrl, cover_path: uploadData.path })
                .eq('id', libraryId);

            if (updateError) throw updateError;

            setLibraries(prevLibraries => prevLibraries.map(lib => 
                lib.id === libraryId ? { ...lib, cover_image: publicUrl } : lib
            ));
            toast.success('Imagen actualizada correctamente');
        } catch (error) {
            console.error('Error al subir imagen:', error);
            toast.error('Error al actualizar la imagen. Detalles: ' + error.message);
        } finally {
            setUploadingImage(null);
            e.target.value = null;
        }
    };

    /**
     * Abre un PDF en una nueva pestaña.
     * @param {object} pdf - Objeto PDF con `public_url`.
     */
    const handleOpenPdf = async (pdf) => {
        try {
            if (!pdf.public_url) {
                toast.error('No se puede abrir el PDF: URL no disponible');
                return;
            }
            window.open(pdf.public_url, '_blank');
        } catch (error) {
            console.error('Error al abrir PDF:', error);
            toast.error('Error al abrir el PDF');
        }
    };

    /**
     * Elimina un PDF.
     * @param {string} pdfId - ID del PDF.
     * @param {string} libraryId - ID de la biblioteca del PDF.
     */
    const handleDeletePdf = async (pdfId, libraryId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este PDF? Esta acción no se puede deshacer.')) {
            return;
        }
        try {
            const { error } = await databaseService.deletePDF(pdfId); 
            if (error) throw error;

            setLibraryPdfs(prev => ({
                ...prev,
                [libraryId]: (prev[libraryId] || []).filter(pdf => pdf.id !== pdfId)
            }));
            toast.success('PDF eliminado correctamente');
            await loadStats();
            await loadLibraries(); // Para actualizar `pdf_count`.
        } catch (error) {
            console.error('Error al eliminar PDF:', error);
            toast.error('Error al eliminar el PDF. Detalles: ' + error.message);
        }
    };

    /**
     * Formatea bytes a un string legible (KB, MB, GB).
     * @param {number} bytes - Número de bytes.
     * @returns {string} - Tamaño formateado.
     */
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === null || typeof bytes === 'undefined' || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    /**
     * Efecto para cargar datos iniciales cuando el componente se monta o `user` cambia.
     */
    useEffect(() => {
        if (user && user.id) {
            loadLibraries();
            loadStats();
        } else {
            // Limpiar estados si no hay usuario.
            setLibraries([]);
            setLibraryPdfs({});
            setStats(null);
            setIsLoading(false);
        }
    }, [user]);

    /**
     * Maneja la expansión/contracción de una biblioteca.
     * @param {string} libraryId - ID de la biblioteca.
     */
    const toggleLibrary = (libraryId) => {
        setExpandedLibrary(prevExpandedId => (prevExpandedId === libraryId ? null : libraryId));
    };

    const handleUpdateLibraryName = async (libraryId, newName) => {
        try {
            const { error } = await supabase
                .from('libraries')
                .update({ name: newName })
                .eq('id', libraryId);

            if (error) throw error;

            // Actualizar el estado local
            setLibraries(libraries.map(lib => 
                lib.id === libraryId ? { ...lib, name: newName } : lib
            ));

            toast.success('Nombre de biblioteca actualizado');
        } catch (error) {
            console.error('Error al actualizar nombre:', error);
            toast.error('Error al actualizar el nombre de la biblioteca');
        }
    };

    const handleDragOver = (e, libraryId) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!dragOverLibrary) {
            setDragOverLibrary(libraryId);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverLibrary(null);
    };

    const handleDrop = async (e, libraryId) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverLibrary(null);

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            try {
                setLoading(true);
                
                const fileData = {
                    title: file.name.replace(/\.pdf$/i, ''),
                    fileName: file.name,
                    libraryId: libraryId,
                    userId: user.id,
                    fileSize: file.size,
                    file: file
                };

                const { data: newPdf, error: createPdfError } = await databaseService.createPDF(fileData);
                
                if (createPdfError) {
                    throw new Error(createPdfError.message || 'Error al subir el PDF.');
                }

                // Actualizar el estado local
                setLibraryPdfs(prev => ({
                    ...prev,
                    [libraryId]: [...(prev[libraryId] || []), newPdf]
                }));

                toast.success('PDF añadido correctamente');
                await loadStats();
                await loadLibraries(); // Para actualizar pdf_count

            } catch (error) {
                console.error('Error al añadir PDF:', error);
                toast.error(error.message || 'Error al añadir el PDF');
            } finally {
                setLoading(false);
            }
        } else {
            toast.error('Solo se permiten archivos PDF');
        }
    };

    // Función para manejar el clic en el área de drop
    const handleDropAreaClick = (e, libraryId) => {
        // Prevenir que se ejecute el toggle de la biblioteca
        e.stopPropagation();
        
        // Crear un input file temporal si no existe
        if (!fileInputRef.current) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.style.display = 'none';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleDrop({ 
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        dataTransfer: { files: [file] }
                    }, libraryId);
                }
            };
            fileInputRef.current = input;
            document.body.appendChild(input);
        }
        
        // Disparar el diálogo de selección de archivo
        fileInputRef.current.click();
    };

    return (
        <>
            <div className="pdf-library-container">
                <div className="library-header">
                    <h1>Mis Bibliotecas</h1>
                    <div className="header-buttons">
                        <button 
                            className="create-library-button"
                            onClick={() => setShowForm(true)}
                            title="Crear una nueva biblioteca de PDFs"
                        >
                            <i className="fas fa-plus"></i>
                            Nueva Biblioteca
                        </button>
                        <div className="pdf-upload-button">
                            <input
                                type="file"
                                id="pdf-upload"
                                accept=".pdf"
                                onChange={handlePdfUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="pdf-upload" className="upload-button" title="Subir un nuevo archivo PDF">
                                <i className="fas fa-file-pdf"></i>
                                Subir PDF
                            </label>
                        </div>
                    </div>
                </div>

                {/* Panel de Estadísticas */}
                <div className="stats-panel">
                    <div className="stat-card">
                        <i className="fas fa-file-pdf"></i>
                        <div className="stat-info">
                            <h3>PDFs Totales</h3>
                            <p>{stats?.totalPdfs || 0}</p> 
                        </div>
                    </div>
                    <div className="stat-card">
                        <i className="fas fa-database"></i>
                        <div className="stat-info">
                            <h3>Espacio Usado</h3>
                            <p>{stats?.totalSize ? formatBytes(stats.totalSize) : '0 Bytes'}</p>
                        </div>
                    </div>
                </div>

                {/* Modal para Crear Nueva Biblioteca */}
                {showForm && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <button 
                                className="close-button"
                                onClick={() => {
                                    setShowForm(false);
                                    setError(null); 
                                    setFormData({ name: '', description: '' }); 
                                }}
                                title="Cerrar formulario"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <form onSubmit={handleCreateLibrary} className="library-form">
                                <h2>Crear Nueva Biblioteca</h2>
                                {error && <div className="form-error">{error}</div>}
                                <div className="form-group">
                                    <label htmlFor="name">Nombre*</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                        placeholder="Ej: Facturas 2024"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="description">Descripción</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="4"
                                        disabled={loading}
                                        placeholder="Ej: Todos los documentos fiscales del año 2024"
                                    />
                                </div>
                                <button type="submit" className="submit-button" disabled={loading}>
                                    {loading ? 'Creando...' : 'Crear Biblioteca'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Filtro y Ordenamiento */}
                <LibraryFilter
                    onFilterChange={setFilterText}
                    onSortChange={setSortOrder}
                    onSearchTypeChange={setSearchType}
                    totalItems={filteredAndSortedLibraries.length}
                    filterActive={!!filterText}
                    searchType={searchType}
                />

                {/* Grid de Bibliotecas */}
                {isLoading ? (
                    <div className="loading-state">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Cargando bibliotecas...</p>
                    </div>
                ) : (
                    <div className="libraries-grid">
                        {libraries.length === 0 ? (
                            <div className="empty-state">
                                <i className="fas fa-book"></i>
                                <p>No tienes bibliotecas creadas.</p>
                                <p>Empieza por crear tu primera biblioteca para organizar tus documentos.</p>
                                <button className="create-first-library" onClick={() => setShowForm(true)}>
                                    Crear mi primera biblioteca
                                </button>
                            </div>
                        ) : (
                            filteredAndSortedLibraries.map(library => (
                                <div key={library.id} className="library-card">                                    <div 
                                        className={`library-header-card ${dragOverLibrary === library.id ? 'drag-over' : ''}`}
                                        onClick={(e) => {
                                            // No ejecutar toggle si el clic fue en el título editable o en el área de drop
                                            if (!e.target.closest('.editable-title') && !e.target.closest('.drop-indicator')) {
                                                toggleLibrary(library.id);
                                            }
                                        }}
                                        onDragOver={(e) => handleDragOver(e, library.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, library.id)}
                                    >
                                        <div className="library-info">
                                            <EditableTitle
                                                title={library.name}
                                                onSave={(newName) => handleUpdateLibraryName(library.id, newName)}
                                                className="library-title"
                                            />
                                            <p>{library.description || 'Sin descripción'}</p>
                                            <div className="library-stats">
                                                <small><i className="fas fa-file-pdf"></i> {library.pdf_count || 0} PDFs</small>
                                                <small><i className="fas fa-calendar"></i> {new Date(library.created_at).toLocaleDateString()}</small>
                                            </div>
                                        </div>
                                        
                                        {/* Indicador de drop */}
                                        <div 
                                            className="drop-indicator"
                                            onClick={(e) => handleDropAreaClick(e, library.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span>
                                                <i className="fas fa-file-upload"></i>
                                                {' '}Suelta o haz clic para añadir PDF
                                            </span>
                                        </div>
                                        
                                        <div className="library-expand-icon">
                                            <i className={`fas fa-chevron-${expandedLibrary === library.id ? 'up' : 'down'}`}></i>
                                        </div>
                                    </div>

                                    {/* Contenido de la biblioteca (lista de PDFs) */}
                                    <div 
                                        id={`library-content-${library.id}`}
                                        className={`library-content ${expandedLibrary === library.id ? 'expanded' : ''}`}
                                    >
                                        <div className="pdf-list">
                                            <h4>PDFs en esta biblioteca:</h4>
                                            {(libraryPdfs[library.id]?.length ?? 0) > 0 ? (
                                                <div className="pdf-grid">
                                                    {libraryPdfs[library.id].map(pdf => (
                                                        <div key={pdf.id} className="pdf-card">
                                                            <div className="pdf-cover">
                                                                {pdf.cover_url ? (
                                                                    <img 
                                                                        src={pdf.cover_url} 
                                                                        alt={`Portada de ${pdf.title}`}
                                                                        className="pdf-thumbnail"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = '/placeholder.png'; // Imagen placeholder
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="pdf-thumbnail-placeholder">
                                                                        <i className="fas fa-file-pdf"></i>
                                                                    </div>
                                                                )}
                                                                <div className="pdf-actions">
                                                                    <DownloadButton pdfData={pdf} />
                                                                    <button 
                                                                        className="btn-action btn-open"
                                                                        onClick={() => handleOpenPdf(pdf)}
                                                                        title="Abrir PDF"
                                                                    >
                                                                        <i className="fas fa-external-link-alt"></i>
                                                                    </button>
                                                                    <YouSignButton 
                                                                        pdfId={pdf.id} 
                                                                        title={pdf.title || 'Documento sin título'}
                                                                    />
                                                                    <button 
                                                                        className="btn-action btn-delete"
                                                                        onClick={() => handleDeletePdf(pdf.id, library.id)}
                                                                        title="Eliminar PDF"
                                                                    >
                                                                        <i className="fas fa-trash-alt"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="pdf-info">
                                                                <h5 className="pdf-title" title={pdf.title || 'Sin título'}>{pdf.title || 'Sin título'}</h5>
                                                                <div className="pdf-meta">
                                                                    <span><i className="fas fa-hdd"></i>{formatBytes(pdf.file_size)}</span>
                                                                    <span><i className="fas fa-calendar-alt"></i>{new Date(pdf.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="no-pdfs">No hay PDFs en esta biblioteca. Sube algunos para empezar.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Modal para Asignar PDF a Biblioteca */}
                {showPdfModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <button 
                                className="close-button"
                                onClick={() => {
                                    setShowPdfModal(false);
                                    setSelectedFile(null);
                                    setSelectedLibrary('');
                                    setError(null);
                                    document.getElementById('pdf-upload').value = null;
                                }}
                                title="Cerrar asignación de PDF"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <form onSubmit={handleAssignPdf} className="library-form">
                                <h2>Asignar PDF a Biblioteca</h2>
                                <div className="form-group">
                                    <p className="selected-file">Archivo seleccionado: <strong>{selectedFile?.name || 'Ninguno'}</strong></p>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="library">Seleccionar Biblioteca*</label>
                                    <select
                                        id="library"
                                        value={selectedLibrary}
                                        onChange={(e) => setSelectedLibrary(e.target.value)}
                                        required
                                        disabled={loading}
                                    >
                                        <option value="">Selecciona una biblioteca</option>
                                        {libraries.map(library => (
                                            <option key={library.id} value={library.id}>
                                                {library.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {error && <div className="form-error">{error}</div>}
                                <button type="submit" className="submit-button" disabled={loading || !selectedLibrary}>
                                    {loading ? 'Asignando...' : 'Asignar PDF'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PDFLibrary;
import React, { useState, useEffect } from 'react';
import '../styles/components/PDFThumbnail.css';

const PDFThumbnail = ({ pdf, onClick }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadThumbnail = async () => {
            if (!pdf || !pdf.cover_url) {
                if (mounted) {
                    setError(true);
                    setIsLoading(false);
                }
                return;
            }

            try {
                const response = await fetch(pdf.cover_url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                if (mounted) {
                    setThumbnailUrl(url);
                    setIsLoading(false);
                    setError(false);
                }
            } catch (err) {
                console.error('Error cargando miniatura:', err);
                if (mounted) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        loadThumbnail();

        return () => {
            mounted = false;
            if (thumbnailUrl) {
                URL.revokeObjectURL(thumbnailUrl);
            }
        };
    }, [pdf?.cover_url]);

    return (
        <div className="pdf-preview" onClick={onClick}>
            <div className="pdf-thumbnail-container">
                {isLoading ? (
                    <div className="pdf-loading">
                        <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                        <span>Cargando...</span>
                    </div>
                ) : error || !thumbnailUrl ? (
                    <div className="pdf-fallback">
                        <i className="fas fa-file-pdf" aria-hidden="true"></i>
                    </div>
                ) : (
                    <img 
                        src={thumbnailUrl}
                        alt={`Vista previa de ${pdf?.title || 'PDF'}`}
                        className="pdf-thumbnail-canvas"
                        onError={() => setError(true)}
                    />
                )}
                <div className="pdf-overlay">
                    <span>Ver PDF</span>
                </div>
            </div>
            <div className="pdf-info">
                <h4>{pdf?.title || 'Sin título'}</h4>
                <span>{pdf?.libraries?.name || 'Sin biblioteca'}</span>
                <small>{pdf?.created_at ? new Date(pdf.created_at).toLocaleDateString() : 'Fecha desconocida'}</small>
            </div>
        </div>
    );
};

export default PDFThumbnail;
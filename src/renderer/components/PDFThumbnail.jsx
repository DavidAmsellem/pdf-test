import React, { useState, useEffect } from 'react';
import '../styles/components/PDFThumbnail.css';

const PDFThumbnail = ({ pdf, onClick }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Solo intentamos verificar si hay una URL válida
        if (!pdf || !pdf.public_url) {
            setError(true);
            setIsLoading(false);
            return;
        }

        // Comprobamos si la URL es accesible
        const checkUrl = async () => {
            try {
                const response = await fetch(pdf.public_url, { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Error verificando URL del PDF:', err);
                setError(true);
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            setError(true);
            setIsLoading(false);
        }, 5000);

        checkUrl();

        return () => clearTimeout(timeoutId);
    }, [pdf?.public_url]);

    // Simplifiquemos el componente para evitar problemas con PDF.js
    return (
        <div className="pdf-preview" onClick={onClick}>
            {isLoading ? (
                <div className="pdf-loading">
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Cargando vista previa...</span>
                </div>
            ) : (
                <div className="pdf-thumbnail-container">
                    <div className="pdf-fallback">
                        <i className="fas fa-file-pdf" aria-hidden="true"></i>
                        <div className="pdf-overlay">
                            <span>Ver PDF</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="pdf-info">
                <h4>{pdf?.title || 'Sin título'}</h4>
                <span>{pdf?.libraries?.name || 'Sin biblioteca'}</span>
                <small>{pdf?.created_at ? new Date(pdf.created_at).toLocaleDateString() : 'Fecha desconocida'}</small>
            </div>
        </div>
    );
};

export default PDFThumbnail;
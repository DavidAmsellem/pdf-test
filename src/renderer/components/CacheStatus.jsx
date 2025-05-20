import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import PDFPreloader from './PDFPreloader';
import '../styles/components/CacheStatus.css';

const CacheStatus = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [key, setKey] = useState(0); // Añadimos una key para forzar el re-render
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const progressTimer = useRef(null);
    const finalizeTimer = useRef(null);

    const loadStats = async () => {
        try {
            const result = await window.electronAPI.getCacheStats();
            if (!result.success) throw new Error(result.error);
            setStats(result.stats);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            toast.error('Error al cargar estadísticas de caché');
        }
    };

    const handleClearCache = async () => {
        if (!confirm('¿Estás seguro de que quieres borrar todo el caché?')) return;
        
        setLoading(true);
        try {
            const result = await window.electronAPI.clearCache();
            if (!result.success) throw new Error(result.error);
            
            toast.success('Caché borrado correctamente');
            loadStats();
        } catch (error) {
            console.error('Error al borrar caché:', error);
            toast.error('Error al borrar caché');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshCache = () => {
        setLoading(true);
        // Forzar re-render del PDFPreloader cambiando su key
        setKey(prevKey => prevKey + 1);
        // El loading se desactivará cuando termine la precarga
    };

    const finalizarProgreso = () => {
        // Asegurar que llegue al 100%
        setProgress(100);
        // Esperar un momento para mostrar el 100%
        finalizeTimer.current = setTimeout(() => {
            setShowProgress(false);
            setProgress(0);
            setLoading(false);
        }, 1000);
    };

    const handlePreloaderFinish = () => {
        finalizarProgreso();
        loadStats();
    };

    useEffect(() => {
        loadStats();
    }, []);    useEffect(() => {
        if (loading) {
            setShowProgress(true);
            setProgress(0);
            
            // Incremento más suave del progreso
            progressTimer.current = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressTimer.current);
                        return 90; // Se mantiene en 90% hasta que termine la carga
                    }
                    return prev + 2; // Incremento más rápido
                });
            }, 50);

            // Asegurar que llegue al 100% después de un tiempo máximo
            finalizeTimer.current = setTimeout(() => {
                if (loading) { // Si aún está cargando después del tiempo máximo
                    finalizarProgreso();
                }
            }, 5000); // Tiempo máximo de espera: 5 segundos

            return () => {
                if (progressTimer.current) clearInterval(progressTimer.current);
                if (finalizeTimer.current) clearTimeout(finalizeTimer.current);
            };
        } else {
            // Limpiar el timer y ocultar la barra después de un breve retraso
            const hideTimer = setTimeout(() => {
                setShowProgress(false);
                setProgress(0);
            }, 1000);
            
            return () => clearTimeout(hideTimer);
        }
    }, [loading]);

    if (!stats) return null;

    const formatSize = (bytes) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="cache-status">
            <div className={`cache-progress ${showProgress ? 'visible' : ''}`}>
                <div 
                    className="progress-bar" 
                    style={{ width: `${progress}%` }}
                />
            </div>
            <PDFPreloader key={key} onFinish={handlePreloaderFinish} />
            
            <div className="cache-info">
                <h3>Estado del Caché</h3>
                <div className="cache-stats">
                    <div className="stat-item">
                        <span>PDFs en caché:</span>
                        <span>{stats?.count}</span>
                    </div>
                    <div className="stat-item">
                        <span>Tamaño total:</span>
                        <span>{formatSize(stats?.size || 0)}</span>
                    </div>
                </div>
            </div>

            <div className="cache-actions">
                <button 
                    onClick={handleRefreshCache}
                    disabled={loading}
                    className="cache-button refresh"
                >
                    🔄 Actualizar
                </button>
                <button 
                    onClick={handleClearCache}
                    disabled={loading}
                    className="cache-button clear"
                >
                    🗑️ Borrar caché
                </button>
            </div>
        </div>
    );
};

export default CacheStatus;
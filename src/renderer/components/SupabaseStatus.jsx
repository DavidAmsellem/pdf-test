import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';
import '../styles/components/SupabaseStatus.css';

const SupabaseStatus = () => {
    const [status, setStatus] = useState({
        connected: false,
        latency: null,
        lastCheck: null,
        error: null,
        checking: false,
        totalPdfs: 0
    });

    const checkConnection = async () => {
        setStatus(prev => ({ ...prev, checking: true, error: null }));
        const startTime = Date.now();

        try {
            const { count, error } = await supabase
                .from('pdfs')
                .select('*', { count: 'exact' });

            if (error) throw error;

            const endTime = Date.now();
            setStatus({
                connected: true,
                latency: endTime - startTime,
                lastCheck: new Date(),
                error: null,
                checking: false,
                totalPdfs: count || 0
            });
            
            toast.success('Conexión con Supabase verificada correctamente');
        } catch (error) {
            setStatus({
                connected: false,
                latency: null,
                lastCheck: new Date(),
                error: error.message,
                checking: false,
                totalPdfs: 0
            });
            toast.error(`Error de conexión: ${error.message}`);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    return (
        <div className="supabase-status-card">
            <div className="status-header">
                <div className="status-title">
                    <i className="fas fa-database"></i>
                    <h4>Estado de Supabase</h4>
                </div>
                <button 
                    onClick={checkConnection}
                    disabled={status.checking}
                    className="refresh-button"
                >
                    <i className={`fas fa-sync ${status.checking ? 'fa-spin' : ''}`}></i>
                    Verificar
                </button>
            </div>

            <div className="status-info">
                <div className="status-row">
                    <span className="status-label">Estado:</span>
                    <div className="status-value">
                        <div className={`status-dot ${status.connected ? 'connected' : 'disconnected'}`}></div>
                        {status.connected ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>

                {status.latency && (
                    <div className="status-row">
                        <span className="status-label">Latencia:</span>
                        <span className="status-value">{status.latency}ms</span>
                    </div>
                )}

                {status.totalPdfs > 0 && (
                    <div className="status-row">
                        <span className="status-label">PDFs totales:</span>
                        <span className="status-value">{status.totalPdfs}</span>
                    </div>
                )}

                {status.lastCheck && (
                    <div className="status-row">
                        <span className="status-label">Última verificación:</span>
                        <span className="status-value">
                            {status.lastCheck.toLocaleTimeString()}
                        </span>
                    </div>
                )}

                {status.error && (
                    <div className="status-error">
                        <i className="fas fa-exclamation-triangle"></i>
                        {status.error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupabaseStatus;